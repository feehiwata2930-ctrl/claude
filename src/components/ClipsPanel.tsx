import { useRef } from 'react'
import { Plus } from 'lucide-react'
import { useProjectStore } from '../store'
import { getVideoDuration, probeHasAudio } from '../lib/media'
import ClipCard from './ClipCard'
import AutoCutPanel from './AutoCutPanel'

export default function ClipsPanel() {
  const clips = useProjectStore((s) => s.clips)
  const addClips = useProjectStore((s) => s.addClips)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return
    const files = Array.from(fileList).filter((f) => f.type.startsWith('video/'))
    if (files.length === 0) return
    const [durations, hasAudio] = await Promise.all([
      Promise.all(files.map(getVideoDuration)),
      Promise.all(files.map(probeHasAudio)),
    ])
    addClips(files, durations, hasAudio)
  }

  return (
    <div className="flex flex-col gap-2">
      <AutoCutPanel />
      {clips.map((clip, i) => (
        <ClipCard key={clip.id} clip={clip} index={i} total={clips.length} />
      ))}
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 py-3 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
      >
        <Plus className="h-4 w-4" /> Adicionar mais clipes
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
