# Preview Navigation and Camera Controls

## Overview

The preview system provides basic navigation controls to inspect the generated map from different angles and zoom levels. This allows users to verify that the terrain looks good before exporting.

## Camera Controls

### Three.js OrbitControls

The preview uses **Three.js OrbitControls** for camera manipulation:

```typescript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface CameraControls {
  orbit: OrbitControls;        // Orbit controls instance
  camera: PerspectiveCamera;   // Camera instance
  scene: Scene;                // Scene instance
}
```

### Control Types

1. **Orbit (Rotation)**
   - Rotate camera around the map
   - View from different angles
   - Inspect terrain from all sides

2. **Pan (Translation)**
   - Move camera horizontally/vertically
   - Navigate across the map
   - Focus on specific areas

3. **Zoom**
   - Zoom in/out
   - Get close-up view of details
   - Overview of entire map

## Mouse Controls

### Left Mouse Button - Orbit

- **Click + Drag**: Rotate camera around the map
- **Rotation Axis**: Vertical (up/down) and horizontal (left/right)
- **Smooth Rotation**: Interpolated for smooth movement

```typescript
// Orbit controls configuration
controls.enableRotate = true;
controls.rotateSpeed = 1.0;
controls.minPolarAngle = 0;      // Can look straight down
controls.maxPolarAngle = Math.PI; // Can look straight up
```

### Right Mouse Button - Pan

- **Click + Drag**: Pan camera horizontally/vertically
- **Movement**: Camera moves in X/Y plane
- **Boundaries**: Constrained to map bounds

```typescript
// Pan controls configuration
controls.enablePan = true;
controls.panSpeed = 1.0;
controls.screenSpacePanning = false; // Pan in world space
```

### Mouse Wheel - Zoom

- **Scroll Up**: Zoom in
- **Scroll Down**: Zoom out
- **Zoom Speed**: Configurable
- **Zoom Limits**: Min/max distance constraints

```typescript
// Zoom controls configuration
controls.enableZoom = true;
controls.zoomSpeed = 1.2;
controls.minDistance = 100;   // Minimum zoom distance
controls.maxDistance = 5000;  // Maximum zoom distance
```

## Touch Controls (Mobile/Tablet)

### Single Touch - Pan

- **Touch + Drag**: Pan camera
- **Movement**: Same as right mouse button pan

### Two Finger Pinch - Zoom

- **Pinch In**: Zoom out
- **Pinch Out**: Zoom in
- **Gesture Recognition**: Standard pinch-to-zoom

### Two Finger Rotate - Orbit

- **Rotate Gesture**: Rotate camera
- **Rotation**: Around center point

## Keyboard Controls (Optional)

```typescript
interface KeyboardControls {
  'Arrow Up': 'panUp';
  'Arrow Down': 'panDown';
  'Arrow Left': 'panLeft';
  'Arrow Right': 'panRight';
  '+': 'zoomIn';
  '-': 'zoomOut';
  'R': 'resetCamera';
  'F': 'fitToView';
}
```

## Camera Presets

### Default View

```typescript
const DEFAULT_CAMERA = {
  position: [mapWidth / 2, mapHeight / 2, mapHeight * 1.5],
  target: [mapWidth / 2, mapHeight / 2, 0],
  fov: 45,
};
```

### Top-Down View

```typescript
const TOP_DOWN_CAMERA = {
  position: [mapWidth / 2, mapHeight / 2, mapHeight * 2],
  target: [mapWidth / 2, mapHeight / 2, 0],
  rotation: [0, 0, 0], // Looking straight down
};
```

### Isometric View

```typescript
const ISOMETRIC_CAMERA = {
  position: [mapWidth * 0.7, mapHeight * 0.7, mapHeight * 1.2],
  target: [mapWidth / 2, mapHeight / 2, 0],
  rotation: [Math.PI / 6, Math.PI / 4, 0], // 30° elevation, 45° rotation
};
```

### Side View

```typescript
const SIDE_CAMERA = {
  position: [mapWidth / 2, 0, mapHeight / 2],
  target: [mapWidth / 2, mapHeight / 2, 0],
  rotation: [0, Math.PI / 2, 0], // Looking from side
};
```

## Camera Reset

### Reset to Default

```typescript
function resetCamera(): void {
  camera.position.set(
    mapWidth / 2,
    mapHeight / 2,
    mapHeight * 1.5
  );
  controls.target.set(mapWidth / 2, mapHeight / 2, 0);
  controls.update();
}
```

### Fit to View

```typescript
function fitToView(): void {
  // Calculate bounding box of visible content
  const box = calculateBoundingBox();
  
  // Calculate camera position to fit box
  const distance = calculateFitDistance(box, camera.fov);
  
  camera.position.set(
    box.center.x,
    box.center.y,
    box.center.z + distance
  );
  controls.target.set(box.center.x, box.center.y, box.center.z);
  controls.update();
}
```

## Navigation Features

### Smooth Transitions

```typescript
interface CameraTransition {
  from: CameraState;
  to: CameraState;
  duration: number;        // Transition duration in ms
  easing: EasingFunction; // Easing function
}

function animateCamera(transition: CameraTransition): Promise<void> {
  // Smoothly animate camera from current to target state
  return new Promise((resolve) => {
    // Animation logic
    resolve();
  });
}
```

### Focus on Point

```typescript
function focusOnPoint(point: Point2D, zoom?: number): void {
  const targetPosition = {
    x: point.x,
    y: point.y,
    z: 0,
  };
  
  // Animate camera to focus on point
  animateCamera({
    from: getCurrentCameraState(),
    to: {
      position: [point.x, point.y, zoom || mapHeight * 0.5],
      target: targetPosition,
    },
    duration: 500,
    easing: easeInOutCubic,
  });
}
```

