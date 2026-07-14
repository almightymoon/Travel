/**
 * Recognizable country silhouettes in a 0–100 × 0–120 viewBox (y down).
 */
export const COUNTRIES = [
  {
    id: 'italy',
    name: 'Italy',
    points: [
      [28, 8], [42, 2], [54, 4], [58, 12], [54, 22], [50, 34], [48, 46],
      [50, 54], [58, 60], [72, 64], [88, 62], [98, 70], [94, 82], [78, 78],
      [64, 76], [56, 82], [54, 96], [50, 110], [40, 118], [32, 108], [36, 92],
      [34, 76], [30, 60], [26, 44], [22, 28], [22, 16], [28, 8],
    ],
  },
  {
    id: 'japan',
    name: 'Japan',
    points: [
      [56, 4], [66, 6], [74, 12], [76, 20], [72, 28], [76, 36], [80, 46], [82, 56],
      [78, 66], [70, 78], [60, 88], [48, 96], [40, 90], [44, 78], [46, 66], [42, 54],
      [34, 44], [34, 32], [40, 20], [48, 10], [56, 4],
    ],
  },
  {
    id: 'portugal',
    name: 'Portugal',
    points: [
      [30, 6], [44, 3], [56, 5], [62, 14], [60, 26], [62, 40], [66, 54], [68, 68],
      [62, 82], [52, 96], [40, 108], [28, 104], [24, 88], [22, 70], [22, 50], [24, 30],
      [26, 14], [30, 6],
    ],
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    points: [
      [36, 4], [48, 3], [56, 10], [60, 22], [68, 32], [74, 42], [68, 52], [60, 62],
      [56, 76], [52, 92], [42, 108], [30, 106], [26, 88], [28, 70], [24, 52], [26, 34],
      [30, 18], [34, 8], [36, 4],
    ],
  },
  {
    id: 'greece',
    name: 'Greece',
    points: [
      [34, 8], [48, 3], [60, 8], [64, 18], [60, 28], [72, 36], [84, 46], [88, 54],
      [76, 58], [70, 70], [74, 84], [66, 98], [52, 108], [40, 96], [34, 80], [26, 64],
      [18, 48], [22, 30], [28, 16], [34, 8],
    ],
  },
  {
    id: 'iceland',
    name: 'Iceland',
    points: [
      [14, 48], [18, 30], [28, 16], [42, 8], [58, 6], [74, 12], [88, 24], [96, 40],
      [94, 56], [84, 72], [68, 88], [50, 98], [32, 92], [18, 78], [10, 62], [8, 50],
      [14, 48],
    ],
  },
  {
    id: 'morocco',
    name: 'Morocco',
    points: [
      [14, 22], [28, 8], [46, 4], [64, 10], [78, 22], [86, 38], [84, 54], [74, 72],
      [58, 90], [40, 104], [24, 96], [14, 80], [8, 60], [8, 40], [14, 22],
    ],
  },
];

export function pickCountry(excludeId) {
  const pool = excludeId ? COUNTRIES.filter((c) => c.id !== excludeId) : COUNTRIES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Closed country silhouette — polygon with round joins (no oversmooth blobs). */
export function outlinePath(country) {
  const raw = country.points;
  if (raw.length < 3) return '';
  const pts = raw[0][0] === raw[raw.length - 1][0] && raw[0][1] === raw[raw.length - 1][1]
    ? raw.slice(0, -1)
    : raw;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i += 1) {
    d += ` L ${pts[i][0]} ${pts[i][1]}`;
  }
  return `${d} Z`;
}

export function placeOutline(country, cx, cy, sizeW, sizeH = sizeW * 1.2) {
  return country.points.map(([x, y]) => ({
    x: cx + ((x / 100) - 0.5) * sizeW,
    y: cy + ((y / 120) - 0.5) * sizeH,
  }));
}

export function smoothClosedPath(points) {
  return outlinePath({ points: points.map((p) => [p.x, p.y]) });
}
