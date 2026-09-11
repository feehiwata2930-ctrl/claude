import { useEffect } from 'react'
import { useApp } from './store'
import TopNav from './components/TopNav'
import StencilStudio from './components/StencilStudio'
import Library from './components/Library'
import SheetEditor from './components/SheetEditor'
import TilingStudio from './components/TilingStudio'
import ClientsPanel from './components/ClientsPanel'
import PromptStudio from './components/PromptStudio'

export default function App() {
  const loaded = useApp((s) => s.loaded)
  const init = useApp((s) => s.init)
  const view = useApp((s) => s.view)

  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!loaded) {
    return (
      <div className="grid min-h-screen place-items-center text-zinc-500">
        <p>Carregando seus decalques…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      {view === 'estudio' && <StencilStudio />}
      {view === 'biblioteca' && <Library />}
      {view === 'folha' && <SheetEditor />}
      {view === 'ampliar' && <TilingStudio />}
      {view === 'prompt' && <PromptStudio />}
      {view === 'clientes' && <ClientsPanel />}
    </div>
  )
}
