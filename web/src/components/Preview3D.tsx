import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useGenerator } from '../context/GeneratorContext';

// Maximum segments for real-time preview (balance quality vs performance)
const MAX_PREVIEW_SEGMENTS = 256; // Higher = better quality but slower

// Camera state storage key
const CAMERA_KEY = 'heightmap-generator-camera';

interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

export const Preview3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { result, isRestored } = useGenerator();
  const [isInitialized, setIsInitialized] = useState(false);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const terrainRef = useRef<THREE.Mesh | null>(null);
  const poisRef = useRef<THREE.Mesh[]>([]);
  const animationRef = useRef<number>(0);
  const hasSetInitialCamera = useRef<boolean>(false);
  const cameraUpdateTimeoutRef = useRef<number | null>(null);

  // Save camera state
  const saveCameraState = () => {
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
  };

  // Restore camera state
  const restoreCameraState = (): boolean => {
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
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    console.log('Initializing Three.js scene...');

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
    camera.position.set(200, 150, 200);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 1000;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Save camera on control changes (debounced)
    controls.addEventListener('change', () => {
      if (cameraUpdateTimeoutRef.current) {
        clearTimeout(cameraUpdateTimeoutRef.current);
      }
      cameraUpdateTimeoutRef.current = window.setTimeout(saveCameraState, 300);
    });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(100, 200, 100);
    scene.add(directionalLight);

    // Grid helper for debugging
    const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x333333);
    scene.add(gridHelper);

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      if (newWidth > 0 && newHeight > 0) {
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver for container resize
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    setIsInitialized(true);
    console.log('Three.js scene initialized');

    return () => {
      console.log('Cleaning up Three.js scene');
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationRef.current);
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update terrain when result changes
  useEffect(() => {
    if (!result || !sceneRef.current || !isInitialized) {
      console.log('Skipping terrain update:', { hasResult: !!result, hasScene: !!sceneRef.current, isInitialized });
      return;
    }

    console.log('Updating terrain with result:', result);

    const scene = sceneRef.current;
    const grid = result.grid;

    if (!grid || typeof grid.getCols !== 'function') {
      console.error('Invalid grid object:', grid);
      return;
    }

    // Cleanup old terrain
    if (terrainRef.current) {
      scene.remove(terrainRef.current);
      terrainRef.current.geometry.dispose();
      (terrainRef.current.material as THREE.Material).dispose();
      terrainRef.current = null;
    }

    poisRef.current.forEach((mesh) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    poisRef.current = [];

    const gridWidth = grid.getCols();
    const gridHeight = grid.getRows();
    
    console.log(`Grid dimensions: ${gridWidth}×${gridHeight}`);

    // Calculate segments (limit for performance)
    const segmentsX = Math.min(gridWidth - 1, MAX_PREVIEW_SEGMENTS - 1);
    const segmentsY = Math.min(gridHeight - 1, MAX_PREVIEW_SEGMENTS - 1);
    
    // Terrain size in 3D space
    const terrainSize = 150;
    
    // Create geometry
    const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, segmentsX, segmentsY);
    geometry.rotateX(-Math.PI / 2);
    
    const positions = geometry.attributes.position.array as Float32Array;
    const vertexCount = (segmentsX + 1) * (segmentsY + 1);
    const colors = new Float32Array(vertexCount * 3);

    // Find height range
    let minH = Infinity, maxH = -Infinity;
    for (let j = 0; j <= segmentsY; j++) {
      for (let i = 0; i <= segmentsX; i++) {
        const gx = Math.min(Math.floor((i / segmentsX) * (gridWidth - 1)), gridWidth - 1);
        const gy = Math.min(Math.floor((j / segmentsY) * (gridHeight - 1)), gridHeight - 1);
        const cell = grid.getCell(gx, gy);
        if (cell && typeof cell.height === 'number') {
          if (cell.height < minH) minH = cell.height;
          if (cell.height > maxH) maxH = cell.height;
        }
      }
    }
    
    console.log(`Height range: ${minH} - ${maxH}`);
    
    const heightRange = maxH - minH || 1;
    // Scale height proportionally to terrain size for natural look
    const heightScale = terrainSize * 0.25; // 25% of terrain width as max height

    // Level colors
    const levelColors = [
      [0.25, 0.73, 0.31], // Green - Level 0
      [0.35, 0.65, 1.0],  // Blue - Level 1
      [0.64, 0.44, 0.97], // Purple - Level 2
      [0.97, 0.32, 0.29], // Red - Level 3+
    ];

    // Apply heights and colors
    for (let j = 0; j <= segmentsY; j++) {
      for (let i = 0; i <= segmentsX; i++) {
        const vertexIndex = j * (segmentsX + 1) + i;
        
        const gx = Math.min(Math.floor((i / segmentsX) * (gridWidth - 1)), gridWidth - 1);
        const gy = Math.min(Math.floor((j / segmentsY) * (gridHeight - 1)), gridHeight - 1);
        const cell = grid.getCell(gx, gy);
        
        if (!cell) continue;
        
        // Set height (Y position)
        const normalizedHeight = (cell.height - minH) / heightRange;
        const y = normalizedHeight * heightScale;
        positions[vertexIndex * 3 + 1] = y;
        
        // Set color
        let r: number, g: number, b: number;
        
        if (cell.flags && cell.flags.road) {
          r = 0.85; g = 0.6; b = 0.15;
        } else if (cell.flags && cell.flags.water) {
          r = 0.2; g = 0.6; b = 0.9;
        } else {
          const colorIdx = Math.min(Math.max(0, cell.levelId || 0), levelColors.length - 1);
          [r, g, b] = levelColors[colorIdx];
        }
        
        colors[vertexIndex * 3] = r;
        colors[vertexIndex * 3 + 1] = g;
        colors[vertexIndex * 3 + 2] = b;
      }
    }

    // Update geometry
    geometry.attributes.position.needsUpdate = true;
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    // Material
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });

    // Create mesh
    const terrain = new THREE.Mesh(geometry, material);
    terrain.position.set(0, 0, 0);
    scene.add(terrain);
    terrainRef.current = terrain;

    console.log('Terrain mesh created and added to scene');

    // Add POIs
    if (result.roadNetwork?.pois && Array.isArray(result.roadNetwork.pois)) {
      const poiGeometry = new THREE.SphereGeometry(2, 16, 16);
      const poiMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444 });

      for (const poi of result.roadNetwork.pois) {
        const poiMesh = new THREE.Mesh(poiGeometry, poiMaterial);
        
        const px = (poi.x / gridWidth - 0.5) * terrainSize;
        const pz = (poi.y / gridHeight - 0.5) * terrainSize;
        const cell = grid.getCell(poi.x, poi.y);
        const py = cell ? ((cell.height - minH) / heightRange) * heightScale + 3 : 3;
        
        poiMesh.position.set(px, py, pz);
        scene.add(poiMesh);
        poisRef.current.push(poiMesh);
      }
      console.log(`Added ${result.roadNetwork.pois.length} POIs`);
    }

    // Update camera only for new generations, not restores
    if (cameraRef.current && controlsRef.current) {
      // Try to restore camera state if this is a restore
      if (isRestored && !hasSetInitialCamera.current) {
        const restored = restoreCameraState();
        if (!restored) {
          // No saved state, set default position
          cameraRef.current.position.set(terrainSize, heightScale + 50, terrainSize);
          controlsRef.current.target.set(0, heightScale / 2, 0);
        }
        hasSetInitialCamera.current = true;
      } else if (!isRestored && !hasSetInitialCamera.current) {
        // New generation - set camera to view the terrain
        cameraRef.current.position.set(terrainSize, heightScale + 50, terrainSize);
        controlsRef.current.target.set(0, heightScale / 2, 0);
        hasSetInitialCamera.current = true;
      }
      // Don't reset camera for subsequent updates
      controlsRef.current.update();
    }
  }, [result, isInitialized, isRestored]);

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
            <div className="text-warning mt-1">
              Preview: {Math.ceil(resInfo.w / resInfo.factor)}×{Math.ceil(resInfo.h / resInfo.factor)}
              <span className="text-muted-foreground ml-1">({resInfo.factor}× downsample)</span>
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
