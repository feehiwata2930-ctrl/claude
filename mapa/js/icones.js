// icones.js — todos os ícones do app em SVG (o app não usa texto durante o uso).

const svg = (miolo, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${miolo}</svg>`;

export const icones = {
  mais: svg('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.6"'),
  voltar: svg('<path d="M15 5l-7 7 7 7"/>'),
  ok: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="2.6"'),
  fechar: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  lixeira: svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>'),
  apagarTecla: svg('<path d="M9 5h11v14H9l-6-7z"/><path d="M12 9.5l5 5M17 9.5l-5 5"/>'),
  engrenagem: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>'),

  // Cicatrizado: curativo
  cicatrizado: svg('<rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-35 12 12)"/><path d="M10 10.5l.01 0M12 12l.01 0M14 13.5l.01 0" stroke-width="2.6"/>'),

  // Segurar o dedo num ponto
  segurar: svg('<circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="8.5" stroke-dasharray="3.2 3"/>'),
  // Aviso: a tela pode apagar
  semtela: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M3 3l18 18"/>'),

  // --- Lentes ---
  // Referência: uma foto
  referencia: svg('<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M4 17l5-5 4 4 2.5-2.5L20 17"/>'),
  // Na pele: braço com uma mancha de tinta
  pele: svg('<path d="M5 21V10c0-4 3-7 7-7s7 3 7 7v11"/><ellipse cx="12" cy="12.5" rx="3" ry="4" fill="currentColor" stroke="none"/>'),
  // Potes: escada de cinzas
  potes: `<svg viewBox="0 0 24 24"><rect x="2.5" y="4" width="5.4" height="16" rx="1.2" fill="currentColor"/><rect x="9.3" y="4" width="5.4" height="16" rx="1.2" fill="currentColor" opacity=".6"/><rect x="16.1" y="4" width="5.4" height="16" rx="1.2" fill="currentColor" opacity=".28"/></svg>`,
  // Textura: liso de um lado, granulado do outro
  textura: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="6" r="1.5"/><circle cx="10" cy="5" r="1.2"/><circle cx="7.5" cy="10" r="1.3"/><circle cx="4.5" cy="14" r="1.2"/><circle cx="9.5" cy="15" r="1.5"/><circle cx="6.5" cy="19" r="1.2"/><circle cx="14" cy="8.5" r="1.1"/><circle cx="13.5" cy="18.5" r="1"/><circle cx="18" cy="6" r="1"/><circle cx="19" cy="13" r=".9"/><circle cx="15" cy="13" r="1"/><circle cx="18.5" cy="19" r=".9"/></svg>`,
  // Bordas: metade dura, metade degradê
  bordas: `<svg viewBox="0 0 24 24"><defs><linearGradient id="gB" x1="0" x2="1"><stop offset="0" stop-color="currentColor"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path d="M12 3a9 9 0 000 18z" fill="currentColor"/><rect x="12" y="3" width="10" height="18" fill="url(#gB)" opacity=".8"/><path d="M12 2v20" stroke="currentColor" stroke-width="1.6"/></svg>`,
  // Direção: tracinhos seguindo uma curva
  direcao: svg('<path d="M3 8l4-2M10 5l4 .5M17 7l3.5 2M3 14l4-2M10 11l4 .5M17 13l3.5 2M3 20l4-2M10 17l4 .5M17 19l3.5 2"/>'),
  // Luz: sol
  luz: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3L7 7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7"/>'),
};
