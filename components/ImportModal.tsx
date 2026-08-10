'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, Download, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'

type LinhaPreview = {
  nome: string
  apartamento: string
  bloco: string
  telefone: string
  email: string
  erro?: string
}

type ResultadoImport = {
  inseridos: number
  atualizados: number
  erros: string[]
}

type Step = 'upload' | 'preview' | 'resultado'

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const ALIAS: Record<string, keyof LinhaPreview> = {
  morador: 'nome',
  nome: 'nome',
  'nome completo': 'nome',
  residente: 'nome',
  proprietario: 'nome',
  apartamento: 'apartamento',
  apto: 'apartamento',
  apt: 'apartamento',
  unidade: 'apartamento',
  bloco: 'bloco',
  torre: 'bloco',
  edificio: 'bloco',
  telefone: 'telefone',
  celular: 'telefone',
  fone: 'telefone',
  tel: 'telefone',
  email: 'email',
  'e-mail': 'email',
  mail: 'email',
}

export default function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [linhas, setLinhas] = useState<LinhaPreview[]>([])
  const [resultado, setResultado] = useState<ResultadoImport | null>(null)
  const [importando, setImportando] = useState(false)
  const [erroArquivo, setErroArquivo] = useState('')
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [colunasEncontradas, setColunasEncontradas] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)

  function processFile(file: File) {
    setErroArquivo('')
    setNomeArquivo(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

        if (raw.length === 0) {
          setErroArquivo('A planilha está vazia ou sem dados reconhecíveis.')
          return
        }

        // Map headers
        const firstRow = raw[0]
        const headerMap: Record<string, keyof LinhaPreview> = {}
        const encontradas: string[] = []
        for (const key of Object.keys(firstRow)) {
          const norm = normalizeHeader(String(key))
          const mapped = ALIAS[norm]
          if (mapped) {
            headerMap[key] = mapped
            if (!encontradas.includes(mapped)) encontradas.push(mapped)
          }
        }

        if (!encontradas.includes('nome') && !encontradas.includes('apartamento')) {
          setErroArquivo(
            'Não foi possível identificar as colunas. Certifique-se que a planilha tem colunas como "morador", "apartamento" e "bloco".'
          )
          return
        }

        setColunasEncontradas(encontradas)

        const parsed: LinhaPreview[] = raw.map(row => {
          const linha: LinhaPreview = { nome: '', apartamento: '', bloco: '', telefone: '', email: '' }
          for (const [key, field] of Object.entries(headerMap)) {
            linha[field] = String(row[key] ?? '').trim()
          }
          if (!linha.nome) linha.erro = 'Nome em branco'
          else if (!linha.apartamento) linha.erro = 'Apartamento em branco'
          return linha
        })

        setLinhas(parsed)
        setStep('preview')
      } catch {
        setErroArquivo('Não foi possível ler o arquivo. Verifique se é um arquivo .xls ou .xlsx válido.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  async function handleImportar() {
    const validas = linhas.filter(l => !l.erro)
    setImportando(true)
    try {
      const res = await fetch('/api/moradores/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linhas: validas }),
      })
      const json = await res.json() as { success: boolean; data: ResultadoImport; error?: string }
      if (json.success) {
        setResultado(json.data)
        setStep('resultado')
      } else {
        setErroArquivo(json.error ?? 'Erro na importação')
      }
    } finally {
      setImportando(false)
    }
  }

  function downloadModelo() {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['morador', 'apartamento', 'bloco', 'telefone', 'email'],
      ['João Silva', '101', 'A', '(11) 99999-0000', 'joao@email.com'],
      ['Maria Souza', '202', 'B', '(11) 98888-0000', ''],
      ['Carlos Lima', '305', 'A', '', ''],
    ])
    ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 25 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Moradores')
    XLSX.writeFile(wb, 'modelo-moradores.xlsx')
  }

  const validas = linhas.filter(l => !l.erro)
  const invalidas = linhas.filter(l => l.erro)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 text-sm">Importar planilha</h2>
              <p className="text-xs text-zinc-400">
                {step === 'upload' && 'Selecione o arquivo .xls ou .xlsx'}
                {step === 'preview' && `${linhas.length} linha${linhas.length !== 1 ? 's' : ''} encontrada${linhas.length !== 1 ? 's' : ''} — ${nomeArquivo}`}
                {step === 'resultado' && 'Importação concluída'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200">
            <X size={15} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-0 px-6 pt-4 pb-3">
          {(['upload', 'preview', 'resultado'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? 'bg-blue-600 text-white' :
                (['upload', 'preview', 'resultado'].indexOf(step) > i) ? 'bg-emerald-500 text-white' :
                'bg-zinc-100 text-zinc-400'
              }`}>{i + 1}</div>
              {i < 2 && <div className={`w-12 h-0.5 mx-1 ${(['upload', 'preview', 'resultado'].indexOf(step) > i) ? 'bg-emerald-400' : 'bg-zinc-100'}`} />}
            </div>
          ))}
          <span className="ml-3 text-xs text-zinc-400">
            {step === 'upload' ? 'Carregar arquivo' : step === 'preview' ? 'Revisar dados' : 'Resultado'}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">

          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="flex flex-col gap-4 pt-2">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                  dragging ? 'border-blue-500 bg-blue-50' : 'border-zinc-200 hover:border-blue-400 hover:bg-blue-50/50'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center">
                  <Upload size={26} className="text-zinc-400" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-zinc-700">Arraste a planilha aqui</p>
                  <p className="text-sm text-zinc-400 mt-1">ou clique para selecionar o arquivo</p>
                  <p className="text-xs text-zinc-300 mt-0.5">.xls, .xlsx</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
                />
              </div>

              {erroArquivo && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {erroArquivo}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col gap-2">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Colunas reconhecidas automaticamente</p>
                <div className="flex flex-wrap gap-2">
                  {['morador / nome', 'apartamento / apto', 'bloco / torre', 'telefone / celular', 'email'].map(c => (
                    <span key={c} className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded-lg font-medium">{c}</span>
                  ))}
                </div>
                <button onClick={downloadModelo} className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline mt-1 w-fit">
                  <Download size={13} /> Baixar planilha modelo
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 'preview' && (
            <div className="flex flex-col gap-3 pt-2">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <p className="text-2xl font-black text-emerald-700">{validas.length}</p>
                  <p className="text-xs text-emerald-600 font-semibold">prontos para importar</p>
                </div>
                <div className={`rounded-xl p-3 border ${invalidas.length > 0 ? 'bg-rose-50 border-rose-100' : 'bg-zinc-50 border-zinc-100'}`}>
                  <p className={`text-2xl font-black ${invalidas.length > 0 ? 'text-rose-600' : 'text-zinc-300'}`}>{invalidas.length}</p>
                  <p className={`text-xs font-semibold ${invalidas.length > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>com erro (serão ignorados)</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <div className="flex flex-wrap gap-1">
                    {colunasEncontradas.map(c => (
                      <span key={c} className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">{c}</span>
                    ))}
                  </div>
                  <p className="text-xs text-blue-500 font-semibold mt-1">colunas mapeadas</p>
                </div>
              </div>

              {/* Table preview */}
              <div className="rounded-xl border border-zinc-200 overflow-hidden">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-500 text-[11px] uppercase tracking-wide">
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Nome</th>
                        <th className="px-3 py-2 text-left">Apto</th>
                        <th className="px-3 py-2 text-left">Bloco</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {linhas.map((l, i) => (
                        <tr key={i} className={l.erro ? 'bg-rose-50/60' : 'hover:bg-zinc-50'}>
                          <td className="px-3 py-2 text-zinc-400">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-zinc-800 max-w-[160px] truncate">{l.nome || <span className="text-zinc-300 italic">vazio</span>}</td>
                          <td className="px-3 py-2 text-zinc-600">{l.apartamento || <span className="text-zinc-300 italic">—</span>}</td>
                          <td className="px-3 py-2 text-zinc-500">{l.bloco || '—'}</td>
                          <td className="px-3 py-2">
                            {l.erro
                              ? <span className="text-rose-500 flex items-center gap-1"><AlertCircle size={11} />{l.erro}</span>
                              : <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} />Ok</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {erroArquivo && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  {erroArquivo}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setStep('upload'); setLinhas([]); setErroArquivo('') }}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50">
                  ← Voltar
                </button>
                <button
                  onClick={handleImportar}
                  disabled={importando || validas.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-60 transition-all"
                >
                  {importando
                    ? <><Loader2 size={16} className="animate-spin" /> Importando...</>
                    : <><ArrowRight size={16} /> Importar {validas.length} morador{validas.length !== 1 ? 'es' : ''}</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Result */}
          {step === 'resultado' && resultado && (
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <div className="text-center">
                <h3 className="font-black text-zinc-900 text-xl">Importação concluída!</h3>
                <p className="text-zinc-500 text-sm mt-1">Sua lista de moradores foi atualizada</p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 text-center">
                  <p className="text-3xl font-black text-emerald-700">{resultado.inseridos}</p>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">novos moradores</p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 text-center">
                  <p className="text-3xl font-black text-blue-700">{resultado.atualizados}</p>
                  <p className="text-xs text-blue-600 font-semibold mt-1">atualizados</p>
                </div>
              </div>

              {resultado.erros.length > 0 && (
                <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-800 mb-2">{resultado.erros.length} linha(s) com problema:</p>
                  {resultado.erros.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-xs text-amber-700">{e}</p>
                  ))}
                </div>
              )}

              <button
                onClick={() => { onImported(); onClose() }}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all"
              >
                Ver moradores importados
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
