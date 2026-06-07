import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getEvento, getLeads, updateLeadStatus } from '../lib/api'
import { Users, RefreshCw, Phone, Mail, Building2, MessageSquare, Clock, CheckCircle, XCircle, Star } from 'lucide-react'

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  novo:        { label: 'Novo',        color: '#6366f1', bg: '#6366f120' },
  contatado:   { label: 'Contatado',   color: '#f59e0b', bg: '#f59e0b20' },
  qualificado: { label: 'Qualificado', color: '#10b981', bg: '#10b98120' },
  perdido:     { label: 'Perdido',     color: '#6b7280', bg: '#6b728020' },
}

function fmt(phone: string) {
  const d = phone.replace(/\D/g, '').replace(/^55/, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  return phone
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

export default function CrmPage() {
  const { slug } = useParams<{ slug: string }>()
  const [evento, setEvento] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')
  const [selected, setSelected] = useState<any>(null)
  const [notesText, setNotesText] = useState('')

  async function load() {
    if (!slug) return
    const ev = await getEvento(slug)
    setEvento(ev)
    if (ev) {
      const ls = await getLeads(ev.id)
      setLeads(ls)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [slug])

  const cor = evento?.cor_primaria || '#6366f1'

  const filtered = leads.filter(l => filter === 'todos' || l.status === filter)

  async function changeStatus(leadId: string, status: string) {
    await updateLeadStatus(leadId, status)
    setLeads(ls => ls.map(l => l.id === leadId ? { ...l, status } : l))
    if (selected?.id === leadId) setSelected((s: any) => ({ ...s, status }))
  }

  async function saveNotes() {
    if (!selected) return
    await updateLeadStatus(selected.id, selected.status, notesText)
    setLeads(ls => ls.map(l => l.id === selected.id ? { ...l, notas: notesText } : l))
    setSelected((s: any) => ({ ...s, notas: notesText }))
  }

  if (loading) return (
    <div className="min-h-svh flex items-center justify-center bg-gray-50">
      <RefreshCw className="animate-spin text-gray-400" size={28} />
    </div>
  )

  if (!evento) return (
    <div className="min-h-svh flex items-center justify-center text-gray-400">Evento não encontrado.</div>
  )

  return (
    <div className="min-h-svh flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between shadow-sm" style={{ background: cor }}>
        <div>
          <div className="text-white font-black text-base leading-none">{evento.nome_expositor}</div>
          <div className="text-white/70 text-xs mt-0.5">{evento.nome_evento}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-white font-black text-xl leading-none">{leads.length}</div>
            <div className="text-white/60 text-[10px]">leads</div>
          </div>
          <button onClick={load} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
            <RefreshCw size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {(['todos', 'novo', 'contatado', 'qualificado', 'perdido'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition border"
            style={{
              background: filter === s ? (s === 'todos' ? cor : STATUS_META[s]?.bg) : 'white',
              borderColor: filter === s ? (s === 'todos' ? cor : STATUS_META[s]?.color) : '#e5e7eb',
              color: filter === s ? (s === 'todos' ? cor : STATUS_META[s]?.color) : '#6b7280',
            }}>
            {s === 'todos' ? `Todos (${leads.length})` : `${STATUS_META[s].label} (${leads.filter(l => l.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Lead list */}
      <div className="flex-1 px-4 pb-6 space-y-2 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Users size={40} strokeWidth={1} />
            <p className="text-sm">Nenhum lead ainda</p>
          </div>
        )}
        {filtered.map(lead => {
          const meta = STATUS_META[lead.status] || STATUS_META.novo
          return (
            <div key={lead.id}
              onClick={() => { setSelected(lead); setNotesText(lead.notas || '') }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer active:scale-[0.99] transition">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-black text-gray-800 text-sm truncate">{lead.nome}</div>
                  {lead.empresa && <div className="text-gray-500 text-xs mt-0.5 flex items-center gap-1"><Building2 size={10} />{lead.empresa}</div>}
                  <div className="text-gray-400 text-xs mt-1 flex items-center gap-1"><Clock size={10} />{timeAgo(lead.created_at)}</div>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black"
                  style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
              </div>
              <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-gray-50">
                <a href={`https://wa.me/${lead.whatsapp}`} target="_blank" rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                  <Phone size={12} /> {fmt(lead.whatsapp)}
                </a>
                {lead.email && <span className="flex items-center gap-1 text-gray-400 text-xs"><Mail size={10} />{lead.email}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Lead detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="bg-white rounded-t-3xl px-5 pt-5 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <h3 className="font-black text-gray-800 text-lg">{selected.nome}</h3>
                {selected.empresa && <p className="text-gray-500 text-sm">{selected.empresa}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-full bg-gray-100 text-gray-400"><XCircle size={18} /></button>
            </div>

            {/* Contato */}
            <div className="space-y-2 mb-4">
              <a href={`https://wa.me/${selected.whatsapp}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl text-emerald-700 font-bold text-sm">
                <Phone size={16} /> {fmt(selected.whatsapp)}
              </a>
              {selected.email && (
                <a href={`mailto:${selected.email}`}
                  className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl text-blue-700 font-bold text-sm">
                  <Mail size={16} /> {selected.email}
                </a>
              )}
            </div>

            {/* Interesse */}
            {selected.interesse && (
              <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-bold text-gray-400 mb-1 flex items-center gap-1"><Star size={10} />Interesse</p>
                <p className="text-gray-700 text-sm">{selected.interesse}</p>
              </div>
            )}

            {/* Status */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 mb-2">Status</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS_META).map(([key, meta]) => (
                  <button key={key} onClick={() => changeStatus(selected.id, key)}
                    className="py-2.5 px-3 rounded-xl text-xs font-black transition border-2"
                    style={{
                      background: selected.status === key ? meta.bg : 'transparent',
                      borderColor: selected.status === key ? meta.color : '#e5e7eb',
                      color: selected.status === key ? meta.color : '#9ca3af',
                    }}>
                    {selected.status === key ? '✓ ' : ''}{meta.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div>
              <p className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1"><MessageSquare size={10} />Anotações</p>
              <textarea value={notesText} onChange={e => setNotesText(e.target.value)}
                placeholder="Anotações sobre esse lead..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm resize-none focus:outline-none focus:border-indigo-300" />
              <button onClick={saveNotes}
                className="w-full mt-2 py-3 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2"
                style={{ background: cor }}>
                <CheckCircle size={16} /> Salvar anotações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
