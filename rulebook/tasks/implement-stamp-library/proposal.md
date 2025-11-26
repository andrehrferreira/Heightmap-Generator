# Implement Stamp Library

## Why

A reusable stamp library speeds up terrain creation by providing:

- Pre-made terrain features (mountains, craters, plateaus)
- User-created stamps for project consistency
- Scatter placement for natural distribution
- Import/export for sharing stamps

## What Changes

1. **Stamp structure**: Height data, masks, metadata
2. **Built-in library**: Mountains, hills, craters, plateaus
3. **Stamp placement**: Position, rotation, scale, blend modes
4. **Scatter system**: Random distribution with variation
5. **Library management**: Categories, search, favorites

## Impact

- **Web Interface**: Stamp library panel and placement tools
- **Preview**: Stamp preview and placement visualization
- **Storage**: Local and optional cloud storage

## Dependencies

- Core grid system (implemented)
- Web interface (partial)

## Deliverables

- `src/stamps/` directory with stamp system
- Built-in stamp library
- Unit tests with ≥95% coverage
- Documentation updates

