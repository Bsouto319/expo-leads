import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { getEventos, createEvento, updateEvento } from '../lib/api'
import { Plus, QrCode, Users, Check, ExternalLink, Copy, ToggleLeft, ToggleRight } from 'lucide-react'

const BASE_URL = window.location.origin

const EMPTY = {
  slug: '', nome_evento: '', nome_expositor: '', cor_primaria: '#6366f1',
  whatsapp_expositor: '', data_evento: '', local_evento: '',
  mensagem_auto: 'Olá {{nome}}! 👋 Foi ótimo te conhecer na {{evento}}. Em breve entramos em contato com mais informações. Qualquer dúvida é só chamar!'
}

export default function AdminPage() {
  const [eventos, setEventos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [qrEvento, setQrEvento] = useState<any>(null)
  const [copied, setCopied] = useState('')

  async function load() {
    const data = await getEventos()
    setEventos(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await createEvento(form)
      setForm({ ...EMPTY })
      setShowForm(false)
      await load()
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleAtivo(ev: any) {
    await updateEvento(ev.id, { ativo: !ev.ativo })
    setEventos(es => es.map(e => e.id === ev.id ? { ...e, ativo: !e.ativo } : e))
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${BASE_URL}/form/${slug}`)
    setCopied(slug)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div className="min-h-svh bg-gray-950 text-white">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="font-black text-lg text-white">ExpoLeads <span className="text-violet-400">Admin</span></div>
          <div className="text-white/40 text-xs mt-0.5">BTechSouto — painel interno</div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 transition text-sm font-black">
          <Plus size={14} /> Novo evento
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mx-auto max-w-lg px-6 py-6 space-y-4 border-b border-white/10">
          <h3 className="font-black text-white text-base">Novo expositor / evento</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-white/40 block mb-1">Slug (URL) *</label>
              <input required value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="nome-empresa-expo" className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500 font-mono" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-white/40 block mb-1">Cor principal</label>
              <input type="color" value={form.cor_primaria} onChange={e => set('cor_primaria', e.target.value)}
                className="w-full h-10 rounded-xl bg-white/5 border border-white/10 cursor-pointer p-1" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-white/40 block mb-1">Nome do expositor *</label>
            <input required value={form.nome_expositor} onChange={e => set('nome_expositor', e.target.value)}
              placeholder="Ex: Empresa ABC" className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500" />
          </div>

          <div>
            <label className="text-[11px] font-bold text-white/40 block mb-1">Nome do evento *</label>
            <input required value={form.nome_evento} onChange={e => set('nome_evento', e.target.value)}
              placeholder="Ex: Expo Brasília 2026" className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-white/40 block mb-1">Data do evento</label>
              <input type="date" value={form.data_evento} onChange={e => set('data_evento', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-white/40 block mb-1">WhatsApp expositor</label>
              <input type="tel" value={form.whatsapp_expositor} onChange={e => set('whatsapp_expositor', e.target.value)}
                placeholder="5561999999999" className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500 font-mono" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-white/40 block mb-1">Local do evento</label>
            <input value={form.local_evento} onChange={e => set('local_evento', e.target.value)}
              placeholder="Ex: Centro de Convenções — Brasília, DF" className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500" />
          </div>

          <div>
            <label className="text-[11px] font-bold text-white/40 block mb-1">Mensagem automática WhatsApp</label>
            <textarea value={form.mensagem_auto} onChange={e => set('mensagem_auto', e.target.value)}
              rows={3} placeholder="Use {{nome}} e {{evento}} como variáveis"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500 resize-none font-mono" />
            <p className="text-[10px] text-white/25 mt-1">Variáveis: {'{{'} nome {'}}'} e {'{{'} evento {'}}'}</p>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 transition font-black text-sm disabled:opacity-40">
              {saving ? 'Criando...' : 'Criar evento'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Eventos list */}
      <div className="px-6 py-4 max-w-2xl mx-auto space-y-3">
        {loading && <p className="text-white/30 text-sm text-center py-10">Carregando...</p>}
        {!loading && eventos.length === 0 && (
          <p className="text-white/30 text-sm text-center py-10">Nenhum evento criado ainda.</p>
        )}
        {eventos.map(ev => (
          <div key={ev.id} className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: ev.cor_primaria + '30', border: `2px solid ${ev.cor_primaria}50` }}>
                <div className="w-full h-full rounded-xl" style={{ background: ev.cor_primaria + '20' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-white text-sm truncate">{ev.nome_expositor}</div>
                <div className="text-white/40 text-xs truncate">{ev.nome_evento} {ev.data_evento ? `· ${new Date(ev.data_evento + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}</div>
              </div>
              <button onClick={() => toggleAtivo(ev)} className="shrink-0 p-1">
                {ev.ativo
                  ? <ToggleRight size={22} className="text-emerald-400" />
                  : <ToggleLeft size={22} className="text-white/20" />}
              </button>
            </div>

            <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
              <button onClick={() => copyLink(ev.slug)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs font-bold text-white/60">
                {copied === ev.slug ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copied === ev.slug ? 'Copiado!' : 'Copiar link'}
              </button>
              <a href={`/form/${ev.slug}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs font-bold text-white/60">
                <ExternalLink size={12} /> Form
              </a>
              <a href={`/crm/${ev.slug}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs font-bold text-white/60">
                <Users size={12} /> CRM
              </a>
              <button onClick={() => setQrEvento(qrEvento?.id === ev.id ? null : ev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 transition text-xs font-bold text-violet-400">
                <QrCode size={12} /> QR Code
              </button>
            </div>

            {/* QR Code expandido */}
            {qrEvento?.id === ev.id && (
              <div className="mx-4 mb-4 p-5 rounded-2xl bg-white flex flex-col items-center gap-3">
                <QRCodeSVG
                  value={`${BASE_URL}/form/${ev.slug}`}
                  size={200}
                  fgColor={ev.cor_primaria}
                  level="M"
                  includeMargin
                />
                <p className="text-gray-500 text-xs font-mono break-all text-center">{BASE_URL}/form/{ev.slug}</p>
                <p className="text-gray-400 text-[11px] text-center">Imprima ou exiba na tela. Visitantes escaneiam com o próprio celular.</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
