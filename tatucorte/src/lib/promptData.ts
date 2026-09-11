// Dados curados para o Gerador de Prompt: cada opção guarda o rótulo em
// português (usado na UI e no prompt do ChatGPT) e o fragmento em inglês
// (usado no prompt do Midjourney, que responde melhor em inglês).

export interface PromptOption {
  id: string
  pt: string
  en: string
}

export const SUBJECTS: PromptOption[] = [
  { id: 'retrato', pt: 'Retrato humano realista (rosto)', en: 'hyper-realistic human portrait, detailed facial features' },
  { id: 'animal-selvagem', pt: 'Animal selvagem (lobo, leão, tigre, águia...)', en: 'realistic wild animal portrait (wolf, lion, tiger or eagle)' },
  { id: 'animal-domestico', pt: 'Retrato de animal de estimação (memorial)', en: 'realistic pet portrait, memorial style' },
  { id: 'caveira', pt: 'Caveira realista (skull)', en: 'hyper-realistic human skull' },
  { id: 'religioso', pt: 'Figura religiosa (santo, anjo, virgem, cristo)', en: 'realistic religious figure, saint, angel or virgin mary statue style' },
  { id: 'relogio', pt: 'Relógio ou ampulheta (tempo)', en: 'realistic pocket watch or hourglass with clockwork details' },
  { id: 'flor', pt: 'Rosa ou flor realista', en: 'hyper-realistic rose or flower with detailed petals' },
  { id: 'natureza', pt: 'Paisagem natural (árvore morta, floresta, montanha)', en: 'realistic nature scene, dead tree, dark forest or mountain' },
  { id: 'biomecanico', pt: 'Biomecânico (pele rasgada revelando mecanismo)', en: 'biomechanical design, torn skin revealing machinery underneath' },
  { id: 'mitologico', pt: 'Figura mitológica (fênix, dragão, deus grego)', en: 'realistic mythological figure, phoenix, dragon or greek god statue' },
]

export const SECONDARY_ELEMENTS: PromptOption[] = [
  { id: 'fumaca', pt: 'Fumaça densa', en: 'dense swirling smoke' },
  { id: 'correntes', pt: 'Correntes quebradas', en: 'broken chains' },
  { id: 'engrenagens', pt: 'Engrenagens de relógio', en: 'clockwork gears' },
  { id: 'rosas', pt: 'Rosas ao redor', en: 'roses surrounding the main subject' },
  { id: 'mandala', pt: 'Mandala geométrica', en: 'geometric mandala pattern' },
  { id: 'moldura', pt: 'Moldura ornamentada', en: 'ornate baroque frame' },
  { id: 'penas', pt: 'Penas caindo', en: 'falling feathers' },
  { id: 'lua', pt: 'Lua cheia ao fundo', en: 'full moon in the background' },
  { id: 'chamas', pt: 'Chamas', en: 'realistic flames' },
  { id: 'agua', pt: 'Água / ondas', en: 'flowing water waves' },
  { id: 'teia', pt: 'Teia de aranha', en: 'spider web' },
  { id: 'runas', pt: 'Runas / escrita antiga', en: 'ancient runes and old script' },
  { id: 'pele-rasgada', pt: 'Pele rasgada (efeito 3D)', en: 'ripped skin 3D effect revealing the design underneath' },
]

export interface PlacementOption extends PromptOption {
  aspectId: string
  preposition: string // ex.: "no antebraço", "nas costas"
}

