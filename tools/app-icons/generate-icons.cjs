const os = require("os");
const path = require("path");

const [project, d, fgHex, bgHex, lightBgHex = "#F0F6FC"] = process.argv.slice(2);

if (!project || !d || !fgHex || !bgHex) {
  console.error('Uso: node generate-icons.js <projeto> "<path d do svg>" <cor do ícone> <cor de fundo> [fundo claro do iOS]');
  process.exit(1);
}

const Jimp = require(require.resolve("jimp-compact", { paths: [project] }));

const hex = (h) => (parseInt(h.replace("#", ""), 16) * 256 + 255) >>> 0;
const FG = hex(fgHex), BG = hex(bgHex), LIGHT_BG = hex(lightBgHex);
const WHITE = 0xffffffff, BLACK = 0x000000ff, GRAY = 0xd0d0d0ff, NONE = 0x00000000;

function parse(source) {
  const toks = source.match(/[a-zA-Z]|-?(\d*\.\d+|\d+\.?\d*)(e-?\d+)?/g);
  const polys = [];
  let poly = null, x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, cmd = null, prev = null, i = 0;
  const num = () => parseFloat(toks[i++]);
  const curve = (pts) => {
    for (let t = 1; t <= 16; t++) {
      const s = t / 16, u = 1 - s;
      const w = pts.length === 3 ? [u * u, 2 * u * s, s * s] : [u * u * u, 3 * u * u * s, 3 * u * s * s, s * s * s];
      poly.push([
        w.reduce((acc, k, j) => acc + k * pts[j][0], 0),
        w.reduce((acc, k, j) => acc + k * pts[j][1], 0),
      ]);
    }
  };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase();
    const pt = () => { const a = num(), b = num(); return rel ? [x + a, y + b] : [a, b]; };
    const up = cmd.toUpperCase();
    switch (up) {
      case "M": [x, y] = pt(); sx = x; sy = y; poly = [[x, y]]; polys.push(poly); cmd = rel ? "l" : "L"; break;
      case "L": [x, y] = pt(); poly.push([x, y]); break;
      case "H": { const a = num(); x = rel ? x + a : a; poly.push([x, y]); break; }
      case "V": { const a = num(); y = rel ? y + a : a; poly.push([x, y]); break; }
      case "C": { const p1 = pt(), p2 = pt(), p3 = pt(); curve([[x, y], p1, p2, p3]); [cx, cy] = p2; [x, y] = p3; break; }
      case "S": {
        const p1 = "CS".includes(prev) ? [2 * x - cx, 2 * y - cy] : [x, y];
        const p2 = pt(), p3 = pt(); curve([[x, y], p1, p2, p3]); [cx, cy] = p2; [x, y] = p3; break;
      }
      case "Q": { const p1 = pt(), p2 = pt(); curve([[x, y], p1, p2]); [cx, cy] = p1; [x, y] = p2; break; }
      case "T": {
        const p1 = "QT".includes(prev) ? [2 * x - cx, 2 * y - cy] : [x, y];
        const p2 = pt(); curve([[x, y], p1, p2]); [cx, cy] = p1; [x, y] = p2; break;
      }
      case "Z": x = sx; y = sy; break;
      default: throw new Error(`Comando de path não suportado: ${cmd}. Use um SVG sem arcos (A).`);
    }
    prev = up;
  }
  return polys;
}

const POLYS = parse(d);
const xs = POLYS.flat().map((p) => p[0]), ys = POLYS.flat().map((p) => p[1]);
const minX = Math.min(...xs), minY = Math.min(...ys);
const boxW = Math.max(...xs) - minX, boxH = Math.max(...ys) - minY;