### Follow Stamp/Feature

```typescript
function focusOnStamp(stampId: string): void {
  const stamp = getStamp(stampId);
  const center = calculateStampCenter(stamp);
  
  focusOnPoint(center, mapHeight * 0.3); // Closer zoom for stamps
}
```

## View Modes

### 2.5D View (Default)

- Perspective camera
- Heightmap rendered as 3D plane
- Depth perception
- Can rotate and inspect from angles

### Top-Down View

- Orthographic camera
- Looking straight down
- No perspective distortion
- Good for precise editing

### Isometric View

- Fixed isometric angle
- Good for overview
- Consistent scale
- No perspective distortion

### Free View

- Full 3D navigation
- Any angle
- Any zoom level
- Maximum flexibility

## Performance Optimization

### LOD Based on Zoom

```typescript
function updateLOD(cameraDistance: number): void {
  if (cameraDistance > 2000) {
    // Far: Low detail
    heightmapLOD = 0.25; // 1/4 resolution
  } else if (cameraDistance > 1000) {
    // Medium: Medium detail
    heightmapLOD = 0.5; // 1/2 resolution
  } else {
    // Close: Full detail
    heightmapLOD = 1.0; // Full resolution
  }
}
```

### Frustum Culling

```typescript
function updateVisibleObjects(): void {
  const frustum = new THREE.Frustum();
  frustum.setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    )
  );
  
  // Only render objects in frustum
  scene.children.forEach((child) => {
    child.visible = frustum.containsPoint(child.position);
  });
}
```

## UI Controls

### Navigation Toolbar

```typescript
interface NavigationToolbar {
  // Camera presets
  topDownButton: Button;
  isometricButton: Button;
  sideViewButton: Button;
  
  // Navigation
  resetButton: Button;
  fitToViewButton: Button;
  
  // Zoom controls
  zoomInButton: Button;
  zoomOutButton: Button;
  zoomSlider: Slider;
  
  // View mode
  viewModeSelector: Dropdown; // 2.5D, Top-Down, Isometric, Free
}
```

### On-Screen Controls

- **Zoom Slider**: Visual zoom control
- **Compass**: Shows current camera rotation
- **Mini Map**: Overview of current view position
- **Coordinates Display**: Shows camera position and target

## Implementation

### Three.js Setup

```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

class PreviewRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  
  constructor(container: HTMLElement) {
    // Scene
    this.scene = new THREE.Scene();
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,                                    // FOV
      container.clientWidth / container.clientHeight, // Aspect
      1,                                     // Near
      10000                                  // Far
    );
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);
    
    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.setupControls();
    
    // Lighting
    this.setupLighting();
    
    // Animation loop
    this.animate();
  }
  
  private setupControls(): void {
    // Enable all controls
    this.controls.enableRotate = true;
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
    
    // Configure limits
    this.controls.minDistance = 100;
    this.controls.maxDistance = 5000;
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;
    
    // Smooth damping
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
  }
  
  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1000, 2000, 1000);
    this.scene.add(directionalLight);
  }
  
  private animate(): void {
    requestAnimationFrame(() => this.animate());
    
    // Update controls
    this.controls.update();
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }
  
  resetCamera(): void {
    this.camera.position.set(
      this.mapWidth / 2,
      this.mapHeight / 2,
      this.mapHeight * 1.5
    );
    this.controls.target.set(
      this.mapWidth / 2,
      this.mapHeight / 2,
      0
    );
    this.controls.update();
  }
  
  fitToView(): void {
    // Calculate bounding box
    const box = this.calculateBoundingBox();
    
    // Fit camera to box
    const distance = this.calculateFitDistance(box);
    this.camera.position.set(
      box.center.x,
      box.center.y,
      box.center.z + distance
    );
    this.controls.target.set(box.center.x, box.center.y, box.center.z);
    this.controls.update();
  }
}
```

## API Endpoints

### GET /api/preview/camera

Get current camera state.

**Response:**
```json
{
  "position": [512, 512, 768],
  "target": [512, 512, 0],
  "rotation": [0.5, 0.3, 0],
  "zoom": 1.0
}
```

### POST /api/preview/camera

Set camera state.

**Request:**
```json
{
  "position": [512, 512, 768],
  "target": [512, 512, 0],
  "animate": true,
  "duration": 500
}
```

### POST /api/preview/camera/reset

Reset camera to default.

### POST /api/preview/camera/fit

Fit camera to view all content.

### POST /api/preview/camera/focus

Focus camera on specific point.

**Request:**
```json
{
  "x": 512,
  "y": 512,
  "zoom": 0.5
}
```

## User Experience

### Smooth Interaction

- **Damping**: Smooth camera movement
- **Interpolation**: Smooth transitions between states
- **Responsive**: 60 FPS target

### Visual Feedback

- **Cursor Changes**: Different cursors for different actions
- **Highlighting**: Highlight objects under cursor
- **Grid Overlay**: Optional grid for reference
- **Coordinates**: Show world coordinates

### Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Touch Support**: Mobile/tablet support
- **Screen Reader**: ARIA labels for controls
- **High Contrast**: Option for high contrast mode

## Best Practices

1. **Smooth Controls**: Use damping for smooth movement
2. **Reasonable Limits**: Set min/max zoom and rotation limits
3. **Performance**: Use LOD based on camera distance
4. **Feedback**: Provide visual feedback for all interactions
5. **Presets**: Offer common camera presets for quick access



