/* Generates color-coded flowchart SVGs (one per role + a combined one) into
   docs/flows/. Shows UI -> REST API -> Auth -> Controller/Logic -> MongoDB,
   where Socket.IO fires, and Yes/No decisions.  Run: node docs/flow-gen.js */
const fs = require('fs');
const path = require('path');

const LAYER = {
  start:   { fill: '#334155', text: '#FFFFFF', shape: 'pill' },
  end:     { fill: '#334155', text: '#FFFFFF', shape: 'pill' },
  ui:      { fill: '#3B82F6', text: '#FFFFFF', shape: 'rect' },   // App / UI
  api:     { fill: '#0EA5A4', text: '#FFFFFF', shape: 'rect' },   // REST API
  auth:    { fill: '#F59E0B', text: '#1F2937', shape: 'rect' },   // Auth / Validation
  logic:   { fill: '#6366F1', text: '#FFFFFF', shape: 'rect' },   // Controller / Logic
  db:      { fill: '#10B981', text: '#FFFFFF', shape: 'cyl'  },   // MongoDB
  socket:  { fill: '#8B5CF6', text: '#FFFFFF', shape: 'rect' },   // Socket.IO
  notify:  { fill: '#EC4899', text: '#FFFFFF', shape: 'rect' },   // Notification
  decision:{ fill: '#FBBF24', text: '#1F2937', shape: 'diamond' },
  ai:      { fill: '#0D9488', text: '#FFFFFF', shape: 'rect' },   // AI service
};
const LEGEND = [
  ['ui', 'App / UI'], ['api', 'REST API'], ['auth', 'Auth / Validation'],
  ['logic', 'Controller / Logic'], ['ai', 'AI Triage'], ['db', 'MongoDB (store/fetch)'],
  ['socket', 'Socket.IO (live)'], ['notify', 'Notification'], ['decision', 'Decision (Yes/No)'],
];

const DIM = {
  rect:    { w: 200, h: 60 },
  pill:    { w: 176, h: 46 },
  diamond: { w: 168, h: 96 },
  cyl:     { w: 188, h: 70 },
};
const COLW = 250, ROWH = 128, MARGIN = 44, TOP = 150;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function textLines(label, cx, cy, color, size = 13) {
  const lines = String(label).split('\n');
  const lh = size + 3;
  const startY = cy - ((lines.length - 1) * lh) / 2;
  return lines.map((ln, i) =>
    `<text x="${cx}" y="${startY + i * lh}" text-anchor="middle" dominant-baseline="central" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="600" fill="${color}">${esc(ln)}</text>`
  ).join('');
}

function nodeBox(n) {
  const L = LAYER[n.type];
  const d = DIM[L.shape];
  const cx = MARGIN + n.col * COLW + COLW / 2;
  const cy = TOP + n.row * ROWH + ROWH / 2;
  return { ...n, L, w: d.w, h: d.h, cx, cy, left: cx - d.w / 2, right: cx + d.w / 2, top: cy - d.h / 2, bottom: cy + d.h / 2 };
}

function renderNode(b) {
  const { L, cx, cy, w, h } = b;
  let shape = '';
  if (L.shape === 'rect') shape = `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="10" fill="${L.fill}" stroke="rgba(0,0,0,0.15)"/>`;
  else if (L.shape === 'pill') shape = `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${L.fill}"/>`;
  else if (L.shape === 'diamond') { const p = `${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}`; shape = `<polygon points="${p}" fill="${L.fill}" stroke="rgba(0,0,0,0.15)"/>`; }
  else if (L.shape === 'cyl') {
    const rx = w / 2, ry = 10, x = cx - rx, yTop = cy - h / 2, yBot = cy + h / 2 - ry;
    shape = `<path d="M${x},${yTop + ry} a${rx},${ry} 0 0 1 ${w},0 v${h - 2 * ry} a${rx},${ry} 0 0 1 -${w},0 Z" fill="${L.fill}" stroke="rgba(0,0,0,0.15)"/>` +
      `<ellipse cx="${cx}" cy="${yTop + ry}" rx="${rx}" ry="${ry}" fill="rgba(255,255,255,0.18)"/>`;
  }
  return shape + textLines(b.label, cx, cy + (L.shape === 'cyl' ? 4 : 0), L.text);
}

