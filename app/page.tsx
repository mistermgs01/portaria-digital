'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Plus, Users, Phone, Mail, Edit2, Trash2, X, Check, ChevronUp, ChevronDown, FileSpreadsheet, Camera, Upload } from 'lucide-react'
import type { Morador } from '@/db/schemas/moradores'
import ImportModal from '@/components/ImportModal'

type FormData = {
  nome: string
  apartamento: string
  bloco: string
  telefone: string
  email: string
  cpf: string
  observacoes: string
  status: 'ativo' | 'inativo'
  foto: string
}

const EMPTY_FORM: FormData = {
  nome: '',
  apartamento: '',
  bloco: '',
  telefone: '',
  email: '',
  cpf: '',
  observacoes: '',
  status: 'ativo',
  foto: '',
}

function formatCPF(value: string) {
  return value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14)
}

function formatTelefone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15)
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${status === 'ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'ativo' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
      {status === 'ativo' ? 'Ativo' : 'Inativo'}
    </span>
  )
}

function AvatarMorador({
  foto, nome, size = 'md', apartamento, bloco,
}: {
  foto?: string | null
  nome: string
  size?: 'sm' | 'md' | 'lg'
  apartamento?: string
  bloco?: string | null
}) {
  const sizes = { sm: 'w-10 h-10', md: 'w-12 h-12', lg: 'w-20 h-20' }
  if (foto) {
    return <img src={foto} alt={nome} className={`${sizes[size]} rounded-xl object-cover flex-shrink-0`} />
  }
  // Se tem apartamento, mostra número do apto + Torre X no balão
  const temApto = apartamento && apartamento !== '0'
  const torre = bloco ? `Torre ${bloco.replace(/^0+/, '')}` : null
  if (temApto) {
    return (
      <div className={`${sizes[size]} rounded-xl bg-blue-600 flex flex-col items-center justify-center text-white flex-shrink-0 px-1`}>
        <span className="font-black leading-none" style={{ fontSize: size === 'lg' ? 22 : size === 'sm' ? 13 : 15 }}>{apartamento}</span>
        {torre && <span className="font-semibold leading-none mt-0.5 text-blue-100" style={{ fontSize: size === 'lg' ? 9 : 7 }}>{torre}</span>}
      </div>
    )
  }
  // Funcionário (apto=0): logo RS Serviços
  const iconSize = size === 'lg' ? 48 : size === 'sm' ? 28 : 36
  return (
    <div className={`${sizes[size]} rounded-xl bg-[#0d2c6e] flex items-center justify-center flex-shrink-0`}>
      <svg width={iconSize} height={Math.round(iconSize * 0.55)} viewBox="0 0 56 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* óvalo externo */}
        <ellipse cx="28" cy="15" rx="27" ry="13.5" fill="#0d2c6e" stroke="white" strokeWidth="2.2"/>
        {/* letra R */}
        <text x="7" y="21.5" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="15" fill="white" letterSpacing="-0.5">RS</text>
      </svg>
    </div>
  )
}

function FotoCaptura({ foto, onChange }: { foto: string; onChange: (f: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraAberta, setCameraAberta] = useState(false)
  const [erroCamera, setErroCamera] = useState('')

  async function abrirCamera() {
    setErroCamera('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      setCameraAberta(true)
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      }, 100)
    } catch {
      setErroCamera('Não foi possível acessar a câmera. Use o upload.')
    }
  }

  function fecharCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraAberta(false)
  }

  function capturar() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
    onChange(dataUrl)
    fecharCamera()
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onChange(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  if (cameraAberta) {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative bg-zinc-900 rounded-xl overflow-hidden aspect-square w-full max-w-[240px] mx-auto">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex gap-2 max-w-[240px] mx-auto w-full">
          <button type="button" onClick={fecharCamera} className="flex-1 py-2 rounded-xl bg-zinc-100 text-zinc-600 text-sm font-semibold hover:bg-zinc-200">
            Cancelar
          </button>
          <button type="button" onClick={capturar} className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-1.5">
            <Camera size={15} /> Tirar foto
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Foto do morador</label>
      <div className="flex items-center gap-3">
        {foto
          ? <img src={foto} alt="Foto" className="w-16 h-16 rounded-xl object-cover border-2 border-blue-100" />
          : <div className="w-16 h-16 rounded-xl bg-zinc-100 flex items-center justify-center"><Users size={24} className="text-zinc-300" /></div>
        }
        <div className="flex flex-col gap-1.5 flex-1">
          <button type="button" onClick={abrirCamera}
            className="flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Camera size={15} /> Tirar foto com câmera
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-100 text-zinc-600 text-sm font-semibold hover:bg-zinc-200 transition-colors">
            <Upload size={15} /> Escolher da galeria
          </button>
          {foto && (
            <button type="button" onClick={() => onChange('')}
              className="text-xs text-rose-400 hover:text-rose-600 text-center">
              Remover foto
            </button>
          )}
        </div>
      </div>
      {erroCamera && <p className="text-xs text-rose-500">{erroCamera}</p>}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  )
}

