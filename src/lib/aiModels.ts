export const AI_MODELS = [
  { id: 'claude-opus-5', label: 'Opus 5 (mais inteligente)', inPrice: 5, outPrice: 25 },
  { id: 'claude-sonnet-5', label: 'Sonnet 5 (equilibrado)', inPrice: 2, outPrice: 10 },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5 (mais barato)', inPrice: 1, outPrice: 5 },
] as const

export type AIModelId = (typeof AI_MODELS)[number]['id']

export function estimateFrameCount(rangeDuration: number, maxFrames = 24): number {
  return Math.max(2, Math.min(maxFrames, Math.ceil(rangeDuration)))
}

export function estimateCostUsd(frameCount: number, modelId: AIModelId): number {
  const model = AI_MODELS.find((m) => m.id === modelId) ?? AI_MODELS[0]
  const imageTokens = frameCount * 190 // ~480px-wide frame, per Anthropic's image token rule of thumb
  const textTokens = frameCount * 6 + 250 // timestamp labels + instructions + system prompt
  const inputTokens = imageTokens + textTokens
  const outputTokens = 700
  return (inputTokens * model.inPrice + outputTokens * model.outPrice) / 1_000_000
}
