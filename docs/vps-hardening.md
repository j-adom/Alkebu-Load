# VPS hardening runbook (Coolify + Payload)

Written Oct 20, 2026 after the Oct 13 and Oct 18 abuse suspensions. Production was
still on `next@15.3.0` / `react@19.1.0`, which is exposed to every Next.js/React
Flight RCE published since Dec 2025. The Oct 13 upgrade branch was never merged, and
Coolify only deploys `main`.

## 0. Triage first (read-only)

```bash
ssh alkebu-vps 'sudo bash -s' < ops/vps-triage.sh > triage-$(date +%F).txt 2>&1
```

Look for:

- **Unknown high-CPU processes**, binaries in `/tmp`, `/dev/shm` or `(deleted)`, or miner names.
- **`docker diff` showing added executables** in the Payload container.
- **Unknown cron, systemd or `authorized_keys` entries**, or recent `Accepted` SSH logins you don't recognise.
- **Postgres, Coolify (8000/6001/6002) or any app port listening on `0.0.0.0`.**

**If the host itself shows persistence** (cron, systemd, new keys, host-level miner),
don't clean it in place. Provision a fresh VPS, install Coolify, and redeploy from git.
If the compromise is confined to the app container, a clean rebuild (step 1) is enough.

## 1. Deploy the patched backend

The deploy branch is `security/next-16-upgrade`:

- next 16.4.2
- react 19.3.1
- payload 3.91.0
- sharp 0.35.5
- access-control fixes

Steps:

1. **Apply the schema patch before merging.** It is idempotent and backwards compatible with the running 3.79:
   ```bash
   psql "$DATABASE_URI" -f alkebu-load/scripts/fix-payload-3-90-schema.sql
   ```
2. **Merge to `main`.**
3. **In Coolify, Redeploy with "Disable build cache" / force rebuild.** Don't just restart the existing container.
4. **Re-run the triage script.** The "versions actually deployed" section should show `next 16.4.2`.
5. **Smoke test:**
   - `/admin` login
   - `/admin/order-dashboard`
   - a storefront cart → Stripe test checkout
   - the Square catalog webhook (Square dashboard → send test event)

## 2. Rotate secrets (after the clean deploy, not before)

Anything the old container could read is burned. Rotate it, then update the values in Coolify:

