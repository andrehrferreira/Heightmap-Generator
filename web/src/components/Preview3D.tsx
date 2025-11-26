import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useGenerator } from '../context/GeneratorContext';

export const Preview3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { result } = useGenerator();
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const terrainRef = useRef<THREE.Mesh | null>(null);
  const poisRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      10000
    );
    camera.position.set(300, 400, 300);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 50;
    controls.maxDistance = 2000;
    controls.maxPolarAngle = Math.PI / 2.1;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(200, 400, 100);
    scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(500, 50, 0x30363d, 0x21262d);
    scene.add(gridHelper);

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!result || !sceneRef.current) return;

    const scene = sceneRef.current;
    const grid = result.grid;

    if (terrainRef.current) {
      scene.remove(terrainRef.current);
      terrainRef.current.geometry.dispose();
      (terrainRef.current.material as THREE.Material).dispose();
    }

    poisRef.current.forEach((mesh) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    poisRef.current = [];

    const rows = grid.getRows();
    const cols = grid.getCols();

    const geometry = new THREE.PlaneGeometry(
      cols,
      rows,
      Math.min(cols - 1, 256),
      Math.min(rows - 1, 256)
    );
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors: number[] = [];

    const segmentsX = Math.min(cols - 1, 256);
    const segmentsY = Math.min(rows - 1, 256);

    for (let i = 0; i <= segmentsY; i++) {
      for (let j = 0; j <= segmentsX; j++) {
        const x = Math.floor((j / segmentsX) * (cols - 1));
        const y = Math.floor((i / segmentsY) * (rows - 1));
        const cell = grid.getCell(x, y);
        
        const index = i * (segmentsX + 1) + j;
        const height = cell.height / 10;
        positions.setY(index, height);

        let r = 0.2, g = 0.3, b = 0.2;

        if (cell.flags.road) {
          r = 0.82; g = 0.6; b = 0.13;
        } else if (cell.flags.water) {
          r = 0.22; g = 0.77; b = 0.81;
        } else {
          const levelColors = [
            [0.25, 0.73, 0.31],
            [0.35, 0.65, 1.0],
            [0.64, 0.44, 0.97],
            [0.97, 0.32, 0.29],
          ];
          const colorIdx = Math.min(cell.levelId, levelColors.length - 1);
          [r, g, b] = levelColors[Math.max(0, colorIdx)];
        }

        colors.push(r, g, b);
      }
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.position.set(-cols / 2, 0, -rows / 2);
    scene.add(terrain);
    terrainRef.current = terrain;

    if (result.roadNetwork?.pois) {
      const poiGeometry = new THREE.SphereGeometry(3, 16, 16);
      const poiMaterial = new THREE.MeshBasicMaterial({ color: 0xf85149 });

      for (const poi of result.roadNetwork.pois) {
        const poiMesh = new THREE.Mesh(poiGeometry, poiMaterial);
        const cell = grid.getCell(poi.x, poi.y);
        poiMesh.position.set(
          poi.x - cols / 2,
          cell.height / 10 + 5,
          poi.y - rows / 2
        );
        scene.add(poiMesh);
        poisRef.current.push(poiMesh);
      }
    }

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
    }
  }, [result]);

  return (
    <div className="w-full h-full" ref={containerRef}>
      {!result && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-background to-card">
          <div className="text-xl font-semibold text-muted-foreground mb-2">3D Preview</div>
          <div className="text-sm text-muted-foreground">Click "Generate Heightmap" to create terrain</div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 px-3 py-2 bg-card/90 rounded-md text-xs text-muted-foreground">
        <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono mx-0.5">LMB</kbd> Rotate
        <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono mx-0.5 ml-2">RMB</kbd> Pan
        <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono mx-0.5 ml-2">Scroll</kbd> Zoom
      </div>
    </div>
  );
};