export const PLACEMENTS: PlacementOption[] = [
  { id: 'antebraco', pt: 'Antebraço', en: 'forearm', aspectId: '2:3', preposition: 'no antebraço' },
  { id: 'manga-fechada', pt: 'Braço fechado (manga inteira)', en: 'full sleeve arm', aspectId: '3:4', preposition: 'no braço fechado' },
  { id: 'panturrilha', pt: 'Panturrilha', en: 'calf', aspectId: '2:3', preposition: 'na panturrilha' },
  { id: 'coxa', pt: 'Coxa', en: 'thigh', aspectId: '3:4', preposition: 'na coxa' },
  { id: 'costas', pt: 'Costas inteiras', en: 'full back', aspectId: '3:4', preposition: 'nas costas' },
  { id: 'peito', pt: 'Peito', en: 'chest', aspectId: '1:1', preposition: 'no peito' },
  { id: 'costela', pt: 'Costela', en: 'ribcage', aspectId: '3:2', preposition: 'na costela' },
  { id: 'ombro', pt: 'Ombro', en: 'shoulder', aspectId: '1:1', preposition: 'no ombro' },
]

export const FRAMINGS: PromptOption[] = [
  { id: 'close-up', pt: 'Close-up preenchendo o quadro', en: 'extreme close-up portrait filling the frame' },
  { id: 'meio-corpo', pt: 'Meio corpo', en: 'half-body composition' },
  { id: 'corpo-inteiro', pt: 'Corpo inteiro em pose dinâmica', en: 'full body dynamic pose' },
  { id: 'perfil', pt: 'Perfil 3/4', en: 'three-quarter profile view' },
  { id: 'plano-aberto', pt: 'Plano aberto com fundo composto', en: 'wide shot with detailed background environment' },
  { id: 'espaco-negativo', pt: 'Centralizado com espaço negativo ao redor', en: 'centered subject with negative space around it, tattoo flash style composition' },
]

export const REALISM_STYLES: PromptOption[] = [
  { id: 'hiper-realismo', pt: 'Hiper-realismo fotográfico', en: 'photorealistic hyper-realism tattoo design, ultra detailed like a black and grey photograph' },
  { id: 'classico', pt: 'Realismo clássico black and grey', en: 'classic black and grey realism tattoo style' },
  { id: 'sombrio', pt: 'Realismo sombrio / horror', en: 'dark realism horror tattoo style, eerie atmosphere' },
  { id: 'chicano', pt: 'Chicano black and grey', en: 'chicano black and grey tattoo style' },
  { id: 'fine-line', pt: 'Fine line realista', en: 'fine line realism tattoo style, delicate thin linework with subtle shading' },
  { id: 'dotwork', pt: 'Dotwork realista', en: 'realistic dotwork shading tattoo style, stippling technique' },
]

export const LIGHTING: PromptOption[] = [
  { id: 'lateral', pt: 'Lateral dramática (chiaroscuro)', en: 'dramatic side lighting, strong chiaroscuro' },
  { id: 'contraluz', pt: 'Contraluz / silhueta', en: 'backlighting, silhouette rim light' },
  { id: 'suave', pt: 'Suave e difusa', en: 'soft diffused frontal lighting' },
  { id: 'estudio', pt: 'Estúdio com luz única', en: 'single studio key light, controlled shadow falloff' },
  { id: 'uplighting', pt: 'De baixo para cima (sombria)', en: 'low uplighting from below, ominous shadows' },
  { id: 'luar', pt: 'Luar frio', en: 'moonlit atmosphere, desaturated cool tones, deep shadows' },
]

export interface TonalPreset {
  id: string
  pt: string
  ptDetail: string
  enDetail: string
}

