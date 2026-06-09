import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { getEvento, submitLead, type Evento, type CampoExtra } from '../lib/api'
import { CheckCircle, Loader2, QrCode, Star, Maximize2, Minimize2, RotateCcw } from 'lucide-react'

// ── helpers ────────────────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function fmtWa(raw: string) { return raw.replace(/\D/g, '').slice(0, 11) }

const SCORE_LABELS = ['', 'Baixo', 'Médio-baixo', 'Médio', 'Alto', 'Muito alto']

// ── componentes de campo ───────────────────────────────────────────────────────
function Stars({ value, onChange, cor }: { value: number; onChange: (v: number) => void; cor: string }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className="transition-transform hover:scale-110 focus:outline-none">
          <Star size={28} fill={n <= value ? cor : 'none'}
            color={n <= value ? cor : '#d1d5db'} strokeWidth={1.5} />
        </button>
      ))}
      {value > 0 && <span className="text-xs self-center font-medium ml-1" style={{ color: cor }}>{SCORE_LABELS[value]}</span>}
    </div>
  )
}

function YesNo({ value, onChange, cor }: { value: string; onChange: (v: string) => void; cor: string }) {
  return (
    <div className="flex gap-3">
      {['Sim', 'Não'].map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          className="flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all"
          style={{
            borderColor: value === opt ? cor : '#e5e7eb',
            background: value === opt ? `rgba(${hexToRgb(cor)},0.08)` : 'white',
            color: value === opt ? cor : '#6b7280',
          }}>
          {opt === 'Sim' ? '✅ Sim' : '❌ Não'}
        </button>
      ))}
    </div>
  )
}

