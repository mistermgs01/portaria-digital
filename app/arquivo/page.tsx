'use client'

import { useState, useEffect, useCallback } from 'react'
import { Archive, Search, FileText, Building2, Car, LogIn, LogOut, Clock, Download, X, ChevronDown, ChevronUp } from 'lucide-react'

interface AcessoRegistro {
  id: number
  tipo: 'entrada' | 'saida'
  placa: string
  nomeVisitante?: string
  createdAt: string
}

interface VisitaArquivada {
  id: number
  autorizacaoId?: number
  nome: string
  tipo?: string
  documento?: string
  telefone?: string
  empresa?: string
  placa?: string
  modelo?: string
  cor?: string
  vaga?: string
  moradorNome?: string
  apartamentoDestino?: string
  blocoDestino?: string
  motivo?: string
  observacoes?: string
  validoDe?: string
  validoAte?: string
  statusFinal?: string
  movimentacoes: AcessoRegistro[]
  arquivadoEm: string
}

const TIPO_LABEL: Record<string, string> = {
  visitante: 'Visita', prestador: 'Prestador', entrega: 'Entrega', outro: 'Outro',
}
const TIPO_COR: Record<string, string> = {
  visitante: 'bg-blue-100 text-blue-700',
  prestador: 'bg-orange-100 text-orange-700',
  entrega: 'bg-purple-100 text-purple-700',
  outro: 'bg-zinc-100 text-zinc-600',
}

