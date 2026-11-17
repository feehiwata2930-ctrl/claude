// tatil.js — vibração leve ao travar num ponto.
// Android: navigator.vibrate. iPhone: o Safari não tem essa API; tentamos o "tique"
// do interruptor nativo (iOS 17.4+). Pode não funcionar — por isso o app sempre dá
// também um retorno visual (o círculo pulsa).

let rotulo = null;

function prepararInterruptor() {
  const id = 'tatil-interruptor';
  const caixa = document.createElement('input');
  caixa.type = 'checkbox'; caixa.id = id; caixa.setAttribute('switch', '');
  rotulo = document.createElement('label');
  rotulo.htmlFor = id;
  rotulo.style.cssText = 'position:fixed;left:-99px;top:-99px;opacity:0;pointer-events:none';
  rotulo.appendChild(caixa);
  document.body.appendChild(rotulo);
}

export function vibrar() {
  try {
    if (navigator.vibrate) { navigator.vibrate(12); return; }
    if (!rotulo) prepararInterruptor();
    rotulo.click();
  } catch { /* sem vibração: segue só com o retorno visual */ }
}
