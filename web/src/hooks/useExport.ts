import { useCallback } from 'react';
import { useGenerator } from '../context/GeneratorContext';

/**
 * Hook for export functionality.
 */
export function useExport() {
  const { result, setStatus } = useGenerator();

  /**
   * Exports heightmap as PNG.
   */
  const exportHeightmapPNG = useCallback(async () => {
    if (!result?.grid) {
      setStatus('Generate a heightmap first', 'warning');
      return;
    }

    try {
      setStatus('Exporting heightmap...', 'warning');

      const grid = result.grid;
      const rows = grid.getRows();
      const cols = grid.getCols();

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = cols;
      canvas.height = rows;
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.createImageData(cols, rows);

      // Find min/max heights
      let minH = Infinity, maxH = -Infinity;
      grid.forEachCell((cell: any) => {
        minH = Math.min(minH, cell.height);
        maxH = Math.max(maxH, cell.height);
      });
      const range = maxH - minH || 1;

      // Fill image data
      let i = 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cell = grid.getCell(x, y);
          const normalized = (cell.height - minH) / range;
          const value = Math.floor(normalized * 255);

          imageData.data[i++] = value; // R
          imageData.data[i++] = value; // G
          imageData.data[i++] = value; // B
          imageData.data[i++] = 255;   // A
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `heightmap-${cols}x${rows}.png`;
          a.click();
          URL.revokeObjectURL(url);
          setStatus('Heightmap exported successfully', 'success');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Export error:', error);
      setStatus('Failed to export heightmap', 'error');
    }
  }, [result, setStatus]);

  /**
   * Exports layers/levels mask as PNG.
   */
  const exportLayersPNG = useCallback(async () => {
    if (!result?.grid) {
      setStatus('Generate a heightmap first', 'warning');
      return;
    }

    try {
      setStatus('Exporting layers...', 'warning');

      const grid = result.grid;
      const rows = grid.getRows();
      const cols = grid.getCols();

      const canvas = document.createElement('canvas');
      canvas.width = cols;
      canvas.height = rows;
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.createImageData(cols, rows);

      const levelColors = [
        [63, 185, 80],   // Level 0 - Green
        [88, 166, 255],  // Level 1 - Blue
        [163, 113, 247], // Level 2 - Purple
        [248, 81, 73],   // Level 3 - Red
        [210, 153, 34],  // Level 4+ - Orange
      ];

      let i = 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cell = grid.getCell(x, y);
          
          let color: number[];
          if (cell.flags.road) {
            color = [210, 153, 34]; // Road color
          } else if (cell.flags.water) {
            color = [57, 197, 207]; // Water color
          } else {
            const idx = Math.max(0, Math.min(cell.levelId, levelColors.length - 1));
            color = levelColors[idx];
          }

          imageData.data[i++] = color[0]; // R
          imageData.data[i++] = color[1]; // G
          imageData.data[i++] = color[2]; // B
          imageData.data[i++] = 255;      // A
        }
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `layers-${cols}x${rows}.png`;
          a.click();
          URL.revokeObjectURL(url);
          setStatus('Layers exported successfully', 'success');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Export error:', error);
      setStatus('Failed to export layers', 'error');
    }
  }, [result, setStatus]);

  /**
   * Exports metadata as JSON.
   */
  const exportMetadata = useCallback(() => {
    if (!result?.grid) {
      setStatus('Generate a heightmap first', 'warning');
      return;
    }

    try {
      const grid = result.grid;
      
      let minH = Infinity, maxH = -Infinity;
      grid.forEachCell((cell: any) => {
        minH = Math.min(minH, cell.height);
        maxH = Math.max(maxH, cell.height);
      });

      const metadata = {
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        grid: {
          width: grid.getCols(),
          height: grid.getRows(),
        },
        heightRange: {
          min: minH,
          max: maxH,
        },
        stats: result.stats,
        pois: result.roadNetwork?.pois?.map((poi: any) => ({
          id: poi.id,
          x: poi.x,
          y: poi.y,
          type: poi.type,
        })),
      };

      const blob = new Blob([JSON.stringify(metadata, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metadata-${grid.getCols()}x${grid.getRows()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus('Metadata exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      setStatus('Failed to export metadata', 'error');
    }
  }, [result, setStatus]);

  return {
    exportHeightmapPNG,
    exportLayersPNG,
    exportMetadata,
  };
}

