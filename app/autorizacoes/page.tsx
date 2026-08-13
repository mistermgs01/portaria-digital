'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ShieldCheck, Plus, Search, X, Camera, Check, Loader2,
  Clock, Car, Ban, RefreshCw, Edit2, AlertTriangle, Building2,
} from 'lucide-react'

// ─── tipos ────────────────────────────────────────────────────────────────────
type TipoAut = 'visitante' | 'prestador' | 'entrega' | 'outro'
type StatusAut = 'ativa' | 'expirada' | 'cancelada'

interface Autorizacao {
  id: number
  nome: string
  tipo: TipoAut
  documento?: string
  telefone?: string
  empresa?: string
  placa?: string
  modelo?: string
  cor?: string
  fotoVeiculo?: string
  moradorId?: number
  apartamentoDestino?: string
  blocoDestino?: string
  vaga?: string
  validoAte: string
  status: StatusAut
  motivo?: string
  observacoes?: string
  createdAt: string
  moradorNome?: string
}

interface MoradorSimples {
  id: number
  nome: string
  apartamento: string
  bloco?: string
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const TIPO_LABEL: Record<TipoAut, string> = {
  visitante: 'Visita',
  prestador: 'Prestador',
  entrega: 'Entrega',
  outro: 'Outro',
}

const TIPO_COR: Record<TipoAut, string> = {
  visitante: 'bg-blue-100 text-blue-700',
  prestador: 'bg-orange-100 text-orange-700',
  entrega: 'bg-purple-100 text-purple-700',
  outro: 'bg-zinc-100 text-zinc-600',
}

function formatarPrazo(dt: string): { label: string; urgente: boolean; expirado: boolean } {
  const fim = new Date(dt)
  const agora = new Date()
  const diff = fim.getTime() - agora.getTime()
  if (diff <= 0) return { label: 'Expirado', urgente: false, expirado: true }
  const horas = Math.floor(diff / 3600000)
  const dias = Math.floor(diff / 86400000)
  if (horas < 1) return { label: 'Menos de 1h', urgente: true, expirado: false }
  if (horas < 24) return { label: `${horas}h restantes`, urgente: horas < 4, expirado: false }
  return { label: `${dias} dia${dias > 1 ? 's' : ''} restantes`, urgente: false, expirado: false }
}

// Calcula timestamp futuro em ms
function tsRapido(horas: number): number {
  return Date.now() + horas * 3600000
}

// Formata timestamp para exibição amigável
function formatarTs(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Timestamp -> ISO string para enviar ao servidor
function tsParaISO(ts: number): string {
  return new Date(ts).toISOString()
}

// ISO string -> timestamp number
function isoParaTs(iso: string): number {
  return iso ? new Date(iso).getTime() : Date.now() + 86400000
}

// ─── componente CameraModal ───────────────────────────────────────────────────
function CameraModal({
  onClose,
  onCaptura,
}: {
  onClose: () => void
  onCaptura: (base64: string, placa: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [ativa, setAtiva] = useState(false)
  const [lendo, setLendo] = useState(false)
  const [foto, setFoto] = useState('')
  const [placa, setPlaca] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    let cancelled = false
    async function iniciar() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        // atribui srcObject diretamente — o autoPlay no elemento cuida do resto
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setAtiva(true)
      } catch (e) {
        if (!cancelled) setErro('Câmera não disponível. Use "Escolher da galeria" abaixo.')
        console.error('Camera error:', e)
      }
    }
    iniciar()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  async function fotografar() {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current
    const c = canvasRef.current
    c.width = v.videoWidth || 1280
    c.height = v.videoHeight || 720
    c.getContext('2d')?.drawImage(v, 0, 0)
    const dataUrl = c.toDataURL('image/jpeg', 0.85)
    setFoto(dataUrl)
    setErro('')
    setPlaca('')
    await enviarIA(dataUrl)
  }

  async function enviarIA(base64: string) {
    setLendo(true)
    try {
      const res = await fetch('/api/ler-placa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      })
      const json = await res.json()
      const p = (json.data?.placa ?? '').replace(/[^A-Z0-9]/gi, '').toUpperCase()
      if (p && p !== 'NAO_IDENTIFICADA' && p.length >= 4) {
        setPlaca(p)
      } else {
        setErro('Placa não lida automaticamente. Verifique a foto e tente de novo, ou use a foto e preencha a placa manualmente.')
      }
    } catch {
      setErro('Erro ao processar. Tente novamente.')
    } finally {
      setLendo(false)
    }
  }

  async function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const base64 = ev.target?.result as string
      setFoto(base64)
      setErro('')
      setPlaca('')
      await enviarIA(base64)
    }
    reader.readAsDataURL(file)
  }

  function confirmar() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    onCaptura(foto, placa)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Camera size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-zinc-900 text-sm">Fotografar veículo</p>
              <p className="text-zinc-400 text-xs">A placa é lida automaticamente pela IA</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200">
            <X size={16} />
          </button>
        </div>

        {/* Viewfinder */}
        <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
          {/* Foto capturada */}
          {foto && !placa && (
            <img src={foto} alt="captura" className="absolute inset-0 w-full h-full object-cover" />
          )}

          {/* Vídeo ao vivo — autoPlay garante que inicie sem chamar .play() manualmente */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ display: ativa && !foto ? 'block' : 'none' }}
            className="w-full h-full object-cover"
          />

