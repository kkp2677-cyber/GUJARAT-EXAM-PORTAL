import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const colorSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#059669" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Rounded corner background box -->
  <rect x="32" y="32" width="448" height="448" rx="110" ry="110" fill="url(#emeraldGrad)" />
  
  <!-- Graduation Cap Shadow (subtle offset) -->
  <polygon points="256,172 406,232 256,292 106,232" fill="#047857" opacity="0.45" />
  
  <!-- Cap Under/Base -->
  <path d="M 180,240 L 180,292 C 180,318 210,334 256,334 C 302,334 332,318 332,292 L 332,240 C 308,257 283,266 256,266 C 229,266 204,257 180,240 Z" fill="#0f172a" />
  
  <!-- Graduation Cap Top (Diamond) -->
  <polygon points="256,150 412,212 256,276 100,212" fill="#1e293b" />
  
  <!-- Cap highlight edge -->
  <polygon points="256,150 412,212 256,218 100,212" fill="#334155" opacity="0.6" />
  
  <!-- Tassel Button on Top -->
  <circle cx="256" cy="212" r="14" fill="#fbbf24" stroke="#d97706" stroke-width="2" />
  
  <!-- Tassel Cord curving down the left side -->
  <path d="M 256,212 Q 210,216 192,252 L 192,312" fill="none" stroke="#fbbf24" stroke-width="12" stroke-linecap="round" />
  
  <!-- Tassel Fringe/Brush at the bottom -->
  <path d="M 178,312 L 206,312 L 214,358 L 170,358 Z" fill="#f59e0b" />
  <circle cx="192" cy="314" r="11" fill="#d97706" opacity="0.4" />
</svg>`;

// Black and White / Monochrome version for footer
const bwSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bwGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>
  
  <!-- Rounded corner background box (Crisp White/Silver with dark border or dark background) -->
  <rect x="32" y="32" width="448" height="448" rx="110" ry="110" fill="#1e293b" stroke="#334155" stroke-width="12" />
  
  <!-- Inner White/Monochrome emblem -->
  <!-- Cap Shadow -->
  <polygon points="256,172 406,232 256,292 106,232" fill="#0f172a" opacity="0.6" />
  
  <!-- Cap Under/Base -->
  <path d="M 180,240 L 180,292 C 180,318 210,334 256,334 C 302,334 332,318 332,292 L 332,240 C 308,257 283,266 256,266 C 229,266 204,257 180,240 Z" fill="#94a3b8" />
  
  <!-- Graduation Cap Top (Diamond) in Pure White -->
  <polygon points="256,150 412,212 256,276 100,212" fill="#ffffff" />
  
  <!-- Cap facet -->
  <polygon points="256,150 412,212 256,218 100,212" fill="#e2e8f0" />
  
  <!-- Tassel Button on Top -->
  <circle cx="256" cy="212" r="14" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2" />
  
  <!-- Tassel Cord curving down the left side -->
  <path d="M 256,212 Q 210,216 192,252 L 192,312" fill="none" stroke="#f8fafc" stroke-width="12" stroke-linecap="round" />
  
  <!-- Tassel Fringe/Brush at the bottom -->
  <path d="M 178,312 L 206,312 L 214,358 L 170,358 Z" fill="#e2e8f0" />
  <circle cx="192" cy="314" r="11" fill="#64748b" opacity="0.3" />
</svg>`;

// Pure B&W (white outline & white shape) alternative
const bwSvgPure = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Rounded corner background box -->
  <rect x="32" y="32" width="448" height="448" rx="110" ry="110" fill="#000000" stroke="#ffffff" stroke-width="16" />
  
  <!-- Cap Under/Base -->
  <path d="M 180,240 L 180,292 C 180,318 210,334 256,334 C 302,334 332,318 332,292 L 332,240 C 308,257 283,266 256,266 C 229,266 204,257 180,240 Z" fill="#ffffff" opacity="0.85" />
  
  <!-- Graduation Cap Top (Diamond) -->
  <polygon points="256,150 412,212 256,276 100,212" fill="#ffffff" />
  
  <!-- Tassel Button on Top -->
  <circle cx="256" cy="212" r="14" fill="#ffffff" />
  
  <!-- Tassel Cord curving down the left side -->
  <path d="M 256,212 Q 210,216 192,252 L 192,312" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" />
  
  <!-- Tassel Fringe/Brush at the bottom -->
  <path d="M 178,312 L 206,312 L 214,358 L 170,358 Z" fill="#ffffff" />
</svg>`;

function renderPng(svgStr: string, width: number, height: number): Buffer {
  const resvg = new Resvg(svgStr, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

const publicDir = path.join(process.cwd(), 'public');

// Render main color logo in 512, 192, and logo.png
const png512 = renderPng(colorSvg, 512, 512);
fs.writeFileSync(path.join(publicDir, 'logo-512.png'), png512);
fs.writeFileSync(path.join(publicDir, 'logo.png'), png512);

const png192 = renderPng(colorSvg, 192, 192);
fs.writeFileSync(path.join(publicDir, 'logo-192.png'), png192);

// Render black and white logo for footer
const pngBw512 = renderPng(bwSvg, 512, 512);
fs.writeFileSync(path.join(publicDir, 'logo-bw.png'), pngBw512);

const pngBwPure = renderPng(bwSvgPure, 512, 512);
fs.writeFileSync(path.join(publicDir, 'logo-bw-pure.png'), pngBwPure);

console.log('Successfully generated:');
console.log('- public/logo.png (512x512)');
console.log('- public/logo-512.png (512x512)');
console.log('- public/logo-192.png (192x192)');
console.log('- public/logo-bw.png (512x512)');
console.log('- public/logo-bw-pure.png (512x512)');
