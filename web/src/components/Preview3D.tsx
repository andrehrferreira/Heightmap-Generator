import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useGenerator } from '../context/GeneratorContext';
import { StandardTerrainRenderer } from '../lib/gpu/GPUTerrainRenderer';

// WebGPU is still experimental in Three.js - use WebGL for now
// WebGPU support can be added when Three.js stabilizes the API
const WEBGPU_ENABLED = false; // Set to true when WebGPU is ready

// Maximum segments for real-time preview - higher = more detail
const MAX_PREVIEW_SEGMENTS = 1024; // High resolution for detailed terrain

// Camera state storage key
const CAMERA_KEY = 'heightmap-generator-camera';

interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

export const Preview3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { result, isRestored, setStatus, config } = useGenerator();
  const [isInitialized, setIsInitialized] = useState(false);
  const [renderStats, setRenderStats] = useState<{ fps: number; triangles: number } | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const terrainRendererRef = useRef<StandardTerrainRenderer | null>(null);
  const poisRef = useRef<THREE.Mesh[]>([]);
  const animationRef = useRef<number>(0);
  const cameraUpdateTimeoutRef = useRef<number | null>(null);
  const fpsCounterRef = useRef<{ frames: number; lastTime: number }>({ frames: 0, lastTime: 0 });
  const lastFrameTimeRef = useRef<number>(0);
  const maxFPSRef = useRef<number>(30);

  // Save camera state
  const saveCameraState = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      const state: CameraState = {
        position: {
          x: cameraRef.current.position.x,
          y: cameraRef.current.position.y,
          z: cameraRef.current.position.z,
        },
        target: {
          x: controlsRef.current.target.x,
          y: controlsRef.current.target.y,
          z: controlsRef.current.target.z,
        },
      };
      localStorage.setItem(CAMERA_KEY, JSON.stringify(state));
    }
  }, []);

  // Restore camera state
  const restoreCameraState = useCallback((): boolean => {
    try {
      const saved = localStorage.getItem(CAMERA_KEY);
      if (saved && cameraRef.current && controlsRef.current) {
        const state: CameraState = JSON.parse(saved);
        cameraRef.current.position.set(state.position.x, state.position.y, state.position.z);
        controlsRef.current.target.set(state.target.x, state.target.y, state.target.z);
        controlsRef.current.update();
        return true;
      }
    } catch (e) {
      console.warn('Failed to restore camera state');
    }
    return false;
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    console.time('[WebGL] Scene initialization');

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera - positioned for epic open world view
    const camera = new THREE.PerspectiveCamera(60, width / height, 50, 500000);
    camera.position.set(12000, 8000, 12000);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // WebGL Renderer with optimizations
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.info.autoReset = false;
    
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls - adjusted for epic open world
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 500;
    controls.maxDistance = 60000;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 200, 0);
    controlsRef.current = controls;

    // Save camera on control changes (debounced)
    controls.addEventListener('change', () => {
      if (cameraUpdateTimeoutRef.current) {
        clearTimeout(cameraUpdateTimeoutRef.current);
      }
      cameraUpdateTimeoutRef.current = window.setTimeout(saveCameraState, 300);
    });

    // Lighting - enhanced for epic terrain
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5000, 10000, 5000);
    scene.add(directionalLight);

    // Secondary light for better shadows
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-3000, 5000, -3000);
    scene.add(fillLight);

    // Infinite grid using GridHelper with massive size
    const gridHelper = new THREE.GridHelper(50000, 200, 0x333333, 0x222222);
    gridHelper.position.y = -5; // Slightly below terrain base
    scene.add(gridHelper);

    // Create terrain renderer with massive open world scale
    // terrainSize: size in world units (like meters)
    // heightScale: vertical exaggeration for dramatic terrain
    terrainRendererRef.current = new StandardTerrainRenderer({
      terrainSize: 16000,  // 16km x 16km terrain - massive open world
      segments: MAX_PREVIEW_SEGMENTS,
      heightScale: 800,    // Dramatic height for epic mountains
    });

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      if (newWidth > 0 && newHeight > 0) {
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation loop with FPS counter and FPS limit
    const animate = (currentTime: number) => {
      animationRef.current = requestAnimationFrame(animate);
      
      // FPS limiting: calculate minimum time between frames
      const maxFPS = maxFPSRef.current || 30;
      const minFrameTime = 1000 / maxFPS; // milliseconds per frame
      const elapsed = currentTime - lastFrameTimeRef.current;
      
      if (elapsed >= minFrameTime) {
        lastFrameTimeRef.current = currentTime - (elapsed % minFrameTime);
        
        controls.update();
        renderer.info.reset();
        renderer.render(scene, camera);

        // Update FPS counter
        fpsCounterRef.current.frames++;
        if (currentTime - fpsCounterRef.current.lastTime >= 1000) {
          setRenderStats({
            fps: fpsCounterRef.current.frames,
            triangles: renderer.info.render.triangles,
          });
          fpsCounterRef.current.frames = 0;
          fpsCounterRef.current.lastTime = currentTime;
        }
      }
    };
    
    animate(performance.now());

    console.timeEnd('[WebGL] Scene initialization');

    setIsInitialized(true);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationRef.current);
      controls.dispose();
      renderer.dispose();
      terrainRendererRef.current?.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [saveCameraState]);

  // Update maxFPS ref when config changes
  useEffect(() => {
    maxFPSRef.current = config.maxFPS || 30;
  }, [config.maxFPS]);

  // Update terrain when result changes
  useEffect(() => {
    if (!result || !sceneRef.current || !isInitialized || !terrainRendererRef.current) {
      return;
    }

    console.time('[WebGL] Terrain update');

    const scene = sceneRef.current;
    const grid = result.grid;

    if (!grid || typeof grid.getCols !== 'function') {
      console.error('Invalid grid object:', grid);
      return;
    }

    // Remove old terrain mesh
    const oldMesh = terrainRendererRef.current.getMesh();
    if (oldMesh && oldMesh.parent) {
      scene.remove(oldMesh);
    }

    // Remove old POIs
    poisRef.current.forEach((mesh) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    poisRef.current = [];

    // Get height stats
    const heightStats = result.heightStats || { minHeight: 0, maxHeight: 100 };

    // Create new terrain using optimized renderer
    const terrainMesh = terrainRendererRef.current.createFromGrid(grid, heightStats);
    scene.add(terrainMesh);

    const gridWidth = grid.getCols();
    const gridHeight = grid.getRows();
    const terrainSize = 16000;   // Epic open world (16km)
    const heightScale = 800;     // Epic height for mountains

    // Add POIs - scaled for epic open world
    if (result.roadNetwork?.pois && Array.isArray(result.roadNetwork.pois)) {
      const poiGeometry = new THREE.SphereGeometry(150, 16, 16); // Epic POI markers for visibility
      const poiMaterial = new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.9 });

      const heightRange = heightStats.maxHeight - heightStats.minHeight || 1;

      for (const poi of result.roadNetwork.pois) {
        // Validate POI coordinates are within grid bounds
        if (poi.x < 0 || poi.x >= gridWidth || poi.y < 0 || poi.y >= gridHeight) {
          console.warn(`POI (${poi.x}, ${poi.y}) out of bounds, skipping`);
          continue;
        }

        const poiMesh = new THREE.Mesh(poiGeometry, poiMaterial);

        const px = (poi.x / gridWidth - 0.5) * terrainSize;
        const pz = (poi.y / gridHeight - 0.5) * terrainSize;
        const cell = grid.getCell(poi.x, poi.y);
        const py = cell
          ? ((cell.height - heightStats.minHeight) / heightRange) * heightScale + 200
          : 200;

        poiMesh.position.set(px, py, pz);
        scene.add(poiMesh);
        poisRef.current.push(poiMesh);
      }
    }

    // Update controls
    if (controlsRef.current) {
      controlsRef.current.update();
    }

    console.timeEnd('[WebGL] Terrain update');
    setStatus(`Rendered ${grid.getCols()}×${grid.getRows()} terrain`, 'success');
  }, [result, isInitialized, setStatus]);

  // Dedicated effect for camera state restoration
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || !isInitialized) {
      return;
    }

    // Try to restore camera from localStorage
    const restored = restoreCameraState();
    
    if (!restored) {
      // Set default camera position only if no saved state
      console.log('[Camera] No saved state, using defaults');
      cameraRef.current.position.set(12000, 6000, 12000);
      controlsRef.current.target.set(0, 200, 0);
    } else {
      console.log('[Camera] Restored from localStorage');
    }
    
    controlsRef.current.update();
  }, [isInitialized, restoreCameraState]);

  // Resolution info
  const getResolutionInfo = () => {
    if (!result?.grid) return null;
    const w = result.grid.getCols();
    const h = result.grid.getRows();
    const maxDim = Math.max(w, h);
    const isDownsampled = maxDim > MAX_PREVIEW_SEGMENTS;
    return { w, h, isDownsampled, factor: Math.ceil(maxDim / MAX_PREVIEW_SEGMENTS) };
  };

  const resInfo = getResolutionInfo();

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      {!result && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-background to-card z-10">
          <div className="text-xl font-semibold text-muted-foreground mb-2">3D Preview</div>
          <div className="text-sm text-muted-foreground">Click "Generate Heightmap" to create terrain</div>
        </div>
      )}

      {resInfo && (
        <div className="absolute top-4 right-4 px-3 py-2 bg-card/90 rounded-md text-xs z-10">
          <div className="text-muted-foreground">
            Source: <span className="text-foreground font-mono">{resInfo.w}×{resInfo.h}</span>
          </div>
          {resInfo.isDownsampled && (
            <div className="text-yellow-500 mt-1">
              Preview: {Math.ceil(resInfo.w / resInfo.factor)}×{Math.ceil(resInfo.h / resInfo.factor)}
              <span className="text-muted-foreground ml-1">({resInfo.factor}× downsample)</span>
            </div>
          )}
          {renderStats && (
            <div className="text-green-500 mt-1">
              {renderStats.fps} FPS • {(renderStats.triangles / 1000).toFixed(1)}k tris
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-4 left-4 px-3 py-2 bg-card/90 rounded-md text-xs text-muted-foreground z-10">
        <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono mx-0.5">LMB</kbd> Rotate
        <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono mx-0.5 ml-2">RMB</kbd> Pan
        <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono mx-0.5 ml-2">Scroll</kbd> Zoom
      </div>
    </div>
  );
};
