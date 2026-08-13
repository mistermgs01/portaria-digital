'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Car, Search, Trash2, X, Check, Edit2, ScanLine, Camera, Loader2 } from 'lucide-react'
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

// ─── Modal leitor de placa por câmera ───────────────────────────────────────
function LeitorPlacaModal({
  onClose,
  onPlacaLida,
}: {
  onClose: () => void
  onPlacaLida: (placa: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [cameraAtiva, setCameraAtiva] = useState(false)
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState('')
  const [placaDetectada, setPlacaDetectada] = useState('')
  const [fotoCapturada, setFotoCapturada] = useState('')

  useEffect(() => {
    abrirCamera()
    return () => fecharCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function abrirCamera() {
    setErro('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      setCameraAtiva(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 80)
    } catch {
      setErro('Câmera não disponível. Use a opção de galeria abaixo.')
    }
  }

  function fecharCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraAtiva(false)
  }

  async function capturar() {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setFotoCapturada(dataUrl)
    await enviarParaIA(dataUrl)
  }

  async function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      await enviarParaIA(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function enviarParaIA(base64: string) {
    setLendo(true)
    setErro('')
    setPlacaDetectada('')
    try {
      const res = await fetch('/api/ler-placa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      })
      const json = await res.json()
      const placa: string = (json.data?.placa ?? json.placa ?? '').replace(/[^A-Z0-9]/gi, '').toUpperCase()
      if (placa && placa !== 'NAO_IDENTIFICADA' && placa.length >= 4) {
        setPlacaDetectada(placa)
      } else {
        setErro('Placa não identificada. Tente com mais luz ou aproxime a câmera.')
      }
    } catch {
      setErro('Erro ao processar imagem. Tente novamente.')
    } finally {
      setLendo(false)
    }
  }

  function confirmar() {
    fecharCamera()
    onPlacaLida(placaDetectada)
    onClose()
  }

  function tentar() {
    setPlacaDetectada('')
    setErro('')
    setFotoCapturada('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)' }}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-400 flex items-center justify-center">
              <ScanLine size={18} className="text-yellow-900" />
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 text-sm">Ler placa com câmera</h2>
              <p className="text-xs text-zinc-400">Aponte para a placa do veículo</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200">
            <X size={16} />
          </button>
        </div>

        {/* Viewfinder */}
        <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
          {/* Foto capturada (mostra enquanto IA processa ou deu erro) */}
          {fotoCapturada && !placaDetectada && (
            <img src={fotoCapturada} alt="foto capturada" className="w-full h-full object-cover" />
          )}
          <video ref={videoRef} playsInline muted className={`w-full h-full object-cover ${cameraAtiva && !fotoCapturada ? 'block' : 'hidden'}`} />

          {!cameraAtiva && !erro && !fotoCapturada && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-zinc-600 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Guia de enquadramento */}
          {cameraAtiva && !lendo && !placaDetectada && !fotoCapturada && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative border-2 border-yellow-400 rounded-lg" style={{ width: '72%', height: '30%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }}>
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-300 text-xs font-semibold whitespace-nowrap">
                  Centralize a placa aqui
                </span>
              </div>
            </div>
          )}

          {/* Processando */}
          {lendo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
              <Loader2 size={32} className="text-white animate-spin" />
              <p className="text-white text-sm font-semibold">Identificando placa pela IA...</p>
            </div>
          )}

          {/* Placa detectada */}
          {placaDetectada && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 gap-3">
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl px-8 py-3 text-center">
                <p className="font-black text-zinc-900 tracking-widest text-2xl font-mono">{placaDetectada}</p>
                <p className="text-yellow-600 text-[10px] font-bold tracking-widest uppercase mt-0.5">Brasil</p>
              </div>
              <p className="text-green-300 text-sm font-semibold">✓ Placa identificada!</p>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Erro */}
        {erro && (
          <div className="px-5 py-2.5 bg-rose-50 border-t border-rose-100 text-rose-700 text-xs font-semibold text-center">
            {erro}
            <p className="text-rose-400 font-normal mt-0.5">Verifique se a placa está visível na foto acima</p>
          </div>
        )}

        {/* Ações */}
        <div className="p-4 flex flex-col gap-2.5">
          {!placaDetectada ? (
            <>
              <button onClick={() => {
                  setFotoCapturada(''); setErro(''); capturar()
                }} disabled={!cameraAtiva || lendo}
                className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50">
                <Camera size={18} /> {fotoCapturada ? 'Fotografar novamente' : 'Fotografar placa'}
              </button>
              <button onClick={() => fileRef.current?.click()} disabled={lendo}
                className="w-full py-2.5 rounded-2xl bg-zinc-100 text-zinc-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50">
                Escolher da galeria
              </button>
            </>
          ) : (
            <div className="flex gap-2.5">
              <button onClick={tentar}
                className="flex-1 py-2.5 rounded-2xl border border-zinc-200 text-zinc-600 font-semibold text-sm hover:bg-zinc-50 transition-colors">
                Tentar novamente
              </button>
              <button onClick={confirmar}
                className="flex-1 py-2.5 rounded-2xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
                <Check size={16} /> Buscar placa
              </button>
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onArquivo} />
      </div>
    </div>
  )
}

function VeiculoModal({
  veiculo, moradores, onClose, onSave,
}: {
  veiculo: VeiculoComMorador | null
  moradores: Morador[]
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState<FormData>(
    veiculo
      ? { placa: veiculo.veiculo.placa, modelo: veiculo.veiculo.modelo ?? '', cor: veiculo.veiculo.cor ?? '', tipo: veiculo.veiculo.tipo, proprietario: veiculo.veiculo.proprietario ?? '', moradorId: veiculo.veiculo.moradorId?.toString() ?? '' }
      : EMPTY_FORM
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Busca de morador por nome ou apartamento
  const moradorAtual = moradores.find(m => m.id === parseInt(form.moradorId))
  const [buscaMorador, setBuscaMorador] = useState(
    moradorAtual ? `Apto ${moradorAtual.apartamento}${moradorAtual.bloco ? ` · ${moradorAtual.bloco}` : ''} – ${moradorAtual.nome}` : ''
  )
  const [dropdownAberto, setDropdownAberto] = useState(false)

  const morFiltrados = moradores.filter(m => {
    if (!buscaMorador.trim()) return true
    const q = buscaMorador.toLowerCase()
    return (
      m.nome.toLowerCase().includes(q) ||
      m.apartamento.includes(buscaMorador.trim()) ||
      (m.bloco ?? '').toLowerCase().includes(q)
    )
  }).slice(0, 10)

  function selecionarMorador(m: Morador) {
    setForm(f => ({ ...f, moradorId: String(m.id), proprietario: f.proprietario || m.nome }))
    setBuscaMorador(`Apto ${m.apartamento}${m.bloco ? ` · ${m.bloco}` : ''} – ${m.nome}`)
    setDropdownAberto(false)
  }

  function limparMorador() {
    setForm(f => ({ ...f, moradorId: '' }))
    setBuscaMorador('')
    setDropdownAberto(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.placa.trim()) { setError('Placa é obrigatória'); return }
    setLoading(true)
    try {
      const payload = { ...form, moradorId: form.moradorId ? parseInt(form.moradorId) : null, modelo: form.modelo || null, cor: form.cor || null, proprietario: form.proprietario || null }
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[95dvh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Car size={18} className="text-white" />
            </div>
            <h2 className="font-bold text-zinc-900">{veiculo ? 'Editar Veículo' : 'Cadastrar Veículo'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Placa <span className="text-rose-500">*</span></label>
            <input value={form.placa} onChange={e => { setForm(f => ({ ...f, placa: formatPlaca(e.target.value) })); setError('') }}
              placeholder="ABC1234" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm bg-zinc-50 font-mono font-bold text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase" maxLength={7} />
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

          {/* ── Busca de morador por nome ou apartamento ── */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Morador vinculado</label>
            <div className="relative">
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 bg-zinc-50 ${dropdownAberto ? 'ring-2 ring-blue-500 border-blue-400' : 'border-zinc-200'}`}>
                <Search size={14} className="text-zinc-400 flex-shrink-0" />
                <input
                  value={buscaMorador}
                  onChange={e => { setBuscaMorador(e.target.value); setDropdownAberto(true); if (!e.target.value) setForm(f => ({ ...f, moradorId: '' })) }}
                  onFocus={() => setDropdownAberto(true)}
                  placeholder="Digite apto, bloco ou nome..."
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-zinc-400"
                />
                {buscaMorador && (
                  <button type="button" onClick={limparMorador} className="text-zinc-400 hover:text-zinc-600 flex-shrink-0">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Dropdown com resultados */}
              {dropdownAberto && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                  {/* Opção nenhum */}
                  <button type="button" onClick={limparMorador}
                    className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 text-zinc-400 text-sm italic border-b border-zinc-100">
                    — Sem vínculo (visitante) —
                  </button>
                  {morFiltrados.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-zinc-400 text-center">Nenhum morador encontrado</div>
                  ) : (
                    morFiltrados.map(m => (
                      <button key={m.id} type="button" onClick={() => selecionarMorador(m)}
                        className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center justify-between border-b border-zinc-50 last:border-0 ${form.moradorId === String(m.id) ? 'bg-blue-50' : ''}`}>
                        <span className="text-sm font-semibold text-zinc-800 truncate">{m.nome}</span>
                        <span className="text-xs text-zinc-400 flex-shrink-0 ml-2 font-mono">
                          {m.apartamento}{m.bloco ? ` · ${m.bloco}` : ''}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {form.moradorId && (
              <p className="text-xs text-green-600 font-semibold flex items-center gap-1 mt-0.5">
                <Check size={12} /> Morador selecionado
              </p>
            )}
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

// ─── Página principal ────────────────────────────────────────────────────────
export default function VeiculosPage() {
  const [lista, setLista] = useState<VeiculoComMorador[]>([])
  const [moradores, setMoradores] = useState<Morador[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<VeiculoComMorador | null>(null)
  const [deletando, setDeletando] = useState<number | null>(null)
  const [leitorAberto, setLeitorAberto] = useState(false)
  const [buscaViaCamera, setBuscaViaCamera] = useState(false)

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

  function onPlacaLida(placa: string) {
    setBuscaViaCamera(true)
    setBusca(placa)
    setTimeout(() => setBuscaViaCamera(false), 4000)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0F4FF', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="bg-white border-b border-zinc-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-900">Veículos</h1>
            <p className="text-zinc-400 text-xs">Gerencie os veículos cadastrados</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Botão câmera ler placa */}
            <button
              onClick={() => setLeitorAberto(true)}
              title="Ler placa com câmera"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-yellow-400 text-yellow-900 hover:bg-yellow-500 transition-colors shadow-sm"
            >
              <ScanLine size={18} />
            </button>
            <button
              onClick={() => { setEditando(null); setModalAberto(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Novo veículo</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['carro', 'moto', 'caminhao', 'outro'] as const).map(t => {
            const count = lista.filter(v => v.veiculo.tipo === t).length
            return (
              <div key={t} className="bg-white rounded-2xl p-3 shadow-sm border border-zinc-100 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${tipoCor[t]}`}>{count}</div>
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
          <input
            value={busca}
            onChange={e => { setBusca(e.target.value); setBuscaViaCamera(false) }}
            placeholder="Buscar por placa, modelo ou proprietário..."
            className={`w-full pl-9 pr-10 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 shadow-sm transition-all ${
              buscaViaCamera
                ? 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-300'
                : 'border-zinc-200 bg-white focus:ring-blue-500'
            }`}
          />
          {busca && (
            <button onClick={() => { setBusca(''); setBuscaViaCamera(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <X size={15} />
            </button>
          )}
          {buscaViaCamera && (
            <div className="absolute -bottom-5 left-1 flex items-center gap-1 text-[11px] text-yellow-700 font-semibold">
              <ScanLine size={11} /> Placa lida pela câmera
            </div>
          )}
        </div>

        {/* List */}
        <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-colors ${buscaViaCamera ? 'border-yellow-300' : 'border-zinc-100'}`}>
          <div className="px-4 py-3 border-b border-zinc-50 flex items-center gap-2">
            <Car size={15} className="text-blue-600" />
            <span className="text-sm font-semibold text-zinc-700">
              {lista.length} veículo{lista.length !== 1 ? 's' : ''} cadastrado{lista.length !== 1 ? 's' : ''}
            </span>
            {buscaViaCamera && busca && (
              <span className="ml-auto flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full font-semibold">
                <ScanLine size={11} /> Placa: {busca}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : lista.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Car size={28} className="text-zinc-200" />
              <p className="text-zinc-400 font-semibold text-sm">
                {buscaViaCamera ? `Placa "${busca}" não encontrada` : 'Nenhum veículo encontrado'}
              </p>
              {buscaViaCamera && <p className="text-xs text-zinc-300">Este veículo pode não estar cadastrado</p>}
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {lista.map(({ veiculo: v, morador: m }) => (
                <div key={v.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50/30 transition-colors">
                  <div className={`flex-shrink-0 rounded-lg px-3 py-1.5 min-w-[90px] text-center border-2 ${buscaViaCamera ? 'bg-yellow-100 border-yellow-400' : 'bg-yellow-50 border-yellow-300'}`}>
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

      {leitorAberto && (
        <LeitorPlacaModal
          onClose={() => setLeitorAberto(false)}
          onPlacaLida={onPlacaLida}
        />
      )}

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