function CampoExtraInput({ campo, value, onChange, cor }: {
  campo: CampoExtra; value: string; onChange: (v: string) => void; cor: string
}) {
  const rgb = hexToRgb(cor)
  const base = 'w-full px-4 py-3.5 rounded-xl border-2 text-gray-800 text-base font-medium bg-white focus:outline-none transition'
  const bStyle = { borderColor: value ? cor : '#e5e7eb' }

  if (campo.tipo === 'select') return (
    <select value={value} onChange={e => onChange(e.target.value)} required={campo.obrigatorio}
      className={base} style={{ ...bStyle, background: value ? `rgba(${rgb},0.02)` : 'white' }}>
      <option value="">Selecione...</option>
      {(campo.opcoes || []).map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  if (campo.tipo === 'textarea') return (
    <textarea value={value} onChange={e => onChange(e.target.value)}
      required={campo.obrigatorio} rows={2} placeholder={`Informe ${campo.label.toLowerCase()}...`}
      className={`${base} resize-none`} style={bStyle} />
  )

  if (campo.tipo === 'stars') return (
    <Stars value={parseInt(value) || 0} onChange={v => onChange(String(v))} cor={cor} />
  )

  if (campo.tipo === 'yesno') return (
    <YesNo value={value} onChange={onChange} cor={cor} />
  )

  return (
    <input type={campo.tipo === 'phone' ? 'tel' : 'text'} value={value}
      onChange={e => onChange(campo.tipo === 'phone' ? fmtWa(e.target.value) : e.target.value)}
      required={campo.obrigatorio} placeholder={`${campo.label}...`}
      className={base} style={bStyle} />
  )
}

// ── página principal ───────────────────────────────────────────────────────────
export default function FormPage() {
  const { slug } = useParams<{ slug: string }>()
  const [params] = useSearchParams()
  const [evento, setEvento] = useState<Evento | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [tabletMode, setTabletMode] = useState(params.get('tablet') === '1')
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<any>(null)

  const [nome, setNome] = useState('')
  const [whatsapp, setWa] = useState('')
  const [email, setEmail] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [interesse, setInteresse] = useState('')
  const [score, setScore] = useState(0)
  const [extras, setExtras] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!slug) return
    getEvento(slug).then(ev => { setEvento(ev); setLoading(false) })
  }, [slug])

  useEffect(() => {
    if (done && tabletMode) {
      setCountdown(5)
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(timerRef.current); resetForm(); return 0 }
          return c - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [done, tabletMode])

  function resetForm() {
    setNome(''); setWa(''); setEmail(''); setEmpresa(''); setInteresse(''); setScore(0); setExtras({}); setDone(false); setError('')
  }

  function setExtra(id: string, v: string) { setExtras(e => ({ ...e, [id]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!evento) return
    setSubmitting(true); setError('')
    try {
      await submitLead(evento, {
        nome: nome.trim(),
        whatsapp: '55' + whatsapp.replace(/\D/g, ''),
        email: email.trim() || undefined,
        empresa: empresa.trim() || undefined,
        interesse: interesse.trim() || undefined,
        score: score || undefined,
        fonte: tabletMode ? 'tablet' : (params.get('qr') === '1' ? 'qr' : 'form'),
        campos_extras_valores: Object.keys(extras).length ? extras : undefined,
      })
      setDone(true)
    } catch { setError('Erro ao enviar. Tente novamente.') }
    finally { setSubmitting(false) }
  }

  if (loading) return (
    <div className="min-h-svh flex items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-gray-400" size={32} />
    </div>
  )

  if (!evento) return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-gray-50 gap-3 px-6 text-center">
      <QrCode size={48} className="text-gray-300" />
      <p className="text-gray-500 font-medium">Evento não encontrado ou inativo.</p>
    </div>
  )

  const cor = evento.cor_primaria || '#6366f1'
  const rgb = hexToRgb(cor)
  const campos = evento.campos_extras || []
  const isConcessionaria = evento.segmento === 'concessionaria'

  if (done) return (
    <div className="min-h-svh flex flex-col items-center justify-center px-6 text-center gap-5"
      style={{ background: `linear-gradient(135deg, rgba(${rgb},0.08), rgba(${rgb},0.03))` }}>
      <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: `linear-gradient(135deg, ${cor}, rgba(${rgb},0.7))` }}>
        <CheckCircle size={48} color="white" strokeWidth={2} />
      </div>
      <div>
        <h2 className="text-3xl font-black text-gray-800 mb-2">
          {isConcessionaria ? 'Interesse registrado!' : 'Cadastro realizado!'}
        </h2>
        <p className="text-gray-500 max-w-sm text-base leading-relaxed">
          {isConcessionaria
            ? `Obrigado, ${nome.split(' ')[0]}! Nossa equipe vai entrar em contato em breve pelo WhatsApp.`
            : `Obrigado, ${nome.split(' ')[0]}! Em breve a ${evento.nome_expositor} vai entrar em contato.`}
        </p>
      </div>
      {evento.logo_url && (
        <img src={evento.logo_url} alt={evento.nome_expositor} className="h-14 object-contain opacity-70 mt-2" />
      )}
      {tabletMode && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="w-48 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${(countdown / 5) * 100}%`, background: cor }} />
          </div>
          <p className="text-sm text-gray-400">Próximo cadastro em {countdown}s...</p>
          <button onClick={resetForm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm shadow"
            style={{ background: cor }}>
            <RotateCcw size={14} /> Novo cadastro agora
          </button>
        </div>
      )}
    </div>
  )

  const inputCls = 'w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 text-gray-800 text-base font-medium bg-white focus:outline-none transition placeholder-gray-400'

  return (
    <div className="min-h-svh flex flex-col" style={{ background: `rgba(${rgb},0.04)` }}>
      {/* Header */}
      <div className="px-6 py-6 text-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${cor}, rgba(${rgb},0.75))` }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        <div className="relative">
          {evento.logo_url
            ? <img src={evento.logo_url} alt={evento.nome_expositor} className="h-16 object-contain mx-auto mb-3 drop-shadow" />
            : <div className="text-white font-black text-3xl mb-1 tracking-tight">{evento.nome_expositor}</div>
          }
          <p className="text-white/85 text-sm font-semibold">{evento.nome_evento}</p>
          {evento.local_evento && <p className="text-white/60 text-xs mt-1">📍 {evento.local_evento}</p>}
        </div>
        {/* Tablet mode toggle */}
        <button onClick={() => setTabletMode(t => !t)}
          title={tabletMode ? 'Sair do modo tablet' : 'Modo tablet (exposição)'}
          className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-white/60 hover:text-white">
          {tabletMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit}
        className={`flex-1 px-5 py-6 mx-auto w-full space-y-4 ${tabletMode ? 'max-w-xl' : 'max-w-md'}`}>
        <p className="text-gray-500 text-sm text-center font-medium">
          {isConcessionaria
            ? '🚗 Preencha seus dados e fale com nosso consultor pelo WhatsApp'
            : '📲 Preencha seus dados e receba nossas informações pelo WhatsApp'}
        </p>

        {/* Nome */}
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Nome completo *</label>
          <input type="text" required autoComplete="name" value={nome}
            onChange={e => setNome(e.target.value)} placeholder="Seu nome completo"
            className={inputCls} style={{ borderColor: nome ? cor : undefined, fontSize: tabletMode ? 18 : undefined }} />
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">WhatsApp *</label>
          <div className="flex gap-2 items-center">
            <span className="px-3 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-500 font-bold text-sm select-none whitespace-nowrap">🇧🇷 +55</span>
            <input type="tel" required autoComplete="tel" value={whatsapp}
              onChange={e => setWa(fmtWa(e.target.value))} placeholder="(00) 00000-0000"
              className={`${inputCls} flex-1`}
              style={{ borderColor: whatsapp.length >= 10 ? cor : undefined, fontSize: tabletMode ? 18 : undefined }} />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
            E-mail <span className="font-normal text-gray-300 normal-case">(opcional)</span>
          </label>
          <input type="email" autoComplete="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
            className={inputCls} />
        </div>

        {/* Empresa / campo de contexto */}
        {!isConcessionaria && (
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
              Empresa <span className="font-normal text-gray-300 normal-case">(opcional)</span>
            </label>
            <input type="text" autoComplete="organization" value={empresa}
              onChange={e => setEmpresa(e.target.value)} placeholder="Nome da empresa"
              className={inputCls} />
          </div>
        )}

        {/* Interesse / O que procura */}
        {campos.length === 0 && (
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
              {isConcessionaria ? 'Veículo de interesse' : 'O que você procura?'}
              <span className="font-normal text-gray-300 normal-case"> (opcional)</span>
            </label>
            {isConcessionaria ? (
              <input type="text" value={interesse} onChange={e => setInteresse(e.target.value)}
                placeholder="Ex: Onix 2025, Tracker, HB20..." className={inputCls} />
            ) : (
              <textarea value={interesse} onChange={e => setInteresse(e.target.value)}
                placeholder="Ex: mais informações sobre o produto X..." rows={2}
                className={`${inputCls} resize-none`} />
            )}
          </div>
        )}

        {/* Campos extras dinâmicos */}
        {campos.map(campo => (
          <div key={campo.id}>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
              {campo.label}
              {!campo.obrigatorio && <span className="font-normal text-gray-300 normal-case"> (opcional)</span>}
              {campo.obrigatorio && <span className="text-red-400 ml-1">*</span>}
            </label>
            <CampoExtraInput campo={campo} value={extras[campo.id] || ''}
              onChange={v => setExtra(campo.id, v)} cor={cor} />
          </div>
        ))}

        {/* Score de interesse */}
        {isConcessionaria && (
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
              Nível de interesse
            </label>
            <Stars value={score} onChange={setScore} cor={cor} />
          </div>
        )}

        {error && <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-xl">{error}</p>}

        <button type="submit" disabled={submitting || !nome || whatsapp.length < 10}
          className="w-full py-4 rounded-xl font-black text-white text-base transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
          style={{
            background: submitting || !nome || whatsapp.length < 10
              ? '#d1d5db'
              : `linear-gradient(135deg, ${cor}, rgba(${rgb},0.8))`,
            fontSize: tabletMode ? 18 : undefined,
            paddingTop: tabletMode ? 18 : undefined,
            paddingBottom: tabletMode ? 18 : undefined,
          }}>
          {submitting ? <Loader2 size={20} className="animate-spin" /> : null}
          {submitting ? 'Enviando...' : isConcessionaria ? '🚗 Quero ser atendido' : 'Enviar meus dados 🚀'}
        </button>

        <p className="text-center text-xs text-gray-400 leading-relaxed">
          🔒 Seus dados são usados apenas para contato. Não compartilhamos com terceiros.
        </p>
      </form>
    </div>
  )
}
