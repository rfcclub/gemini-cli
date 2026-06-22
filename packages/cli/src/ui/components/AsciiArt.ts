/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const isVestaEnv = () => {
  if (typeof process === 'undefined') {
    return false;
  }
  if (process.env?.['VITEST']) {
    return false;
  }
  return (
    process.env?.['VESTA_ATHANOR_DIR'] !== undefined ||
    process.env?.['ATHANOR_DIR'] !== undefined ||
    process.argv?.some(
      (arg) => arg.includes('gemini-vesta') || arg.includes('gemini_vesta'),
    )
  );
};

// --- GEMINI Logos ---

const shortGeminiLogo = `
   █████████  ██████████ ██████   ██████ █████ ██████   █████ █████
  ███░░░░░███░░███░░░░░█░░██████ ██████ ░░███ ░░██████ ░░███ ░░███
 ███     ░░░  ░███  █ ░  ░███░█████░███  ░███  ░███░███ ░███  ░███
░███          ░██████    ░███░░███ ░███  ░███  ░███░░███░███  ░███
░███    █████ ░███░░█    ░███ ░░░  ░███  ░███  ░███ ░░██████  ░███
░░███  ░░███  ░███ ░   █ ░███      ░███  ░███  ░███  ░░█████  ░███
 ░░█████████  ██████████ █████     █████ █████ █████  ░░█████ █████
  ░░░░░░░░░  ░░░░░░░░░░ ░░░░░     ░░░░░ ░░░░░ ░░░░░    ░░░░░ ░░░░░
`;

const longGeminiLogo = `
 █████████  ██████████ ██████   ██████ █████ ██████   █████ █████ 
███░░░░░███░░███░░░░░█░░██████ █████ ░░███░░██████ ░░███ ░░███  
███ ░░░░░░░  ░███  █ ░  ░███░█████░███  ░███ ░███░███ ░███  ░███  
░███          ░██████    ░███░░███ ░███  ░███ ░███░░███░███  ░███  
░███    █████ ░███░░█    ░███ ░░░  ░███  ░███ ░███ ░░██████  ░███  
░░███  ░░███  ░███ ░   █ ░███      ░███  ░███ ░███  ░░█████  ░███  
 ░░█████████  ██████████ █████     █████ █████ █████  ░░████ █████ 
  ░░░░░░░░░  ░░░░░░░░░░ ░░░░░     ░░░░░ ░░░░░ ░░░░░    ░░░░ ░░░░░  
`;

const tinyGeminiLogo = `
 ███         █████████ 
░░░███      ███░░░░░███
  ░░░███   ███     ░░░ 
    ░░░███░███         
     ███░ ░███    █████
   ███░   ░░███  ░░███ 
 ███░      ░░█████████ 
░░░         ░░░░░░░░░  
`;

const shortGeminiLogoCompactText = `
▟▛▀▀█▖▜█▀▀▜▝██▙▗██▛▝█▛▝██▙ ▜█▘▜█▘
▐█     ▐█▄▌  █▌▜█▘█▌ █▌ █▌▜▙▐█ ▐█ 
▝█▖ ▜█▘▐█ ▘▗ █▌   █▌ █▌ █▌ ▜██ ▐█ 
 ▝▀▀▀▀ ▀▀▀▀▀▝▀▀  ▝▀▀▝▀▀▝▀▀  ▀▀▘▀▀▘
`;

const longGeminiLogoCompactText = `
▗█▀▀▜▙▝█▛▀▀▌▜██▖▟██▘▜█▘▜██▖▝█▛▝█▛
█▌     █▙▟  ▐█▝█▛▐█ ▐█ ▐█▝█▖█▌ █▌
▜▙ ▝█▛ █▌▝ ▖▐█   ▐█ ▐█ ▐█ ▝██▌ █▌
 ▀▀▀▀▘▝▀▀▀▀▘▀▀▘  ▀▀▘▀▀▘▀▀▘ ▝▀▀▝▀▀
`;