export const TONAL_PRESETS: TonalPreset[] = [
  {
    id: 'alto-contraste',
    pt: 'Alto contraste clássico (pretos profundos + brancos puros)',
    ptDetail:
      'Pretos sólidos e profundos nas sombras, transição suave para os cinzas médios, e a pele deixada em branco puro nos pontos de luz (highlights). Contraste bem definido entre luz e sombra.',
    enDetail:
      'pure black and grey palette only, no color, rich deep solid blacks in the shadows, smooth soft gradient through the mid-tones, skin left blank white for the brightest highlights, strong defined contrast between light and shadow',
  },
  {
    id: 'cinza-medio',
    pt: 'Cinza médio suave (transições delicadas)',
    ptDetail:
      'Gama tonal compacta, com poucos pretos totalmente sólidos, priorizando transições de cinza muito suaves e um acabamento delicado.',
    enDetail:
      'black and grey palette only, no color, soft compact tonal range, gentle smooth grey gradients, minimal solid black, delicate soft shading transitions',
  },
  {
    id: 'sombras-densas',
    pt: 'Sombras densas / dark realism',
    ptDetail:
      'Predomínio de pretos e cinzas escuros cobrindo boa parte da composição, com pontos de luz pequenos e dramáticos se destacando.',
    enDetail:
      'black and grey palette only, no color, dominant deep blacks and dark greys covering most of the composition, small dramatic pinpoint highlights, moody dark realism shading',
  },
  {
    id: 'baixo-contraste',
    pt: 'Baixo contraste / fine line',
    ptDetail: 'Tons majoritariamente claros, sombreamento leve e sutil, ideal para linhas finas e traços delicados.',
    enDetail:
      'black and grey palette only, no color, light overall tonal range, subtle soft shading, minimal dark areas, ideal for fine line linework',
  },
]

export const MOODS: PromptOption[] = [
  { id: 'sombrio', pt: 'Sombrio e misterioso', en: 'dark and mysterious mood' },
  { id: 'poderoso', pt: 'Poderoso e imponente', en: 'powerful and imposing mood' },
  { id: 'melancolico', pt: 'Melancólico e nostálgico', en: 'melancholic and nostalgic mood' },
  { id: 'sereno', pt: 'Sereno e contemplativo', en: 'serene and contemplative mood' },
  { id: 'agressivo', pt: 'Agressivo e intenso', en: 'aggressive and intense mood' },
  { id: 'sagrado', pt: 'Sagrado e reverente', en: 'sacred and reverent mood' },
]

export const SHADING_TECHNIQUES: PromptOption[] = [
  { id: 'gradiente', pt: 'Gradiente suave (estilo pincel)', en: 'smooth soft gradient shading, brush-like blending, ideal for realism black and grey tattoo' },
  { id: 'pontilhismo', pt: 'Pontilhismo (dotwork)', en: 'stippling dotwork shading technique' },
  { id: 'contraste-solido', pt: 'Blackwork sólido com contraste forte', en: 'bold solid blackwork mixed with sharp contrast shading' },
]

export interface AspectOption {
  id: string
  label: string
  mj: string
}

export const ASPECT_RATIOS: AspectOption[] = [
  { id: '2:3', label: '2:3 · vertical (antebraço/perna)', mj: '2:3' },
  { id: '3:4', label: '3:4 · vertical', mj: '3:4' },
  { id: '1:1', label: '1:1 · quadrado', mj: '1:1' },
  { id: '4:5', label: '4:5 · retrato para rede social', mj: '4:5' },
  { id: '9:16', label: '9:16 · vertical alongado', mj: '9:16' },
  { id: '3:2', label: '3:2 · horizontal (costela)', mj: '3:2' },
  { id: '16:9', label: '16:9 · horizontal panorâmico', mj: '16:9' },
]

export interface AvoidOption {
  id: string
  pt: string
  en: string
  defaultOn: boolean
}

export const AVOID_OPTIONS: AvoidOption[] = [
  { id: 'cores', pt: 'Sem cores (garantir preto e cinza)', en: 'color, colorful, saturated colors', defaultOn: true },
  { id: 'fundo-poluido', pt: 'Sem fundo poluído', en: 'busy background, cluttered background', defaultOn: true },
  { id: 'marca-dagua', pt: "Sem marca d'água ou texto", en: 'watermark, text, signature, logo', defaultOn: true },
  { id: 'anatomia', pt: 'Sem erros de anatomia', en: 'extra fingers, deformed hands, distorted anatomy, extra limbs', defaultOn: true },
  { id: 'cartoon', pt: 'Sem estilo cartoon/anime', en: 'cartoon, anime, illustration style, 3d render', defaultOn: true },
]
