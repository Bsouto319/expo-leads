import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getEvento, submitLead } from '../lib/api'
import { CheckCircle, Loader2, QrCode } from 'lucide-react'

export default function FormPage() {
  const { slug } = useParams<{ slug: string }>()
  const [evento, setEvento] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nome: '', whatsapp: '', email: '', empresa: '', interesse: ''
  })

  useEffect(() => {
    if (!slug) return
    getEvento(slug).then(ev => { setEvento(ev); setLoading(false) })
  }, [slug])

  const cor = evento?.cor_primaria || '#6366f1'

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function formatWhatsapp(raw: string) {
    return raw.replace(/\D/g, '').slice(0, 11)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim() || !form.whatsapp.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await submitLead(evento, {
        nome: form.nome.trim(),
        whatsapp: '55' + form.whatsapp.replace(/\D/g, ''),
        email: form.email.trim() || undefined,
        empresa: form.empresa.trim() || undefined,
        interesse: form.interesse.trim() || undefined,
      })
      setDone(true)
    } catch {
      setError('Erro ao enviar. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
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

  if (done) return (
    <div className="min-h-svh flex flex-col items-center justify-center px-6 text-center gap-4"
      style={{ background: `${cor}10` }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: `${cor}20` }}>
        <CheckCircle size={44} style={{ color: cor }} />
      </div>
      <h2 className="text-2xl font-black text-gray-800">Cadastro realizado!</h2>
      <p className="text-gray-500 max-w-xs">
        Obrigado, <strong>{form.nome.split(' ')[0]}</strong>! Em breve a {evento.nome_expositor} vai entrar em contato pelo WhatsApp.
      </p>
      {evento.logo_url && (
        <img src={evento.logo_url} alt={evento.nome_expositor} className="h-12 object-contain mt-4 opacity-60" />
      )}
    </div>
  )

  return (
    <div className="min-h-svh flex flex-col" style={{ background: `${cor}08` }}>
      {/* Header */}
      <div className="px-6 py-8 text-center" style={{ background: cor }}>
        {evento.logo_url
          ? <img src={evento.logo_url} alt={evento.nome_expositor} className="h-14 object-contain mx-auto mb-3" />
          : <div className="text-white font-black text-2xl mb-1">{evento.nome_expositor}</div>
        }
        <p className="text-white/80 text-sm font-medium">{evento.nome_evento}</p>
        {evento.local_evento && <p className="text-white/60 text-xs mt-1">{evento.local_evento}</p>}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 px-5 py-6 max-w-md mx-auto w-full space-y-4">
        <p className="text-gray-600 text-sm text-center font-medium">
          Preencha seus dados e receba nossas informações pelo WhatsApp 📲
        </p>

        {/* Nome */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Nome completo *</label>
          <input
            type="text" required autoComplete="name"
            value={form.nome} onChange={e => set('nome', e.target.value)}
            placeholder="Seu nome"
            className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 text-gray-800 text-base font-medium bg-white focus:outline-none transition"
            style={{ borderColor: form.nome ? cor : undefined }}
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">WhatsApp *</label>
          <div className="flex gap-2 items-center">
            <span className="px-3 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-500 font-bold text-sm select-none">🇧🇷 +55</span>
            <input
              type="tel" required autoComplete="tel"
              value={form.whatsapp} onChange={e => set('whatsapp', formatWhatsapp(e.target.value))}
              placeholder="(00) 00000-0000"
              className="flex-1 px-4 py-3.5 rounded-xl border-2 border-gray-200 text-gray-800 text-base font-medium bg-white focus:outline-none transition"
              style={{ borderColor: form.whatsapp.length >= 10 ? cor : undefined }}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">E-mail <span className="font-normal text-gray-400">(opcional)</span></label>
          <input
            type="email" autoComplete="email"
            value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 text-gray-800 text-base font-medium bg-white focus:outline-none transition"
          />
        </div>

        {/* Empresa */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Empresa <span className="font-normal text-gray-400">(opcional)</span></label>
          <input
            type="text" autoComplete="organization"
            value={form.empresa} onChange={e => set('empresa', e.target.value)}
            placeholder="Nome da empresa"
            className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 text-gray-800 text-base font-medium bg-white focus:outline-none transition"
          />
        </div>

        {/* Interesse */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">O que você procura? <span className="font-normal text-gray-400">(opcional)</span></label>
          <textarea
            value={form.interesse} onChange={e => set('interesse', e.target.value)}
            placeholder="Ex: mais informações sobre o produto X..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-800 text-base bg-white focus:outline-none transition resize-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit" disabled={submitting || !form.nome || form.whatsapp.length < 10}
          className="w-full py-4 rounded-xl font-black text-white text-base transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: cor }}>
          {submitting ? <Loader2 size={20} className="animate-spin" /> : null}
          {submitting ? 'Enviando...' : 'Enviar meus dados 🚀'}
        </button>

        <p className="text-center text-xs text-gray-400">
          Seus dados são usados apenas para contato. Não compartilhamos com terceiros.
        </p>
      </form>
    </div>
  )
}
