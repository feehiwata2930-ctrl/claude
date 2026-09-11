import { useState } from 'react'
import { ExternalLink, HardDrive, LogOut } from 'lucide-react'
import { getGoogleClientId, setGoogleClientId, clearGoogleClientId } from '../lib/googleConfig'
import { useApp } from '../store'

export default function SettingsScreen({ onSaved }: { onSaved: () => void }) {
  const existing = getGoogleClientId()
  const [clientId, setClientId] = useState(existing ?? '')
  const [error, setError] = useState<string | null>(null)
  const disconnect = useApp((s) => s.disconnect)
  const account = useApp((s) => s.account)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = clientId.trim()
    if (!trimmed.endsWith('.apps.googleusercontent.com')) {
      setError('Isso não parece um Client ID do Google válido (termina em .apps.googleusercontent.com).')
      return
    }
    setGoogleClientId(trimmed)
    setError(null)
    onSaved()
  }

  async function handleDisconnect() {
    if (account) await disconnect().catch(() => {})
    clearGoogleClientId()
    onSaved()
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-500/15 text-pink-400">
          <HardDrive size={20} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-zinc-50">Conectar ao Google Drive</h1>
          <p className="text-sm text-zinc-400">Seus decalques e folhas ficam salvos numa pasta "TatuCorte" no seu próprio Google Drive.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Client ID OAuth do Google</label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="123456789-abc...apps.googleusercontent.com"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-pink-500"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="w-full rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500">
          Salvar e continuar
        </button>
      </form>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
        <p className="mb-2 font-medium text-zinc-300">Como conseguir isso (grátis, ~5 min):</p>
        <ol className="list-decimal space-y-1.5 pl-4">
          <li>
            Abra o{' '}
            <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-pink-400 hover:underline">
              Google Cloud Console <ExternalLink size={12} />
            </a>{' '}
            e crie um projeto (ou use um existente).
          </li>
          <li>
            Em <span className="text-zinc-300">APIs e Serviços → Biblioteca</span>, procure <span className="text-zinc-300">Google Drive API</span> e clique em <span className="text-zinc-300">Ativar</span>.
          </li>
          <li>
            Em <span className="text-zinc-300">APIs e Serviços → Tela de consentimento OAuth</span>: escolha <span className="text-zinc-300">Externo</span>, preencha o nome do app e seu e-mail, e deixe a publicação em <span className="text-zinc-300">Testing</span>. Em <span className="text-zinc-300">Test users</span>, adicione o seu próprio e-mail do Google.
          </li>
          <li>
            Em <span className="text-zinc-300">APIs e Serviços → Credenciais → Criar credenciais → ID do cliente OAuth</span>: tipo <span className="text-zinc-300">App da Web</span>. Em <span className="text-zinc-300">Origens JavaScript autorizadas</span>, adicione o endereço onde o app roda (ex.: <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">http://localhost:5173</code>).
          </li>
          <li>Copie o <span className="text-zinc-300">Client ID</span> gerado (termina em <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">.apps.googleusercontent.com</code>) e cole acima.</li>
        </ol>
        <p className="mt-3 text-xs text-zinc-500">
          Mantendo a tela de consentimento em "Testing" e só com você como test user, ninguém mais acessa — e o Google não exige revisão/verificação do app.
        </p>
      </div>

      {existing && (
        <button
          onClick={handleDisconnect}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:border-red-800 hover:text-red-400"
        >
          <LogOut size={14} /> Esquecer este Client ID
        </button>
      )}
    </div>
  )
}
