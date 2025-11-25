# Proposal: Implement Persistence System

## Why

The persistence system prevents data loss from power outages, browser crashes, or accidental closure. It provides two levels of persistence: localStorage auto-save for crash recovery and project file save/load for manual backup and sharing. Without this system, users risk losing hours of work. The persistence system stores all layers, zones, stamps, and configuration in a complete project JSON format that can be saved and loaded.

## What Changes

This task implements the persistence system:

1. **Project File Format**:
   - `ProjectFile` interface with version, metadata, world, settings
   - Complete serialization of all layers, zones, stamps, configuration
   - JSON format for human-readable and machine-parseable storage

2. **Save/Load Operations**:
   - Save project to JSON file
   - Load project from JSON file
   - Validation of project file format and version
   - Migration support for older project formats

3. **LocalStorage Auto-Save**:
   - Automatic saving to browser localStorage
   - Configurable auto-save interval
   - Auto-recovery on application start
   - Backup system for multiple recovery points

4. **Project Management**:
   - Project metadata (name, description, author, timestamps)
   - Project settings (cell size, default biome, auto-save config)
   - Project validation and error handling

## Impact

- Affected specs: `PERSISTENCE.md`
- Affected code:
  - `src/persistence/project.ts` (new)
  - `src/persistence/storage.ts` (new)
  - `src/persistence/auto-save.ts` (new)
- Breaking change: NO (new feature)
- User benefit: Prevents data loss and enables project backup/sharing
