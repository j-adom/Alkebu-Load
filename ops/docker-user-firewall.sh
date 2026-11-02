#!/usr/bin/env bash
# Keep Docker-published admin/internal ports off the public internet while
# leaving them reachable over Tailscale and from the host itself.
#
# ufw can't do this: Docker DNATs published ports in PREROUTING and forwards
# them through FORWARD -> DOCKER-USER, never touching ufw's INPUT rules. By the
# time a packet reaches DOCKER-USER its destination port is already the
# container port, so we match the ORIGINAL (published) port via conntrack.
#
# Only traffic arriving on the public interface is dropped. tailscale0, the
# docker bridges, and cloudflared (which connects outbound) are unaffected.
# SSH (22) and Traefik (80/443) are not touched.
#
#   sudo ./docker-user-firewall.sh            # apply (idempotent)
#   sudo ./docker-user-firewall.sh --dry-run  # print the rules only
#   sudo ./docker-user-firewall.sh --remove   # undo
#
# Persist across reboots with ops/docker-user-firewall.service.

set -euo pipefail

# 8000 Coolify dashboard, 8080 Traefik dashboard, 6001/6002 Coolify realtime,
# 8123 Hi.Events (served through Traefik/tunnel; the direct port isn't needed).
PORTS="${PORTS:-8000 8080 6001 6002 8123}"
EXT_IF="${EXT_IF:-$(ip -o route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i < NF; i++) if ($i == "dev") { print $(i + 1); exit }}')}"
MODE="${1:-apply}"
TAG="docker-user-firewall"

if [ -z "$EXT_IF" ]; then
  echo "could not detect the public interface; set EXT_IF=eth0 (or similar)" >&2
  exit 1
fi
case "$EXT_IF" in
  tailscale*|docker*|br-*|lo) echo "refusing: EXT_IF=$EXT_IF is not a public interface" >&2; exit 1;;
esac

run() {
  if [ "$MODE" = "--dry-run" ]; then echo "$*"; else "$@"; fi
}

for ipt in iptables ip6tables; do
  command -v "$ipt" >/dev/null 2>&1 || continue
  # Docker creates DOCKER-USER; skip a family it doesn't manage (e.g. no IPv6).
  "$ipt" -nL DOCKER-USER >/dev/null 2>&1 || { echo "$ipt: no DOCKER-USER chain, skipping"; continue; }

  for port in $PORTS; do
    rule=(DOCKER-USER -i "$EXT_IF" -p tcp
      -m conntrack --ctdir ORIGINAL --ctorigdstport "$port"
      -m comment --comment "$TAG"
      -j DROP)
    case "$MODE" in
      --remove)
        while "$ipt" -C "${rule[@]}" 2>/dev/null; do "$ipt" -D "${rule[@]}"; done
        ;;
      apply|--dry-run)
        "$ipt" -C "${rule[@]}" 2>/dev/null || run "$ipt" -I "${rule[@]}"
        ;;
      *) echo "usage: $0 [--dry-run|--remove]" >&2; exit 2;;
    esac
  done
  [ "$MODE" = "--dry-run" ] || { echo "--- $ipt DOCKER-USER"; "$ipt" -S DOCKER-USER; }
done