function anchors(a, b) {
  const dr = b.row - a.row, dc = b.col - a.col;
  let s, e;
  if (dr > 0) { s = [a.cx, a.bottom]; e = [b.cx, b.top]; }
  else if (dr < 0) { s = [a.right, a.cy]; e = [b.right, b.cy]; }        // loop back (route right)
  else if (dc > 0) { s = [a.right, a.cy]; e = [b.left, b.cy]; }
  else { s = [a.left, a.cy]; e = [b.right, b.cy]; }
  return { s, e, dr, dc };
}

function renderEdge(a, b, label) {
  const { s, e, dr, dc } = anchors(a, b);
  let d;
  if (dr < 0) { // loop back: go right, up, into right side of target
    const bend = Math.max(a.right, b.right) + 46;
    d = `M${s[0]},${s[1]} H${bend} V${e[1]} H${e[0]}`;
  } else if (dr > 0 && dc !== 0) { // down + across: elbow
    const midY = (s[1] + e[1]) / 2;
    d = `M${s[0]},${s[1]} V${midY} H${e[0]} V${e[1]}`;
  } else if (dr === 0) { // sideways: straight
    d = `M${s[0]},${s[1]} H${e[0]}`;
  } else { // straight down
    d = `M${s[0]},${s[1]} V${e[1]}`;
  }
  let lbl = '';
  if (label) {
    const lx = dr === 0 ? (s[0] + e[0]) / 2 : (dc !== 0 ? e[0] : s[0]);
    const ly = dr === 0 ? s[1] - 10 : (s[1] + e[1]) / 2;
    const wgt = label.toLowerCase() === 'yes' ? '#059669' : (label.toLowerCase() === 'no' ? '#DC2626' : '#374151');
    lbl = `<rect x="${lx - 16}" y="${ly - 11}" width="32" height="20" rx="5" fill="#FFFFFF" stroke="${wgt}"/>` +
      `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-family="Segoe UI, Arial" font-size="11" font-weight="700" fill="${wgt}">${esc(label)}</text>`;
  }
  return `<path d="${d}" fill="none" stroke="#64748B" stroke-width="2" marker-end="url(#ar--)"/>` + lbl;
}

function render(spec) {
  const boxes = {};
  spec.nodes.forEach((n) => { boxes[n.id] = nodeBox(n); });
  let maxCol = 0, maxRow = 0;
  spec.nodes.forEach((n) => { maxCol = Math.max(maxCol, n.col); maxRow = Math.max(maxRow, n.row); });
  const W = MARGIN * 2 + (maxCol + 1) * COLW;
  const H = TOP + (maxRow + 1) * ROWH + MARGIN;

  const edges = spec.edges.map((ed) => renderEdge(boxes[ed.from], boxes[ed.to], ed.label)).join('\n');
  const nodes = spec.nodes.map((n) => renderNode(boxes[n.id])).join('\n');

  // legend
  let lx = MARGIN, ly = 92; let legend = '';
  LEGEND.forEach(([k, name]) => {
    legend += `<rect x="${lx}" y="${ly}" width="18" height="18" rx="4" fill="${LAYER[k].fill}" stroke="rgba(0,0,0,0.15)"/>` +
      `<text x="${lx + 24}" y="${ly + 9}" dominant-baseline="central" font-family="Segoe UI, Arial" font-size="12" fill="#334155">${esc(name)}</text>`;
    lx += 40 + name.length * 7.2 + 26;
    if (lx > W - 220) { lx = MARGIN; ly += 26; }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <marker id="ar--" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L8,3 L0,6 Z" fill="#64748B"/>
    </marker>
  </defs>
  <rect width="${W}" height="${H}" fill="#F8FAFC"/>
  <text x="${MARGIN}" y="46" font-family="Segoe UI, Arial" font-size="26" font-weight="800" fill="#0F766E">${esc(spec.title)}</text>
  <text x="${MARGIN}" y="72" font-family="Segoe UI, Arial" font-size="13" fill="#64748B">${esc(spec.subtitle || '')}</text>
  ${legend}
  ${edges}
  ${nodes}
</svg>`;
}

// ---------------- diagram specs ----------------
const diagrams = require('./flow-specs');

const outDir = path.join(__dirname, 'flows');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
diagrams.forEach((spec) => {
  const svg = render(spec);
  const file = path.join(outDir, spec.file);
  fs.writeFileSync(file, svg);
  console.log('wrote', path.relative(process.cwd(), file));
});
console.log('done');
