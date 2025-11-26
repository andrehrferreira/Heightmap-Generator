import React, { useRef, useEffect } from 'react';
import { useGenerator } from '../context/GeneratorContext';

export const PreviewLayers: React.FC = () => {
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

    const levelColors = ['#3fb950', '#58a6ff', '#a371f7', '#f85149', '#d29922'];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid.getCell(x, y);
        
        let color: string;
        if (cell.flags.road) {
          color = '#d29922';
        } else if (cell.flags.water) {
          color = '#39c5cf';
        } else {
          const idx = Math.max(0, Math.min(cell.levelId, levelColors.length - 1));
          color = levelColors[idx];
        }

        ctx.fillStyle = color;
        ctx.fillRect(
          Math.floor(x * cellWidth),
          Math.floor(y * cellHeight),
          Math.ceil(cellWidth) + 1,
          Math.ceil(cellHeight) + 1
        );
      }
    }

    if (result.roadNetwork?.pois) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#f85149';
      ctx.lineWidth = 2;

      for (const poi of result.roadNetwork.pois) {
        const px = poi.x * cellWidth + cellWidth / 2;
        const py = poi.y * cellHeight + cellHeight / 2;
        const radius = Math.max(4, Math.min(cellWidth, cellHeight) * 2);

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }, [result]);

  return (
    <div className="w-full h-full" ref={containerRef}>
      {!result ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-background to-card">
          <div className="text-xl font-semibold text-muted-foreground mb-2">Layers Preview</div>
          <div className="text-sm text-muted-foreground">Generate a heightmap first</div>
        </div>
      ) : (
        <canvas ref={canvasRef} className="w-full h-full" />
      )}
    </div>
  );
};
