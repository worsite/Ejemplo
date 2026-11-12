// Ilustraciones de platos en SVG inline (sin depender de internet). Decorativas: el nombre va en el texto.
const INK = '#4B2328';
const st = `stroke="${INK}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"`;
const thin = `stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
const C = { cream: '#FBF6EC', rim: '#EADFC9', white: '#FFFDF7', brown: '#9A5B34', dark: '#7A3F24', orange: '#E08A3C', gold: '#F2B84B',
  green: '#6BAA55', leaf: '#8CC063', red: '#C8452F', yellow: '#F6D365', rice: '#FFFCEF', bean: '#8A4B2B', potato: '#EBC76A', cream2: '#F3E6C8' };

const wrap = (inner) => `<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

/* ---- piezas ---- */
const plate = () => `<ellipse cx="100" cy="128" rx="90" ry="54" fill="${C.cream}" ${st}/><ellipse cx="100" cy="124" rx="68" ry="38" fill="${C.rim}" ${thin}/>`;
const steam = (x = 100, y = 52) => [-16, 0, 16].map((d, i) => `<path d="M${x + d} ${y + 20} q-7 -8 0 -16 t0 -16" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" opacity="${i === 1 ? 1 : .75}"/>`).join('');
const bowl = (broth, inner = '') => `
  <path d="M22 96 Q26 172 100 176 Q174 172 178 96 Z" fill="${C.cream}" ${st}/>
  <ellipse cx="100" cy="96" rx="78" ry="22" fill="${broth}" ${st}/>${inner}
  <path d="M60 176 H140" ${st}/>`;