function MoradorModal({ morador, onClose, onSave }: { morador: Morador | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState<FormData>(
    morador ? {
      nome: morador.nome,
      apartamento: morador.apartamento,
      bloco: morador.bloco ?? '',
      telefone: morador.telefone ?? '',
      email: morador.email ?? '',
      cpf: morador.cpf ?? '',
      observacoes: morador.observacoes ?? '',
      status: morador.status,
      foto: morador.foto ?? '',
    } : EMPTY_FORM
  )
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (!form.apartamento.trim()) e.apartamento = 'Apartamento é obrigatório'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const payload = { ...form, bloco: form.bloco || null, telefone: form.telefone || null, email: form.email || null, cpf: form.cpf || null, observacoes: form.observacoes || null, foto: form.foto || null }
      if (morador) {
        await fetch(`/api/moradores/${morador.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        await fetch('/api/moradores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      onSave()
    } finally {
      setLoading(false)
    }
  }

  function field(key: keyof FormData, label: string, opts?: { type?: string; mask?: 'cpf' | 'tel'; required?: boolean; as?: 'textarea' }) {
    const hasError = !!errors[key]
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          {label}{opts?.required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
        {opts?.as === 'textarea' ? (
          <textarea rows={3} value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            className={`rounded-xl border px-3 py-2 text-sm resize-none bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasError ? 'border-rose-400' : 'border-zinc-200'}`} />
        ) : (
          <input type={opts?.type ?? 'text'} value={form[key] as string}
            onChange={e => {
              let v = e.target.value
              if (opts?.mask === 'cpf') v = formatCPF(v)
              if (opts?.mask === 'tel') v = formatTelefone(v)
              setForm(f => ({ ...f, [key]: v }))
              if (errors[key]) setErrors(p => ({ ...p, [key]: undefined }))
            }}
            className={`rounded-xl border px-3 py-2 text-sm bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasError ? 'border-rose-400' : 'border-zinc-200'}`}
          />
        )}
        {hasError && <p className="text-xs text-rose-500">{errors[key]}</p>}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <AvatarMorador foto={form.foto} nome={form.nome || '?'} size="md" />
            <div>
              <h2 className="font-bold text-zinc-900">{morador ? 'Editar Morador' : 'Novo Morador'}</h2>
              <p className="text-xs text-zinc-400">Preencha os dados do morador</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Foto */}
          <FotoCaptura foto={form.foto} onChange={foto => setForm(f => ({ ...f, foto }))} />

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">{field('nome', 'Nome completo', { required: true })}</div>
            {field('apartamento', 'Apartamento', { required: true })}
            {field('bloco', 'Bloco')}
            {field('telefone', 'Telefone', { mask: 'tel' })}
            {field('cpf', 'CPF', { mask: 'cpf' })}
            <div className="col-span-2">{field('email', 'E-mail', { type: 'email' })}</div>
            <div className="col-span-2">{field('observacoes', 'Observações', { as: 'textarea' })}</div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</label>
              <div className="flex gap-2">
                {(['ativo', 'inativo'] as const).map(s => (
                  <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      form.status === s
                        ? s === 'ativo' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-zinc-500 text-white border-zinc-500'
                        : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100'
                    }`}>
                    {s === 'ativo' ? 'Ativo' : 'Inativo'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
              {morador ? 'Salvar alterações' : 'Cadastrar morador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Home() {
  const [moradores, setMoradores] = useState<Morador[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [moradorEditando, setMoradorEditando] = useState<Morador | null>(null)
  const [deletando, setDeletando] = useState<number | null>(null)
  const [sortField, setSortField] = useState<'apartamento' | 'nome'>('apartamento')
  const [sortAsc, setSortAsc] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [importModalAberto, setImportModalAberto] = useState(false)

  const buscarMoradores = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/moradores${q ? `?busca=${encodeURIComponent(q)}` : ''}`)
      const json = await res.json()
      if (json.success) setMoradores(json.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => buscarMoradores(busca), 300)
    return () => clearTimeout(timer)
  }, [busca, buscarMoradores])

  async function deletar(id: number) {
    if (!confirm('Tem certeza que deseja remover este morador?')) return
    setDeletando(id)
    try {
      await fetch(`/api/moradores/${id}`, { method: 'DELETE' })
      await buscarMoradores(busca)
    } finally {
      setDeletando(null)
    }
  }

  function toggleSort(field: 'apartamento' | 'nome') {
    if (sortField === field) setSortAsc(a => !a)
    else { setSortField(field); setSortAsc(true) }
  }

  const listagem = [...moradores]
    .filter(m => filtroStatus === 'todos' || m.status === filtroStatus)
    .sort((a, b) => {
      const va = a[sortField] ?? ''
      const vb = b[sortField] ?? ''
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
    })

  const totalAtivos = moradores.filter(m => m.status === 'ativo').length

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0F4FF', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Page header */}
      <div className="bg-white border-b border-zinc-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-900">Moradores</h1>
            <p className="text-zinc-400 text-xs">Gerencie a lista de moradores do condomínio</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportModalAberto(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"
            >
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">Importar planilha</span>
            </button>
            <button
              onClick={() => { setMoradorEditando(null); setModalAberto(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm shadow hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Novo morador</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">Total</p>
            <p className="text-3xl font-bold text-zinc-900 mt-1">{moradores.length}</p>
            <p className="text-xs text-zinc-400 mt-0.5">moradores cadastrados</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100">
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">Ativos</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{totalAtivos}</p>
            <p className="text-xs text-zinc-400 mt-0.5">moradores ativos</p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-zinc-100">
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">Inativos</p>
            <p className="text-3xl font-bold text-zinc-400 mt-1">{moradores.length - totalAtivos}</p>
            <p className="text-xs text-zinc-400 mt-0.5">moradores inativos</p>
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Pesquisar por nome, apartamento, bloco ou telefone..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                <X size={16} />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {(['todos', 'ativo', 'inativo'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  filtroStatus === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                {s === 'todos' ? 'Todos' : s === 'ativo' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          {/* Table header */}
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
            <Users size={16} className="text-blue-600" />
            <span className="text-sm font-semibold text-zinc-700">
              {listagem.length} {listagem.length === 1 ? 'morador' : 'moradores'} encontrado{listagem.length === 1 ? '' : 's'}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : listagem.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
                <Users size={32} className="text-zinc-300" />
              </div>
              <p className="font-semibold text-zinc-400">Nenhum morador encontrado</p>
              {busca && <p className="text-sm text-zinc-300">Tente uma busca diferente</p>}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">
                        <button onClick={() => toggleSort('apartamento')} className="flex items-center gap-1 font-semibold hover:text-zinc-700">
                          Apto / Bloco
                          {sortField === 'apartamento' ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronUp size={12} className="opacity-30" />}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button onClick={() => toggleSort('nome')} className="flex items-center gap-1 font-semibold hover:text-zinc-700">
                          Nome
                          {sortField === 'nome' ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronUp size={12} className="opacity-30" />}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">Contato</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {listagem.map(m => (
                      <tr key={m.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                              {m.apartamento}
                            </div>
                            {m.bloco && <span className="text-xs text-zinc-400">Bloco {m.bloco}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <AvatarMorador nome={m.nome} size="sm" apartamento={m.apartamento} bloco={m.bloco} />
                            <div>
                              <p className={`${m.apartamento === '0' ? 'font-black text-zinc-900' : 'font-semibold text-zinc-800'}`}>{m.nome}</p>
                              {m.apartamento === '0'
                                ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md mt-0.5">● Funcionário ativo</span>
                                : m.cpf && <p className="text-xs text-zinc-400">{m.cpf}</p>
                              }
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            {m.telefone && (
                              <span className="flex items-center gap-1 text-xs text-zinc-600">
                                <Phone size={11} className="text-zinc-400" /> {m.telefone}
                              </span>
                            )}
                            {m.email && (
                              <span className="flex items-center gap-1 text-xs text-zinc-400">
                                <Mail size={11} /> {m.email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setMoradorEditando(m); setModalAberto(true) }}
                              className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => deletar(m.id)}
                              disabled={deletando === m.id}
                              className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors disabled:opacity-50"
                            >
                              {deletando === m.id
                                ? <span className="w-3 h-3 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
                                : <Trash2 size={14} />
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-zinc-100">
                {listagem.map(m => (
                  <div key={m.id} className="p-4 flex items-start gap-3">
                    <AvatarMorador nome={m.nome} size="sm" apartamento={m.apartamento} bloco={m.bloco} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate ${m.apartamento === '0' ? 'font-black text-zinc-900' : 'font-semibold text-zinc-800'}`}>{m.nome}</p>
                        <StatusBadge status={m.status} />
                      </div>
                      {m.apartamento === '0'
                        ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md mt-0.5">● Funcionário ativo</span>
                        : <p className="text-xs text-zinc-500 mt-0.5 font-medium">Apto {m.apartamento}{m.bloco ? ` · Bloco ${m.bloco}` : ''}</p>
                      }
                      {m.telefone && (
                        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                          <Phone size={11} /> {m.telefone}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => { setMoradorEditando(m); setModalAberto(true) }}
                        className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => deletar(m.id)}
                        className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {modalAberto && (
        <MoradorModal
          morador={moradorEditando}
          onClose={() => { setModalAberto(false); setMoradorEditando(null) }}
          onSave={() => { setModalAberto(false); setMoradorEditando(null); buscarMoradores(busca) }}
        />
      )}
      {importModalAberto && (
        <ImportModal
          onClose={() => setImportModalAberto(false)}
          onImported={() => buscarMoradores(busca)}
        />
      )}
    </div>
  )
}
