import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { useGenerator, calculateTerrainSize } from '../context/GeneratorContext';
import { StandardTerrainRenderer } from '../lib/gpu/GPUTerrainRenderer';
import { getNavMeshSystem } from '../lib/NavMeshGenerator';

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
  const { result, isRestored, setStatus, config, viewOptions } = useGenerator();
  const [isInitialized, setIsInitialized] = useState(false);
  const [renderStats, setRenderStats] = useState<{ fps: number; triangles: number } | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const terrainRendererRef = useRef<StandardTerrainRenderer | null>(null);
  const poisRef = useRef<THREE.Mesh[]>([]);
  const navMeshRef = useRef<THREE.Mesh | null>(null);
  const waterRef = useRef<Water | null>(null);
  const skyRef = useRef<Sky | null>(null);
  const sunRef = useRef<THREE.Vector3>(new THREE.Vector3());
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

    // Create ocean water (initially hidden, shown for island/coastal biomes)
    const waterGeometry = new THREE.PlaneGeometry(60000, 60000);
    const water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load(
        'https://threejs.org/examples/textures/waternormals.jpg',
        (texture) => {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }
      ),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: false,
    });
    water.rotation.x = -Math.PI / 2;
    water.position.y = 50; // Sea level height
    water.visible = false; // Hidden by default
    scene.add(water);
    waterRef.current = water;

    // Create sky (for ocean scenes)
    const sky = new Sky();
    sky.scale.setScalar(450000);
    sky.visible = false; // Hidden by default
    scene.add(sky);
    skyRef.current = sky;

    // Sun position for sky/water
    const sun = new THREE.Vector3();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const sceneEnv = new THREE.Scene();

    const updateSun = () => {
      const elevation = 2;
      const azimuth = 180;
      const phi = THREE.MathUtils.degToRad(90 - elevation);
      const theta = THREE.MathUtils.degToRad(azimuth);

      sun.setFromSphericalCoords(1, phi, theta);
      sunRef.current = sun.clone();

      if (skyRef.current) {
        const skyUniforms = skyRef.current.material.uniforms;
        skyUniforms['sunPosition'].value.copy(sun);
      }

      if (waterRef.current) {
        (waterRef.current.material as THREE.ShaderMaterial).uniforms['sunDirection'].value.copy(sun).normalize();
      }

      sceneEnv.environment = pmremGenerator.fromScene(sky as any).texture;
    };

    updateSun();

    // Create terrain renderer - will be configured dynamically based on resolution
    terrainRendererRef.current = new StandardTerrainRenderer({
      terrainSize: 16000,  // Initial size, updated based on config
      segments: MAX_PREVIEW_SEGMENTS,
      heightScale: 800,    // Initial height, updated based on config
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

        // Animate water waves
        if (waterRef.current && waterRef.current.visible) {
          (waterRef.current.material as THREE.ShaderMaterial).uniforms['time'].value += 1.0 / 60.0;
        }

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

    const gridWidth = grid.getCols();
    const gridHeight = grid.getRows();
    
    // Calculate terrain size based on resolution for proper scaling
    const terrainSize = calculateTerrainSize(config.width, config.height);
    const heightScale = config.heightScale;

    // Recreate terrain renderer with updated config
    terrainRendererRef.current.dispose();
    terrainRendererRef.current = new StandardTerrainRenderer({
      terrainSize,
      segments: MAX_PREVIEW_SEGMENTS,
      heightScale,
    });

    // Create new terrain using optimized renderer with proper config
    const terrainMesh = terrainRendererRef.current.createFromGrid(grid, heightStats);
    scene.add(terrainMesh);

    const heightRange = heightStats.maxHeight - heightStats.minHeight || 1;

    // Add road overlay mesh that follows terrain (if enabled)
    if (viewOptions.showRoads && result.roadNetwork?.segments && Array.isArray(result.roadNetwork.segments)) {
      // Road material - dirt/gravel color
      const roadMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8B7355, // Brown/dirt color
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      
      // Road edge/glow
      const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: 0xd4a574, // Lighter edge
        linewidth: 2,
        transparent: true,
        opacity: 0.8 
      });

      const roadWidth = 60; // Width of road in world units

      for (const segment of result.roadNetwork.segments) {
        if (!segment.path || segment.path.length < 2) continue;

        // Build road mesh that follows terrain
        const roadVertices: number[] = [];
        const roadIndices: number[] = [];
        const centerPoints: THREE.Vector3[] = [];
        
        for (let i = 0; i < segment.path.length; i++) {
          const point = segment.path[i];
          if (point.x < 0 || point.x >= gridWidth || point.y < 0 || point.y >= gridHeight) continue;
          
          const px = (point.x / gridWidth - 0.5) * terrainSize;
          const pz = (point.y / gridHeight - 0.5) * terrainSize;
          const cell = grid.getCell(point.x, point.y);
          const py = cell
            ? ((cell.height - heightStats.minHeight) / heightRange) * heightScale + 5 // Slightly above terrain
            : 5;
          
          centerPoints.push(new THREE.Vector3(px, py, pz));
        }

        // Create road strip geometry
        if (centerPoints.length >= 2) {
          for (let i = 0; i < centerPoints.length; i++) {
            const p = centerPoints[i];
            
            // Calculate perpendicular direction
            let dir: THREE.Vector3;
            if (i === 0) {
              dir = new THREE.Vector3().subVectors(centerPoints[1], centerPoints[0]).normalize();
            } else if (i === centerPoints.length - 1) {
              dir = new THREE.Vector3().subVectors(centerPoints[i], centerPoints[i - 1]).normalize();
            } else {
              dir = new THREE.Vector3().subVectors(centerPoints[i + 1], centerPoints[i - 1]).normalize();
            }
            
            const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
            
            // Left and right vertices
            const left = new THREE.Vector3().addVectors(p, perp.clone().multiplyScalar(roadWidth / 2));
            const right = new THREE.Vector3().addVectors(p, perp.clone().multiplyScalar(-roadWidth / 2));
            
            // Sample terrain height at left/right points
            const leftGx = Math.round((left.x / terrainSize + 0.5) * gridWidth);
            const leftGy = Math.round((left.z / terrainSize + 0.5) * gridHeight);
            const rightGx = Math.round((right.x / terrainSize + 0.5) * gridWidth);
            const rightGy = Math.round((right.z / terrainSize + 0.5) * gridHeight);
            
            try {
              const leftCell = grid.getCell(Math.max(0, Math.min(gridWidth - 1, leftGx)), Math.max(0, Math.min(gridHeight - 1, leftGy)));
              const rightCell = grid.getCell(Math.max(0, Math.min(gridWidth - 1, rightGx)), Math.max(0, Math.min(gridHeight - 1, rightGy)));
              left.y = ((leftCell.height - heightStats.minHeight) / heightRange) * heightScale + 5;
              right.y = ((rightCell.height - heightStats.minHeight) / heightRange) * heightScale + 5;
            } catch {
              // Use center height
            }
            
            const baseIdx = roadVertices.length / 3;
            roadVertices.push(left.x, left.y, left.z);
            roadVertices.push(right.x, right.y, right.z);
            
            // Add triangles
            if (i > 0) {
              const prevBase = baseIdx - 2;
              roadIndices.push(prevBase, baseIdx, prevBase + 1);
              roadIndices.push(baseIdx, baseIdx + 1, prevBase + 1);
            }
          }
          
          if (roadVertices.length > 0) {
            const roadGeometry = new THREE.BufferGeometry();
            roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
            roadGeometry.setIndex(roadIndices);
            roadGeometry.computeVertexNormals();
            
            const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
            scene.add(roadMesh);
            poisRef.current.push(roadMesh);
          }
          
          // Add center line
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(centerPoints);
          const centerLine = new THREE.Line(lineGeometry, edgeMaterial);
          centerLine.position.y += 10;
          scene.add(centerLine);
          poisRef.current.push(centerLine);
        }
      }
    }

    // Add POIs - scaled for epic open world with different colors per type (if enabled)
    if (viewOptions.showPOIs && result.roadNetwork?.pois && Array.isArray(result.roadNetwork.pois)) {
      // Different colors for different POI types
      const poiColors: Record<string, number> = {
        'exit': 0x00ff00,    // Green for exits
        'town': 0xff3333,    // Red for towns
        'dungeon': 0x9933ff, // Purple for dungeons
        'portal': 0x00ffff,  // Cyan for portals/ramps
      };

      for (const poi of result.roadNetwork.pois) {
        if (poi.x < 0 || poi.x >= gridWidth || poi.y < 0 || poi.y >= gridHeight) {
          console.warn(`POI (${poi.x}, ${poi.y}) out of bounds, skipping`);
          continue;
        }

        // Get color based on POI type
        const color = poiColors[poi.type] || 0xff3333;
        const isExit = poi.type === 'exit';
        const isRamp = poi.type === 'portal' && poi.id?.includes('ramp');
        
        // Different sizes for different types
        const size = isExit ? 200 : isRamp ? 120 : 150;
        const poiGeometry = new THREE.SphereGeometry(size, 16, 16);
        const poiMaterial = new THREE.MeshBasicMaterial({ 
          color, 
          transparent: true, 
          opacity: 0.9 
        });
        
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
        
        // Add vertical beam for exits (easier to spot)
        if (isExit) {
          const beamGeometry = new THREE.CylinderGeometry(20, 20, 500, 8);
          const beamMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.5 
          });
          const beam = new THREE.Mesh(beamGeometry, beamMaterial);
          beam.position.set(px, py + 250, pz);
          scene.add(beam);
          poisRef.current.push(beam);
        }
      }
    }

    // Update controls
    if (controlsRef.current) {
      controlsRef.current.update();
    }

    console.timeEnd('[WebGL] Terrain update');
    setStatus(`Rendered ${grid.getCols()}×${grid.getRows()} terrain`, 'success');
  }, [result, isInitialized, setStatus, viewOptions.showRoads, viewOptions.showPOIs]);

  // Effect for NavMesh visualization
  useEffect(() => {
    if (!sceneRef.current || !isInitialized) return;

    const scene = sceneRef.current;

    // Remove existing NavMesh
    if (navMeshRef.current) {
      scene.remove(navMeshRef.current);
      if (navMeshRef.current.geometry) navMeshRef.current.geometry.dispose();
      if (navMeshRef.current.material) {
        const mat = navMeshRef.current.material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat.dispose();
      }
      navMeshRef.current = null;
    }

    // Add NavMesh if enabled
    if (viewOptions.showNavMesh && result?.grid) {
      console.log('[Preview3D] Building NavMesh visualization...');
      
      const navMeshSystem = getNavMeshSystem();
      let geometry = navMeshSystem.getGeometry();

      // If no geometry from system, build simple visualization from grid
      if (!geometry || !geometry.getAttribute('position')?.count) {
        console.log('[Preview3D] No NavMesh geometry, creating simple visualization from grid...');
        
        // Create simple walkable area visualization
        const grid = result.grid;
        const cols = grid.getCols();
        const rows = grid.getRows();
        // Use config values for terrain size and height scale
        const terrainSize = calculateTerrainSize(config.width, config.height);
        const heightScale = config.heightScale;
        const resolution = 16; // Sample every 16 cells
        
        // Get height range
        let minH = Infinity, maxH = -Infinity;
        grid.forEachCell((cell: any) => {
          minH = Math.min(minH, cell.height);
          maxH = Math.max(maxH, cell.height);
        });
        const heightRange = maxH - minH || 1;
        
        const vertices: number[] = [];
        const indices: number[] = [];
        const vertexMap = new Map<string, number>();
        
        for (let y = 0; y < rows - resolution; y += resolution) {
          for (let x = 0; x < cols - resolution; x += resolution) {
            const c00 = grid.getCell(x, y);
            const c10 = grid.getCell(x + resolution, y);
            const c01 = grid.getCell(x, y + resolution);
            const c11 = grid.getCell(x + resolution, y + resolution);
            
            // Check if walkable (not blocked, water, or barrier)
            const isWalkable = (c: any) => !c.flags.blocked && !c.flags.water && !c.flags.visualOnly;
            if (!isWalkable(c00) || !isWalkable(c10) || !isWalkable(c01) || !isWalkable(c11)) continue;
            
            const getIdx = (gx: number, gy: number, h: number) => {
              const key = `${gx},${gy}`;
              if (vertexMap.has(key)) return vertexMap.get(key)!;
              
              const idx = vertices.length / 3;
              const px = (gx / cols - 0.5) * terrainSize;
              const py = ((h - minH) / heightRange) * heightScale + 50;
              const pz = (gy / rows - 0.5) * terrainSize;
              vertices.push(px, py, pz);
              vertexMap.set(key, idx);
              return idx;
            };
            
            const i00 = getIdx(x, y, c00.height);
            const i10 = getIdx(x + resolution, y, c10.height);
            const i01 = getIdx(x, y + resolution, c01.height);
            const i11 = getIdx(x + resolution, y + resolution, c11.height);
            
            indices.push(i00, i10, i01);
            indices.push(i10, i11, i01);
          }
        }
        
        if (vertices.length > 0) {
          geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
          geometry.setIndex(indices);
          geometry.computeVertexNormals();
          console.log('[Preview3D] Created simple NavMesh with', vertices.length / 3, 'vertices');
        }
      }

      if (geometry && geometry.getAttribute('position')?.count) {
        const material = new THREE.MeshBasicMaterial({
          color: 0x00ff88,
          wireframe: true,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geometry.clone(), material);
        scene.add(mesh);
        navMeshRef.current = mesh;

        console.log('[NavMesh] Visualization enabled');
      } else {
        console.warn('[NavMesh] Could not create visualization');
      }
    }
  }, [viewOptions.showNavMesh, isInitialized, result]);

  // Effect for ocean and sky (island/coastal biomes)
  useEffect(() => {
    if (!waterRef.current || !skyRef.current || !sceneRef.current) return;

    const isOceanBiome = config.biomeType === 'island' || config.biomeType === 'coastal';
    
    waterRef.current.visible = isOceanBiome;
    skyRef.current.visible = isOceanBiome;

    // Update scene background for ocean biomes
    if (isOceanBiome) {
      // Ocean-like background gradient through sky
      sceneRef.current.background = null; // Let sky render as background
      
      // Adjust water level based on terrain
      const seaLevel = config.biomeType === 'island' ? 100 : 50;
      waterRef.current.position.y = seaLevel;

      console.log(`[Ocean] Enabled for ${config.biomeType} biome at y=${seaLevel}`);
    } else {
      sceneRef.current.background = new THREE.Color(0x1a1a1a);
    }
  }, [config.biomeType]);

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
