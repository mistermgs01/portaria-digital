'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Car, Search, Trash2, X, Check, Edit2 } from 'lucide-react'
import type { Veiculo } from '@/db/schemas/veiculos'
import type { Morador } from '@/db/schemas/moradores'

type VeiculoComMorador = { veiculo: Veiculo; morador: Morador | null }

type FormData = {
  placa: string
  modelo: string
  cor: string
  tipo: 'carro' | 'moto' | 'caminhao' | 'outro'
  proprietario: string
  moradorId: string
}

const EMPTY_FORM: FormData = { placa: '', modelo: '', cor: '', tipo: 'carro', proprietario: '', moradorId: '' }

const tipoLabel: Record<string, string> = { carro: 'Carro', moto: 'Moto', caminhao: 'Caminhão', outro: 'Outro' }
const tipoCor: Record<string, string> = {
  carro: 'bg-blue-100 text-blue-700',
  moto: 'bg-orange-100 text-orange-700',
  caminhao: 'bg-purple-100 text-purple-700',
  outro: 'bg-zinc-100 text-zinc-600',
}

function formatPlaca(v: string) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
}

function VeiculoModal({
  veiculo,
  moradores,
  onClose,
  onSave,
}: {
  veiculo: VeiculoComMorador | null
  moradores: Morador[]
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState<FormData>(
    veiculo
      ? {
          placa: veiculo.veiculo.placa,
          modelo: veiculo.veiculo.modelo ?? '',
          cor: veiculo.veiculo.cor ?? '',
          tipo: veiculo.veiculo.tipo,
          proprietario: veiculo.veiculo.proprietario ?? '',
          moradorId: veiculo.veiculo.moradorId?.toString() ?? '',
        }
      : EMPTY_FORM
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.placa.trim()) { setError('Placa é obrigatória'); return }
    setLoading(true)
    try {
      const payload = {
        ...form,
        moradorId: form.moradorId ? parseInt(form.moradorId) : null,
        modelo: form.modelo || null,
        cor: form.cor || null,
        proprietario: form.proprietario || null,
      }
      if (veiculo) {
        await fetch(`/api/veiculos/${veiculo.veiculo.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        await fetch('/api/veiculos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      onSave()
    } catch {
      setError('Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Car size={18} className="text-white" />
            </div>
            <h2 className="font-bold text-zinc-900">{veiculo ? 'Editar Veículo' : 'Cadastrar Veículo'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Placa */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Placa <span className="text-rose-500">*</span></label>
            <input
              value={form.placa}
              onChange={e => { setForm(f => ({ ...f, placa: formatPlaca(e.target.value) })); setError('') }}
              placeholder="ABC1234"
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm bg-zinc-50 font-mono font-bold text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              maxLength={7}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Modelo</label>
              <input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="Ex: Fiat Uno" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Cor</label>
              <input value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} placeholder="Ex: Prata" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tipo</label>
            <div className="grid grid-cols-4 gap-2">
              {(['carro', 'moto', 'caminhao', 'outro'] as const).map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, tipo: t }))}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${form.tipo === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100'}`}>
                  {tipoLabel[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Morador vinculado</label>
            <select value={form.moradorId} onChange={e => setForm(f => ({ ...f, moradorId: e.target.value, proprietario: e.target.value ? (moradores.find(m => m.id === parseInt(e.target.value))?.nome ?? '') : f.proprietario }))}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Visitante / não vinculado —</option>
              {moradores.map(m => <option key={m.id} value={m.id}>Apto {m.apartamento}{m.bloco ? ` Bloco ${m.bloco}` : ''} – {m.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Proprietário</label>
            <input value={form.proprietario} onChange={e => setForm(f => ({ ...f, proprietario: e.target.value }))} placeholder="Nome do proprietário" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {error && <p className="text-xs text-rose-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
              {veiculo ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function VeiculosPage() {
  const [lista, setLista] = useState<VeiculoComMorador[]>([])
  const [moradores, setMoradores] = useState<Morador[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<VeiculoComMorador | null>(null)
  const [deletando, setDeletando] = useState<number | null>(null)

  const buscar = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const [rv, rm] = await Promise.all([
        fetch(`/api/veiculos${q ? `?busca=${encodeURIComponent(q)}` : ''}`).then(r => r.json()),
        fetch('/api/moradores').then(r => r.json()),
      ])
      if (rv.success) setLista(rv.data)
      if (rm.success) setMoradores(rm.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => buscar(busca), 300)
    return () => clearTimeout(t)
  }, [busca, buscar])

  async function deletar(id: number) {
    if (!confirm('Remover este veículo?')) return
    setDeletando(id)
    try {
      await fetch(`/api/veiculos/${id}`, { method: 'DELETE' })
      await buscar(busca)
    } finally {
      setDeletando(null)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0F4FF', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="bg-white border-b border-zinc-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-900">Veículos</h1>
            <p className="text-zinc-400 text-xs">Gerencie os veículos cadastrados</p>
          </div>
          <button onClick={() => { setEditando(null); setModalAberto(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">Novo veículo</span>
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['carro', 'moto', 'caminhao', 'outro'] as const).map(t => {
            const count = lista.filter(v => v.veiculo.tipo === t).length
            return (
              <div key={t} className="bg-white rounded-2xl p-3 shadow-sm border border-zinc-100 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${tipoCor[t]}`}>
                  {count}
                </div>
                <div>
                  <p className="text-xs text-zinc-400">{tipoLabel[t]}s</p>
                  <p className="text-sm font-bold text-zinc-800">{count}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por placa, modelo ou proprietário..."
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
          {busca && <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"><X size={15} /></button>}
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-50 flex items-center gap-2">
            <Car size={15} className="text-blue-600" />
            <span className="text-sm font-semibold text-zinc-700">{lista.length} veículo{lista.length !== 1 ? 's' : ''} cadastrado{lista.length !== 1 ? 's' : ''}</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : lista.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Car size={28} className="text-zinc-200" />
              <p className="text-zinc-400 font-semibold text-sm">Nenhum veículo encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {lista.map(({ veiculo: v, morador: m }) => (
                <div key={v.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50/30 transition-colors">
                  {/* Placa visual */}
                  <div className="flex-shrink-0 bg-yellow-50 border-2 border-yellow-300 rounded-lg px-3 py-1.5 min-w-[90px] text-center">
                    <p className="font-black text-zinc-900 tracking-widest text-sm font-mono">{v.placa}</p>
                    <p className="text-yellow-600 text-[9px] font-bold tracking-widest uppercase">Brasil</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tipoCor[v.tipo]}`}>{tipoLabel[v.tipo]}</span>
                      {v.modelo && <span className="text-sm font-semibold text-zinc-800">{v.modelo}</span>}
                      {v.cor && <span className="text-xs text-zinc-400">{v.cor}</span>}
                    </div>
                    {m ? (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Morador: <span className="font-semibold text-zinc-700">{m.nome}</span> — Apto {m.apartamento}{m.bloco ? ` / Bloco ${m.bloco}` : ''}
                      </p>
                    ) : v.proprietario ? (
                      <p className="text-xs text-zinc-500 mt-0.5">{v.proprietario}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => { setEditando({ veiculo: v, morador: m }); setModalAberto(true) }}
                      className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => deletar(v.id)} disabled={deletando === v.id}
                      className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 disabled:opacity-50">
                      {deletando === v.id ? <span className="w-3 h-3 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {modalAberto && (
        <VeiculoModal
          veiculo={editando}
          moradores={moradores}
          onClose={() => { setModalAberto(false); setEditando(null) }}
          onSave={() => { setModalAberto(false); setEditando(null); buscar(busca) }}
        />
      )}
    </div>
  )
}
