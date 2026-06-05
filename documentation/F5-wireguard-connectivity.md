# F5 — WireGuard Connectivity to Private Apps

> **Priority:** P0 (Phase 2) · **Primary engineering:** DevOps/Network, Backend · **Depends on:** F1

## Goal
Let the hub reach applications that live inside private networks and are not publicly exposed. The hub runs a WireGuard interface; private apps (or their networks) peer with it, so the Probe Engine (F4) and Test Engine (F6) can reach them over an encrypted tunnel exactly as if they were public.

## Why it matters
You explicitly require monitoring of VPN-only apps. Without a private transport, F4 and F6 simply can't see those apps, and inbound-only data (F3) would be the sole signal — insufficient for availability/SLA and impossible for active load tests.

## Recommended topology
**Hub-and-spoke (recommended):** the VPS runs a WireGuard "hub" (`wg0`). Each private app — or a small relay/gateway inside the app's private network — is a **spoke** that connects into the hub. The hub then routes probe/test traffic to each spoke's allowed IPs.

Why hub model over "VPS dials into each app's VPN":
- One stable interface to manage instead of N client profiles.
- Apps initiate the connection (outbound from their network), which is firewall-friendly and avoids exposing the private networks inbound.
- Clean per-peer IP allocation makes F4 routing trivial (route by destination IP).

> If some networks can't run an outbound spoke, support a per-network gateway peer that fronts several apps behind it.

## Scope
- WireGuard hub configured on the VPS (keys, `wg0`, listen port, persistent config).
- Per-app/per-network peer provisioning: keypair, allowed IPs, address allocation.
- Routing + firewall so only the Probe/Test workers can use the tunnel, and peers can't reach each other unless intended.
- A mapping in the app registry from `application_id` → private address, so F4/F6 know where to send traffic.
- Operational tooling to add/rotate/remove peers (ideally driven from the dashboard).

## Implementation steps

1. **[Network]** Design the addressing plan: a private CIDR for the tunnel, one address (or subnet) per peer, documented allocation.
2. **[DevOps]** Install and configure WireGuard on the VPS; create the hub keypair; bring up `wg0`; open the WireGuard UDP port in the firewall (only that port).
3. **[Network]** Define the peering model with app teams: each private app/network generates a keypair, shares its public key, and configures the VPS hub as its endpoint with `PersistentKeepalive`.
4. **[DevOps]** Implement peer provisioning: a script/service that adds a peer (public key + allowed IPs) to the hub and returns the config the app side needs.
5. **[Network]** Configure routing + firewall rules so traffic to a peer's allowed IPs egresses via `wg0`, restrict peer-to-peer traffic, and ensure return traffic works.
6. **[Backend]** Extend the registry: a `private_endpoint` (tunnel IP/host + port) per private application, set at registration or peer-provisioning time.
7. **[Backend]** Make F4/F6 transport-aware: when `network_type = private`, target `private_endpoint` and ensure the request egresses through the tunnel (route by destination IP handles this if addressing is right).
8. **[DevOps]** Add health/monitoring of the tunnel itself: per-peer last-handshake time, and alert (F10) if a peer goes silent.
9. **[Security]** Document key rotation and peer revocation; ensure removing an app revokes its peer.
10. **[Frontend]** (Optional, Phase 3) Surface peer status (connected / last handshake) and a "generate peer config" action in the app detail view.

## Deliverables
- A running WireGuard hub on the VPS with documented addressing.
- Peer provisioning tooling and per-app private endpoint mapping.
- F4/F6 reaching private apps through the tunnel.
- Tunnel health monitoring.

## Acceptance criteria
- A private app with no public exposure is reachable from the hub over `wg0` and is probed/load-tested identically to a public app.
- Removing/revoking a peer immediately stops tunnel reachability for that app.
- Per-peer last-handshake is visible and a stale handshake fires an alert.
- Peers cannot reach each other unless explicitly allowed.

## Risks & mitigations
- **NAT/firewall on the app side blocks the tunnel** → spokes dial out + `PersistentKeepalive`; provide a gateway-peer pattern for locked-down networks.
- **Addressing collisions with app internal subnets** → choose a tunnel CIDR unlikely to overlap and document it; allow per-peer overrides.
- **Operational drift in peer configs** → manage peers through tooling/dashboard, not hand-edited files; track in the audit log.
- **Security of a central tunnel hub** → restrict which workers can use `wg0`, isolate peers, rotate keys, keep the hub patched (ties to F11).
