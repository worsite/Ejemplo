// Ilustraciones genéricas de comida en SVG inline (sin depender de internet).
// Cada una usa viewBox 0 0 200 200 y es decorativa (aria-hidden): el nombre del producto va en el texto.
const INK = '#450A0A';
const wrap = (inner) =>
  `<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const s = `stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;

const seeds = (pts) => pts.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="2.4" fill="#FFF3C4"/>`).join('');

const bunTop = (y = 70) => `
  <path d="M30 ${y + 30} C30 ${y - 30} 170 ${y - 30} 170 ${y + 30} Z" fill="#F59E0B" ${s}/>
  ${seeds([[75, y - 8], [100, y - 16], [125, y - 8], [90, y + 4], [112, y + 4]])}`;
const bunBottom = (y = 150) => `<path d="M32 ${y} H168 V${y + 6} Q168 ${y + 24} 150 ${y + 24} H50 Q32 ${y + 24} 32 ${y + 6} Z" fill="#F59E0B" ${s}/>`;
const patty = (y) => `<rect x="26" y="${y}" width="148" height="20" rx="10" fill="#7C2D12" ${s}/>`;
const cheese = (y) => `<path d="M30 ${y} H170 L158 ${y + 18} L138 ${y + 8} L118 ${y + 22} L98 ${y + 8} L78 ${y + 20} L58 ${y + 8} L40 ${y + 18} Z" fill="#FACC15" ${s}/>`;
const lettuce = (y) => `<path d="M24 ${y} q12 -14 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t12 0 v10 H24 Z" fill="#4ADE80" ${s}/>`;
const tomato = (y) => `<rect x="34" y="${y}" width="132" height="12" rx="6" fill="#EF4444" ${s}/>`;

const art = {
  burger: () => wrap(`${bunBottom(148)}${patty(126)}${cheese(116)}${tomato(104)}${lettuce(92)}${bunTop(70)}`),
  doble: () => wrap(`${bunBottom(160)}${patty(140)}${cheese(130)}${patty(112)}${cheese(102)}${lettuce(92)}${bunTop(66)}`),
  pollo: () => wrap(`${bunBottom(148)}
    <path d="M28 142 Q30 108 70 104 Q100 92 132 104 Q172 110 172 142 Z" fill="#FDBA74" ${s}/>
    <circle cx="60" cy="122" r="3" fill="#C2410C"/><circle cx="92" cy="114" r="3" fill="#C2410C"/><circle cx="124" cy="120" r="3" fill="#C2410C"/><circle cx="150" cy="128" r="3" fill="#C2410C"/>
    ${lettuce(94)}${bunTop(70)}`),
  hotdog: () => wrap(`
    <rect x="14" y="96" width="172" height="56" rx="28" fill="#F59E0B" ${s}/>
    <rect x="22" y="78" width="156" height="30" rx="15" fill="#DC2626" ${s}/>
    <path d="M30 90 q10 -10 20 0 t20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke="#FACC15" stroke-width="6" stroke-linecap="round"/>
    <rect x="14" y="108" width="172" height="44" rx="22" fill="#F59E0B" ${s}/>`),
  sandwich: () => wrap(`
    <path d="M30 70 L100 40 L170 70 L170 90 L30 90 Z" fill="#FDE68A" ${s}/>
    <rect x="30" y="90" width="140" height="14" fill="#4ADE80" ${s}/>
    <rect x="30" y="104" width="140" height="12" fill="#EF4444" ${s}/>
    <rect x="30" y="116" width="140" height="12" fill="#FACC15" ${s}/>
    <path d="M30 128 H170 V150 Q170 160 160 160 H40 Q30 160 30 150 Z" fill="#FDE68A" ${s}/>
    <path d="M100 40 L100 90" stroke="${INK}" stroke-width="3"/>
    <circle cx="100" cy="34" r="6" fill="#DC2626" ${s}/>`),
  papas: () => wrap(`
    ${[44, 64, 84, 104, 124, 144].map((x, i) => `<rect x="${x}" y="${40 + (i % 3) * 8}" width="14" height="80" rx="5" fill="#FACC15" ${s} transform="rotate(${(i - 2.5) * 6} ${x + 7} 120)"/>`).join('')}
    <path d="M40 110 H160 L148 176 Q147 184 138 184 H62 Q53 184 52 176 Z" fill="#DC2626" ${s}/>
    <path d="M60 130 H140" stroke="#FACC15" stroke-width="6" stroke-linecap="round"/>
    <path d="M64 150 H136" stroke="#FACC15" stroke-width="6" stroke-linecap="round"/>`),
  nuggets: () => wrap(`
    <path d="M36 110 q-6 -34 28 -40 q40 -8 52 18 q14 28 -16 44 q-40 16 -64 -22 Z" fill="#F59E0B" ${s}/>
    <path d="M100 118 q-6 -30 30 -36 q38 -4 46 26 q4 34 -34 40 q-34 2 -42 -30 Z" fill="#FBBF24" ${s}/>
    <path d="M70 150 q-10 -20 14 -26 q28 -4 34 14 q6 26 -22 30 q-20 0 -26 -18 Z" fill="#F59E0B" ${s}/>
    <circle cx="160" cy="154" r="22" fill="#B91C1C" ${s}/><circle cx="160" cy="154" r="10" fill="#EF4444"/>`),
  aros: () => wrap(`
    ${[[70, 90, 40], [128, 100, 36], [98, 140, 40]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#F59E0B" ${s}/><circle cx="${x}" cy="${y}" r="${r * 0.48}" fill="#FEF2F2" ${s}/>`).join('')}`),
  pizza: () => wrap(`
    <path d="M100 176 L24 52 Q100 16 176 52 Z" fill="#FACC15" ${s}/>
    <path d="M24 52 Q100 16 176 52 L170 64 Q100 32 30 64 Z" fill="#F59E0B" ${s}/>
    <circle cx="82" cy="78" r="10" fill="#DC2626" ${s}/><circle cx="118" cy="82" r="10" fill="#DC2626" ${s}/>
    <circle cx="100" cy="112" r="10" fill="#DC2626" ${s}/><circle cx="98" cy="144" r="8" fill="#DC2626" ${s}/>
    <circle cx="66" cy="96" r="3" fill="#4ADE80"/><circle cx="136" cy="102" r="3" fill="#4ADE80"/>`),
  pizza2: () => wrap(`
    <path d="M100 176 L24 52 Q100 16 176 52 Z" fill="#FDE68A" ${s}/>
    <path d="M24 52 Q100 16 176 52 L170 64 Q100 32 30 64 Z" fill="#F59E0B" ${s}/>
    <rect x="70" y="72" width="22" height="16" rx="5" fill="#F472B6" ${s}/><rect x="112" y="76" width="22" height="16" rx="5" fill="#F472B6" ${s}/>
    <path d="M86 108 l14 -8 l14 8 l-4 16 h-20 Z" fill="#FACC15" ${s}/>
    <path d="M90 136 l10 -6 l10 6 l-3 12 h-14 Z" fill="#FACC15" ${s}/>`),
  soda: () => wrap(`
    <path d="M110 20 L120 20 L126 56" fill="none" stroke="#FACC15" stroke-width="8" stroke-linecap="round"/>
    <path d="M52 52 H148 L136 176 Q135 184 126 184 H74 Q65 184 64 176 Z" fill="#FEF2F2" ${s}/>
    <path d="M56 84 H144 L136 176 Q135 184 126 184 H74 Q65 184 64 176 Z" fill="#7C2D12" ${s}/>
    <rect x="44" y="40" width="112" height="16" rx="8" fill="#DC2626" ${s}/>
    <circle cx="90" cy="120" r="5" fill="#FDBA74"/><circle cx="112" cy="146" r="4" fill="#FDBA74"/><circle cx="104" cy="104" r="3" fill="#FDBA74"/>`),
  malteada: () => wrap(`
    <path d="M60 70 H140 L128 180 Q127 188 118 188 H82 Q73 188 72 180 Z" fill="#FBCFE8" ${s}/>
    <path d="M52 66 Q100 20 148 66 Z" fill="#FFFFFF" ${s}/>
    <circle cx="100" cy="40" r="11" fill="#DC2626" ${s}/>
    <path d="M100 24 L112 6" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M70 110 H130" stroke="#F472B6" stroke-width="8" stroke-linecap="round"/>`),
  helado: () => wrap(`
    <circle cx="64" cy="86" r="28" fill="#F9A8D4" ${s}/><circle cx="136" cy="86" r="28" fill="#FDE68A" ${s}/>
    <circle cx="100" cy="64" r="30" fill="#92400E" ${s}/>
    <path d="M50 108 H150 L132 150 Q128 158 118 158 H82 Q72 158 68 150 Z" fill="#FEF2F2" ${s}/>
    <rect x="76" y="162" width="48" height="12" rx="6" fill="#FEF2F2" ${s}/>
    <path d="M100 174 V190 M80 190 H120" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="100" cy="40" r="7" fill="#DC2626" ${s}/>`),
};

export function artSvg(key) {
  return (art[key] || art.burger)();
}
export const HERO_ART = 'doble';
