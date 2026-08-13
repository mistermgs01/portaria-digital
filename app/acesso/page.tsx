'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, CameraOff, ScanSearch, Car, LogIn, LogOut, Check, X, Clock, User, AlertTriangle, Upload } from 'lucide-react'
import type { Morador } from '@/db/schemas/moradores'
import type { Acesso, Veiculo } from '@/db/schemas/veiculos'

type AcessoComMorador = { acesso: Acesso; morador: Morador | null }

type LeituraPlaca = {
  placa: string
  confianca: string
  tipo_placa: string
  observacao: string
}

type VeiculoInfo = {
  veiculo: Veiculo
  morador: Morador | null
} | null

const confiancaCor: Record<string, string> = {
  alta: 'text-emerald-600 bg-emerald-50',
  media: 'text-yellow-600 bg-yellow-50',
  baixa: 'text-rose-600 bg-rose-50',
}

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return `${diff}s atrás`
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  return new Date(date).toLocaleDateString('pt-BR')
}

export default function AcessoPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraAtiva, setCameraAtiva] = useState(false)
  const [capturando, setCapturando] = useState(false)
  const [lendo, setLendo] = useState(false)
  const [previewImg, setPreviewImg] = useState<string | null>(null)
  const [leitura, setLeitura] = useState<LeituraPlaca | null>(null)
  const [veiculoInfo, setVeiculoInfo] = useState<VeiculoInfo>(null)
  const [buscandoVeiculo, setBuscandoVeiculo] = useState(false)
  const [placaManual, setPlacaManual] = useState('')
  const [tipoAcesso, setTipoAcesso] = useState<'entrada' | 'saida'>('entrada')
  const [nomeVisitante, setNomeVisitante] = useState('')
  const [aptoDestino, setAptoDestino] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [registroOk, setRegistroOk] = useState(false)
  const [historico, setHistorico] = useState<AcessoComMorador[]>([])
  const [erroCamera, setErroCamera] = useState('')

  // Saída rápida
  const [placaSaida, setPlacaSaida] = useState('')
  const [veiculoSaida, setVeiculoSaida] = useState<VeiculoInfo>(null)
  const [buscandoSaida, setBuscandoSaida] = useState(false)
  const [registrandoSaida, setRegistrandoSaida] = useState(false)
  const [saidaOk, setSaidaOk] = useState(false)

  const carregarHistorico = useCallback(async () => {
    const res = await fetch('/api/acessos?limit=20')
    const json = await res.json() as { success: boolean; data: AcessoComMorador[] }
    if (json.success) setHistorico(json.data)
  }, [])

  useEffect(() => {
    carregarHistorico()
  }, [carregarHistorico])

  async function iniciarCamera() {
    setErroCamera('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      setCameraAtiva(true)
      // srcObject será atribuído pelo useEffect após o React revelar o <video>
    } catch {
      setErroCamera('Não foi possível acessar a câmera. Use o upload de foto.')
    }
  }

  // Atribui o stream ao <video> depois que o React o tornar visível (cameraAtiva=true, previewImg=null)
  useEffect(() => {
    if (cameraAtiva && !previewImg && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraAtiva, previewImg])

  function pararCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraAtiva(false)
  }

  function capturarFoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setPreviewImg(dataUrl)
    setCapturando(true)
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setPreviewImg(ev.target?.result as string)
      setCapturando(true)
      setLeitura(null)
      setVeiculoInfo(null)
    }
    reader.readAsDataURL(file)
  }

  async function lerPlaca() {
    if (!previewImg) return
    setLendo(true)
    setLeitura(null)
    setVeiculoInfo(null)
    setPlacaManual('')
    try {
      const res = await fetch('/api/ler-placa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: previewImg }),
      })
      const json = await res.json() as { success: boolean; data: LeituraPlaca; error?: string }
      if (json.success && json.data.placa !== 'NAO_IDENTIFICADA') {
        setLeitura(json.data)
        setPlacaManual(json.data.placa)
        await buscarVeiculo(json.data.placa)
      } else {
        setLeitura(json.data ?? { placa: 'NAO_IDENTIFICADA', confianca: 'baixa', tipo_placa: 'nenhuma', observacao: '' })
      }
    } catch {
      setLeitura({ placa: 'ERRO', confianca: 'baixa', tipo_placa: 'erro', observacao: 'Falha na leitura' })
    } finally {
      setLendo(false)
    }
  }

  async function buscarVeiculo(placa: string) {
    setBuscandoVeiculo(true)
    try {
      const res = await fetch(`/api/veiculos?placa=${encodeURIComponent(placa)}`)
      const json = await res.json() as { success: boolean; data: VeiculoInfo }
      setVeiculoInfo(json.data)
      if (json.data?.morador?.apartamento) setAptoDestino(json.data.morador.apartamento)
    } finally {
      setBuscandoVeiculo(false)
    }
  }

  async function registrarAcesso() {
    const placa = placaManual.trim().toUpperCase()
    if (!placa) return
    setRegistrando(true)
    try {
      // Busca autorização ativa vinculada a esta placa
      let autorizacaoId: number | null = null
      try {
        const resAut = await fetch(`/api/autorizacoes?placa=${encodeURIComponent(placa)}&status=ativa`)
        const jsonAut = await resAut.json() as { success: boolean; data: Array<{ id: number }> }
        if (jsonAut.success && jsonAut.data.length > 0) autorizacaoId = jsonAut.data[0].id
      } catch { /* ignora se não achar */ }

      const payload: Record<string, unknown> = {
        placa,
        tipo: tipoAcesso,
        origem: veiculoInfo?.morador ? 'morador' : 'visitante',
        moradorId: veiculoInfo?.morador?.id ?? null,
        autorizacaoId,
        nomeVisitante: nomeVisitante || null,
        apartamentoDestino: aptoDestino || null,
        confiancaLeitura: leitura?.confianca ?? null,
      }
      await fetch('/api/acessos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      setRegistroOk(true)
      await carregarHistorico()
      setTimeout(() => {
        setRegistroOk(false)
        setCapturando(false)
        setPreviewImg(null)
        setLeitura(null)
        setVeiculoInfo(null)
        setPlacaManual('')
        setNomeVisitante('')
        setAptoDestino('')
      }, 2000)
    } finally {
      setRegistrando(false)
    }
  }

  function resetar() {
    setCapturando(false)
    setPreviewImg(null)
    setLeitura(null)
    setVeiculoInfo(null)
    setPlacaManual('')
    setNomeVisitante('')
    setAptoDestino('')
  }

  async function buscarVeiculoSaida(placa: string) {
    if (placa.length < 7) { setVeiculoSaida(null); return }
    setBuscandoSaida(true)
    try {
      const res = await fetch(`/api/veiculos?placa=${encodeURIComponent(placa)}`)
      const json = await res.json() as { success: boolean; data: VeiculoInfo }
      setVeiculoSaida(json.data ?? null)
    } finally {
      setBuscandoSaida(false)
    }
  }

  async function registrarSaidaRapida() {
    const placa = placaSaida.trim().toUpperCase()
    if (!placa) return
    setRegistrandoSaida(true)
    try {
      await fetch('/api/acessos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placa,
          tipo: 'saida',
          origem: veiculoSaida?.morador ? 'morador' : 'visitante',
          moradorId: veiculoSaida?.morador?.id ?? null,
        }),
      })
      setSaidaOk(true)
      await carregarHistorico()
      setTimeout(() => {
        setSaidaOk(false)
        setPlacaSaida('')
        setVeiculoSaida(null)
      }, 2000)
    } finally {
      setRegistrandoSaida(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0F4FF', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="bg-white border-b border-zinc-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-lg font-bold text-zinc-900">Controle de Acesso</h1>
          <p className="text-zinc-400 text-xs">Leitor de placa por câmera ou foto</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* LEFT: Camera & reader */}
          <div className="flex flex-col gap-4">
            {/* Camera panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-50 flex items-center gap-2">
                <ScanSearch size={16} className="text-blue-600" />
                <span className="text-sm font-bold text-zinc-800">Leitor de Placa</span>
              </div>

              <div className="p-4 flex flex-col gap-3">
                {/* Video / preview area */}
                <div className="relative bg-zinc-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                  {previewImg ? (
                    <img src={previewImg} alt="Placa capturada" className="w-full h-full object-contain" />
                  ) : null}

                  {/* Vídeo SEMPRE no DOM — visibilidade por CSS — evita bug de srcObject antes do mount */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ display: cameraAtiva && !previewImg ? 'block' : 'none' }}
                  />

                  {!cameraAtiva && !previewImg && (
                    <div className="absolute inset-0 flex flex-col items-center gap-2 text-zinc-500 py-6 justify-center">
                      <CameraOff size={36} className="opacity-40" />
                      <p className="text-sm opacity-60">Câmera desligada</p>
                      {erroCamera && <p className="text-xs text-rose-400 text-center px-4">{erroCamera}</p>}
                    </div>
                  )}

                  {/* Scanning overlay */}
                  {cameraAtiva && !previewImg && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="border-2 border-yellow-400 rounded-lg w-3/4 h-1/3 opacity-60" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
                    </div>
                  )}

                  {lendo && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-400 rounded-full animate-spin" />
                      <p className="text-white text-sm font-semibold">Analisando placa com IA...</p>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />

                {/* Action buttons */}
                {!capturando ? (
                  <div className="flex gap-2">
                    <button onClick={cameraAtiva ? pararCamera : iniciarCamera}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        cameraAtiva ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200' : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}>
                      {cameraAtiva ? <><CameraOff size={16} /> Desligar</> : <><Camera size={16} /> Ligar câmera</>}
                    </button>
                    {cameraAtiva && (
                      <button onClick={capturarFoto}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-yellow-500 text-white font-semibold text-sm hover:bg-yellow-600">
                        <Camera size={16} /> Capturar
                      </button>
                    )}
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-600 font-semibold text-sm hover:bg-zinc-200">
                      <Upload size={16} />
                      <span className="hidden sm:inline">Upload</span>
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={resetar} className="px-3 py-2.5 rounded-xl bg-zinc-100 text-zinc-600 font-semibold text-sm hover:bg-zinc-200">
                      <X size={16} />
                    </button>
                    <button onClick={lerPlaca} disabled={lendo}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-60">
                      {lendo ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ScanSearch size={16} />}
                      {lendo ? 'Lendo...' : 'Ler placa com IA'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick exit panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-rose-50 flex items-center gap-2 bg-rose-50/40">
                <LogOut size={16} className="text-rose-600" />
                <span className="text-sm font-bold text-rose-800">Registrar Saída Rápida</span>
              </div>
              <div className="p-4 flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    value={placaSaida}
                    onChange={e => {
                      const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
                      setPlacaSaida(v)
                      setVeiculoSaida(null)
                      if (v.length === 7) buscarVeiculoSaida(v)
                    }}
                    placeholder="Digite a placa (ex: ABC1234)"
                    maxLength={7}
                    className="flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-mono font-bold tracking-widest text-zinc-900 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-rose-400 uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-zinc-400"
                  />
                  <button
                    onClick={registrarSaidaRapida}
                    disabled={registrandoSaida || placaSaida.length < 7 || saidaOk}
                    className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                      saidaOk
                        ? 'bg-emerald-500 text-white'
                        : 'bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50'
                    }`}>
                    {saidaOk ? <Check size={16} /> : registrandoSaida ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : <LogOut size={16} />}
                    {saidaOk ? 'Registrado!' : 'Saída'}
                  </button>
                </div>
                {buscandoSaida && (
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-zinc-200 border-t-zinc-400 rounded-full animate-spin" />
                    Buscando veículo...
                  </p>
                )}
                {veiculoSaida?.morador && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-2">
                    <Check size={14} className="text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-800">{veiculoSaida.morador.nome}</p>
                      <p className="text-[11px] text-emerald-700">
                        Apto {veiculoSaida.morador.apartamento}
                        {veiculoSaida.morador.bloco ? ` / Bloco ${veiculoSaida.morador.bloco}` : ''}
                        {veiculoSaida.veiculo?.modelo ? ` · ${veiculoSaida.veiculo.modelo}` : ''}
                      </p>
                    </div>
                  </div>
                )}
                {placaSaida.length === 7 && !buscandoSaida && !veiculoSaida && (
                  <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
                    Veículo não cadastrado — saída de visitante será registrada.
                  </p>
                )}
              </div>
            </div>

            {/* Result panel */}
            {(leitura || capturando) && (
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-50 flex items-center gap-2">
                  <Car size={15} className="text-blue-600" />
                  <span className="text-sm font-bold text-zinc-800">Resultado da Leitura</span>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  {/* Plate input */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Placa detectada</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-yellow-50 border-2 border-yellow-300 rounded-xl px-4 py-2 text-center">
                        <input
                          value={placaManual}
                          onChange={e => { setPlacaManual(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)); setVeiculoInfo(null) }}
                          onBlur={() => placaManual.length >= 7 && buscarVeiculo(placaManual)}
                          placeholder="ABC1234"
                          className="font-black text-2xl tracking-widest font-mono text-zinc-900 bg-transparent text-center w-full focus:outline-none"
                          maxLength={7}
                        />
                      </div>
                      {leitura && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${confiancaCor[leitura.confianca] ?? 'bg-zinc-100 text-zinc-500'}`}>
                          {leitura.confianca === 'alta' ? 'Alta confiança' : leitura.confianca === 'media' ? 'Confiança média' : 'Baixa confiança'}
                        </span>
                      )}
                    </div>
                    {leitura?.observacao && <p className="text-xs text-zinc-400">{leitura.observacao}</p>}
                  </div>

                  {/* Vehicle info */}
                  {buscandoVeiculo ? (
                    <div className="flex items-center gap-2 text-zinc-400 text-sm">
                      <span className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-400 rounded-full animate-spin" />
                      Buscando veículo...
                    </div>
                  ) : veiculoInfo ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Check size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-800">Veículo cadastrado</p>
                        {veiculoInfo.morador && (
                          <p className="text-xs text-emerald-700 mt-0.5">
                            <span className="font-semibold">{veiculoInfo.morador.nome}</span> — Apto {veiculoInfo.morador.apartamento}
                            {veiculoInfo.morador.bloco ? ` / Bloco ${veiculoInfo.morador.bloco}` : ''}
                          </p>
                        )}
                        {veiculoInfo.veiculo.modelo && <p className="text-xs text-emerald-600">{veiculoInfo.veiculo.modelo} {veiculoInfo.veiculo.cor ? `• ${veiculoInfo.veiculo.cor}` : ''}</p>}
                      </div>
                    </div>
                  ) : placaManual.length >= 7 && leitura ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-3">
                      <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0" />
                      <p className="text-sm text-yellow-800">Veículo <span className="font-bold">não cadastrado</span> no condomínio</p>
                    </div>
                  ) : null}

                  {/* Entry type */}
                  <div className="grid grid-cols-2 gap-2">
                    {(['entrada', 'saida'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setTipoAcesso(t)}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm border transition-all ${
                          tipoAcesso === t
                            ? t === 'entrada' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-rose-600 text-white border-rose-600'
                            : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100'
                        }`}>
                        {t === 'entrada' ? <LogIn size={16} /> : <LogOut size={16} />}
                        {t === 'entrada' ? 'Entrada' : 'Saída'}
                      </button>
                    ))}
                  </div>

                  {/* Visitor fields */}
                  {!veiculoInfo?.morador && (
                    <div className="flex flex-col gap-2">
                      <input value={nomeVisitante} onChange={e => setNomeVisitante(e.target.value)}
                        placeholder="Nome do visitante (opcional)"
                        className="rounded-xl border border-zinc-200 px-3 py-2 text-sm bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input value={aptoDestino} onChange={e => setAptoDestino(e.target.value)}
                        placeholder="Apartamento destino"
                        className="rounded-xl border border-zinc-200 px-3 py-2 text-sm bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}

                  {/* Register button */}
                  <button onClick={registrarAcesso}
                    disabled={registrando || !placaManual || registroOk}
                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      registroOk
                        ? 'bg-emerald-500 text-white'
                        : tipoAcesso === 'entrada'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60'
                          : 'bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60'
                    }`}>
                    {registroOk ? (
                      <><Check size={18} /> Acesso registrado!</>
                    ) : registrando ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : tipoAcesso === 'entrada' ? (
                      <><LogIn size={16} /> Registrar Entrada</>
                    ) : (
                      <><LogOut size={16} /> Registrar Saída</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: History */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-blue-600" />
                <span className="text-sm font-bold text-zinc-800">Histórico de Acessos</span>
              </div>
              <span className="text-xs text-zinc-400">{historico.length} registros</span>
            </div>
            <div className="overflow-y-auto flex-1" style={{ maxHeight: '70vh' }}>
              {historico.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Clock size={28} className="text-zinc-200" />
                  <p className="text-zinc-400 text-sm">Nenhum acesso registrado</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {historico.map(({ acesso: a, morador: m }) => (
                    <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50/80 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        a.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'
                      }`}>
                        {a.tipo === 'entrada' ? <LogIn size={14} /> : <LogOut size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm font-mono tracking-wider text-zinc-900">{a.placa}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            a.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                          }`}>
                            {a.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                        </div>
                        {m ? (
                          <p className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5">
                            <User size={10} className="flex-shrink-0" />
                            <span className="font-semibold">{m.nome}</span>
                            <span className="text-zinc-400">— Apto {m.apartamento}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {a.nomeVisitante ? a.nomeVisitante : 'Visitante'}
                            {a.apartamentoDestino ? ` → Apto ${a.apartamentoDestino}` : ''}
                          </p>
                        )}
                        <p className="text-[10px] text-zinc-300 mt-0.5">{timeAgo(a.createdAt as unknown as string)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