async function render(size, ratio, fg, bg) {
  const img = await Jimp.create(size, size, bg);
  const scale = (size * ratio) / Math.max(boxW, boxH);
  const ox = (size - boxW * scale) / 2, oy = (size - boxH * scale) / 2;
  const polys = POLYS.map((p) => p.map(([px, py]) => [(px - minX) * scale + ox, (py - minY) * scale + oy]));
  const cov = new Float32Array(size * size);
  const SUB = 8;
  for (let sy = 0; sy < size * SUB; sy++) {
    const yy = (sy + 0.5) / SUB;
    const hits = [];
    for (const p of polys)
      for (let k = 0; k < p.length; k++) {
        const [ax, ay] = p[k], [bx, by] = p[(k + 1) % p.length];
        if ((ay <= yy) !== (by <= yy)) hits.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
      }
    hits.sort((a, b) => a - b);
    const row = Math.floor(yy) * size;
    for (let k = 0; k + 1 < hits.length; k += 2) {
      const x0 = Math.max(0, hits[k]), x1 = Math.min(size, hits[k + 1]);
      for (let px = Math.floor(x0); px < Math.ceil(x1); px++) {
        cov[row + px] += (Math.min(px + 1, x1) - Math.max(px, x0)) / SUB;
      }
    }
  }
  const rgb = [(fg >>> 24) & 255, (fg >>> 16) & 255, (fg >>> 8) & 255];
  const data = img.bitmap.data;
  for (let k = 0; k < size * size; k++) {
    const a = Math.min(1, cov[k]);
    if (!a) continue;
    const o = k * 4, ba = data[o + 3] / 255, outA = a + ba * (1 - a);
    for (let c = 0; c < 3; c++) data[o + c] = (rgb[c] * a + data[o + c] * ba * (1 - a)) / outA;
    data[o + 3] = outA * 255;
  }
  return img;
}

const ICONS = [
  ["icon.png", 1024, 0.6, FG, BG],
  ["ios-light.png", 1024, 0.6, FG, LIGHT_BG],
  ["ios-dark.png", 1024, 0.6, FG, BG],
  ["ios-tinted.png", 1024, 0.6, GRAY, BLACK],
  ["android-icon-foreground.png", 1024, 0.45, FG, NONE],
  ["android-icon-monochrome.png", 1024, 0.45, WHITE, NONE],
  ["splash-icon.png", 1024, 0.8, FG, NONE],
  ["favicon.png", 48, 0.8, FG, BG],
];

const TILE = 256, GAP = 24;
const MASKS = {
  rounded: (x, y) => {
    const r = TILE * 0.22, cx = Math.min(Math.max(x, r), TILE - r), cy = Math.min(Math.max(y, r), TILE - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  },
  circle: (x, y) => (x - TILE / 2) ** 2 + (y - TILE / 2) ** 2 <= (TILE / 2) ** 2,
  squircle: (x, y) => Math.abs(x / (TILE / 2) - 1) ** 4 + Math.abs(y / (TILE / 2) - 1) ** 4 <= 1,
};

async function tile(img, bg, mask, viewport) {
  const src = img.clone();
  const crop = Math.round(src.bitmap.width * viewport), off = Math.round((src.bitmap.width - crop) / 2);
  src.crop(off, off, crop, crop).resize(TILE, TILE);
  const t = await Jimp.create(TILE, TILE, bg);
  t.composite(src, 0, 0);
  t.scan(0, 0, TILE, TILE, function (x, y, i) {
    if (!MASKS[mask](x + 0.5, y + 0.5)) this.bitmap.data[i + 3] = 0;
  });
  return t;
}

(async () => {
  const out = {};
  for (const [file, size, ratio, fg, bg] of ICONS) {
    out[file] = await render(size, ratio, fg, bg);
    await out[file].writeAsync(path.join(project, "assets", file));
    console.log("ok", `assets/${file}`);
  }

  const rows = [
    [["ios-light.png", 0, "rounded", 1], ["ios-dark.png", 0, "rounded", 1], ["ios-tinted.png", 0, "rounded", 1]],
    [
      ["android-icon-foreground.png", BG, "circle", 72 / 108],
      ["android-icon-foreground.png", BG, "squircle", 72 / 108],
      ["android-icon-monochrome.png", 0x2b3a55ff, "circle", 72 / 108],
    ],
  ];
  const preview = await Jimp.create(3 * TILE + 4 * GAP, 2 * TILE + 3 * GAP, 0x808080ff);
  for (let r = 0; r < rows.length; r++)
    for (let c = 0; c < 3; c++) {
      const [file, bg, mask, viewport] = rows[r][c];
      preview.composite(await tile(out[file], bg, mask, viewport), GAP + c * (TILE + GAP), GAP + r * (TILE + GAP));
    }
  const previewPath = path.join(os.tmpdir(), "icon-preview.png");
  await preview.writeAsync(previewPath);
  console.log("prévia:", previewPath);
})();
