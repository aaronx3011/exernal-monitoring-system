# F5 — WireGuard Connectivity Agent

**Builds:** WireGuard hub config, peer provisioning, private routing for F4/F6  
**Depends on:** F1

## Requirements
- WireGuard hub on VPS: `wg0` interface, keys, listen port, firewall rules
- Hub-and-spoke topology: private apps peer into the VPS hub
- Addressing plan: private CIDR for tunnel, unique IP per peer
- Peer provisioning script/service (add/remove/rotate peers)
- Firewall rules: restrict tunnel access to probe/test workers, block peer-to-peer
- Extend app registry with `private_endpoint` field
- F4/F6 transport-aware routing: target `private_endpoint` for private apps
- Tunnel health monitoring per-peer (last-handshake time)
- Peer status UI surface (connected / last handshake)

## Deliverables
- WireGuard configuration scripts
- Peer provisioning tooling
- Routing integration with F4/F6
- Tunnel health monitoring
