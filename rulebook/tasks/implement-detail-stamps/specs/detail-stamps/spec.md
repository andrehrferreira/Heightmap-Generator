# Detail Stamps Specification

This specification defines the requirements for the detail stamp system that provides high-quality surface texturing while preserving terrain structure.

## Core Philosophy

**Detail stamps exist to add visual quality that algorithms cannot safely provide.**

The level/ramp system is the foundation of this project. Detail stamps are a controlled way to add realism without risking that foundation.

---

## Requirements

### Requirement: Amplitude Safety

The system SHALL enforce strict amplitude limits on all detail stamps.

#### Scenario: Maximum amplitude enforcement
Given a detail stamp with any amplitude value
When the stamp is applied to the heightmap
Then the effective amplitude SHALL NOT exceed 1% of level height difference
And amplitude SHALL be further reduced near ramp zones

#### Scenario: Amplitude scaling on import
Given an imported heightmap with amplitude > 1%
When importing as a detail stamp
Then the system SHALL scale the data to ≤ 0.5% amplitude
And SHALL warn the user about the scaling

#### Scenario: Amplitude preview
Given a detail stamp selected for application
When the user views the preview
Then the system SHALL display the effective height range in world units
And SHALL highlight any areas that would receive maximum amplitude

---

### Requirement: Ramp Zone Protection

The system SHALL protect ramp zones from any detail modification.

#### Scenario: Zero detail in ramps
Given a ramp zone identified by ramp mask value > 0.95
When detail stamps are applied
Then the ramp zone SHALL receive exactly 0 detail modification

#### Scenario: Fade near ramps
Given a zone near a ramp (ramp mask value 0.1-0.95)
When detail stamps are applied
Then detail amplitude SHALL be reduced proportionally to (1 - rampMask)

#### Scenario: Visual ramp protection
Given detail application UI
When the user previews stamp placement
Then ramp zones SHALL be visually indicated as protected
And fade zones SHALL show reduced intensity preview

---

### Requirement: External Tool Import

The system SHALL support importing heightmaps from professional terrain tools.

#### Scenario: PNG import
Given a 16-bit grayscale PNG file
When imported as detail stamp
Then the system SHALL correctly read height values
And SHALL normalize to 0-1 range

#### Scenario: TIFF import
Given a 32-bit float TIFF file (Gaea/World Machine export)
When imported as detail stamp
Then the system SHALL correctly read float height values
And SHALL preserve precision

#### Scenario: Nano Banana import
Given a heightmap exported from Google Nano Banana
When imported as detail stamp
Then the system SHALL auto-detect format
And SHALL apply appropriate normalization

#### Scenario: Batch import
Given a folder containing multiple heightmap files
When batch import is executed
Then all valid files SHALL be imported as detail stamps
And invalid files SHALL be reported with reasons

---

### Requirement: Tileable Stamps

The system SHALL support seamlessly tileable detail stamps.

#### Scenario: Tile detection
Given an imported heightmap
When analyzed for tileability
Then the system SHALL compare edge pixels for continuity
And SHALL report tileable: true/false

#### Scenario: Make tileable
Given a non-tileable heightmap
When "make tileable" is requested
Then the system SHALL apply edge blending
And resulting stamp SHALL tile without visible seams

#### Scenario: Tile application
Given a tileable stamp applied in TILE mode
When viewed at tile boundaries
Then there SHALL be no visible seams or discontinuities

---

### Requirement: Application Modes

The system SHALL support multiple detail application modes.

#### Scenario: Single placement
Given SINGLE application mode
When user clicks on map
Then exactly one stamp instance SHALL be placed at click position
And user SHALL be able to adjust position, rotation, scale

#### Scenario: Tile across level
Given TILE_LEVEL application mode
When user selects a level and applies
Then stamp SHALL tile across all safe zones in that level
And stamp SHALL NOT appear in other levels

#### Scenario: Scatter placement
Given SCATTER application mode with count N
When user defines an area and applies
Then N stamp instances SHALL be placed randomly
And all instances SHALL respect ramp protection

#### Scenario: Paint mode
Given PAINT application mode with brush
When user drags across terrain
Then stamps SHALL be applied along brush path
And density SHALL be controlled by brush spacing setting

---

### Requirement: Non-Destructive Workflow

The system SHALL support non-destructive detail application.

#### Scenario: Toggle detail off
Given detail stamps applied to heightmap
When user toggles "Detail Layer" off
Then heightmap SHALL revert to pre-detail state
And toggle on SHALL restore detail