const tinyGeminiLogoCompactText = `
▟▛▀▀█▖
▐█     
▝█▖ ▜█▘
 ▝▀▀▀▀ 
`;

// --- VESTA Logos ---

const shortVestaLogo = `
███     ███ ██████████  █████████  ███████████    █████████  
███     ███ ░███░░░░░░█ ███░░░░░███░░░░░███░░░░  ███░░░░░███ 
███     ███ ░███  █ ░  ░███     ░░░     ░███    ░███    ░███ 
░███   ███  ░██████    ░░█████████      ░███    ░███████████ 
░░███ ███   ░███░░█     ░░░░░░░░███     ░███    ░███░░░░░███ 
 ░░█████    ░███ ░   █  ███     ░███     ░███    ░███    ░███ 
  ░░███     ██████████ ░░█████████      █████   █████  █████
   ░░░     ░░░░░░░░░░   ░░░░░░░░░      ░░░░░   ░░░░░  ░░░░░ 
`;

const longVestaLogo = `
███     ███ ██████████  █████████  ███████████    █████████  
███     ███ ░███░░░░░░█ ███░░░░░███░░░░░███░░░░  ███░░░░░███ 
███     ███ ░███  █ ░  ░███     ░░░     ░███    ░███    ░███ 
░███   ███  ░██████    ░░█████████      ░███    ░███████████ 
░░███ ███   ░███░░█     ░░░░░░░░███     ░███    ░███░░░░░███ 
 ░░█████    ░███ ░   █  ███     ░███     ░███    ░███    ░███ 
  ░░███     ██████████ ░░█████████      █████   █████  █████
   ░░░     ░░░░░░░░░░   ░░░░░░░░░      ░░░░░   ░░░░░  ░░░░░ 
`;

const tinyVestaLogo = `
 █▌    █▌ █▛▀▀▀▀  ▞▀▀▀▀▜  ▛▀▀▀▀▀▜ ▟▛▀▀▀▀█▙
 ▐█   █▌  ▐█▄▄▄▄ ▐█▄     ▐█   █▌  ▐█▄▄▄▄█▌
  ▜█ █▛   ▐█▀▀▀▀  ▝▀▀▀▀█▙   ▐█    ▐█▀▀▀▀█▌
   ▜█▛    ▐█▄▄▄▄ ▜▙▄▄▄▄█▛   ▐█    ▐█    █▌
    ▀     ▀▀▀▀▀▀  ▀▀▀▀▀▀    ▀▀    ▀▀    ▀▀
`;

const shortVestaLogoCompactText = `
 █▌    █▌ █▛▀▀▀▀  ▞▀▀▀▀▜  ▛▀▀▀▀▀▜ ▟▛▀▀▀▀█▙
 ▐█   █▌  ▐█▄▄▄▄ ▐█▄     ▐█   █▌  ▐█▄▄▄▄█▌
  ▜█ █▛   ▐█▀▀▀▀  ▝▀▀▀▀█▙   ▐█    ▐█▀▀▀▀█▌
   ▜█▛    ▐█▄▄▄▄ ▜▙▄▄▄▄█▛   ▐█    ▐█    █▌
    ▀     ▀▀▀▀▀▀  ▀▀▀▀▀▀    ▀▀    ▀▀    ▀▀
`;

const longVestaLogoCompactText = `
███     ███ ██████████  █████████  ███████████    █████████  
███     ███ ░███░░░░░░█ ███░░░░░███░░░░░███░░░░  ███░░░░░███ 
███     ███ ░███  █ ░  ░███     ░░░     ░███    ░███    ░███ 
░███   ███  ░██████    ░░█████████      ░███    ░███████████ 
░░███ ███   ░███░░█     ░░░░░░░░███     ░███    ░███░░░░░███ 
 ░░█████    ░███ ░   █  ███     ░███     ░███    ░███    ░███ 
  ░░███     ██████████ ░░█████████      █████   █████  █████
   ░░░     ░░░░░░░░░░   ░░░░░░░░░      ░░░░░   ░░░░░  ░░░░░ 
`;

