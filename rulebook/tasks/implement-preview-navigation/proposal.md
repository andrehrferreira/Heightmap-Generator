# Proposal: Implement Preview Navigation

## Why

Preview navigation enables users to explore the generated heightmap in 2.5D with camera controls (orbit, pan, zoom, rotation). This is essential for verifying the quality of generated terrain and identifying issues. Without navigation, users cannot properly inspect the heightmap from different angles and distances. The navigation system uses Three.js OrbitControls and provides mouse, touch, and keyboard controls for accessibility.

## What Changes

This task implements preview navigation:

1. **Camera Controls**:
   - OrbitControls for Three.js camera
   - Pan, zoom, rotation controls
   - Mouse, touch, keyboard support

2. **Camera Presets**:
   - Top-down view
   - Isometric view
   - Side view
   - Custom camera positions

3. **Focus Features**:
   - Focus on specific area
   - Fit to bounds
   - Reset camera

4. **API Integration**:
   - Camera state API endpoints
   - Camera control API endpoints

## Impact

- Affected specs: `PREVIEW_NAVIGATION.md`, `API.md` (camera endpoints)
- Affected code:
  - `web/src/preview/controls.ts` (update)
  - `src/api/routes.ts` (add camera endpoints)
- Breaking change: NO (new feature)
- User benefit: Enables proper heightmap inspection and verification
