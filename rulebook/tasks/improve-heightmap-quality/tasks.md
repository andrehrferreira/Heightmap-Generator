# Tasks: Improve Heightmap Quality

## Progress: 64% (21/33 tasks complete)

---

## 1. Continuous Height Base 🔥🔥🔥 (High Priority)
- [x] 1.1 Remove discrete level quantization from GPU shader <!-- implemented: soft boundaries -->
- [x] 1.2 Implement smooth gradient blending between height regions <!-- smoothstep transitions -->
- [x] 1.3 Add continuous height normalization <!-- implemented in HEIGHTMAP_FRAG -->
- [x] 1.4 Update level assignment to use soft boundaries <!-- LEVEL_FRAG updated -->

## 2. Advanced Noise System
- [x] 2.1 Implement ridged multifractal noise in GLSL (multi-octave) <!-- ridgedMultifractal() -->
- [x] 2.2 Add billow noise function <!-- billowNoise() -->
- [x] 2.3 Implement multi-pass domain warping (cascade warping) <!-- warp() with 2 passes -->
- [x] 2.4 Add Voronoi noise for geological features (ridges, cracks, mountain ranges) <!-- voronoi(), voronoiEdges() -->
- [x] 2.5 Create noise blending system with configurable weights <!-- 6-layer system in HEIGHTMAP_FRAG -->
- [x] 2.6 Add UI controls for noise parameters <!-- Erosion + Detail accordions in Sidebar -->

## 3. Hydraulic Erosion 🔥🔥🔥 (High Priority)
- [x] 3.1 Implement rain droplet simulation <!-- EROSION_FRAG shader (prepared) -->
- [ ] 3.2 Create water flow accumulation map <!-- Track water accumulation from multiple sources -->
- [x] 3.3 Implement sediment pickup based on velocity <!-- capacity-based erosion -->
- [x] 3.4 Add sediment deposition in slow-moving areas <!-- deposition logic -->
- [ ] 3.5 Create valley carving effect <!-- Deep valleys from repeated water flow -->
- [ ] 3.6 Implement river carving system <!-- River bed formation from water channels -->
- [x] 3.7 Add erosion iteration controls to UI <!-- Sidebar Erosion accordion -->

## 4. Thermal Erosion 🔥🔥 (Medium Priority)
- [x] 4.1 Implement talus angle calculation <!-- THERMAL_EROSION_FRAG -->
- [x] 4.2 Create slope collapse simulation <!-- 8-neighbor sampling -->
- [x] 4.3 Add material redistribution <!-- erosionStrength control -->
- [x] 4.4 Implement cliff formation logic <!-- integrated in pipeline -->

## 5. Detail Enhancement
- [x] 5.1 Add micro-noise overlay at 3 scales (macro, meso, micro) <!-- DETAIL_OVERLAY_FRAG -->
- [ ] 5.2 Implement coastal/beach erosion effects <!-- Coastal weathering and beach formation -->
- [ ] 5.3 Create river bed carving system <!-- Dedicated river channel carving -->
- [x] 5.4 Add detail intensity controls to UI <!-- Sidebar Detail Enhancement accordion -->

## 6. Sediment Deposition 🔥🔥🔥 (High Priority)
- [x] 6.1 Basic sediment deposition in slow areas <!-- Already in 3.4 -->
- [ ] 6.2 Implement sediment layer accumulation <!-- Build up sediment over time -->
- [ ] 6.3 Add sediment-based height adjustment <!-- Modify terrain based on sediment thickness -->
- [ ] 6.4 Create delta formation at water outlets <!-- River deltas and alluvial fans -->

## 7. Testing & Documentation
- [ ] 7.1 Add visual comparison tests
- [ ] 7.2 Update documentation with new features
- [ ] 7.3 Add performance benchmarks
- [ ] 7.4 Create preset configurations for different quality levels
