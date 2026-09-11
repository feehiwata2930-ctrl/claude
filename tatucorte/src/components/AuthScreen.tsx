import { useState } from 'react'
import { HardDrive, Settings, Sparkles } from 'lucide-react'
import { useApp } from '../store'

export default function AuthScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const connect = useApp((s) => s.connect)
  const connecting = useApp((s) => s.connecting)
  const connectError = useApp((s) => s.connectError)
  const [busy, setBusy] = useState(false)

  async function handleConnect() {
    setBusy(true)
    try {
      await connect(true)
    } catch {
      // erro já fica exposto via connectError
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-pink-500/15 text-pink-400 mx-auto">
          <Sparkles size={22} />
        </div>
        <h1 className="text-xl font-semibold text-zinc-50">TatuCorte</h1>
        <p className="mt-1 mb-6 text-sm text-zinc-400">Decalques e corte de folha para tatuagem, salvos no seu Google Drive.</p>

        <button
          onClick={handleConnect}
          disabled={busy || connecting}
          className="mx-auto flex w-full items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pink-500 disabled:opacity-50"
        >
          <HardDrive size={16} /> {busy || connecting ? 'Conectando…' : 'Entrar com o Google Drive'}
        </button>

        {connectError && <p className="mt-3 text-sm text-red-400">{connectError}</p>}

        <p className="mt-4 text-xs text-zinc-500">
          Uma janela do Google vai pedir permissão para o app criar e gerenciar apenas os arquivos que ele mesmo criar no seu Drive
          (pasta "TatuCorte") — nada mais do seu Drive é acessado.
        </p>

        <button onClick={onOpenSettings} className="mx-auto mt-6 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
          <Settings size={12} /> Trocar Client ID do Google
        </button>
      </div>
    </div>
  )
}
