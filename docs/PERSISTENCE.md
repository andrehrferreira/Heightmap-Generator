# Persistence System

## Overview

The system provides two levels of persistence to prevent data loss:

1. **LocalStorage**: Automatic saving to browser's localStorage for crash recovery
2. **Project File**: Manual save/load of complete project as JSON file

## Project File Format

### Project Structure

The project file contains all layers, zones, and configuration:

```typescript
interface ProjectFile {
  version: string;              // Project file format version
  metadata: ProjectMetadata;
  world: WorldMap;              // Complete world with all zones
  settings: ProjectSettings;
  lastSaved: string;            // ISO 8601 timestamp
}

interface ProjectMetadata {
  name: string;                 // Project name
  description: string;          // Project description
  author: string;               // Author name
  createdAt: string;            // ISO 8601 timestamp
  modifiedAt: string;           // ISO 8601 timestamp
}

interface ProjectSettings {
  cellSize: number;             // Default cell size
  defaultBiome: BiomeType;      // Default biome
  autoSave: boolean;            // Auto-save to localStorage
  autoSaveInterval: number;     // Auto-save interval in seconds
}
```

### Complete Project JSON Structure

```json
{
  "version": "1.0.0",
  "metadata": {
    "name": "My World Project",
    "description": "Large world with 20 zones",
    "author": "User Name",
    "createdAt": "2025-01-15T10:00:00Z",
    "modifiedAt": "2025-01-15T15:30:00Z"
  },
  "world": {
    "id": "world-1",
    "name": "Main World",
    "worldSize": { "width": 10240, "height": 10240 },
    "cellSize": 1,
    "zones": [
      {
        "id": "zone-1",
        "name": "Forest Zone",
        "position": { "x": 0, "y": 0 },
        "size": { "width": 1024, "height": 1024 },
        "visible": true,
        "locked": false,
        "layers": {
          "layers": [
            {
              "id": "layer-rivers-1",
              "name": "Rivers",
              "type": "rivers",
              "visible": true,
              "opacity": 1.0,
              "locked": false,
              "color": { "r": 0, "g": 100, "b": 255 },
              "data": {
                "width": 1024,
                "height": 1024,
                "cells": "base64-encoded-uint8array",
                "metadata": {
                  "generated": true,
                  "seed": 12345,
                  "parameters": {}
                }
              },
              "blendMode": "normal",
              "stamps": []
            }
          ],
          "activeLayerId": "layer-rivers-1",
          "order": ["layer-rivers-1"]
        },
        "connections": [],
        "metadata": {
          "biome": "forest",
          "level": 0,
          "tags": [],
          "notes": ""
        }
      }
    ],
    "connections": []
  },
  "settings": {
    "cellSize": 1,
    "defaultBiome": "plains",
    "autoSave": true,
    "autoSaveInterval": 30
  },
  "lastSaved": "2025-01-15T15:30:00Z"
}
```

### Data Encoding

Large data arrays (layer cells, heightmaps) are encoded as base64 strings to reduce JSON size:

```typescript
function encodeLayerData(cells: Uint8Array): string {
  return Buffer.from(cells).toString('base64');
}

function decodeLayerData(encoded: string): Uint8Array {
  return new Uint8Array(Buffer.from(encoded, 'base64'));
}
```

## LocalStorage Persistence

### Auto-Save Strategy

The system automatically saves project state to localStorage:

1. **On change**: After any modification (debounced)
2. **On interval**: Periodic saves (configurable interval)
3. **Before unload**: On browser close/navigation
4. **On error**: Before throwing errors

### LocalStorage Structure

```typescript
interface LocalStorageData {
  project: ProjectFile;          // Complete project data
  lastSaved: string;            // ISO 8601 timestamp
  version: string;              // Data format version
}
```

### Storage Keys

```typescript
const STORAGE_KEYS = {
  PROJECT: 'heightmap-generator:project',
  BACKUP: 'heightmap-generator:backup',  // Previous version backup
  SETTINGS: 'heightmap-generator:settings',
};
```

### Auto-Save Implementation