#### Scenario: Adjust intensity after application
Given detail stamps applied with intensity X
When user changes intensity to Y
Then all detail SHALL update to new intensity
And no re-application SHALL be required

#### Scenario: Remove individual stamps
Given multiple detail stamps applied
When user selects and deletes one stamp
Then only that stamp's effect SHALL be removed
And other stamps SHALL remain unchanged

---

### Requirement: Performance

The system SHALL maintain acceptable performance during detail operations.

#### Scenario: Application performance
Given a 1024x1024 heightmap
When tiling a 256x256 detail stamp across entire map
Then application SHALL complete in < 100ms

#### Scenario: Preview performance
Given detail stamp selected for placement
When user moves stamp preview across map
Then preview SHALL update at ≥ 30fps

#### Scenario: Large stamp handling
Given a detail stamp larger than 512x512
When imported
Then system SHALL offer to downscale for performance
And SHALL warn about memory usage

---

### Requirement: Stamp Library Management

The system SHALL provide organized stamp library management.

#### Scenario: Category organization
Given multiple detail stamps imported
When viewing stamp library
Then stamps SHALL be organized by category
And user SHALL be able to filter by category

#### Scenario: Search functionality
Given a stamp library with many stamps
When user searches by name
Then matching stamps SHALL be displayed
And search SHALL be case-insensitive

#### Scenario: Favorites
Given any detail stamp
When user marks as favorite
Then stamp SHALL appear in favorites section
And favorites SHALL persist across sessions

#### Scenario: Custom categories
Given default categories
When user creates custom category
Then new category SHALL be available for assignment
And SHALL persist across sessions

---

## Data Structures

### DetailStamp

```typescript
interface DetailStamp {
    id: string;
    name: string;
    category: DetailStampCategory;
    heightData: Float32Array;
    width: number;
    height: number;
    detail: DetailStampConfig;
    source: DetailStampSource;
    favorite: boolean;
    tags: string[];
    created: Date;
    modified: Date;
}

interface DetailStampConfig {
    maxAmplitude: number;      // 0.001 - 0.01 (0.1% - 1%)
    recommendedTileSize: number;
    tileable: boolean;
    blendMode: BlendMode;
}

interface DetailStampSource {
    tool: SourceTool;
    author?: string;
    license?: string;
    originalFile?: string;
}

type SourceTool = 'nano_banana' | 'gaea' | 'world_machine' | 'hand_painted' | 'custom';
type BlendMode = 'add' | 'multiply' | 'overlay' | 'max' | 'min';
```

### DetailApplication

```typescript
interface DetailApplication {
    id: string;
    stampId: string;
    mode: ApplicationMode;
    intensity: number;         // 0-1
    scale: number;             // 0.5-2.0
    rotation: number;          // 0-360 degrees
    position?: Vec2;           // For SINGLE mode
    area?: BoundingBox;        // For TILE/SCATTER modes
    levelId?: number;          // For TILE_LEVEL mode
    count?: number;            // For SCATTER mode
    randomRotation: boolean;
    randomScale: boolean;
    scaleVariation: number;    // 0-0.5
}

type ApplicationMode = 'single' | 'tile_level' | 'tile_map' | 'scatter' | 'paint';
```

---

## Export Format

Detail stamps are stored as `.detailstamp` files (JSON + binary):

```typescript
interface DetailStampFile {
    version: 1;
    metadata: {
        id: string;
        name: string;
        category: string;
        width: number;
        height: number;
        detail: DetailStampConfig;
        source: DetailStampSource;
    };
    // Binary height data follows JSON header
    // Format: Float32Array, row-major order
}
```

---

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ Detail Stamps                                          [+]  │
├─────────────────────────────────────────────────────────────┤
│ [Search...                                    ] [Category ▼]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│ │rock │ │rock │ │dirt │ │dirt │ │grass│ │sand │           │
│ │ 01  │ │ 02  │ │ 01  │ │ 02  │ │ 01  │ │ 01  │           │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │
├─────────────────────────────────────────────────────────────┤
│ Selected: rock_rough_01                                     │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Mode: [Single ▼] [Tile Level ▼] [Scatter] [Paint]    │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ Intensity: [████████░░] 80%                           │  │
│ │ Scale:     [█████░░░░░] 100%                          │  │
│ │ Rotation:  [░░░░░░░░░░] 0° [x] Random                 │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ Target Level: [Level 1 ▼]                             │  │
│ │ Amplitude: ±2.5 units (0.5% of level height)          │  │
│ └───────────────────────────────────────────────────────┘  │
│                                          [Apply to Level]   │
└─────────────────────────────────────────────────────────────┘
```
