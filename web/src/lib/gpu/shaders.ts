/**
 * WebGL Shaders for GPU-accelerated heightmap generation and terrain rendering.
 */

// Vertex shader for terrain with displacement mapping
export const terrainVertexShader = `
  uniform sampler2D heightMap;
  uniform float heightScale;
  uniform float heightOffset;
  
  varying vec2 vUv;
  varying float vHeight;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    
    // Sample height from texture
    float height = texture2D(heightMap, uv).r;
    vHeight = height;
    
    // Displace vertex position
    vec3 displaced = position;
    displaced.y = height * heightScale + heightOffset;
    
    // Calculate normal from neighboring heights (for lighting)
    float texelSize = 1.0 / 512.0; // Adjust based on texture size
    float heightL = texture2D(heightMap, uv + vec2(-texelSize, 0.0)).r;
    float heightR = texture2D(heightMap, uv + vec2(texelSize, 0.0)).r;
    float heightD = texture2D(heightMap, uv + vec2(0.0, -texelSize)).r;
    float heightU = texture2D(heightMap, uv + vec2(0.0, texelSize)).r;
    
    vec3 normal = normalize(vec3(
      (heightL - heightR) * heightScale,
      2.0,
      (heightD - heightU) * heightScale
    ));
    
    vNormal = normalMatrix * normal;
    vPosition = displaced;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

// Fragment shader for terrain with level-based coloring
export const terrainFragmentShader = `
  uniform sampler2D levelMap;
  uniform sampler2D flagsMap;
  uniform vec3 levelColors[8];
  uniform vec3 roadColor;
  uniform vec3 waterColor;
  uniform vec3 ambientColor;
  uniform vec3 lightColor;
  uniform vec3 lightDirection;
  
  varying vec2 vUv;
  varying float vHeight;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    // Sample level and flags
    float level = texture2D(levelMap, vUv).r * 255.0;
    vec4 flags = texture2D(flagsMap, vUv);
    
    // Determine base color from level
    int levelIdx = int(clamp(level, 0.0, 7.0));
    vec3 baseColor = levelColors[levelIdx];
    
    // Override for roads and water
    if (flags.r > 0.5) {
      baseColor = roadColor; // Road flag
    } else if (flags.g > 0.5) {
      baseColor = waterColor; // Water flag
    }
    
    // Simple lighting
    vec3 normal = normalize(vNormal);
    float diffuse = max(dot(normal, normalize(lightDirection)), 0.0);
    vec3 lighting = ambientColor + lightColor * diffuse;
    
    vec3 finalColor = baseColor * lighting;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Vertex shader for heightmap generation (fullscreen quad)
export const heightmapGenVertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader for Simplex noise-based heightmap generation
export const heightmapGenFragmentShader = `
  precision highp float;
  
  uniform float seed;
  uniform float noiseScale;
  uniform int octaves;
  uniform float persistence;
  uniform float lacunarity;
  uniform int minLevel;
  uniform int maxLevel;
  uniform vec2 resolution;
  
  varying vec2 vUv;
  
  // Simplex noise functions
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                           + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                            dot(x12.zw, x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  // Fractal Brownian Motion
  float fbm(vec2 p, float seedOffset) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float maxValue = 0.0;
    
    for (int i = 0; i < 8; i++) {
      if (i >= octaves) break;
      value += amplitude * snoise(p * frequency + seedOffset);
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    
    return value / maxValue;
  }
  
  void main() {
    vec2 pos = vUv * resolution * noiseScale;
    
    // Generate noise
    float noise = fbm(pos, seed);
    
    // Normalize to 0-1 range
    float normalized = (noise + 1.0) * 0.5;
    
    // Map to level range
    float levelRange = float(maxLevel - minLevel);
    float level = float(minLevel) + normalized * levelRange;
    
    // Quantize to integer level for level map
    float quantizedLevel = floor(level + 0.5) / 255.0;
    
    // Output: R = height (0-1), G = level (0-255 normalized)
    gl_FragColor = vec4(normalized, quantizedLevel, 0.0, 1.0);
  }
`;

// Fragment shader for Gaussian blur (used for smoothing)
export const gaussianBlurFragmentShader = `
  precision highp float;
  
  uniform sampler2D inputTexture;
  uniform vec2 direction; // (1,0) for horizontal, (0,1) for vertical
  uniform float radius;
  uniform vec2 resolution;
  
  varying vec2 vUv;
  
  void main() {
    vec4 sum = vec4(0.0);
    float weightSum = 0.0;
    
    for (float i = -16.0; i <= 16.0; i += 1.0) {
      if (abs(i) > radius) continue;
      
      float weight = exp(-(i * i) / (2.0 * radius * radius));
      vec2 offset = direction * i / resolution;
      sum += texture2D(inputTexture, vUv + offset) * weight;
      weightSum += weight;
    }
    
    gl_FragColor = sum / weightSum;
  }
`;

// Simple pass-through for compositing
export const passthroughFragmentShader = `
  uniform sampler2D inputTexture;
  varying vec2 vUv;
  
  void main() {
    gl_FragColor = texture2D(inputTexture, vUv);
  }
`;

