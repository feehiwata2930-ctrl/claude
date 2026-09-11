import { useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import { useApp } from '../store'

export default function ClientsPanel() {
  const clients = useApp((s) => s.db.clients)
  const decalques = useApp((s) => s.db.decalques)
  const addClient = useApp((s) => s.addClient)
  const removeClient = useApp((s) => s.removeClient)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await addClient(name.trim(), notes.trim())
      setName('')
      setNotes('')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este cliente? Os decalques associados continuam salvos, sem cliente.')) return
    await removeClient(id)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold text-zinc-100">Clientes</h1>

      <form onSubmit={handleAdd} className="mb-6 flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do cliente"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-pink-500"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações (opcional)"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-pink-500"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500 disabled:opacity-50"
        >
          <UserPlus size={14} /> Adicionar
        </button>
      </form>

      <div className="space-y-2">
        {clients.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">{c.name}</p>
              <p className="text-xs text-zinc-500">
                {decalques.filter((d) => d.client_id === c.id).length} decalque(s) salvos
                {c.notes ? ` · ${c.notes}` : ''}
              </p>
            </div>
            <button onClick={() => handleDelete(c.id)} className="rounded-lg p-2 text-zinc-500 hover:bg-red-950 hover:text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {clients.length === 0 && <p className="text-sm text-zinc-500">Nenhum cliente cadastrado ainda.</p>}
      </div>
    </div>
  )
}
