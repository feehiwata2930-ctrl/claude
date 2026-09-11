import { useEffect, useState } from 'react'
import { getSupabaseConfig } from './lib/config'
import { getSupabase } from './lib/supabaseClient'
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
  const hasConfig = !!getSupabaseConfig()

  const session = useApp((s) => s.session)
  const setSession = useApp((s) => s.setSession)
  const loaded = useApp((s) => s.loaded)
  const refreshAll = useApp((s) => s.refreshAll)
  const view = useApp((s) => s.view)
  const setView = useApp((s) => s.setView)

  useEffect(() => {
    if (!hasConfig) return
    const client = getSupabase()
    if (!client) return
    client.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = client.auth.onAuthStateChange((_event, sess) => setSession(sess))
    return () => sub.subscription.unsubscribe()
  }, [hasConfig, configVersion, setSession])

  useEffect(() => {
    if (session) refreshAll()
  }, [session, refreshAll])

  if (!hasConfig) {
    return <SettingsScreen onSaved={() => setConfigVersion((v) => v + 1)} showSignOut={false} />
  }

  if (view === 'config') {
    return (
      <SettingsScreen
        onSaved={() => {
          setConfigVersion((v) => v + 1)
          setView('estudio')
        }}
        showSignOut={!!session}
      />
    )
  }

  if (!session) {
    return <AuthScreen onOpenSettings={() => setView('config')} />
  }

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
      {view === 'clientes' && <ClientsPanel />}
    </div>
  )
}
