const sharp = require('sharp');
const fs = require('fs');

// We use paths for the "评" character to ensure no font dependency issues.
// 
const svgBuffer = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="transparent" />
  <circle cx="256" cy="256" r="240" fill="#c62828" />
  
  <g fill="white" transform="translate(130, 130) scale(0.65)">
    <!-- 讠 (Speech radical) -->
    <path d="M 50 30 L 110 50 L 100 80 L 40 60 Z" />
    <path d="M 60 120 L 140 120 L 140 150 L 80 150 L 80 280 L 120 330 L 80 370 L 20 300 L 20 150 L 60 150 Z" />

    <!-- 平 (Right part) -->
    <!-- Top horizontal stroke -->
    <path d="M 160 50 L 370 50 L 370 80 L 160 80 Z" />
    <!-- Two dots / short strokes -->
    <path d="M 180 100 L 220 170 L 190 190 L 150 120 Z" />
    <path d="M 350 100 L 380 120 L 340 190 L 310 170 Z" />
    <!-- Middle horizontal stroke -->
    <path d="M 120 220 L 410 220 L 410 250 L 120 250 Z" />
    <!-- Vertical stroke -->
    <path d="M 250 80 L 280 80 L 280 380 L 250 380 Z" />
  </g>
  
  <!-- 5 small 4-pointed stars (sparkles) -->
  <g fill="white">
    <!-- Top -->
    <path d="M 230 60 Q 230 90 200 90 Q 230 90 230 120 Q 230 90 260 90 Q 230 90 230 60 Z" />
    <!-- Left -->
    <path d="M 100 280 Q 100 300 80 300 Q 100 300 100 320 Q 100 300 120 300 Q 100 300 100 280 Z" />
    <!-- Bottom -->
    <path d="M 220 420 Q 220 440 200 440 Q 220 440 220 460 Q 220 440 240 440 Q 220 440 220 420 Z" />
    <!-- Bottom Right -->
    <path d="M 390 380 Q 390 395 375 395 Q 390 395 390 410 Q 390 395 405 395 Q 390 395 390 380 Z" />
    <!-- Right -->
    <path d="M 440 220 Q 440 240 420 240 Q 440 240 440 260 Q 440 240 460 240 Q 440 240 440 220 Z" />
  </g>
</svg>
`);

sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile('/workspace/public/icon_512.png')
  .then(() => sharp(svgBuffer).resize(128, 128).png().toFile('/workspace/public/icon_128.png'))
  .then(() => sharp(svgBuffer).resize(48, 48).png().toFile('/workspace/public/icon_48.png'))
  .then(() => sharp(svgBuffer).resize(16, 16).png().toFile('/workspace/public/icon_16.png'))
  .then(() => console.log('Successfully generated PNG icons with path-based Chinese character.'))
  .catch(err => console.error(err));
