# Tasks: Implement Detail Stamps for Surface Quality

## Progress: 0% (0/24 tasks complete)

## Overview

This task implements a **detail stamp system** for adding high-quality surface texturing to heightmaps using pre-made stamps from professional tools (Nano Banana, Gaea, World Machine, etc.).

**Key Principle**: Detail stamps are the SAFEST way to add visual quality because:
- Amplitude is strictly limited (≤ 1%)
- Ramp zones are automatically protected
- Non-destructive (can be toggled off)
- No algorithmic surprises

---

## Phase 1: Core Detail Stamp System

### 1.1 Data Structures
- [ ] 1.1.1 Create `DetailStamp` interface with amplitude limits
- [ ] 1.1.2 Create `DetailStampConfig` with safety constraints
- [ ] 1.1.3 Create `DetailApplication` for tracking applied stamps
- [ ] 1.1.4 Create `DetailStampCategory` enum

### 1.2 Stamp Storage
- [ ] 1.2.1 Implement `.detailstamp` file format (JSON + binary)
- [ ] 1.2.2 Create stamp save/load functions
- [ ] 1.2.3 Implement stamp library storage (IndexedDB)
- [ ] 1.2.4 Add stamp thumbnail generation

---

## Phase 2: Import System

### 2.1 Image Import
- [ ] 2.1.1 Implement PNG heightmap import (8/16-bit)
- [ ] 2.1.2 Implement TIFF import (16/32-bit float)
- [ ] 2.1.3 Implement EXR import (32-bit float)
- [ ] 2.1.4 Implement RAW/R16 import

### 2.2 Tool-Specific Import
- [ ] 2.2.1 Add Nano Banana format detection and import
- [ ] 2.2.2 Add Gaea format detection and import
- [ ] 2.2.3 Add World Machine format detection and import

### 2.3 Import Processing
- [ ] 2.3.1 Implement amplitude analysis (detect min/max)
- [ ] 2.3.2 Implement amplitude scaling to safe range (≤ 0.5%)
- [ ] 2.3.3 Implement tileability detection
- [ ] 2.3.4 Implement "make tileable" edge blending

---

## Phase 3: Safe Application System

### 3.1 Ramp-Protected Application
- [ ] 3.1.1 Integrate with ramp mask system
- [ ] 3.1.2 Implement amplitude fade near ramps
- [ ] 3.1.3 Implement zero-application in protected zones
- [ ] 3.1.4 Add amplitude limit enforcement

### 3.2 Application Modes
- [ ] 3.2.1 Implement SINGLE placement mode
- [ ] 3.2.2 Implement TILE_LEVEL mode (tile across one level)
- [ ] 3.2.3 Implement TILE_MAP mode (tile all safe zones)
- [ ] 3.2.4 Implement SCATTER mode (random distribution)
- [ ] 3.2.5 Implement PAINT mode (brush-based)

### 3.3 Transform Support
- [ ] 3.3.1 Implement rotation (fixed and random)
- [ ] 3.3.2 Implement scale (fixed and variation)
- [ ] 3.3.3 Implement blend modes (add, multiply, overlay)

---

## Phase 4: Non-Destructive Layer

### 4.1 Detail Layer System
- [ ] 4.1.1 Create detail layer that stores all applications
- [ ] 4.1.2 Implement layer toggle (on/off)
- [ ] 4.1.3 Implement intensity adjustment (affects all stamps)
- [ ] 4.1.4 Implement individual stamp removal

### 4.2 Undo/Redo
- [ ] 4.2.1 Integrate with undo system for stamp placement
- [ ] 4.2.2 Integrate with undo system for stamp removal
- [ ] 4.2.3 Integrate with undo system for parameter changes

---

## Phase 5: UI Components

### 5.1 Stamp Library Panel
- [ ] 5.1.1 Create grid view with thumbnails
- [ ] 5.1.2 Implement category filtering
- [ ] 5.1.3 Implement search functionality
- [ ] 5.1.4 Implement favorites system
- [ ] 5.1.5 Add import button with drag-drop support

### 5.2 Application Controls
- [ ] 5.2.1 Create mode selector (single/tile/scatter/paint)
- [ ] 5.2.2 Create intensity slider with preview
- [ ] 5.2.3 Create scale/rotation controls
- [ ] 5.2.4 Create level selector for TILE_LEVEL mode
- [ ] 5.2.5 Add amplitude preview (shows height range)

### 5.3 Safety Indicators
- [ ] 5.3.1 Show ramp zone overlay during placement
- [ ] 5.3.2 Show amplitude warning if approaching limits
- [ ] 5.3.3 Add before/after comparison toggle

---

## Phase 6: Built-in Library

### 6.1 Create Starter Stamps
- [ ] 6.1.1 Create/source rock surface stamps (2-3)
- [ ] 6.1.2 Create/source dirt ground stamps (2-3)
- [ ] 6.1.3 Create/source grass terrain stamps (2-3)
- [ ] 6.1.4 Create/source sand/erosion stamps (2-3)

### 6.2 Package Library
- [ ] 6.2.1 Package stamps into built-in library
- [ ] 6.2.2 Add library to application bundle
- [ ] 6.2.3 Implement first-run library initialization

---

## Phase 7: Pipeline Integration

### 7.1 Generation Pipeline
- [ ] 7.1.1 Add detail stamp pass after ramp smoothing
- [ ] 7.1.2 Ensure detail layer exports correctly
- [ ] 7.1.3 Add detail toggle to generation config

### 7.2 Export Integration
- [ ] 7.2.1 Include detail in heightmap export
- [ ] 7.2.2 Option to export with/without detail
- [ ] 7.2.3 Export detail layer as separate mask

---

## Phase 8: Testing & Documentation

### 8.1 Testing
- [ ] 8.1.1 Unit tests for amplitude limits
- [ ] 8.1.2 Unit tests for ramp protection
- [ ] 8.1.3 Unit tests for import formats
- [ ] 8.1.4 Integration tests for full workflow
- [ ] 8.1.5 Performance tests for large maps

### 8.2 Documentation
- [ ] 8.2.1 Document detail stamp workflow
- [ ] 8.2.2 Create import guide for each tool (Nano Banana, etc.)
- [ ] 8.2.3 Add examples with before/after images

---

## Validation Checklist

Before marking complete:

- [ ] Amplitude NEVER exceeds 1% of level height
- [ ] Ramp zones receive exactly 0 modification
- [ ] Fade zones receive proportionally reduced detail
- [ ] Detail layer can be toggled completely off
- [ ] Original heightmap preserved when detail disabled
- [ ] Import works for PNG, TIFF, EXR formats
- [ ] Tile mode produces seamless results
- [ ] Performance acceptable for 1024x1024 maps
- [ ] All application modes work correctly
- [ ] Undo/redo works for all operations
