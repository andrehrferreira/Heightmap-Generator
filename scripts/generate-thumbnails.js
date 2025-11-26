/**
 * Script to generate thumbnails for stamp images.
 * Run with: node scripts/generate-thumbnails.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if sharp is available
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (e) {
  console.log('Sharp not installed. Installing...');
  execSync('npm install sharp --save-dev', { stdio: 'inherit' });
  sharp = (await import('sharp')).default;
}

const STAMPS_DIR = path.join(__dirname, '..', 'web', 'stamps');
const THUMBS_DIR = path.join(__dirname, '..', 'web', 'stamps', 'thumbs');
const THUMB_SIZE = 128; // 128x128 thumbnails

async function generateThumbnails() {
  console.log('Generating thumbnails for stamps...');
  
  // Create thumbs directory if it doesn't exist
  if (!fs.existsSync(THUMBS_DIR)) {
    fs.mkdirSync(THUMBS_DIR, { recursive: true });
  }
  
  // Get all PNG files in stamps directory
  const files = fs.readdirSync(STAMPS_DIR).filter(f => 
    f.endsWith('.png') && !f.startsWith('thumb_')
  );
  
  console.log(`Found ${files.length} stamp files`);
  
  let processed = 0;
  let skipped = 0;
  
  for (const file of files) {
    const inputPath = path.join(STAMPS_DIR, file);
    const outputPath = path.join(THUMBS_DIR, file);
    
    // Skip if thumbnail already exists and is newer than source
    if (fs.existsSync(outputPath)) {
      const inputStat = fs.statSync(inputPath);
      const outputStat = fs.statSync(outputPath);
      if (outputStat.mtime > inputStat.mtime) {
        skipped++;
        continue;
      }
    }
    
    try {
      await sharp(inputPath)
        .resize(THUMB_SIZE, THUMB_SIZE, {
          fit: 'cover',
          position: 'center'
        })
        .png({ quality: 80, compressionLevel: 9 })
        .toFile(outputPath);
      
      processed++;
      console.log(`  ✓ ${file}`);
    } catch (error) {
      console.error(`  ✗ ${file}: ${error.message}`);
    }
  }
  
  console.log(`\nDone! Processed: ${processed}, Skipped: ${skipped}`);
  
  // Generate manifest file
  const manifest = {
    generated: new Date().toISOString(),
    thumbSize: THUMB_SIZE,
    stamps: files.map(file => {
      const name = file
        .replace(/^HM_/, '')
        .replace(/_Ex\.png$/i, '')
        .replace(/_/g, ' ')
        .replace(/(\d+)$/, ' $1')
        .trim();
      
      // Detect category
      let category = 'terrain';
      if (/crater|impact/i.test(file)) category = 'crater';
      else if (/canyon/i.test(file)) category = 'canyon';
      else if (/volcano/i.test(file)) category = 'volcano';
      else if (/highland|mountain|peak|rock|cliff|rugged/i.test(file)) category = 'mountain';
      else if (/valley|meadow|rolling/i.test(file)) category = 'valley';
      else if (/dune|desert|sandy/i.test(file)) category = 'desert';
      else if (/island|beach|seaside/i.test(file)) category = 'island';
      else if (/alien|stranger|voronian/i.test(file)) category = 'alien';
      else if (/terrace/i.test(file)) category = 'terrace';
      else if (/tundra/i.test(file)) category = 'tundra';
      
      return {
        id: `stamp-${file.replace(/\.[^.]+$/, '')}`,
        file,
        name,
        category,
        thumb: `thumbs/${file}`
      };
    })
  };
  
  const manifestPath = path.join(STAMPS_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest saved to: ${manifestPath}`);
}

generateThumbnails().catch(console.error);

