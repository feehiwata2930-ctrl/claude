// tracinhos.js — desenha os tracinhos da lente Direção.
// A grade é em espaço de TELA (espaçamento fixo em px): a densidade na tela é a mesma em
// qualquer zoom. Ela é ancorada na origem da imagem, então anda junto com a imagem ao arrastar.

const ESPACO = 30;   // px entre tracinhos
const COMPR = 18;    // comprimento do tracinho

/**
 * @param dados { angulo, forca, l, a }  campo de direção (l × a células)
 * @param vista { escala, x, y }          posição da imagem na tela
 */
export function desenharTracinhos(ctx, dados, vista, baseL, baseA, dpr, telaL, telaA) {
  const { angulo, forca, l, a } = dados;
  const w = baseL * vista.escala, h = baseA * vista.escala;
  const x0 = Math.max(0, vista.x), x1 = Math.min(telaL, vista.x + w);
  const y0 = Math.max(0, vista.y), y1 = Math.min(telaA, vista.y + h);
  const i0 = Math.ceil((x0 - vista.x) / ESPACO - 0.5), i1 = Math.floor((x1 - vista.x) / ESPACO - 0.5);
  const j0 = Math.ceil((y0 - vista.y) / ESPACO - 0.5), j1 = Math.floor((y1 - vista.y) / ESPACO - 0.5);
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round';
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const sx = vista.x + (i + 0.5) * ESPACO, sy = vista.y + (j + 0.5) * ESPACO;
      const u = (sx - vista.x) / w, v = (sy - vista.y) / h;
      if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
      const k = Math.floor(v * a) * l + Math.floor(u * l);
      const f = forca[k];
      if (f < 28) continue;                       // coerência baixa: sem direção confiável
      const ang = (angulo[k] / 255) * Math.PI;
      const dx = Math.cos(ang) * COMPR / 2, dy = Math.sin(ang) * COMPR / 2;
      ctx.globalAlpha = Math.min(1, f / 255 * 1.15);
      ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = 5.5;
      ctx.beginPath(); ctx.moveTo(sx - dx, sy - dy); ctx.lineTo(sx + dx, sy + dy); ctx.stroke();
      ctx.strokeStyle = 'rgb(255,238,190)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sx - dx, sy - dy); ctx.lineTo(sx + dx, sy + dy); ctx.stroke();
    }
  }
  ctx.restore();
}
