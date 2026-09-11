import { useState } from 'react'
import { Settings, Sparkles } from 'lucide-react'
import { signIn, signUp } from '../lib/data'

export default function AuthScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password)
        setInfo('Conta criada! Se a confirmação por e-mail estiver ativa no seu projeto, confirme o e-mail antes de entrar.')
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível autenticar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-pink-500/15 text-pink-400">
            <Sparkles size={22} />
          </div>
          <h1 className="text-xl font-semibold text-zinc-50">TatuCorte</h1>
          <p className="mt-1 text-sm text-zinc-400">Decalques e corte de folha para tatuagem, salvos na nuvem.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-pink-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-pink-500"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-emerald-400">{info}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500 disabled:opacity-50"
          >
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="mt-3 w-full text-center text-sm text-zinc-400 hover:text-zinc-200"
        >
          {mode === 'login' ? 'Ainda não tem conta? Criar uma' : 'Já tem conta? Entrar'}
        </button>

        <button
          onClick={onOpenSettings}
          className="mx-auto mt-6 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300"
        >
          <Settings size={12} /> Trocar projeto Supabase
        </button>
      </div>
    </div>
  )
}
