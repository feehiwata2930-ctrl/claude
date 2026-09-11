import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { Clip } from '../types'
import { sampleFrames } from './frameSampler'
import type { AIModelId } from './aiModels'

export type { AIModelId } from './aiModels'
export { AI_MODELS, estimateCostUsd, estimateFrameCount } from './aiModels'

const CutSchema = z.object({
  start: z.number().describe('Tempo de início do corte, em segundos, dentro do intervalo analisado'),
  end: z.number().describe('Tempo de fim do corte, em segundos'),
  reason: z
    .string()
    .describe('Por que esse trecho vale a pena manter: papel narrativo (gancho, clímax, piada, reação, etc.) e por que prende atenção'),
})

const AnalysisSchema = z.object({
  summary: z.string().describe('Resumo em 1-2 frases do que acontece no vídeo'),
  recommended_cuts: z.array(CutSchema),
})

export interface AISegment {
  start: number
  end: number
  reason: string
}

export type AIStage = 'extracting' | 'analyzing'

export interface AIAnalyzeParams {
  clip: Clip
  targetDuration: number
  apiKey: string
  model: AIModelId
  onProgress?: (stage: AIStage) => void
}

const SYSTEM_PROMPT = `Você é um editor de vídeo especialista em conteúdo de curta duração para Stories, Reels e TikTok, com faro para o que gera alcance e retenção.

Você recebe uma sequência de frames extraídos de um vídeo, em ordem cronológica, cada um precedido por uma etiqueta de tempo no formato [t=X.XXs]. Não há áudio nem transcrição disponível — julgue apenas pelo conteúdo visual.

Entenda a narrativa do vídeo: onde está o gancho inicial, a preparação, o clímax, a reação ou virada, e o desfecho. Priorize para o corte final momentos que prendem atenção logo nos primeiros segundos e mantêm coerência (prefira manter uma configuração e seu pagamento/reação juntos, em vez de escolher só picos isolados e desconexos).

Responda apenas no formato estruturado solicitado.`

export async function analyzeClipWithAI({
  clip,
  targetDuration,
  apiKey,
  model,
  onProgress,
}: AIAnalyzeParams): Promise<AISegment[]> {
  onProgress?.('extracting')
  const rangeStart = clip.trimStart
  const rangeEnd = clip.trimEnd
  const frames = await sampleFrames(clip.url, rangeStart, rangeEnd, { maxFrames: 24, maxWidth: 480 })
  if (frames.length === 0) {
    throw new Error('Não foi possível extrair frames deste vídeo.')
  }

  onProgress?.('analyzing')
  // Bound the network call explicitly — the SDK's own default (10 min) is
  // far too long to sit on a stalled mobile connection before failing.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, timeout: 45_000 })

  const content: Anthropic.ContentBlockParam[] = []
  frames.forEach((f) => {
    content.push({ type: 'text', text: `[t=${f.time.toFixed(2)}s]` })
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: f.mediaType, data: f.base64 },
    })
  })
  content.push({
    type: 'text',
    text: `Este trecho dura ${(rangeEnd - rangeStart).toFixed(1)}s, do tempo ${rangeStart.toFixed(2)}s ao ${rangeEnd.toFixed(2)}s no vídeo original. Recomende cortes que somem aproximadamente ${targetDuration.toFixed(0)}s no total. Os tempos de "start" e "end" devem estar dentro de [${rangeStart.toFixed(2)}, ${rangeEnd.toFixed(2)}], em ordem cronológica e sem sobreposição entre si.`,
  })

  const response = await client.messages.parse({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
    output_config: { format: zodOutputFormat(AnalysisSchema) },
  })

  const parsed = response.parsed_output
  if (!parsed) {
    throw new Error('O Claude não retornou uma análise válida. Tente novamente.')
  }

  return parsed.recommended_cuts
    .map((c) => ({
      start: Math.max(rangeStart, Math.min(c.start, c.end)),
      end: Math.min(rangeEnd, Math.max(c.start, c.end)),
      reason: c.reason,
    }))
    .filter((c) => c.end - c.start > 0.1)
    .sort((a, b) => a.start - b.start)
}

export function friendlyAIError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return 'Chave de API inválida. Confira a chave nas configurações do corte com IA.'
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return 'Sua chave não tem permissão para usar este modelo.'
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'Limite de uso da API atingido. Aguarde um pouco e tente novamente.'
  }
  if (err instanceof Anthropic.APIError) {
    return `Erro da API da Anthropic: ${err.message}`
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'Erro desconhecido ao analisar o vídeo com IA.'
}
