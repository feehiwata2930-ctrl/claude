import {
  ASPECT_RATIOS,
  AVOID_OPTIONS,
  FRAMINGS,
  LIGHTING,
  MOODS,
  PLACEMENTS,
  REALISM_STYLES,
  SECONDARY_ELEMENTS,
  SHADING_TECHNIQUES,
  SUBJECTS,
  TONAL_PRESETS,
} from './promptData'

export interface PromptSelections {
  subjectId: string | null
  elementIds: string[]
  placementId: string
  aspectId: string | null // null = usa o padrão do local do corpo
  framingId: string
  styleId: string
  lightingId: string
  tonalId: string
  moodId: string
  shadingId: string
  avoidIds: string[]
  extra: string
}

export function defaultSelections(): PromptSelections {
  return {
    subjectId: null,
    elementIds: [],
    placementId: PLACEMENTS[0].id,
    aspectId: null,
    framingId: FRAMINGS[1].id,
    styleId: REALISM_STYLES[1].id,
    lightingId: LIGHTING[0].id,
    tonalId: TONAL_PRESETS[0].id,
    moodId: MOODS[0].id,
    shadingId: SHADING_TECHNIQUES[0].id,
    avoidIds: AVOID_OPTIONS.filter((a) => a.defaultOn).map((a) => a.id),
    extra: '',
  }
}

function findById<T extends { id: string }>(list: T[], id: string | null): T | undefined {
  return list.find((item) => item.id === id)
}

export function resolveAspect(sel: PromptSelections): string {
  if (sel.aspectId) return sel.aspectId
  const placement = findById(PLACEMENTS, sel.placementId)
  return placement?.aspectId ?? ASPECT_RATIOS[0].id
}

export interface PromptResult {
  title: string
  midjourney: string
  chatgpt: string
}

export function buildPrompt(sel: PromptSelections): PromptResult | null {
  const subject = findById(SUBJECTS, sel.subjectId)
  if (!subject) return null

  const placement = findById(PLACEMENTS, sel.placementId) ?? PLACEMENTS[0]
  const framing = findById(FRAMINGS, sel.framingId) ?? FRAMINGS[0]
  const style = findById(REALISM_STYLES, sel.styleId) ?? REALISM_STYLES[0]
  const lighting = findById(LIGHTING, sel.lightingId) ?? LIGHTING[0]
  const tonal = findById(TONAL_PRESETS, sel.tonalId) ?? TONAL_PRESETS[0]
  const mood = findById(MOODS, sel.moodId) ?? MOODS[0]
  const shading = findById(SHADING_TECHNIQUES, sel.shadingId) ?? SHADING_TECHNIQUES[0]
  const elements = sel.elementIds.map((id) => findById(SECONDARY_ELEMENTS, id)).filter((e): e is NonNullable<typeof e> => !!e)
  const avoids = sel.avoidIds.map((id) => findById(AVOID_OPTIONS, id)).filter((a): a is NonNullable<typeof a> => !!a)
  const aspect = findById(ASPECT_RATIOS, resolveAspect(sel)) ?? ASPECT_RATIOS[0]

  const elementsEn = elements.map((e) => e.en)
  const elementsPt = elements.map((e) => e.pt.toLowerCase())

  const mjParts = [
    'black and grey realism tattoo design',
    subject.en,
    ...elementsEn,
    framing.en,
    style.en,
    lighting.en,
    shading.en,
    mood.en,
    tonal.enDetail,
    `designed for ${placement.en} placement, clean composition suitable for tattooing`,
  ]
  if (sel.extra.trim()) mjParts.push(sel.extra.trim())
  const noList = avoids.map((a) => a.en).join(', ')
  const midjourney = `${mjParts.join(', ')} --ar ${aspect.mj} --style raw --v 6.1${noList ? ` --no ${noList}` : ''}`

  const chatgptParts: string[] = []
  chatgptParts.push(
    `Crie uma imagem de referência para tatuagem realista em preto e cinza (sem nenhuma cor), com o seguinte conceito: ${subject.pt.toLowerCase()}${
      elementsPt.length ? `, combinando elementos como ${elementsPt.join(', ')}` : ''
    }.`,
  )
  chatgptParts.push(`Composição: ${framing.pt.toLowerCase()}, pensada para aplicação ${placement.preposition}.`)
  chatgptParts.push(`Estilo: ${style.pt.toLowerCase()}.`)
  chatgptParts.push(`Iluminação: ${lighting.pt.toLowerCase()}.`)
  chatgptParts.push(`Sombreamento: ${shading.pt.toLowerCase()}.`)
  chatgptParts.push(`Atmosfera: ${mood.pt.toLowerCase()}.`)
  chatgptParts.push(`Tonalidade: ${tonal.ptDetail}`)
  if (avoids.length) chatgptParts.push(`Evite: ${avoids.map((a) => a.pt.toLowerCase()).join(', ')}.`)
  if (sel.extra.trim()) chatgptParts.push(sel.extra.trim())
  chatgptParts.push(
    'A imagem deve funcionar como referência técnica para um tatuador reproduzir com agulha: priorize contornos definidos e transições de sombra realistas, sem elementos que a técnica de tatuagem em preto e cinza não consiga reproduzir.',
  )
  const chatgpt = chatgptParts.join(' ')

  const title = [subject.pt, placement.pt].join(' · ')

  return { title, midjourney, chatgpt }
}

