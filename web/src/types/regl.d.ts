/**
 * Type declarations for regl
 */

declare module 'regl' {
  export interface ReglConfig {
    canvas?: HTMLCanvasElement;
    gl?: WebGLRenderingContext;
    extensions?: string[];
    optionalExtensions?: string[];
    profile?: boolean;
    onDone?: (err: Error | null, regl?: Regl) => void;
  }

  export interface FramebufferConfig {
    width: number;
    height: number;
    colorType?: 'uint8' | 'half float' | 'float';
    colorFormat?: 'rgba' | 'rgb' | 'alpha';
    depth?: boolean;
    stencil?: boolean;
  }

  export interface Framebuffer2D {
    width: number;
    height: number;
    color: any[];
    depth?: any;
    stencil?: any;
    destroy(): void;
    use(callback: () => void): void;
    resize(width: number, height: number): void;
  }

  export interface DrawConfig {
    frag: string;
    vert: string;
    attributes: Record<string, any>;
    uniforms: Record<string, any>;
    framebuffer?: any;
    count: number;
    primitive?: string;
    depth?: { enable: boolean };
    blend?: { enable: boolean };
  }

  export type DrawCommand = (props?: Record<string, any>) => void;

  export interface Regl {
    (config: DrawConfig): DrawCommand;
    clear(config: { color?: number[]; depth?: number; stencil?: number }): void;
    framebuffer(config: FramebufferConfig): Framebuffer2D;
    texture(config: any): any;
    buffer(data: any): any;
    read(config?: { framebuffer?: Framebuffer2D; x?: number; y?: number; width?: number; height?: number }): Uint8Array | Float32Array;
    prop<T, K extends string>(name: K): any;
    destroy(): void;
    frame(callback: (context: { time: number; tick: number }) => void): { cancel(): void };
    poll(): void;
    now(): number;
    limits: Record<string, any>;
  }

  function createREGL(config?: ReglConfig | HTMLCanvasElement): Regl;
  
  export default createREGL;
}