const tinyVestaLogoCompactText = `
 ▌ ▌ ▛▀ ▞▀ ▛▀ ▛▜
 ▜▛  ▙▄ ▝▀ ▐█ ▐█
`;

// --- Vesta Fire Palette (lửa cổ điển) ---
// Đỏ thẫm → đỏ tươi → cam → vàng → trắng nóng.
// Chỉ dùng khi isVestaEnv() = true (Footer pulse, splash, spinner).
export const FIRE_PALETTE = [
  '#8B0000', // darkred    - base ember
  '#FF4500', // orangered  - core flame
  '#FF8C00', // darkorange - mid flame
  '#FFD700', // gold       - hot tip
  '#FFFAF0', // floralwhite - white hot
] as const;

// Footer mini-icon: 3-char pulse, mỗi frame kèm 1 màu trong palette.
// Dùng ░▒▓ (block elements) thay emoji 🔥 để render consistent mọi terminal.
export const vestaMiniFlameFrames: ReadonlyArray<readonly [string, string]> = [
  ['\u2591\u2588\u2591', FIRE_PALETTE[1]], // dim core
  ['\u2588\u2588\u2588', FIRE_PALETTE[2]], // mid
  ['\u2588\u2588\u2588', FIRE_PALETTE[3]], // hot tip
  ['\u2592\u2588\u2592', FIRE_PALETTE[1]], // settling
];

// Spinner / splash multi-line flame. Mỗi frame là 3 dòng × 5 cột, kèm mảng
// màu cho từng dòng để render gradient top→bottom (đỏ thẫm dưới, vàng trắng trên).
export interface VestaFlameFrame {
  rows: readonly string[]; // length 3, each row 5 chars wide
  colors: readonly string[]; // length 3, one per row
}

export const vestaFlameFrames: readonly VestaFlameFrame[] = [
  {
    // dim ember
    rows: [
      '\u2591\u2592\u2588\u2592\u2591',
      '\u2591\u2588\u2588\u2588\u2591',
      '\u2592\u2588\u2588\u2588\u2592',
    ],
    colors: [FIRE_PALETTE[0], FIRE_PALETTE[1], FIRE_PALETTE[2]],
  },
  {
    // rising
    rows: [
      '\u2592\u2588\u2588\u2588\u2592',
      '\u2588\u2588\u2588\u2588\u2588',
      '\u2592\u2588\u2588\u2588\u2592',
    ],
    colors: [FIRE_PALETTE[1], FIRE_PALETTE[2], FIRE_PALETTE[3]],
  },
  {
    // peak
    rows: [
      '\u2588\u2588\u2588\u2588\u2588',
      '\u2588\u2588\u2588\u2588\u2588',
      '\u2588\u2588\u2588\u2588\u2588',
    ],
    colors: [FIRE_PALETTE[2], FIRE_PALETTE[3], FIRE_PALETTE[4]],
  },
  {
    // settling
    rows: [
      '\u2591\u2588\u2588\u2588\u2591',
      '\u2592\u2588\u2588\u2588\u2592',
      '\u2591\u2592\u2588\u2592\u2591',
    ],
    colors: [FIRE_PALETTE[1], FIRE_PALETTE[2], FIRE_PALETTE[1]],
  },
];

// --- Dynamic Exports ---

export const shortAsciiLogo = isVestaEnv() ? shortVestaLogo : shortGeminiLogo;
export const longAsciiLogo = isVestaEnv() ? longVestaLogo : longGeminiLogo;
export const tinyAsciiLogo = isVestaEnv() ? tinyVestaLogo : tinyGeminiLogo;

export const shortAsciiLogoCompactText = isVestaEnv()
  ? shortVestaLogoCompactText
  : shortGeminiLogoCompactText;

export const longAsciiLogoCompactText = isVestaEnv()
  ? longVestaLogoCompactText
  : longGeminiLogoCompactText;

export const tinyAsciiLogoCompactText = isVestaEnv()
  ? tinyVestaLogoCompactText
  : tinyGeminiLogoCompactText;