function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function pickRandomSubset<T>(list: T[], min: number, max: number): T[] {
  const count = min + Math.floor(Math.random() * (max - min + 1))
  const pool = [...list]
  const picked: T[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked
}

/** Sorteia uma combinação inteira, evitando repetir exatamente a anterior. */
export function randomSelections(previous: PromptSelections | null): PromptSelections {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate: PromptSelections = {
      subjectId: pickRandom(SUBJECTS).id,
      elementIds: pickRandomSubset(SECONDARY_ELEMENTS, 0, 3).map((e) => e.id),
      placementId: pickRandom(PLACEMENTS).id,
      aspectId: null,
      framingId: pickRandom(FRAMINGS).id,
      styleId: pickRandom(REALISM_STYLES).id,
      lightingId: pickRandom(LIGHTING).id,
      tonalId: pickRandom(TONAL_PRESETS).id,
      moodId: pickRandom(MOODS).id,
      shadingId: pickRandom(SHADING_TECHNIQUES).id,
      avoidIds: AVOID_OPTIONS.filter((a) => a.defaultOn).map((a) => a.id),
      extra: previous?.extra ?? '',
    }
    const signature = (s: PromptSelections) => `${s.subjectId}|${s.placementId}|${s.styleId}|${s.tonalId}|${s.moodId}`
    if (!previous || signature(candidate) !== signature(previous)) return candidate
  }
  return { ...defaultSelections(), subjectId: pickRandom(SUBJECTS).id }
}

/** Sorteia só um campo específico, mantendo o resto da combinação. */
export function randomizeField(sel: PromptSelections, field: keyof PromptSelections): PromptSelections {
  switch (field) {
    case 'subjectId':
      return { ...sel, subjectId: pickRandom(SUBJECTS).id }
    case 'elementIds':
      return { ...sel, elementIds: pickRandomSubset(SECONDARY_ELEMENTS, 1, 3).map((e) => e.id) }
    case 'placementId':
      return { ...sel, placementId: pickRandom(PLACEMENTS).id }
    case 'framingId':
      return { ...sel, framingId: pickRandom(FRAMINGS).id }
    case 'styleId':
      return { ...sel, styleId: pickRandom(REALISM_STYLES).id }
    case 'lightingId':
      return { ...sel, lightingId: pickRandom(LIGHTING).id }
    case 'tonalId':
      return { ...sel, tonalId: pickRandom(TONAL_PRESETS).id }
    case 'moodId':
      return { ...sel, moodId: pickRandom(MOODS).id }
    case 'shadingId':
      return { ...sel, shadingId: pickRandom(SHADING_TECHNIQUES).id }
    default:
      return sel
  }
}
