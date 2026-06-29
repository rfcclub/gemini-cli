/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Vesta is a hard fork that has left Google/Gemini support. The
// `isVestaEnv()` helper is preserved as a stable, always-true shim so
// legacy call sites continue to compile; new code can read the boolean
// directly when needed.
export const isVestaEnv = (): boolean => true;

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
// Hard fork: only Vesta branding is shipped. Gemini logos have been
// removed; these names are kept for backwards compatibility with existing
// call sites (e.g. `shortAsciiLogo` in VestaSplash.tsx).

export const shortAsciiLogo = shortVestaLogo;
export const longAsciiLogo = longVestaLogo;
export const tinyAsciiLogo = tinyVestaLogo;

export const shortAsciiLogoCompactText = shortVestaLogoCompactText;
export const longAsciiLogoCompactText = longVestaLogoCompactText;
export const tinyAsciiLogoCompactText = tinyVestaLogoCompactText;
