import { useState } from 'react'
import { Database, ExternalLink, LogOut } from 'lucide-react'
import { getSupabaseConfig, setSupabaseConfig, clearSupabaseConfig } from '../lib/config'
import { resetSupabaseClient } from '../lib/supabaseClient'
import { signOut } from '../lib/data'

export default function SettingsScreen({ onSaved, showSignOut }: { onSaved: () => void; showSignOut: boolean }) {
  const existing = getSupabaseConfig()
  const [url, setUrl] = useState(existing?.url ?? '')
  const [anonKey, setAnonKey] = useState(existing?.anonKey ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim() || !anonKey.trim()) {
      setError('Preencha a URL e a chave anônima (anon key).')
      return
    }
    try {
      new URL(url.trim())
    } catch {
      setError('URL do projeto inválida.')
      return
    }
    setSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() })
    resetSupabaseClient()
    setError(null)
    onSaved()
  }

  async function handleDisconnect() {
    if (showSignOut) {
      try {
        await signOut()
      } catch {
        // ignora — vamos limpar local de qualquer forma
      }
    }
    clearSupabaseConfig()
    resetSupabaseClient()
    onSaved()
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-500/15 text-pink-400">
          <Database size={20} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-zinc-50">Conectar armazenamento na nuvem</h1>
          <p className="text-sm text-zinc-400">Seus decalques e folhas ficam salvos no seu próprio projeto Supabase (gratuito).</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">URL do projeto Supabase</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://xxxxxxxx.supabase.co"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-pink-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Chave anônima (anon / public key)</label>
          <input
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
            placeholder="eyJhbGciOi..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-pink-500"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="w-full rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500">
          Salvar e continuar
        </button>
      </form>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
        <p className="mb-2 font-medium text-zinc-300">Como conseguir isso (grátis, ~2 min):</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>
            Crie um projeto em{' '}
            <a href="https://supabase.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-pink-400 hover:underline">
              supabase.com <ExternalLink size={12} />
            </a>
          </li>
          <li>
            No painel: <span className="text-zinc-300">SQL Editor → New query</span>, cole o conteúdo de{' '}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">supabase/schema.sql</code> deste projeto e clique em Run.
          </li>
          <li>
            Em <span className="text-zinc-300">Project Settings → API</span>, copie a <span className="text-zinc-300">Project URL</span> e a{' '}
            <span className="text-zinc-300">anon public key</span> e cole acima.
          </li>
        </ol>
      </div>

      {existing && (
        <button
          onClick={handleDisconnect}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:border-red-800 hover:text-red-400"
        >
          <LogOut size={14} /> Desconectar deste projeto Supabase
        </button>
      )}
    </div>
  )
}
