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
// Vẫn còn dùng cho màu chữ trong VestaSplash (logo + tagline).
// Flame frame data đã bị xoá cùng với useFlameAnimation.
export const FIRE_PALETTE = [
  '#8B0000', // darkred    - base ember
  '#FF4500', // orangered  - core flame
  '#FF8C00', // darkorange - mid flame
  '#FFD700', // gold       - hot tip
  '#FFFAF0', // floralwhite - white hot
] as const;

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
