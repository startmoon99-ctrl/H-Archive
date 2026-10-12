function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 썸네일이 없거나 불러오지 못했을 때 쓰는 결정적(seed 기반) 커버 이미지 */
export function createPlaceholderCover(seed: string): string {
  const hash = hashString(seed);
  const hue = hash % 360;
  const hue2 = (hue + 35 + ((hash >>> 8) % 50)) % 360;
  const x1 = 60 + ((hash >>> 4) % 280);
  const y1 = 40 + ((hash >>> 12) % 200);
  const x2 = 60 + ((hash >>> 16) % 280);
  const y2 = 60 + ((hash >>> 20) % 180);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue} 42% 54%)"/><stop offset="1" stop-color="hsl(${hue2} 46% 34%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="400" height="300" fill="url(#g)"/>` +
    `<circle cx="${x1}" cy="${y1}" r="110" fill="hsl(${hue2} 60% 72%)" opacity="0.22"/>` +
    `<circle cx="${x2}" cy="${y2}" r="64" fill="hsl(${hue} 70% 82%)" opacity="0.2"/>` +
    `</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
