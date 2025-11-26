import React, { useRef, useEffect } from 'react';
import { useGenerator } from '../context/GeneratorContext';

export const Preview2D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { result } = useGenerator();

  useEffect(() => {
    if (!result || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grid = result.grid;
    const rows = grid.getRows();
    const cols = grid.getCols();

    const cellWidth = canvas.width / cols;
    const cellHeight = canvas.height / rows;

    let minH = Infinity, maxH = -Infinity;
    grid.forEachCell((cell: any) => {
      minH = Math.min(minH, cell.height);
      maxH = Math.max(maxH, cell.height);
    });
    const heightRange = maxH - minH || 1;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid.getCell(x, y);
        const normalized = (cell.height - minH) / heightRange;
        const gray = Math.floor(normalized * 255);
        
        ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
        ctx.fillRect(
          Math.floor(x * cellWidth),
          Math.floor(y * cellHeight),
          Math.ceil(cellWidth) + 1,
          Math.ceil(cellHeight) + 1
        );
      }
    }
  }, [result]);

  return (
    <div className="w-full h-full" ref={containerRef}>
      {!result ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-background to-card">
          <div className="text-xl font-semibold text-muted-foreground mb-2">Heightmap Preview</div>
          <div className="text-sm text-muted-foreground">Generate a heightmap first</div>
        </div>
      ) : (
        <canvas ref={canvasRef} className="w-full h-full" />
      )}
    </div>
  );
};
