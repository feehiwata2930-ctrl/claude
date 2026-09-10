import { useState } from 'react'
import { Clapperboard, Music, Scissors, Sparkles, Type, RotateCcw } from 'lucide-react'
import { useProjectStore } from './store'
import Uploader from './components/Uploader'
import PreviewStage from './components/PreviewStage'
import ClipsPanel from './components/ClipsPanel'
import TextPanel from './components/TextPanel'
import MusicPanel from './components/MusicPanel'
import FormatPanel from './components/FormatPanel'
import ExportPanel from './components/ExportPanel'

type Tab = 'cortar' | 'texto' | 'musica' | 'formato' | 'exportar'

const TABS: { id: Tab; label: string; icon: typeof Scissors }[] = [
  { id: 'cortar', label: 'Cortar', icon: Scissors },
  { id: 'texto', label: 'Texto', icon: Type },
  { id: 'musica', label: 'Música', icon: Music },
  { id: 'formato', label: 'Formato', icon: Clapperboard },
  { id: 'exportar', label: 'Exportar', icon: Sparkles },
]

function App() {
  const clips = useProjectStore((s) => s.clips)
  const reset = useProjectStore((s) => s.reset)
  const [tab, setTab] = useState<Tab>('cortar')

  const hasClips = clips.length > 0

  return (
    <div className="flex h-dvh flex-col bg-[#0b0b0f]">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 p-1.5">
            <Clapperboard className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-zinc-100">ReelCut</span>
        </div>
        {hasClips && (
          <button
            onClick={() => {
              if (confirm('Começar um novo projeto? Isso apaga os clipes e edições atuais.')) reset()
            }}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Novo projeto
          </button>
        )}
      </header>

      {!hasClips ? (
        <Uploader />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="flex min-h-[45vh] flex-1 md:min-h-0">
            <PreviewStage />
          </div>

          <div className="flex min-h-0 flex-1 flex-col border-t border-zinc-800 md:w-96 md:flex-none md:border-t-0 md:border-l">
            <nav className="flex shrink-0 overflow-x-auto border-b border-zinc-800">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex flex-1 flex-col items-center gap-1 px-3 py-2.5 text-xs whitespace-nowrap transition-colors ${
                    tab === id ? 'border-b-2 border-pink-500 text-pink-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {tab === 'cortar' && <ClipsPanel />}
              {tab === 'texto' && <TextPanel />}
              {tab === 'musica' && <MusicPanel />}
              {tab === 'formato' && <FormatPanel />}
              {tab === 'exportar' && <ExportPanel />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