| Secret | Where |
| --- | --- |
| `STRIPE_SECRET_KEY` (roll) + `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers |
| `SES_SMTP_USER` / `SES_SMTP_PASSWORD` | AWS IAM → delete old SMTP user, create new |
| `SQUARE_ACCESS_TOKEN`, `SQUARE_WEBHOOK_SIGNATURE_KEY` | Square Developer Dashboard |
| R2 access key ID / secret | Cloudflare → R2 → Manage API tokens |
| `PAYLOAD_SECRET` | `openssl rand -hex 32` (logs everyone out; expected) |
| Postgres password | `ALTER ROLE … PASSWORD …`, then update `DATABASE_URI` everywhere |
| Shippo, ISBNdb, Google Books keys | each provider's dashboard |
| Admin password | change it. A hash of it was committed to this repo in `alkebu-load/alkebulanimages.db*` |

## 3. Contain the Payload container

These flags were verified against the standalone build: the server boots and serves
with a read-only root, uses ~180 MB idle, and only writes to `.next/cache`.

**Coolify 4.4.6 (latest release as of Oct 20, 2026):**

- **Settings → General → Runtime → Custom Docker Options:** `--cap-drop=ALL` (this is what production runs).
- **Operations → Resource Limits:** CPU limit `1`, memory limit `1g`, and memory-and-swap limit `1g`.

The limits matter as much as the flags. With them in place, a compromised container
can't pin every core, which is what triggers the abuse suspensions.

4.4.6's `convertDockerRunToCompose` only maps `--cap-add/--cap-drop/--security-opt/
--sysctl/--device/--init/--ulimit/--privileged/--ip/--shm-size/--dns/--gpus/--hostname/
--entrypoint`. It **silently ignores** `--read-only`, `--tmpfs` and `--pids-limit`. It also
cuts option values at the first `-`, so `--security-opt=no-new-privileges` becomes
`security_opt: "no"` and the deploy fails with `invalid security-opt: "no"`.
Coolify's `main` branch has fixed both. Once a release includes the fix, use the full set
(verified against the standalone build: it boots read-only, ~180 MB idle, and only
writes to `.next/cache`):

```
--read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m --tmpfs /app/.next/cache:rw,noexec,nosuid,uid=1001,gid=1001,size=256m --cap-drop=ALL --security-opt=no-new-privileges --pids-limit=256
```

Confirm what actually applied with `ops/vps-triage.sh` ("container hardening flags").

To get the full set before then, deploy as a Docker Compose resource; compose keys
are passed through unparsed:

```yaml
read_only: true
tmpfs: ['/tmp:size=64m,noexec,nosuid', '/app/.next/cache:size=256m,noexec,nosuid,uid=1001,gid=1001']
cap_drop: [ALL]
security_opt: ['no-new-privileges:true']
pids_limit: 256
mem_limit: 1g
cpus: 1
```

## 4. Network exposure

**Docker publishes ports by writing iptables rules that bypass `ufw`.** A
`ufw deny 5432` does nothing for a container published on `0.0.0.0:5432`.

- **Postgres: never publish its port.** Payload reaches it over the Docker network. If you need remote psql, use Tailscale or an SSH tunnel.
- **Coolify dashboard (8000) and realtime (6001/6002): reach them over Tailscale only.** Put the dashboard behind a domain with Cloudflare Access, or firewall those ports in the `DOCKER-USER` chain.
- **`ops/docker-user-firewall.sh` does this.** It drops public-interface traffic to 8000, 8080 (Traefik dashboard), 6001, 6002 and 8123 (Hi.Events' direct port) in `DOCKER-USER`, matching the original published port via conntrack. Tailscale, the host itself, cloudflared and outbound replies are unaffected; 22/80/443 are untouched.
  ```bash
  # keep an SSH session open while doing this
  sudo ./ops/docker-user-firewall.sh --dry-run      # check the detected interface and rules
  sudo install -m 0755 ops/docker-user-firewall.sh /usr/local/sbin/
  sudo install -m 0644 ops/docker-user-firewall.service /etc/systemd/system/
  sudo systemctl daemon-reload && sudo systemctl enable --now docker-user-firewall
  ```
  First confirm you can open Coolify at `http://<tailscale-ip>:8000`. Undo with `sudo docker-user-firewall.sh --remove`.
- **Host firewall:**
  ```bash
  ufw default deny incoming && ufw default allow outgoing
  ufw allow in on tailscale0
  ufw allow 22/tcp          # or restrict to tailscale0 only once confirmed working
  ufw allow 80,443/tcp      # drop these once Cloudflare Tunnel is serving traffic
  ufw enable
  ```
- **Target state:** Payload behind a Cloudflare Tunnel with Access.
  - Use a service token for the storefront worker.
  - Bypass Access only for `/api/stripe-webhook` and `/api/webhooks/square-catalog`.
  - Use an email-OTP policy for `/admin`.
  - Close every public port except SSH, and close SSH too if you only use Tailscale.

## 5. Host basics

```bash
# SSH: keys only
printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\nMaxAuthTries 3\n' \
  > /etc/ssh/sshd_config.d/10-hardening.conf && sshd -t && systemctl reload ssh

apt install -y unattended-upgrades fail2ban && dpkg-reconfigure -plow unattended-upgrades
```

## 6. Keep it patched

`.github/dependabot.yml` opens daily PRs for the backend. It groups
next/react/payload into one PR because Payload's peer range on `next` is narrow.
For example, 3.91 accepts `>=16.3.3 <17` but not 15.5.x. A green Dependabot PR
still needs a merge to `main` to deploy.

Next.js 15.x leaves LTS on Oct 21, 2026. Stay on 16.x.