function fmt(dt?: string) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
function fmtHora(dt: string) {
  return new Date(dt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function RelatorioModal({ visita, onClose }: { visita: VisitaArquivada; onClose: () => void }) {
  const entradas = visita.movimentacoes.filter(m => m.tipo === 'entrada')
  const saidas = visita.movimentacoes.filter(m => m.tipo === 'saida')

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 print:hidden" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mt-8 mb-8 pointer-events-auto">
          <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 px-6 py-5 rounded-t-2xl flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText size={18} className="text-white/80" />
                <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">Relatório de Visita</span>
              </div>
              <h2 className="text-white text-xl font-black leading-tight">{visita.nome}</h2>
              <p className="text-indigo-100 text-xs mt-0.5">Arquivado em {fmt(visita.arquivadoEm)}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white ml-4 print:hidden"><X size={20} /></button>
          </div>

          <div className="p-5 flex flex-col gap-5">
            <section>
              <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Identificação</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div><p className="text-[10px] text-zinc-400">Tipo</p><p className="text-sm font-semibold text-zinc-800">{TIPO_LABEL[visita.tipo ?? ''] ?? '—'}</p></div>
                <div>
                  <p className="text-[10px] text-zinc-400">Status final</p>
                  <p className={`text-sm font-bold ${visita.statusFinal === 'cancelada' ? 'text-rose-600' : visita.statusFinal === 'expirada' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {visita.statusFinal ?? '—'}
                  </p>
                </div>
                {visita.documento && <div><p className="text-[10px] text-zinc-400">Documento</p><p className="text-sm font-semibold text-zinc-800">{visita.documento}</p></div>}
                {visita.telefone && <div><p className="text-[10px] text-zinc-400">Telefone</p><p className="text-sm font-semibold text-zinc-800">{visita.telefone}</p></div>}
                {visita.empresa && <div className="col-span-2"><p className="text-[10px] text-zinc-400">Empresa</p><p className="text-sm font-semibold text-zinc-800">{visita.empresa}</p></div>}
              </div>
            </section>

            <section className="border-t border-zinc-100 pt-4">
              <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Destino</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {visita.moradorNome && <div className="col-span-2"><p className="text-[10px] text-zinc-400">Morador</p><p className="text-sm font-semibold text-zinc-800">{visita.moradorNome}</p></div>}
                {visita.apartamentoDestino && <div><p className="text-[10px] text-zinc-400">Apartamento</p><p className="text-sm font-bold text-zinc-900">Apto {visita.apartamentoDestino}{visita.blocoDestino ? ` · Bl ${visita.blocoDestino}` : ''}</p></div>}
                {visita.vaga && <div><p className="text-[10px] text-zinc-400">Vaga</p><p className="text-sm font-bold text-blue-700">Vaga {visita.vaga}</p></div>}
                {visita.motivo && <div className="col-span-2"><p className="text-[10px] text-zinc-400">Motivo</p><p className="text-sm text-zinc-700 italic">"{visita.motivo}"</p></div>}
              </div>
            </section>

            {(visita.placa || visita.modelo) && (
              <section className="border-t border-zinc-100 pt-4">
                <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Veículo</h3>
                <div className="flex items-center gap-3">
                  <div className="bg-zinc-900 text-white font-mono font-black px-3 py-1.5 rounded-lg tracking-widest text-sm">{visita.placa ?? '—'}</div>
                  {visita.modelo && <p className="text-sm font-semibold text-zinc-800">{visita.modelo}{visita.cor ? ` · ${visita.cor}` : ''}</p>}
                </div>
              </section>
            )}

            <section className="border-t border-zinc-100 pt-4">
              <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Período</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div><p className="text-[10px] text-zinc-400">Criada em</p><p className="text-sm font-semibold text-zinc-800">{fmt(visita.validoDe)}</p></div>
                <div><p className="text-[10px] text-zinc-400">Válida até</p><p className="text-sm font-semibold text-zinc-800">{fmt(visita.validoAte)}</p></div>
              </div>
            </section>

            <section className="border-t border-zinc-100 pt-4">
              <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">
                Movimentações ({visita.movimentacoes.length})
              </h3>
              {visita.movimentacoes.length === 0 ? (
                <p className="text-sm text-zinc-400 italic">Nenhuma movimentação registrada.</p>
              ) : (
                <div className="rounded-xl border border-zinc-100 overflow-hidden">
                  <div className="grid grid-cols-2 divide-x divide-zinc-100 bg-zinc-50">
                    <div className="flex items-center gap-2 px-4 py-2.5">
                      <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center"><LogIn size={12} className="text-emerald-600" /></div>
                      <div><p className="text-[10px] text-zinc-400">Entradas</p><p className="text-sm font-black text-emerald-700">{entradas.length}</p></div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5">
                      <div className="w-6 h-6 rounded-md bg-rose-100 flex items-center justify-center"><LogOut size={12} className="text-rose-600" /></div>
                      <div><p className="text-[10px] text-zinc-400">Saídas</p><p className="text-sm font-black text-rose-700">{saidas.length}</p></div>
                    </div>
                  </div>
                  <div className="divide-y divide-zinc-50">
                    {visita.movimentacoes.map((m, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${m.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                          {m.tipo === 'entrada' ? <LogIn size={13} /> : <LogOut size={13} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs tracking-widest">{m.placa}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${m.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                              {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-zinc-400 flex-shrink-0 font-mono">{fmtHora(m.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {visita.observacoes && (
              <section className="border-t border-zinc-100 pt-4">
                <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Observações</h3>
                <p className="text-sm text-zinc-600">{visita.observacoes}</p>
              </section>
            )}
          </div>

          <div className="px-5 pb-5 flex gap-2.5 print:hidden">
            <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-zinc-200 text-zinc-600 font-semibold text-sm hover:bg-zinc-50">Fechar</button>
            <button onClick={() => window.print()} className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700">
              <Download size={16} /> Salvar / Imprimir
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function CardArquivo({ v, onAbrir }: { v: VisitaArquivada; onAbrir: () => void }) {
  const [expandido, setExpandido] = useState(false)
  const entradas = v.movimentacoes.filter(m => m.tipo === 'entrada').length
  const saidas = v.movimentacoes.filter(m => m.tipo === 'saida').length

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className="flex gap-3 p-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Archive size={22} className="text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-zinc-900 text-sm leading-tight">{v.nome}</p>
            {v.tipo && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${TIPO_COR[v.tipo] ?? 'bg-zinc-100 text-zinc-600'}`}>
                {TIPO_LABEL[v.tipo] ?? v.tipo}
              </span>
            )}
          </div>
          {v.empresa && <p className="text-xs text-zinc-400 mt-0.5">{v.empresa}</p>}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {v.placa && <span className="bg-zinc-900 text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded-md tracking-widest">{v.placa}</span>}
            {v.vaga && <span className="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-md">Vaga {v.vaga}</span>}
          </div>
          {(v.moradorNome || v.apartamentoDestino) && (
            <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
              <Building2 size={11} />
              {v.moradorNome ? `${v.moradorNome} — ` : ''}
              {v.apartamentoDestino ? `Apto ${v.apartamentoDestino}${v.blocoDestino ? ` · Bl ${v.blocoDestino}` : ''}` : ''}
            </p>
          )}
          {v.motivo && <p className="text-xs text-zinc-400 mt-0.5 italic truncate">"{v.motivo}"</p>}
        </div>
      </div>

      <div className="px-4 py-2.5 border-t border-zinc-50 bg-zinc-50/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-emerald-600">
            <LogIn size={12} /><span className="text-xs font-bold">{entradas}</span>
          </div>
          <div className="flex items-center gap-1 text-rose-500">
            <LogOut size={12} /><span className="text-xs font-bold">{saidas}</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-400">
            <Clock size={11} /><span className="text-[11px]">{fmt(v.arquivadoEm)}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setExpandido(e => !e)}
            className="p-1.5 rounded-lg hover:bg-white text-zinc-500 hover:text-zinc-700 transition-colors flex items-center gap-0.5">
            <Clock size={13} />
            {expandido ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          <button onClick={onAbrir}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors">
            <FileText size={13} /> Ver Relatório
          </button>
        </div>
      </div>

      {expandido && v.movimentacoes.length > 0 && (
        <div className="border-t border-zinc-100 divide-y divide-zinc-50">
          {v.movimentacoes.map((m, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${m.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                {m.tipo === 'entrada' ? <LogIn size={11} /> : <LogOut size={11} />}
              </div>
              <span className="font-mono font-black text-xs tracking-widest text-zinc-900 flex-1">{m.placa}</span>
              <span className="text-[10px] text-zinc-400 font-mono">{fmtHora(m.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
      {expandido && v.movimentacoes.length === 0 && (
        <div className="px-4 py-3 border-t border-zinc-100 text-xs text-zinc-400 italic">Nenhuma movimentação registrada.</div>
      )}
    </div>
  )
}

export default function ArquivoPage() {
  const [lista, setLista] = useState<VisitaArquivada[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [selecionada, setSelecionada] = useState<VisitaArquivada | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/arquivo?limit=100')
      const json = await res.json() as { success: boolean; data: VisitaArquivada[] }
      if (json.success) setLista(json.data)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const filtrada = lista.filter(v => {
    const q = busca.toLowerCase()
    return !q || v.nome.toLowerCase().includes(q) ||
      (v.placa ?? '').toLowerCase().includes(q) ||
      (v.moradorNome ?? '').toLowerCase().includes(q) ||
      (v.apartamentoDestino ?? '').includes(q)
  })

  return (
    <div className="min-h-screen bg-[#F0F4FF] dark:bg-[#111827]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #3730A3 0%, #6366F1 100%)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Archive size={22} className="text-white/80" />
              <h1 className="text-2xl font-black text-white">Arquivo de Visitas</h1>
            </div>
            <span className="text-indigo-200 text-sm font-semibold">{lista.length} registros</span>
          </div>
          <p className="text-indigo-200 text-sm">Histórico completo de visitas arquivadas</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Total', valor: lista.length, cor: 'text-white' },
              { label: 'Entradas', valor: lista.reduce((s, v) => s + v.movimentacoes.filter(m => m.tipo === 'entrada').length, 0), cor: 'text-emerald-300' },
              { label: 'Saídas', valor: lista.reduce((s, v) => s + v.movimentacoes.filter(m => m.tipo === 'saida').length, 0), cor: 'text-rose-300' },
            ].map(({ label, valor, cor }) => (
              <div key={label} className="bg-white/10 rounded-xl px-3 py-2.5 text-center">
                <p className={`text-xl font-black ${cor}`}>{valor}</p>
                <p className="text-indigo-200 text-[11px] uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5">
        {/* Busca */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, placa, apartamento..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-zinc-200 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {carregando ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-zinc-400 text-sm">Carregando arquivo...</p>
          </div>
        ) : filtrada.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Archive size={40} className="text-zinc-200" />
            <p className="text-zinc-400 text-sm font-semibold">
              {busca ? 'Nenhuma visita encontrada' : 'Nenhuma visita arquivada ainda'}
            </p>
            {!busca && <p className="text-zinc-300 text-xs text-center px-8">Use o botão "Gerar Relatório e Arquivar Visita" nos cards de Autorizações para arquivar uma visita.</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtrada.map(v => (
              <CardArquivo key={v.id} v={v} onAbrir={() => setSelecionada(v)} />
            ))}
          </div>
        )}
      </main>

      {selecionada && <RelatorioModal visita={selecionada} onClose={() => setSelecionada(null)} />}
    </div>
  )
}
