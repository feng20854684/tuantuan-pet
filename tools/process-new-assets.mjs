#!/usr/bin/env node
// 手动处理新素材：去白底 + 同状态统一归一化到 512×512
import sharp from 'sharp';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const incomingDir = join(__dirname, '..', 'incoming-assets');
const outputDir = join(__dirname, '..', 'src', 'assets', 'pet');

// 新素材状态列表
const newStates = [
  'sleep', 'yawn', 'lick-paw', 'tail-chase', 'pet-belly',
  'knead', 'climb', 'dance', 'scratch'
];

async function removeWhiteBackground(inputBuffer) {
  const metadata = await sharp(inputBuffer).metadata();
  const { width, height } = metadata;
  
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const pixels = new Uint8Array(data);
  const channels = info.channels;
  
  // 从四个角开始泛洪填充去白底
  const visited = new Uint8Array(width * height);
  const queue = [];
  
  const seeds = [
    [0, 0], [width - 1, 0],
    [0, height - 1], [width - 1, height - 1]
  ];
  
  for (const [sx, sy] of seeds) {
    const idx = sy * width + sx;
    if (!visited[idx]) {
      queue.push([sx, sy]);
      visited[idx] = 1;
    }
  }
  
  const threshold = 240;
  
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const idx = (y * width + x) * channels;
    
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    
    if (r > threshold && g > threshold && b > threshold) {
      pixels[idx + 3] = 0;
      
      const neighbors = [
        [x - 1, y], [x + 1, y],
        [x, y - 1], [x, y + 1]
      ];
      
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const nidx = ny * width + nx;
        if (!visited[nidx]) {
          visited[nidx] = 1;
          queue.push([nx, ny]);
        }
      }
    }
  }
  
  return sharp(pixels, { raw: { width, height, channels } })
    .png()
    .toBuffer();
}

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

async function processState(stateName, filenames) {
  console.log(`\nProcessing state: ${stateName} (${filenames.length} frames)`);
  
  // 第一步：所有帧去白底
  const noBgBuffers = [];
  for (const file of filenames) {
    const inputPath = join(incomingDir, file);
    const inputBuffer = await readFile(inputPath);
    const noBgBuffer = await removeWhiteBackground(inputBuffer);
    noBgBuffers.push({ file, buffer: noBgBuffer });
  }
  
  // 第二步：计算所有帧的边界，找最大边界作为统一缩放基准
  const allBounds = [];
  for (const { buffer } of noBgBuffers) {
    allBounds.push(await getBounds(buffer));
  }
  
  // 找最大宽度和高度
  let maxWidth = 0, maxHeight = 0;
  for (const bounds of allBounds) {
    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;
    if (w > maxWidth) maxWidth = w;
    if (h > maxHeight) maxHeight = h;
  }
  
  // 统一缩放：按最大边缩放到画布的 75%
  const targetSize = 512;
  const targetOccupancy = 0.75;
  const maxDim = Math.max(maxWidth, maxHeight);
  const scale = (targetSize * targetOccupancy) / maxDim;
  
  console.log(`  Max bounds: ${maxWidth}x${maxHeight}, scale: ${scale.toFixed(3)}`);
  
  // 第三步：所有帧按统一缩放裁剪、缩放、对齐到 512×512 画布
  for (let i = 0; i < noBgBuffers.length; i++) {
    const { file, buffer } = noBgBuffers[i];
    const bounds = allBounds[i];
    
    const cropWidth = bounds.maxX - bounds.minX;
    const cropHeight = bounds.maxY - bounds.minY;
    
    const newWidth = Math.round(cropWidth * scale);
    const newHeight = Math.round(cropHeight * scale);
    
    // 对齐：底部中心对齐
    const xOffset = Math.round((targetSize - newWidth) / 2);
    const yOffset = targetSize - newHeight - Math.round((targetSize * (1 - targetOccupancy)) / 2);
    
    const outputPath = join(outputDir, file);
    
    await sharp(buffer)
      .extract({ 
        left: bounds.minX, 
        top: bounds.minY, 
        width: cropWidth, 
        height: cropHeight 
      })
      .resize(newWidth, newHeight, { fit: 'contain' })
      .extend({
        top: yOffset,
        bottom: targetSize - yOffset - newHeight,
        left: xOffset,
        right: targetSize - xOffset - newWidth,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
    
    console.log(`  ✓ ${file} (${newWidth}x${newHeight})`);
  }
}

async function main() {
  console.log('Processing new assets with unified alignment...');
  
  // 获取所有新素材文件
  const files = await readdir(incomingDir);
  
  // 按状态分组
  const stateFiles = {};
  for (const state of newStates) {
    stateFiles[state] = files.filter(f => f.startsWith(state + '-'));
  }
  
  for (const [state, filenames] of Object.entries(stateFiles)) {
    if (filenames.length === 0) continue;
    await processState(state, filenames.sort());
  }
  
  console.log('\n✅ All new assets processed!');
}

main().catch(console.error);