          {/* Spinner de carregamento */}
          {!ativa && !erro && !foto && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
              <div className="w-8 h-8 border-4 border-zinc-600 border-t-white rounded-full animate-spin" />
              <p className="text-zinc-400 text-xs">Iniciando câmera...</p>
            </div>
          )}

          {/* Guia de enquadramento */}
          {ativa && !lendo && !foto && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="border-2 border-yellow-400 rounded-lg relative"
                style={{ width: '72%', height: '30%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
              >
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-300 text-xs font-semibold whitespace-nowrap">
                  Centralize a placa aqui
                </span>
              </div>
            </div>
          )}

          {/* Processando IA */}
          {lendo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
              <Loader2 size={32} className="text-white animate-spin" />
              <p className="text-white text-sm font-semibold">Lendo placa pela IA...</p>
            </div>
          )}

          {/* Placa detectada */}
          {placa && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 gap-3">
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl px-8 py-3 text-center">
                <p className="font-black text-zinc-900 tracking-widest text-2xl font-mono">{placa}</p>
                <p className="text-yellow-600 text-[10px] font-bold tracking-widest uppercase mt-0.5">Brasil</p>
              </div>
              <p className="text-green-300 text-sm font-semibold">✓ Placa lida!</p>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Erro */}
        {erro && (
          <div className="px-4 py-3 bg-rose-50 border-t border-rose-100 text-rose-700 text-xs text-center leading-relaxed">
            {erro}
          </div>
        )}

        {/* Botões */}
        <div className="p-4 flex flex-col gap-2.5">
          {!placa ? (
            <>
              <button
                onClick={() => { setFoto(''); setErro(''); fotografar() }}
                disabled={!ativa || lendo}
                className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
              >
                <Camera size={18} /> {foto ? 'Fotografar novamente' : 'Fotografar veículo'}
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={lendo}
                className="w-full py-2.5 rounded-2xl bg-zinc-100 text-zinc-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-zinc-200"
              >
                Escolher da galeria
              </button>
            </>
          ) : (
            <div className="flex gap-2.5">
              <button
                onClick={() => { setPlaca(''); setFoto(''); setErro('') }}
                className="flex-1 py-2.5 rounded-2xl border border-zinc-200 text-zinc-600 font-semibold text-sm hover:bg-zinc-50"
              >
                Tentar novamente
              </button>
              <button
                onClick={confirmar}
                className="flex-1 py-2.5 rounded-2xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700"
              >
                <Check size={16} /> Usar esta foto
              </button>
            </div>
          )}
          {/* Usar foto mesmo sem placa lida */}
          {foto && !placa && !lendo && (
            <button
              onClick={confirmar}
              className="w-full py-2 rounded-xl bg-zinc-50 text-zinc-500 text-xs hover:bg-zinc-100"
            >
              Usar foto (preencher placa manualmente)
            </button>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onArquivo} />
      </div>
    </div>
  )
}

