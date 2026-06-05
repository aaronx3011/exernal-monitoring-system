#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <peer-name> <public-key>"
  echo "Example: $0 customer-vpn-app1 XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  exit 1
fi

PEER_NAME="$1"
PUBLIC_KEY="$2"
WG_CONF="/path/to/wireguard/wg0.conf"
WG_INTERFACE="wg0"
BASE_CIDR="10.0.0.0/24"
BASE_NET="10.0.0"

echo "=== Provisioning WireGuard peer: $PEER_NAME ==="

# Find the next available IP in the /24 subnet
LAST_IP=$(grep -oP 'AllowedIPs = \K[0-9.]+' "$WG_CONF" 2>/dev/null | \
  awk -F. '{print $4}' | sort -n | tail -1)
LAST_IP=${LAST_IP:-0}
NEXT_IP=$((LAST_IP + 1))

if [ "$NEXT_IP" -ge 254 ]; then
  echo "Error: No available IPs in $BASE_CIDR"
  exit 1
fi

PEER_IP="${BASE_NET}.${NEXT_IP}"

# Add peer to wg0.conf
cat >> "$WG_CONF" <<EOF

[Peer]
# $PEER_NAME
PublicKey = $PUBLIC_KEY
AllowedIPs = $PEER_IP/32
EOF

echo "Peer $PEER_NAME added with IP $PEER_IP"

# Restart WireGuard to apply changes
if command -v wg-quick &>/dev/null; then
  wg-quick down "$WG_INTERFACE" 2>/dev/null || true
  wg-quick up "$WG_INTERFACE"
  echo "WireGuard restarted via wg-quick"
elif command -v docker &>/dev/null; then
  docker compose -f /path/to/docker/docker-compose.yml restart wireguard
  echo "WireGuard container restarted"
else
  echo "Warning: WireGuard restart required manually"
fi

echo "=== Peer provisioning complete ==="
echo "Peer: $PEER_NAME"
echo "IP:   $PEER_IP"
echo ""
echo "Client config snippet:"
echo "[Interface]"
echo "PrivateKey = <client-private-key>"
echo "Address = ${PEER_IP}/32"
echo "DNS = <dns-server>"
echo ""
echo "[Peer]"
echo "PublicKey = <hub-public-key>"
echo "Endpoint = <hub-public-ip>:51820"
echo "AllowedIPs = $BASE_CIDR"
echo "PersistentKeepalive = 25"