```typescript
class PersistenceManager {
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastSaveTime: number = 0;

  constructor(
    private project: ProjectFile,
    private settings: ProjectSettings
  ) {
    this.setupAutoSave();
    this.setupUnloadHandler();
  }

  private setupAutoSave(): void {
    if (!this.settings.autoSave) return;

    // Periodic auto-save
    this.autoSaveTimer = setInterval(() => {
      this.saveToLocalStorage();
    }, this.settings.autoSaveInterval * 1000);
  }

  private setupUnloadHandler(): void {
    // Save before page unload
    window.addEventListener('beforeunload', () => {
      this.saveToLocalStorage();
    });

    // Save on visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveToLocalStorage();
      }
    });
  }

  onProjectChange(): void {
    // Debounced save on change
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.saveToLocalStorage();
    }, 1000); // 1 second debounce
  }

  saveToLocalStorage(): void {
    try {
      // Create backup of current data
      const current = localStorage.getItem(STORAGE_KEYS.PROJECT);
      if (current) {
        localStorage.setItem(STORAGE_KEYS.BACKUP, current);
      }

      // Save current project
      const data: LocalStorageData = {
        project: this.project,
        lastSaved: new Date().toISOString(),
        version: '1.0.0',
      };

      localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(data));
      this.lastSaveTime = Date.now();
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError') {
        this.handleStorageQuotaExceeded();
      }
    }
  }

  loadFromLocalStorage(): ProjectFile | null {
    try {
      const dataStr = localStorage.getItem(STORAGE_KEYS.PROJECT);
      if (!dataStr) return null;

      const data: LocalStorageData = JSON.parse(dataStr);
      return data.project;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      // Try to load backup
      return this.loadFromBackup();
    }
  }

  loadFromBackup(): ProjectFile | null {
    try {
      const backupStr = localStorage.getItem(STORAGE_KEYS.BACKUP);
      if (!backupStr) return null;

      const data: LocalStorageData = JSON.parse(backupStr);
      return data.project;
    } catch (error) {
      console.error('Failed to load backup:', error);
      return null;
    }
  }

  private handleStorageQuotaExceeded(): void {
    // Strategy: Remove old backups, compress data, or prompt user
    console.warn('LocalStorage quota exceeded. Consider exporting project file.');
    // Could implement data compression or cleanup old versions
  }
}
```

## File Save/Load

### Save Project

```typescript
interface FileOperations {
  saveProject(project: ProjectFile): Promise<void>;
  loadProject(file: File): Promise<ProjectFile>;
  exportProject(project: ProjectFile, format: 'json' | 'zip'): Promise<Blob>;
}
```

### Save Implementation

```typescript
async function saveProject(project: ProjectFile): Promise<void> {
  // Update metadata
  project.metadata.modifiedAt = new Date().toISOString();
  project.lastSaved = new Date().toISOString();

  // Serialize project
  const json = JSON.stringify(project, null, 2);
  
  // Create blob and download
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.metadata.name || 'project'}.json`;
  a.click();
  URL.revokeObjectURL(url);

  // Also save to localStorage
  persistenceManager.saveToLocalStorage();
}
```

### Load Implementation

```typescript
async function loadProject(file: File): Promise<ProjectFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const project: ProjectFile = JSON.parse(e.target?.result as string);
        
        // Validate project structure
        if (!validateProject(project)) {
          reject(new Error('Invalid project file format'));
          return;
        }

        // Migrate if needed
        const migratedProject = migrateProject(project);
        
        resolve(migratedProject);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
```

### Project Validation

```typescript
function validateProject(project: any): project is ProjectFile {
  return (
    project &&
    typeof project.version === 'string' &&
    project.metadata &&
    project.world &&
    Array.isArray(project.world.zones)
  );
}
```

### Project Migration

Handle version changes:

```typescript
function migrateProject(project: ProjectFile): ProjectFile {
  const version = parseVersion(project.version);
  
  if (version.major < 1) {
    // Migrate from v0.x to v1.0
    project = migrateV0ToV1(project);
  }

  project.version = '1.0.0';
  return project;
}
```

## Recovery on Startup

### Startup Flow

```typescript
async function initializeProject(): Promise<ProjectFile> {
  // 1. Check for unsaved changes in localStorage
  const savedProject = persistenceManager.loadFromLocalStorage();
  
  if (savedProject) {
    // 2. Check if user wants to restore
    const shouldRestore = await promptRestore(savedProject);
    
    if (shouldRestore) {
      return savedProject;
    }
  }

  // 3. Create new project
  return createNewProject();
}

async function promptRestore(project: ProjectFile): Promise<boolean> {
  const lastSaved = new Date(project.lastSaved);
  const timeDiff = Date.now() - lastSaved.getTime();
  const minutesAgo = Math.floor(timeDiff / 60000);

  return confirm(
    `Found unsaved work from ${minutesAgo} minutes ago. Restore?`
  );
}
```

## Storage Limits

### LocalStorage Quota

- Typical limit: 5-10 MB per domain
- Monitor usage and warn when approaching limit
- Provide export option when quota is exceeded

### Optimization Strategies

1. **Compress large arrays**: Use base64 encoding
2. **Remove unused data**: Clean up old backups
3. **Lazy load zones**: Only save visible/active zones
4. **Incremental saves**: Only save changed zones

## API Endpoints

### POST /api/project/save

Save project to server (optional cloud backup).

**Request:**
```json
{
  "project": { /* ProjectFile */ },
  "name": "project-name"
}
```

### GET /api/project/:projectId

Load project from server.

### POST /api/project/export

Export project as downloadable file.

