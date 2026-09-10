import { useProjectStore } from '../store'
import { ASPECT_DIMENSIONS, type AspectRatio } from '../types'

const OPTIONS: AspectRatio[] = ['9:16', '4:5', '1:1', '16:9']

export default function FormatPanel() {
  const aspectRatio = useProjectStore((s) => s.aspectRatio)
  const setAspectRatio = useProjectStore((s) => s.setAspectRatio)

  return (
    <div className="grid grid-cols-2 gap-3">
      {OPTIONS.map((ratio) => {
        const dims = ASPECT_DIMENSIONS[ratio]
        const active = aspectRatio === ratio
        return (
          <button
            key={ratio}
            onClick={() => setAspectRatio(ratio)}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
              active ? 'border-pink-500 bg-pink-500/10' : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600'
            }`}
          >
            <div
              className={`rounded border-2 bg-zinc-800 ${active ? 'border-pink-500' : 'border-zinc-600'}`}
              style={{
                width: ratio === '16:9' ? 48 : (dims.w / dims.h) * 34,
                height: ratio === '16:9' ? (dims.h / dims.w) * 48 : 34,
              }}
            />
            <div className="text-center">
              <p className="text-sm font-semibold text-zinc-100">{ratio}</p>
              <p className="text-xs text-zinc-500">{dims.label}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
