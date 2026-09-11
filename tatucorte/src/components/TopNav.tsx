import { Layers, LogOut, Scissors, Settings, Sparkles, Users, WalletCards } from 'lucide-react'
import { useApp, type View } from '../store'
import { signOut } from '../lib/data'

const TABS: { id: View; label: string; icon: typeof Sparkles }[] = [
  { id: 'estudio', label: 'Gerar decalque', icon: Sparkles },
  { id: 'biblioteca', label: 'Biblioteca', icon: Layers },
  { id: 'folha', label: 'Montar folha', icon: WalletCards },
  { id: 'ampliar', label: 'Ampliar & cortar', icon: Scissors },
  { id: 'clientes', label: 'Clientes', icon: Users },
]

export default function TopNav() {
  const view = useApp((s) => s.view)
  const setView = useApp((s) => s.setView)
  const email = useApp((s) => s.session?.user.email)

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-2.5">
        <div className="mr-2 flex shrink-0 items-center gap-2 text-sm font-semibold text-zinc-100">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-pink-500/15 text-pink-400">
            <Sparkles size={15} />
          </div>
          TatuCorte
        </div>

        <nav className="flex shrink-0 gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = view === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
                  active ? 'bg-pink-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {email && <span className="mr-1 hidden text-xs text-zinc-500 sm:inline">{email}</span>}
          <button
            onClick={() => setView('config')}
            className={`rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 ${view === 'config' ? 'bg-zinc-800 text-zinc-100' : ''}`}
            title="Configurações"
          >
            <Settings size={16} />
          </button>
          <button onClick={() => signOut()} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-red-400" title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
