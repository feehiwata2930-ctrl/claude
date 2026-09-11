import { useState } from 'react'
import { Layers, Ruler, Scissors, Trash2, WalletCards } from 'lucide-react'
import { useApp } from '../store'
import { deleteDecalque } from '../lib/data'

export default function Library() {
  const decalques = useApp((s) => s.decalques)
  const clients = useApp((s) => s.clients)
  const refreshDecalques = useApp((s) => s.refreshDecalques)
  const setView = useApp((s) => s.setView)
  const setActiveDecalqueForTiling = useApp((s) => s.setActiveDecalqueForTiling)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [filterClient, setFilterClient] = useState('')

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name

  const filtered = filterClient ? decalques.filter((d) => d.client_id === filterClient) : decalques

  async function handleDelete(id: string, imagePath: string) {
    if (!confirm('Excluir este decalque? Essa ação não pode ser desfeita.')) return
    setBusyId(id)
    try {
      await deleteDecalque(id, imagePath)
      await refreshDecalques()
    } finally {
      setBusyId(null)
    }
  }

  if (decalques.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-zinc-400">
        <Layers className="mx-auto mb-3 opacity-40" size={32} />
        <p>Nenhum decalque salvo ainda.</p>
        <button onClick={() => setView('estudio')} className="mt-3 text-sm text-pink-400 hover:underline">
          Gerar o primeiro decalque
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Biblioteca de decalques</h1>
        {clients.length > 0 && (
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-300 outline-none"
          >
            <option value="">Todos os clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((d) => (
          <div key={d.id} className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
            <div className="grid aspect-square place-items-center bg-white p-2">
              <img src={d.imageUrl} alt={d.name} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium text-zinc-200">{d.name}</p>
              <p className="mb-2 flex items-center gap-1 text-xs text-zinc-500">
                <Ruler size={11} /> {d.width_mm} × {d.height_mm} mm
                {clientName(d.client_id) && <span className="ml-1">· {clientName(d.client_id)}</span>}
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setView('folha')}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700"
                  title="Usar numa folha"
                >
                  <WalletCards size={12} /> Folha
                </button>
                <button
                  onClick={() => {
                    setActiveDecalqueForTiling(d.id)
                    setView('ampliar')
                  }}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700"
                  title="Ampliar e cortar em várias folhas"
                >
                  <Scissors size={12} /> Ampliar
                </button>
                <button
                  onClick={() => handleDelete(d.id, d.image_path)}
                  disabled={busyId === d.id}
                  className="rounded-lg bg-zinc-800 px-2 py-1.5 text-xs text-red-400 hover:bg-red-950"
                  title="Excluir"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
