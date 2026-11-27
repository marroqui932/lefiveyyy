'use strict';
/* ============================================================
   ICÔNES - jeu d'icônes SVG au trait (24x24, currentColor).
   ic('ball') -> <svg class="ic">…</svg> ; ic('ball',20) pour une taille précise.
   ============================================================ */
const ICONS={
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  boot:'<path d="M4 6h5v5.5l4.5 2.2c2.6.4 6.5 1.3 6.5 4.3v1H4z"/><path d="M4 16h16M8.5 13.5l1.5-1.2M11 14.5l1.4-1.1"/>',
  ball:'<circle cx="12" cy="12" r="9"/><path d="m12 7.5 4.2 3-1.6 5h-5.2l-1.6-5z"/><path d="M12 3v4.5M21 10.3l-4.8.2M17.6 19.4l-3-3.9M6.4 19.4l3-3.9M3 10.3l4.8.2"/>',
  pitch:'<rect x="2.5" y="4.5" width="19" height="15" rx="1.5"/><path d="M12 4.5v15"/><circle cx="12" cy="12" r="2.6"/><path d="M2.5 9h3v6h-3M21.5 9h-3v6h3"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2.1.7 3.5 2.8 3.5 5.6"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4"/><path d="M12 13v4M8.5 21h7M9.5 17h5v4h-5z"/>',
  medal:'<circle cx="12" cy="15" r="5.5"/><path d="M8.5 10.6 5.5 3h4l2.5 5.5L14.5 3h4l-3 7.6"/><path d="m12 12.6.9 1.7 1.9.3-1.4 1.3.3 1.9-1.7-.9-1.7.9.3-1.9-1.4-1.3 1.9-.3z"/>',
  link:'<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L12 5.6"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>',
  scale:'<path d="M12 3v18M7 21h10M4 7h16"/><path d="m6.5 7-3 6.5a3 3 0 0 0 6 0zM17.5 7l-3 6.5a3 3 0 0 0 6 0z"/>',
  shuffle:'<path d="M3 7h3.5c2 0 3.3 1 4.4 2.6l2.2 3.3c1.1 1.6 2.4 2.6 4.4 2.6H21"/><path d="M3 17h3.5c1.4 0 2.4-.5 3.3-1.4M14.2 8.4c.9-.9 1.9-1.4 3.3-1.4H21"/><path d="m18 4 3 3-3 3M18 13l3 3-3 3"/>',
  database:'<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13"/><path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
  login:'<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M3.5 12H15M11 8l4 4-4 4"/>',
  logout:'<path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10"/><path d="M9 12h11.5M16.5 8l4 4-4 4"/>',
  edit:'<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6"/><path d="M5.5 7l1 12.5A1.5 1.5 0 0 0 8 21h8a1.5 1.5 0 0 0 1.5-1.5L18.5 7"/><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  minus:'<path d="M5 12h14"/>',
  pin:'<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  star:'<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  crown:'<path d="M3.5 8 7.5 12 12 5l4.5 7 4-4-1.8 10.5H5.3z"/><path d="M5.3 21h13.4"/>',
  trend:'<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  flame:'<path d="M12 21c-4 0-7-2.8-7-6.6 0-3.1 2-5.1 3.6-7 .4 1.8 1.4 3 2.6 3.6C11 7.5 12.3 5 15 3c-.4 2.6.6 4.5 2 6.3 1.2 1.5 2 3.1 2 5.1C19 18.2 16 21 12 21z"/><path d="M12 21c-1.7 0-3-1.2-3-2.9 0-1.6 1.2-2.6 2.2-3.6.3 1 .9 1.6 1.6 1.9.2-1 .7-1.9 1.6-2.6.1 1.2.6 2 1 2.7.4.6.6 1.1.6 1.8 0 1.6-1.3 2.7-3 2.7z"/>',
  shield:'<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6z"/>',
  arrowRight:'<path d="M4 12h16M14 6l6 6-6 6"/>',
  arrowLeft:'<path d="M20 12H4M10 6l-6 6 6 6"/>',
  swap:'<path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  play:'<path d="M7 4.5v15l12.5-7.5z"/>',
  video:'<rect x="2.5" y="6" width="13.5" height="12" rx="2"/><path d="m16 10.5 5.5-3.5v10L16 13.5"/>',
  upload:'<path d="M12 15V3M7 8l5-5 5 5M4 15v4.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V15"/>',
  download:'<path d="M12 3v12M7 10l5 5 5-5M4 15v4.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V15"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.8"/><path d="m21 16-5-5-9 9"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.5-4.5"/>',
  lock:'<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  alert:'<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.3"/>',
  zap:'<path d="M13 2.5 4.5 13.5H12L11 21.5l8.5-11H12z"/>',
  history:'<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4v4h4"/><path d="M12 8v4.5l3 2"/>',
  map:'<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  more:'<circle cx="5.5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor"/>',
  heart:'<path d="M12 20.5S3.5 15.5 3.5 9.3A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 8.5 2.9c0 6.2-8.5 11.2-8.5 11.2z"/>',
  heartOff:'<path d="M12 20.5S3.5 15.5 3.5 9.3A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 8.5 2.9c0 6.2-8.5 11.2-8.5 11.2z"/><path d="m12 6.4-1.5 4 3 2-1.5 4"/>',
  swords:'<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 6.5 14 3h3v3l-3.5 4.5M5 14l4 4M7 17l-3 3M5 21l-2-2"/>',
  skull:'<path d="M12 3a8 8 0 0 0-8 8c0 2.8 1.4 4.6 3 5.6V20h10v-3.4c1.6-1 3-2.8 3-5.6a8 8 0 0 0-8-8z"/><circle cx="9" cy="11.5" r="1.6"/><circle cx="15" cy="11.5" r="1.6"/><path d="M10.5 20v-2.5M13.5 20v-2.5"/>',
  gauge:'<path d="M4 18a8.5 8.5 0 1 1 16 0"/><path d="m12 14 4-5"/><circle cx="12" cy="14" r="1.3" fill="currentColor"/>',
  timer:'<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5"/>',
  sparkles:'<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  goalNet:'<path d="M3 20V6h18v14"/><path d="M3 10h18M3 14h18M7.5 6v14M12 6v14M16.5 6v14"/>',
  refresh:'<path d="M20 11.5A8 8 0 0 0 5.6 6.3L3.5 8.5"/><path d="M3.5 3.5v5h5"/><path d="M4 12.5a8 8 0 0 0 14.4 5.2l2.1-2.2"/><path d="M20.5 20.5v-5h-5"/>',
  save:'<path d="M5 3.5h11l4.5 4.5v11a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z"/><path d="M7.5 3.5v5h8v-5M7.5 20.5v-6.5h9v6.5"/>',
  cloud:'<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.7A3.7 3.7 0 0 1 17.5 18.5z"/>',
  hash:'<path d="M5 9h15M4 15h15M10 3.5 8 20.5M16 3.5l-2 17"/>',
  fullscreen:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  compress:'<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  github:'<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>'
};
function ic(name,size){
  const body=ICONS[name];
  if(!body) return '';
  const s=size? ` width="${size}" height="${size}"` : '';
  return `<svg class="ic"${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
/* Couleurs des équipes, utilisées partout (badges, carte des actions, courbe du score, comparateur). */
const TEAM_COLORS={A:'#3b82f6', B:'#f97316', tie:'#a78bfa'};
