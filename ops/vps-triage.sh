#!/usr/bin/env bash
# Read-only compromise triage for the Coolify VPS. Changes nothing.
#
#   ssh alkebu-vps 'sudo bash -s' < ops/vps-triage.sh > triage-$(date +%F).txt 2>&1
#
# Never prints environment variables or `docker inspect` output (both hold
# secrets). Review the output before sharing it anywhere.

set -u
export LC_ALL=C
section() { printf '\n===== %s =====\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }

section "host"
hostnamectl 2>/dev/null | grep -E 'hostname|Operating|Kernel' || uname -a
uptime
date -u
[ -f /var/run/reboot-required ] && echo "REBOOT REQUIRED (pending kernel/libc update)"

section "top CPU / memory (cryptominers show up here)"
ps -eo pid,user,%cpu,%mem,etime,comm,args --sort=-%cpu | head -20

section "processes whose binary was deleted or lives in tmp dirs"
for p in /proc/[0-9]*; do
  exe=$(readlink "$p/exe" 2>/dev/null) || continue
  case "$exe" in
    *"(deleted)"*|/tmp/*|/var/tmp/*|/dev/shm/*|/run/user/*) echo "pid ${p#/proc/}: $exe :: $(tr '\0' ' ' < "$p/cmdline" | cut -c1-200)";;
  esac
done

section "known miner / botnet names"
ps -eo pid,user,args | grep -Ei 'xmrig|kdevtmpfsi|kinsing|c3pool|minexmr|nanopool|supportxmr|stratum|\.x86_64|kthreaddi|watchbog|perfctl|sysupdate|networkservice' | grep -v grep || echo "none"

section "listening sockets (anything on 0.0.0.0 / [::] is internet-facing unless firewalled)"
ss -tulpnH 2>/dev/null | awk '{print $1, $5, $7}' | sort -u

section "established outbound connections"
ss -tnpH state established 2>/dev/null | awk '{print $4, "->", $5, $6}' | grep -vE '127\.0\.0\.1|\[::1\]' | sort | uniq -c | sort -rn | head -40

section "firewall"
have ufw && ufw status verbose 2>/dev/null
echo "-- DOCKER-USER chain (ufw does NOT filter published Docker ports; this chain does):"
iptables -S DOCKER-USER 2>/dev/null || echo "no iptables / no DOCKER-USER chain"
have nft && nft list ruleset 2>/dev/null | grep -c . | sed 's/^/nft rule lines: /'

section "docker containers and published ports"
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null
echo "-- containers publishing on all interfaces:"
docker ps --format '{{.Names}} {{.Ports}}' 2>/dev/null | grep -E '0\.0\.0\.0|:::' || echo "none"

section "container resource usage"
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.PIDs}}' 2>/dev/null

section "container hardening flags (Payload / Next.js apps)"
for c in $(docker ps --format '{{.Names}}' 2>/dev/null); do
  docker inspect --format '{{.Name}} user={{.Config.User}} readonly={{.HostConfig.ReadonlyRootfs}} privileged={{.HostConfig.Privileged}} capdrop={{.HostConfig.CapDrop}} secopt={{.HostConfig.SecurityOpt}} mem={{.HostConfig.Memory}} nanocpus={{.HostConfig.NanoCpus}} pids={{.HostConfig.PidsLimit}}' "$c" 2>/dev/null
done

section "running processes inside each container (look for sh, curl, wget, miners)"
for c in $(docker ps --format '{{.Names}}' 2>/dev/null); do
  echo "--- $c"
  docker top "$c" -eo pid,user,etime,args 2>/dev/null | cut -c1-220 | head -15
done

section "files changed inside app containers since start (A=added, C=changed)"
# Excludes Next's own cache; anything executable in /tmp or /app is a red flag.
for c in $(docker ps --format '{{.Names}} {{.Image}}' 2>/dev/null | grep -Eiv 'postgres|redis|coolify|traefik|caddy|soketi|minio' | awk '{print $1}'); do
  echo "--- $c"
  docker diff "$c" 2>/dev/null | grep -vE '\.next/cache|/root/\.npm|/home/nextjs/\.cache' | head -40
done

section "Next.js / React versions actually deployed"
for c in $(docker ps --format '{{.Names}}' 2>/dev/null); do
  v=$(docker exec "$c" sh -c 'for f in /app/node_modules/next/package.json /app/package.json; do [ -f "$f" ] && grep -m1 "\"version\"" "$f" && break; done' 2>/dev/null)
  r=$(docker exec "$c" sh -c '[ -f /app/node_modules/react/package.json ] && grep -m1 "\"version\"" /app/node_modules/react/package.json' 2>/dev/null)
  [ -n "$v" ] && echo "$c next:${v} react:${r}"
done

section "executables in world-writable dirs on the host"
find /tmp /var/tmp /dev/shm -xdev -type f \( -perm -u+x -o -name '.*' \) -printf '%TY-%Tm-%Td %TH:%TM %u %s %p\n' 2>/dev/null | sort | tail -40

section "cron (all users + system)"
for u in $(cut -d: -f1 /etc/passwd); do crontab -l -u "$u" 2>/dev/null | grep -v '^#' | sed "s/^/[$u] /"; done
ls -la /etc/cron.d /etc/cron.hourly /etc/cron.daily 2>/dev/null
grep -rHv '^#' /etc/cron.d 2>/dev/null | grep -v '^\s*$' | head -30

section "systemd units and timers modified in the last 30 days"
find /etc/systemd /lib/systemd/system /usr/lib/systemd/system ~root/.config/systemd -xdev -type f -mtime -30 2>/dev/null | head -30
systemctl list-timers --all --no-pager 2>/dev/null | head -25

section "accounts"
echo "-- uid 0 accounts:"; awk -F: '$3==0{print $1}' /etc/passwd
echo "-- login shells:"; grep -Ev 'nologin|false|sync$' /etc/passwd | cut -d: -f1,6,7
echo "-- sudoers (non-comment):"; grep -rhEv '^\s*(#|$)' /etc/sudoers /etc/sudoers.d 2>/dev/null

section "ssh authorized_keys (fingerprints + mtime)"
for d in /root $(awk -F: '$3>=1000{print $6}' /etc/passwd); do
  f="$d/.ssh/authorized_keys"
  [ -f "$f" ] || continue
  echo "--- $f (modified $(stat -c %y "$f" | cut -d. -f1))"
  ssh-keygen -lf "$f" 2>/dev/null
done

section "sshd effective config"
sshd -T 2>/dev/null | grep -Ei '^(port|permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|maxauthtries|allowusers|x11forwarding) '

section "recent logins"
last -n 20 -a 2>/dev/null | head -22
echo "-- failed ssh attempts (last 7 days):"
journalctl -u ssh -u sshd --since '-7d' --no-pager 2>/dev/null | grep -cE 'Failed password|Invalid user' || true
echo "-- accepted ssh logins (last 14 days):"
journalctl -u ssh -u sshd --since '-14d' --no-pager 2>/dev/null | grep 'Accepted' | awk '{print $1,$2,$3,$9,$11}' | tail -20
have fail2ban-client && fail2ban-client status 2>/dev/null

section "patching"
have apt && apt list --upgradable 2>/dev/null | grep -c upgradable | sed 's/^/upgradable packages: /'
systemctl is-enabled unattended-upgrades 2>/dev/null | sed 's/^/unattended-upgrades: /'
docker version --format 'docker server {{.Server.Version}}' 2>/dev/null
docker ps --format '{{.Image}}' 2>/dev/null | grep -i coolify | sort -u

section "disk"
df -h -x tmpfs -x overlay 2>/dev/null
echo
echo "triage complete (read-only)"