// ─── Modal Nova/Editar Autorização ────────────────────────────────────────────
const BLANK_FORM = {
  nome: '', tipo: 'visitante' as TipoAut, documento: '', telefone: '', empresa: '',
  placa: '', modelo: '', cor: '', fotoVeiculo: '', moradorId: '',
  apartamentoDestino: '', blocoDestino: '', vaga: '',
  validoAteTs: tsRapido(24), // armazenamos como timestamp number
  motivo: '', observacoes: '',
  status: 'ativa' as StatusAut,
}

type FormState = typeof BLANK_FORM

function ModalAutorizacao({
  aut,
  onClose,
  onSalvo,
}: {
  aut: Autorizacao | null
  onClose: () => void
  onSalvo: () => void
}) {
  const [form, setForm] = useState<FormState>({ ...BLANK_FORM })
  const [moradores, setMoradores] = useState<MoradorSimples[]>([])
  const [buscaMorador, setBuscaMorador] = useState('')
  const [showBuscaDropdown, setShowBuscaDropdown] = useState(false)
  const [camera, setCamera] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  // Carregar moradores
  useEffect(() => {
    fetch('/api/moradores?limit=500')
      .then(r => r.json())
      .then(j => {
        const lista = (j.data ?? []) as Array<MoradorSimples & { apartamento: string }>
        setMoradores(lista.filter(m => m.apartamento !== '0'))
      })
      .catch(() => {})
  }, [])

  // Popular form ao editar
  useEffect(() => {
    if (aut) {
      setForm({
        nome: aut.nome ?? '',
        tipo: aut.tipo ?? 'visitante',
        documento: aut.documento ?? '',
        telefone: aut.telefone ?? '',
        empresa: aut.empresa ?? '',
        placa: aut.placa ?? '',
        modelo: aut.modelo ?? '',
        cor: aut.cor ?? '',
        fotoVeiculo: aut.fotoVeiculo ?? '',
        moradorId: aut.moradorId ? String(aut.moradorId) : '',
        apartamentoDestino: aut.apartamentoDestino ?? '',
        blocoDestino: aut.blocoDestino ?? '',
        vaga: aut.vaga ?? '',
        validoAteTs: isoParaTs(aut.validoAte),
        motivo: aut.motivo ?? '',
        observacoes: aut.observacoes ?? '',
        status: aut.status ?? 'ativa',
      })
      setBuscaMorador(aut.moradorNome ?? '')
    } else {
      setForm({ ...BLANK_FORM, validoAteTs: tsRapido(24) })
      setBuscaMorador('')
    }
  }, [aut])

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function selecionarMorador(m: MoradorSimples) {
    setField('moradorId', String(m.id))
    setField('apartamentoDestino', m.apartamento)
    setField('blocoDestino', m.bloco ?? '')
    setBuscaMorador(m.nome)
    setShowBuscaDropdown(false)
  }

  function onCapturaCamera(base64: string, placaLida: string) {
    setField('fotoVeiculo', base64)
    if (placaLida) setField('placa', placaLida)
  }

  async function salvar() {
    if (!form.nome.trim()) { setErroForm('Nome é obrigatório'); return }
    if (!form.validoAteTs) { setErroForm('Prazo de validade é obrigatório'); return }
    setSalvando(true)
    setErroForm('')
    try {
      const payload = {
        nome: form.nome,
        tipo: form.tipo,
        documento: form.documento || null,
        telefone: form.telefone || null,
        empresa: form.empresa || null,
        placa: form.placa || null,
        modelo: form.modelo || null,
        cor: form.cor || null,
        fotoVeiculo: form.fotoVeiculo || null,
        moradorId: form.moradorId ? Number(form.moradorId) : null,
        apartamentoDestino: form.apartamentoDestino || null,
        blocoDestino: form.blocoDestino || null,
        vaga: form.vaga || null,
        validoAte: tsParaISO(form.validoAteTs),
        status: form.status,
        motivo: form.motivo || null,
        observacoes: form.observacoes || null,
      }
      const url = aut ? `/api/autorizacoes/${aut.id}` : '/api/autorizacoes'
      const res = await fetch(url, {
        method: aut ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Erro ao salvar')
      onSalvo()
      onClose()
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : 'Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const morFiltrados = moradores.filter(m =>
    !buscaMorador ||
    m.nome.toLowerCase().includes(buscaMorador.toLowerCase()) ||
    m.apartamento.includes(buscaMorador)
  ).slice(0, 8)

  const prazoLabel = formatarTs(form.validoAteTs)

  return (
    <>
      {camera && (
        <CameraModal onClose={() => setCamera(false)} onCaptura={onCapturaCamera} />
      )}

      <div className="fixed inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center">
        <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[95dvh] flex flex-col">

          {/* ── Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <ShieldCheck size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-bold text-zinc-900">{aut ? 'Editar Autorização' : 'Nova Autorização'}</p>
                <p className="text-zinc-400 text-xs">Acesso provisório para visitantes e prestadores</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200">
              <X size={16} />
            </button>
          </div>

          {/* ── Corpo scrollável */}
          <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">

            {/* Tipo */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Tipo</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['visitante', 'prestador', 'entrega', 'outro'] as TipoAut[]).map(t => (
                  <button key={t} type="button" onClick={() => setField('tipo', t)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      form.tipo === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                    }`}>
                    {TIPO_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Foto + câmera */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Foto do veículo</label>
              {form.fotoVeiculo ? (
                <div className="relative rounded-xl overflow-hidden border border-zinc-200" style={{ aspectRatio: '16/7' }}>
                  <img src={form.fotoVeiculo} alt="veículo" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setCamera(true)}
                    className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/60 text-white text-xs font-semibold rounded-lg flex items-center gap-1 hover:bg-black/80">
                    <RefreshCw size={12} /> Refazer
                  </button>
                  <button type="button" onClick={() => setField('fotoVeiculo', '')}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-rose-600">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setCamera(true)}
                  className="w-full py-7 border-2 border-dashed border-zinc-300 rounded-xl flex flex-col items-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors group">
                  <div className="w-11 h-11 rounded-2xl bg-zinc-100 group-hover:bg-blue-100 flex items-center justify-center">
                    <Camera size={22} className="text-zinc-400 group-hover:text-blue-500" />
                  </div>
                  <p className="text-zinc-500 text-sm font-semibold group-hover:text-blue-600">Fotografar veículo + ler placa</p>
                  <p className="text-zinc-400 text-xs">A câmera lê a placa automaticamente</p>
                </button>
              )}
            </div>

            {/* Placa + Cor + Vaga */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Placa</label>
                <input value={form.placa} onChange={e => setField('placa', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="ABC1234"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Cor</label>
                <input value={form.cor} onChange={e => setField('cor', e.target.value)}
                  placeholder="Prata"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Vaga</label>
                <input value={form.vaga} onChange={e => setField('vaga', e.target.value)}
                  placeholder="V-12"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Modelo do veículo</label>
              <input value={form.modelo} onChange={e => setField('modelo', e.target.value)}
                placeholder="Hyundai Tucson, Honda CG 160..."
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            {/* Dados pessoais */}
            <div className="pt-1 border-t border-zinc-100">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                {form.tipo === 'prestador' ? 'Dados do Prestador' : 'Dados do Visitante'}
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Nome *</label>
                  <input value={form.nome} onChange={e => setField('nome', e.target.value)}
                    placeholder="Nome completo"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                {form.tipo === 'prestador' && (
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Empresa / Serviço</label>
                    <input value={form.empresa} onChange={e => setField('empresa', e.target.value)}
                      placeholder="Ex: Hidra Instalações, Amazon..."
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Telefone</label>
                    <input value={form.telefone} onChange={e => setField('telefone', e.target.value)}
                      placeholder="11 9 9999-9999"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">RG / CPF</label>
                    <input value={form.documento} onChange={e => setField('documento', e.target.value)}
                      placeholder="Opcional"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Destino */}
            <div className="pt-1 border-t border-zinc-100">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Apartamento de destino</label>
              <div className="relative">
                <div className="flex items-center border border-zinc-200 rounded-xl px-4 py-2.5 gap-2 focus-within:ring-2 focus-within:ring-blue-400">
                  <Search size={14} className="text-zinc-400 flex-shrink-0" />
                  <input
                    value={buscaMorador}
                    onChange={e => { setBuscaMorador(e.target.value); setShowBuscaDropdown(true) }}
                    onFocus={() => setShowBuscaDropdown(true)}
                    placeholder="Buscar morador pelo nome ou apto..."
                    className="flex-1 text-sm outline-none"
                  />
                  {buscaMorador && (
                    <button type="button" onClick={() => { setBuscaMorador(''); setField('moradorId', ''); setShowBuscaDropdown(false) }}>
                      <X size={14} className="text-zinc-400" />
                    </button>
                  )}
                </div>
                {showBuscaDropdown && buscaMorador.length > 0 && morFiltrados.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-hidden">
                    {morFiltrados.map(m => (
                      <button key={m.id} type="button" onClick={() => selecionarMorador(m)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between border-b border-zinc-50 last:border-0">
                        <span className="text-sm font-semibold text-zinc-800 truncate">{m.nome}</span>
                        <span className="text-xs text-zinc-400 flex-shrink-0 ml-2">
                          Apto {m.apartamento}{m.bloco ? ` · ${m.bloco}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2.5 mt-2">
                <div className="col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1">Apartamento</label>
                  <input value={form.apartamentoDestino} onChange={e => setField('apartamentoDestino', e.target.value)}
                    placeholder="101"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Bloco</label>
                  <input value={form.blocoDestino} onChange={e => setField('blocoDestino', e.target.value)}
                    placeholder="01"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
            </div>

            {/* ── PRAZO DE VALIDADE ── */}
            <div className="pt-1 border-t border-zinc-100">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                Prazo de validade *
              </label>

              {/* Data selecionada — exibição amigável */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3 flex items-center gap-3">
                <Clock size={16} className="text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-blue-700 font-bold text-sm">{prazoLabel}</p>
                  <p className="text-blue-400 text-xs">Toque nos botões abaixo para alterar</p>
                </div>
              </div>

              {/* Botões rápidos */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: '4 horas', h: 4 },
                  { label: '8 horas', h: 8 },
                  { label: '24 horas', h: 24 },
                  { label: '3 dias', h: 72 },
                  { label: '7 dias', h: 168 },
                  { label: '30 dias', h: 720 },
                ].map(({ label, h }) => {
                  const ts = tsRapido(h)
                  // Verifica se este botão está selecionado (±5min)
                  const selecionado = Math.abs(form.validoAteTs - ts) < 5 * 60 * 1000
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setField('validoAteTs', ts)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        selecionado
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Data/hora personalizada — usa um input nativo mas gerenciado separadamente */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Ou escolha data e hora exata:</label>
                <input
                  type="datetime-local"
                  defaultValue={new Date(form.validoAteTs).toISOString().slice(0, 16)}
                  key={form.validoAteTs} /* força remount quando muda via botão */
                  onChange={e => {
                    if (e.target.value) setField('validoAteTs', new Date(e.target.value).getTime())
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Motivo da visita</label>
              <input value={form.motivo} onChange={e => setField('motivo', e.target.value)}
                placeholder="Ex: obra, entrega de móveis, visita familiar..."
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            {/* Status (só na edição) */}
            {aut && (
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Status</label>
                <select value={form.status} onChange={e => setField('status', e.target.value as StatusAut)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  <option value="ativa">Ativa</option>
                  <option value="expirada">Expirada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            )}

            {erroForm && (
              <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
                {erroForm}
              </div>
            )}
          </div>

          {/* ── Footer */}
          <div className="p-5 border-t border-zinc-100 flex-shrink-0 flex gap-2.5">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-zinc-200 text-zinc-600 font-semibold text-sm hover:bg-zinc-50">
              Cancelar
            </button>
            <button type="button" onClick={salvar} disabled={salvando}
              className="flex-1 py-3 rounded-2xl bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50">
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {aut ? 'Salvar' : 'Criar autorização'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Card de Autorização ──────────────────────────────────────────────────────
function CardAutorizacao({
  a,
  onEditar,
  onCancelar,
}: {
  a: Autorizacao
  onEditar: () => void
  onCancelar: () => void
}) {
  const prazo = formatarPrazo(a.validoAte)
  const ativa = a.status === 'ativa'
  const cancelada = a.status === 'cancelada'

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${cancelada ? 'opacity-55' : ''}`}>
      <div className="flex gap-3 p-4">
        {a.fotoVeiculo ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-200 flex-shrink-0">
            <img src={a.fotoVeiculo} alt="veículo" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${ativa ? 'bg-green-50' : 'bg-zinc-100'}`}>
            <Car size={28} className={ativa ? 'text-green-400' : 'text-zinc-300'} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-bold text-zinc-900 text-sm leading-tight truncate">{a.nome}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${TIPO_COR[a.tipo]}`}>
              {TIPO_LABEL[a.tipo]}
            </span>
          </div>

          {a.empresa && (
            <p className="text-xs text-zinc-400 flex items-center gap-1 mb-0.5">
              <Building2 size={11} /> {a.empresa}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 mt-1">
            {a.placa && (
              <span className="bg-zinc-900 text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded-md tracking-widest">
                {a.placa}
              </span>
            )}
            {a.vaga && (
              <span className="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-md">
                Vaga {a.vaga}
              </span>
            )}
          </div>

          {a.modelo && <p className="text-xs text-zinc-400 mt-0.5">{a.modelo}{a.cor ? ` · ${a.cor}` : ''}</p>}

          {(a.apartamentoDestino || a.moradorNome) && (
            <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
              <Building2 size={11} />
              {a.moradorNome ? `${a.moradorNome} — ` : ''}Apto {a.apartamentoDestino}{a.blocoDestino ? ` · Bl ${a.blocoDestino}` : ''}
            </p>
          )}
          {a.motivo && <p className="text-xs text-zinc-400 mt-0.5 italic truncate">"{a.motivo}"</p>}
        </div>
      </div>

      <div className={`flex items-center justify-between px-4 py-2.5 border-t ${
        cancelada ? 'bg-zinc-50 border-zinc-100' :
        prazo.expirado ? 'bg-rose-50 border-rose-100' :
        prazo.urgente ? 'bg-amber-50 border-amber-100' :
        'bg-green-50 border-green-100'
      }`}>
        <div className="flex items-center gap-1.5">
          {cancelada ? <Ban size={13} className="text-zinc-400" /> :
           prazo.expirado ? <AlertTriangle size={13} className="text-rose-500" /> :
           <Clock size={13} className={prazo.urgente ? 'text-amber-500' : 'text-green-500'} />}
          <span className={`text-xs font-bold ${
            cancelada ? 'text-zinc-400' : prazo.expirado ? 'text-rose-600' : prazo.urgente ? 'text-amber-600' : 'text-green-700'
          }`}>
            {cancelada ? 'Cancelada' : prazo.label}
          </span>
          <span className="text-[10px] text-zinc-400">
            até {new Date(a.validoAte).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEditar} className="p-1.5 rounded-lg hover:bg-white/70 text-zinc-500 hover:text-blue-600 transition-colors">
            <Edit2 size={14} />
          </button>
          {ativa && (
            <button onClick={onCancelar} className="p-1.5 rounded-lg hover:bg-white/70 text-zinc-500 hover:text-rose-600 transition-colors">
              <Ban size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AutorizacoesPage() {
  const [lista, setLista] = useState<Autorizacao[]>([])
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<'todas' | 'ativa' | 'expirada' | 'cancelada'>('ativa')
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null)
  const [autSelecionada, setAutSelecionada] = useState<Autorizacao | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ busca, status: filtro })
      const res = await fetch(`/api/autorizacoes?${params}`)
      const json = await res.json()
      setLista(json.data ?? [])
    } catch { setLista([]) }
    finally { setCarregando(false) }
  }, [busca, filtro])

  useEffect(() => { carregar() }, [carregar])

  // Recarregar a cada 60s para expirar visualmente
  useEffect(() => {
    const t = setInterval(carregar, 60000)
    return () => clearInterval(t)
  }, [carregar])

  async function cancelar(id: number) {
    if (!confirm('Cancelar esta autorização?')) return
    await fetch(`/api/autorizacoes/${id}`, { method: 'DELETE' })
    carregar()
  }

  const ativas = lista.filter(a => a.status === 'ativa').length
  const expiradas = lista.filter(a => a.status === 'expirada').length

  return (
    <main className="min-h-screen bg-zinc-50 pb-20">
      {(modal === 'criar' || modal === 'editar') && (
        <ModalAutorizacao
          aut={modal === 'editar' ? autSelecionada : null}
          onClose={() => { setModal(null); setAutSelecionada(null) }}
          onSalvo={carregar}
        />
      )}

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #166534 0%, #16a34a 100%)' }} className="px-4 pt-6 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black text-white">Autorizações</h1>
              <p className="text-green-100 text-sm mt-0.5">Acesso provisório · Visitantes e prestadores</p>
            </div>
            <button
              onClick={() => { setAutSelecionada(null); setModal('criar') }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-green-700 rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all"
            >
              <Plus size={16} /> Nova
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Ativas', valor: ativas, cor: 'text-green-300' },
              { label: 'Expiradas', valor: expiradas, cor: 'text-amber-300' },
              { label: 'Total', valor: lista.length, cor: 'text-white' },
            ].map(({ label, valor, cor }) => (
              <div key={label} className="bg-white/10 rounded-xl px-3 py-2 text-center">
                <p className={`text-xl font-black ${cor}`}>{valor}</p>
                <p className="text-green-200 text-[11px] font-semibold uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4">
        {/* Busca */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 mb-3">
          <div className="flex items-center gap-3 px-4 py-3">
            <Search size={16} className="text-zinc-400 flex-shrink-0" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, placa ou apartamento..."
              className="flex-1 text-sm outline-none placeholder:text-zinc-400" />
            {busca && (
              <button onClick={() => setBusca('')}>
                <X size={16} className="text-zinc-400 hover:text-zinc-600" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(['ativa', 'todas', 'expirada', 'cancelada'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                filtro === f
                  ? f === 'ativa' ? 'bg-green-600 text-white' :
                    f === 'expirada' ? 'bg-amber-500 text-white' :
                    f === 'cancelada' ? 'bg-zinc-600 text-white' : 'bg-blue-600 text-white'
                  : 'bg-white text-zinc-500 border border-zinc-200'
              }`}>
              {f === 'ativa' ? 'Ativas' : f === 'todas' ? 'Todas' : f === 'expirada' ? 'Expiradas' : 'Canceladas'}
            </button>
          ))}
        </div>

        {/* Lista */}
        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="text-green-500 animate-spin" />
          </div>
        ) : lista.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-green-100 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={36} className="text-green-400" />
            </div>
            <p className="text-zinc-500 font-semibold text-lg">Nenhuma autorização</p>
            <p className="text-zinc-400 text-sm mt-1">
              {filtro === 'ativa' ? 'Sem autorizações ativas agora' : `Sem registros "${filtro}"`}
            </p>
            <button onClick={() => { setAutSelecionada(null); setModal('criar') }}
              className="mt-4 px-6 py-2.5 bg-green-600 text-white font-bold rounded-2xl text-sm hover:bg-green-700 flex items-center gap-2 mx-auto">
              <Plus size={16} /> Criar primeira autorização
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {lista.map(a => (
              <CardAutorizacao
                key={a.id}
                a={a}
                onEditar={() => { setAutSelecionada(a); setModal('editar') }}
                onCancelar={() => cancelar(a.id)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
