# Proposal: Implement Multi-Map System

## Why

The multi-map system enables working with multiple interconnected zones (e.g., 20 zones) in a single world. Zones can be connected seamlessly, via portals, ramps, bridges, teleports, or blocked. Users can hide specific zones for performance optimization and edit zones independently. This is essential for large world generation and supports both single large maps and multiple smaller maps connected by teleports.

## What Changes

This task implements the multi-map system:

1. **Zone Structure**:
   - Zone interface with id, name, position, size, visible, locked, layers, connections, metadata
   - Zone management (create, delete, update)
   - Active zone selection

2. **Zone Connections**:
   - Connection types (seamless, portal, ramp, bridge, teleport, blocked)
   - Connection validation
   - Cross-zone pathfinding

3. **World Map**:
   - WorldMap interface with zones and connections
   - World-level operations
   - Zone visibility control

4. **Cross-Zone Operations**:
   - Cross-zone editing
   - Cross-zone stamp placement
   - Cross-zone road generation

## Impact

- Affected specs: `MULTI_MAP_SYSTEM.md`
- Affected code:
  - `src/core/zone.ts` (new)
  - `src/core/world-map.ts` (new)
  - `src/core/zone-connection.ts` (new)
- Breaking change: NO (new feature)
- User benefit: Enables large world generation with multiple interconnected zones
