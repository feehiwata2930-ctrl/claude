import { useEffect, useState } from 'react'
import { getGoogleClientId } from './lib/googleConfig'
import { useApp } from './store'
import SettingsScreen from './components/SettingsScreen'
import AuthScreen from './components/AuthScreen'
import TopNav from './components/TopNav'
import StencilStudio from './components/StencilStudio'
import Library from './components/Library'
import SheetEditor from './components/SheetEditor'
import TilingStudio from './components/TilingStudio'
import ClientsPanel from './components/ClientsPanel'

export default function App() {
  const [configVersion, setConfigVersion] = useState(0)
  const hasConfig = !!getGoogleClientId()

  const account = useApp((s) => s.account)
  const loaded = useApp((s) => s.loaded)
  const connect = useApp((s) => s.connect)
  const view = useApp((s) => s.view)
  const setView = useApp((s) => s.setView)

  useEffect(() => {
    if (!hasConfig || account) return
    connect(false).catch(() => {
      // sem sessão válida ainda — a tela de login cuida do resto
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasConfig, configVersion])

  if (!hasConfig) {
    return <SettingsScreen onSaved={() => setConfigVersion((v) => v + 1)} />
  }

  if (view === 'config') {
    return (
      <SettingsScreen
        onSaved={() => {
          setConfigVersion((v) => v + 1)
          setView('estudio')
        }}
      />
    )
  }

  if (!account || !loaded) {
    return <AuthScreen onOpenSettings={() => setView('config')} />
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      {view === 'estudio' && <StencilStudio />}
      {view === 'biblioteca' && <Library />}
      {view === 'folha' && <SheetEditor />}
      {view === 'ampliar' && <TilingStudio />}
      {view === 'clientes' && <ClientsPanel />}
    </div>
  )
}
