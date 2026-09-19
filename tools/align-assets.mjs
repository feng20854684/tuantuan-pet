#!/usr/bin/env node
// 统一对齐所有素材：找猫咪边界框，统一底部中心锚点，统一缩放
import sharp from 'sharp';
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'src', 'assets', 'pet');

const TARGET_SIZE = 512;
const TARGET_OCCUPANCY = 0.75; // 猫咪占画布高度的 75%

async function getBounds(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  const channels = info.channels;
  const width = info.width;
  const height = info.height;

  let minX = width, minY = height, maxX = 0, maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const alpha = pixels[idx + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return { minX, minY, maxX, maxY, width, height };
}

async function processImage(filename) {
  const inputPath = join(assetsDir, filename);
  const inputBuffer = await readFile(inputPath);

  // 1. 找到猫咪边界框
  const bounds = await getBounds(inputBuffer);

  const catWidth = bounds.maxX - bounds.minX;
  const catHeight = bounds.maxY - bounds.minY;

  // 2. 统一缩放：按猫咪高度缩放到目标占比
  const targetCatHeight = TARGET_SIZE * TARGET_OCCUPANCY;
  const scale = targetCatHeight / catHeight;
  const newCatWidth = Math.round(catWidth * scale);
  const newCatHeight = Math.round(catHeight * scale);

  // 3. 计算对齐位置：底部中心
  const xOffset = Math.round((TARGET_SIZE - newCatWidth) / 2);
  const yOffset = Math.round(TARGET_SIZE - newCatHeight - (TARGET_SIZE * (1 - TARGET_OCCUPANCY) / 2));

  // 4. 裁剪猫咪并重新对齐
  await sharp(inputBuffer)
    .extract({
      left: bounds.minX,
      top: bounds.minY,
      width: catWidth,
      height: catHeight,
    })
    .resize(newCatWidth, newCatHeight, { fit: 'contain' })
    .extend({
      top: yOffset,
      bottom: TARGET_SIZE - yOffset - newCatHeight,
      left: xOffset,
      right: TARGET_SIZE - xOffset - newCatWidth,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(inputPath);

  return { filename, catWidth, catHeight, scale };
}

async function main() {
  console.log('Aligning all pet assets...');
  console.log(`Target: ${TARGET_SIZE}x${TARGET_SIZE}, occupancy: ${TARGET_OCCUPANCY * 100}%`);

  const files = (await readdir(assetsDir)).filter(f => f.endsWith('.png') && f !== 'core-ip.png');
  console.log(`Found ${files.length} PNG files to align\n`);

  let success = 0;
  for (const file of files) {
    try {
      const result = await processImage(file);
      success++;
      if (success % 10 === 0) {
        console.log(`  Processed ${success}/${files.length}...`);
      }
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }

  console.log(`\n✅ Done! Aligned ${success}/${files.length} assets.`);
}

main().catch(console.error);