const dot = (x, y, r, f) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${thin}/>`;
const blob = (x, y, rx, ry, f, rot = 0) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${thin} transform="rotate(${rot} ${x} ${y})"/>`;
const rice = (x = 70, y = 118, w = 60) => `<path d="M${x - w / 2} ${y} q${w * .12} -${w * .55} ${w / 2} -${w * .42} q${w * .38} -${w * .12} ${w / 2} ${w * .42} q-${w / 2} ${w * .2} -${w} 0z" fill="${C.rice}" ${st}/><path d="M${x - 10} ${y - 14} l4 -2 M${x + 4} ${y - 18} l4 2 M${x + 14} ${y - 10} l4 -2" ${thin}/>`;
const maduro = (x, y) => `${blob(x, y, 14, 8, C.gold, -20)}${dot(x - 4, y - 1, 1.6, C.dark)}${dot(x + 5, y + 2, 1.6, C.dark)}`;
const salad = (x, y) => `${blob(x, y, 18, 10, C.leaf, 15)}${blob(x + 10, y - 6, 12, 7, C.green, -25)}${dot(x - 6, y - 6, 6, C.red)}`;
const potatoes = (x, y) => `${blob(x, y, 12, 9, C.potato, 10)}${blob(x + 16, y + 4, 11, 8, C.potato, -15)}${blob(x + 6, y - 9, 10, 7, C.potato, 30)}<path d="M${x - 2} ${y - 2} h2 M${x + 14} ${y + 3} h2 M${x + 6} ${y - 9} h2" ${thin}/>`;
const fries = (x, y) => [0, 1, 2, 3, 4].map((i) => `<rect x="${x + i * 8}" y="${y - 28 + (i % 2) * 4}" width="7" height="34" rx="2" fill="${C.yellow}" ${thin} transform="rotate(${(i - 2) * 9} ${x + i * 8} ${y})"/>`).join('');
const chicken = (x, y, rot = 0) => `<g transform="rotate(${rot} ${x} ${y})"><path d="M${x - 26} ${y} q2 -22 26 -22 q26 0 24 22 q-2 20 -24 20 q-26 0 -26 -20z" fill="${C.orange}" ${st}/><path d="M${x + 22} ${y - 4} l16 -6 q6 -2 6 4 q0 6 -6 6 l-16 2z" fill="${C.white}" ${thin}/><path d="M${x - 14} ${y - 6} q10 -6 22 0 M${x - 12} ${y + 6} q12 -5 24 0" ${thin} fill="none"/></g>`;
const grill = (x, y, w = 40) => [0, 1, 2].map((i) => `<path d="M${x + i * (w / 3.2)} ${y - 8} l8 16" stroke="${C.dark}" stroke-width="3" stroke-linecap="round"/>`).join('');
const sauce = (x, y, rx, ry, f) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${thin}/>`;

/* ---- vasos ---- */
const glass = (liquid, extra = '') => `
  <path d="M58 52 H142 L128 178 Q127 188 116 188 H84 Q73 188 72 178 Z" fill="${C.white}" ${st}/>
  <path d="M62 84 H138 L128 178 Q127 188 116 188 H84 Q73 188 72 178 Z" fill="${liquid}" ${st}/>
  <rect x="82" y="102" width="14" height="14" rx="3" fill="${C.white}" opacity=".7" ${thin} transform="rotate(12 89 109)"/>
  <rect x="106" y="128" width="14" height="14" rx="3" fill="${C.white}" opacity=".7" ${thin} transform="rotate(-10 113 135)"/>
  <circle cx="124" cy="52" r="20" fill="${C.yellow}" ${st}/><path d="M124 32 V72 M104 52 H144 M110 38 L138 66 M138 38 L110 66" stroke="${INK}" stroke-width="1.6"/>${extra}`;

const ART = {
  sancocho: () => wrap(`${steam(100, 40)}${bowl('#F0B85A', `
    <ellipse cx="62" cy="96" rx="20" ry="8" fill="${C.yellow}" ${st}/>${[50, 58, 66, 74].map((x) => `<path d="M${x} 90 v12" ${thin}/>`).join('')}
    ${blob(112, 94, 16, 9, C.orange, -10)}${blob(140, 98, 12, 7, C.potato, 15)}${blob(96, 104, 12, 6, C.potato, -10)}
    <path d="M86 90 l4 -6 l4 6 M122 106 l4 -6 l4 6" fill="none" stroke="${C.green}" stroke-width="3" stroke-linecap="round"/>`)}`),
  gallina: () => wrap(`${plate()}${chicken(82, 112, -8)}${sauce(98, 122, 44, 16, '#E7A24F').replace('<ellipse', '<ellipse opacity=".0"')}${rice(150, 120, 40)}${maduro(60, 146)}${maduro(78, 152)}${salad(124, 148)}`),
  bandeja: () => wrap(`${plate()}${rice(62, 118, 48)}
    <path d="M92 104 q18 -14 38 -4 q14 12 -2 24 q-22 6 -36 -6z" fill="${C.bean}" ${st}/>${dot(104, 108, 2, C.dark)}${dot(116, 114, 2, C.dark)}
    <path d="M60 136 q30 -16 60 0 l-4 10 q-26 -10 -52 0z" fill="${C.red}" ${st}/>
    ${blob(128, 140, 14, 8, '#E3A04A', 20)}${blob(146, 124, 16, 10, C.white, 5)}${dot(146, 124, 6, C.gold)}
    <path d="M44 100 q-4 -18 10 -20 q16 0 14 20z" fill="${C.green}" ${st}/>${dot(54, 92, 4, '#7B4B2A')}
    ${maduro(86, 150)}${maduro(104, 154)}`),
  bondiola: () => wrap(`${plate()}<path d="M44 112 q8 -30 46 -28 q36 2 46 24 q6 18 -22 24 q-44 8 -70 -20z" fill="${C.brown}" ${st}/>${grill(62, 108, 56)}${potatoes(142, 128)}${dot(150, 138, 1.5, C.white)}${dot(136, 132, 1.5, C.white)}`),
  filete: () => wrap(`${plate()}<path d="M40 118 q4 -34 48 -34 q50 0 58 28 q-6 26 -54 26 q-44 0 -52 -20z" fill="${C.orange}" ${st}/>${grill(62, 112, 60)}${potatoes(146, 130)}`),
  chuleta: () => wrap(`${plate()}<path d="M44 116 q-2 -30 32 -34 q36 -4 52 14 q10 18 -10 30 q-36 14 -66 -2z" fill="${C.brown}" ${st}/>${blob(60, 112, 10, 8, C.white, 0)}${dot(60, 112, 3.5, C.cream2)}${grill(80, 106, 40)}${fries(142, 142)}`),
  sopa_maiz: () => wrap(`${steam(100, 40)}${bowl(C.yellow, `${[[60, 96], [78, 92], [98, 98], [118, 92], [136, 98], [88, 104], [112, 105], [66, 105]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="4.5" fill="#FFE27A" ${thin}/>`).join('')}<path d="M116 86 l3 -7 l3 7" fill="none" stroke="${C.green}" stroke-width="3" stroke-linecap="round"/>`)}`),
  frijoles: () => wrap(`${steam(100, 44)}${bowl(C.bean, `${[[64, 96], [84, 92], [104, 98], [124, 93], [142, 97], [92, 104], [118, 104]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="4.5" fill="#A5603A" ${thin} transform="rotate(${(x % 5) * 10} ${x} ${y})"/>`).join('')}`)}`),
  macarrones: () => wrap(`${plate()}${[[64, 112, -20], [88, 104, 10], [112, 112, -35], [78, 128, 30], [104, 130, -10], [128, 124, 20], [148, 112, 0]].map(([x, y, r]) => `<rect x="${x - 14}" y="${y - 5}" width="28" height="11" rx="5" fill="${C.orange}" ${st} transform="rotate(${r} ${x} ${y})"/><ellipse cx="${x + 13}" cy="${y}" rx="2" ry="3.4" fill="${C.cream2}" transform="rotate(${r} ${x} ${y})"/>`).join('')}${dot(96, 120, 5, C.red)}`),
  papa_bechamel: () => wrap(`${plate()}${potatoes(84, 118)}${potatoes(110, 126)}<path d="M52 112 q10 -14 34 -12 q32 -2 52 14 q10 16 -14 24 q-40 8 -66 -6 q-14 -8 -6 -20z" fill="${C.white}" opacity=".92" ${st}/>${blob(86, 112, 14, 9, C.potato, 10)}${blob(108, 122, 13, 8, C.potato, -12)}${blob(126, 112, 11, 7, C.potato, 20)}<path d="M88 104 l3 -6 l3 6" fill="none" stroke="${C.green}" stroke-width="3" stroke-linecap="round"/>`),
  pollo_sudado: () => wrap(`${plate()}${sauce(100, 124, 60, 28, '#E7A24F')}${chicken(82, 116, -10)}${chicken(122, 126, 18)}${dot(60, 134, 5, C.red)}${dot(142, 112, 5, C.red)}<path d="M96 100 l3 -6 l3 6 M70 146 l3 -6 l3 6" fill="none" stroke="${C.green}" stroke-width="3" stroke-linecap="round"/>`),
  cerdo: () => wrap(`${plate()}${[[70, 110, -12], [100, 118, 4], [130, 112, 14]].map(([x, y, r]) => `<rect x="${x - 22}" y="${y - 13}" width="44" height="26" rx="12" fill="${C.brown}" ${st} transform="rotate(${r} ${x} ${y})"/><path d="M${x - 14} ${y - 4} h26" ${thin} transform="rotate(${r} ${x} ${y})"/>`).join('')}${potatoes(100, 148)}`),
  res: () => wrap(`${plate()}<path d="M38 116 q-2 -32 40 -38 q50 -6 70 18 q10 22 -22 32 q-52 12 -88 -12z" fill="${C.dark}" ${st}/>${grill(58, 108, 70)}${salad(142, 142)}`),
  plato: () => wrap(`${plate()}${rice(78, 120, 56)}${blob(128, 116, 22, 13, C.orange, 10)}${salad(110, 148)}`),
  sopa: () => wrap(`${steam(100, 40)}${bowl('#F0B85A', `${dot(70, 96, 8, C.yellow)}${dot(100, 100, 8, C.orange)}${dot(130, 96, 8, C.potato)}`)}`),
  limonada: () => wrap(glass('#F2E27B')),
  limonada_coco: () => wrap(glass('#FBF3DC', `<path d="M150 64 q14 -6 22 4 q-8 12 -22 8z" fill="${C.cream2}" ${thin}/>`)),
  limonada_cereza: () => wrap(glass('#D9476A', `<circle cx="150" cy="150" r="9" fill="${C.red}" ${st}/><path d="M150 141 q8 -16 18 -18" fill="none" ${st}/>`)),
  limonada_hierbabuena: () => wrap(glass('#B7E08A', `<path d="M144 70 q18 -10 30 6 q-12 14 -30 6z" fill="${C.green}" ${st}/><path d="M148 76 l20 -2" ${thin}/>`)),
  jugo: () => wrap(glass('#F29B3C')),
};

export const ART_OPTIONS = [
  ['plato', 'Plato genérico'], ['sancocho', 'Sancocho'], ['gallina', 'Gallina guisada'], ['bandeja', 'Bandeja paisa'],
  ['bondiola', 'Bondiola'], ['filete', 'Filete de pollo'], ['chuleta', 'Chuleta de cerdo'], ['sopa_maiz', 'Sopa de maíz'],
  ['frijoles', 'Frijoles'], ['macarrones', 'Macarrones'], ['papa_bechamel', 'Papa en bechamel'], ['pollo_sudado', 'Pollo sudado'],
  ['cerdo', 'Cerdo asado'], ['res', 'Res asada'], ['sopa', 'Sopa genérica'], ['limonada', 'Limonada natural'],
  ['limonada_coco', 'Limonada de coco'], ['limonada_cereza', 'Limonada de cereza'], ['limonada_hierbabuena', 'Limonada de hierbabuena'], ['jugo', 'Jugo'],
].map(([key, label]) => ({ key, label }));

// Encuadre ajustado por tipo, para que los platos llenen su recuadro.
const PLATES = new Set(['plato', 'gallina', 'bandeja', 'bondiola', 'filete', 'chuleta', 'macarrones', 'papa_bechamel', 'pollo_sudado', 'cerdo', 'res']);
const BOWLS = new Set(['sancocho', 'sopa_maiz', 'frijoles', 'sopa']);

export function artSvg(key) {
  const k = ART[key] ? key : 'plato';
  const svg = ART[k]();
  if (PLATES.has(k)) return svg.replace('viewBox="0 0 200 200"', 'viewBox="0 62 200 128"');
  if (BOWLS.has(k)) return svg.replace('viewBox="0 0 200 200"', 'viewBox="0 14 200 172"');
  return svg.replace('viewBox="0 0 200 200"', 'viewBox="30 14 140 186"');
}
