import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getEvento, getLeads, updateLead, addLeadNota, type Evento, type Lead, type HistoricoItem } from '../lib/api'
import { RefreshCw, Search, Mail, Building2, X, Download, BarChart2, Star, MessageCircle, Send } from 'lucide-react'
import PasswordGate from '../components/PasswordGate'
import { exportToCSV } from '../utils/export'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD as string

// ── Configuração de estágios ───────────────────────────────────────────────────
const STAGES = [
  { id: 'novo',        label: 'Novo',        short: 'Novo',     color: '#6366f1', bg: '#f0f0ff', pill: '#e0e0ff' },
  { id: 'abordado',   label: 'Abordado',    short: 'Abordado', color: '#f59e0b', bg: '#fffbeb', pill: '#fef3c7' },
  { id: 'qualificado',label: 'Qualificado', short: 'Qualif.',  color: '#3b82f6', bg: '#eff6ff', pill: '#dbeafe' },
  { id: 'em_proposta',label: 'Em Proposta', short: 'Proposta', color: '#8b5cf6', bg: '#f5f3ff', pill: '#ede9fe' },
  { id: 'ganho',      label: 'Fechado ✅',   short: 'Fechado',  color: '#10b981', bg: '#f0fdf4', pill: '#d1fae5' },
  { id: 'perdido',    label: 'Perdido',     short: 'Perdido',  color: '#ef4444', bg: '#fef2f2', pill: '#fee2e2' },
]

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#84cc16']

// ── helpers ────────────────────────────────────────────────────────────────────
function initials(nome: string) {
  const p = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase()
  return (p[0]?.[0] || '?').toUpperCase()
}
function avatarColor(nome: string) {
  const s = (nome || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[s % AVATAR_COLORS.length]
}
function fmtPhone(phone: string) {
  const d = (phone || '').replace(/\D/g, '').replace(/^55/, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return phone
}
function waUrl(phone: string) {
  const d = (phone || '').replace(/\D/g, '')
  if (d.length === 11) return `https://wa.me/55${d}`
  if (d.startsWith('55') && d.length >= 12) return `https://wa.me/${d}`
  return `https://wa.me/55${d}`
}
function timeAgo(ts: string) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h/24)}d`
}
function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function stageConfig(id: string) { return STAGES.find(s => s.id === id) || STAGES[0] }

// ── Lead Modal ─────────────────────────────────────────────────────────────────
function LeadModal({ lead, onClose, onUpdate, cor }: {
  lead: Lead; onClose: () => void; onUpdate: (l: Lead) => void; cor: string
}) {
  const [status, setStatus] = useState(lead.status)
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)
  const [historico, setHistorico] = useState<HistoricoItem[]>(lead.historico || [])
  const [savingNota, setSavingNota] = useState(false)

  const stage = stageConfig(status)

  async function saveStage(newStatus: string) {
    setStatus(newStatus)
    await updateLead(lead.id, { status: newStatus })
    onUpdate({ ...lead, status: newStatus })
  }

  async function submitNota() {
    if (!nota.trim()) return
    setSavingNota(true)
    try {
      const updated = await addLeadNota(lead, nota.trim())
      setHistorico(updated)
      setNota('')
      onUpdate({ ...lead, historico: updated, status })
    } finally { setSavingNota(false) }
  }

  async function saveAndClose() {
    setSaving(true)
    await updateLead(lead.id, { status })
    onUpdate({ ...lead, status })
    setSaving(false)
    onClose()
  }

  const extras = lead.campos_extras_valores || {}
  const hasExtras = Object.keys(extras).length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden z-10">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-center gap-4 border-b border-gray-100">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg shrink-0"
            style={{ background: avatarColor(lead.nome) }}>
            {initials(lead.nome)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-gray-900 text-lg truncate">{lead.nome}</div>
            <div className="text-sm text-gray-400">{fmtPhone(lead.whatsapp)} · {timeAgo(lead.created_at)}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Ações rápidas */}
          <div className="flex gap-2">
            <a href={waUrl(lead.whatsapp)} target="_blank"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition"
              style={{ background: '#25d366' }}>
              <MessageCircle size={15} /> WhatsApp
            </a>
            {lead.email && (
              <a href={`mailto:${lead.email}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold transition">
                <Mail size={15} /> E-mail
              </a>
            )}
            {lead.score && (
              <div className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-amber-50 text-amber-600 text-sm font-bold">
                <Star size={14} fill="#f59e0b" /> {lead.score}/5
              </div>
            )}
          </div>

          {/* Dados do lead */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Dados</div>
            {lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail size={14} className="text-gray-400 shrink-0" />
                <span className="text-gray-700">{lead.email}</span>
              </div>
            )}
            {lead.empresa && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 size={14} className="text-gray-400 shrink-0" />
                <span className="text-gray-700">{lead.empresa}</span>
              </div>
            )}
            {lead.interesse && (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-400 shrink-0 mt-0.5">🎯</span>
                <span className="text-gray-700">{lead.interesse}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 shrink-0">📅</span>
              <span className="text-gray-500 text-xs">{fmtDate(lead.created_at)}</span>
              {lead.fonte && <span className="text-gray-400 text-xs">· {lead.fonte}</span>}
            </div>
          </div>

          {/* Campos extras */}
          {hasExtras && (
            <div className="bg-indigo-50 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-2">Campos adicionais</div>
              {Object.entries(extras).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-gray-800">{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Estágio */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Estágio no pipeline</div>
            <div className="grid grid-cols-3 gap-2">
              {STAGES.map(s => (
                <button key={s.id} onClick={() => saveStage(s.id)}
                  className="py-2 px-3 rounded-xl text-xs font-bold transition border-2"
                  style={{
                    background: status === s.id ? s.bg : 'transparent',
                    borderColor: status === s.id ? s.color : '#e5e7eb',
                    color: status === s.id ? s.color : '#9ca3af',
                  }}>
                  {s.short}
                </button>
              ))}
            </div>
          </div>

          {/* Histórico de notas */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Histórico / Notas</div>
            {historico.length === 0 && (
              <p className="text-gray-400 text-xs text-center py-3 bg-gray-50 rounded-xl">Nenhuma nota ainda</p>
            )}
            <div className="space-y-2 mb-3">
              {historico.map((h, i) => (
                <div key={i} className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-500">{h.autor}</span>
                    <span className="text-[10px] text-gray-400">{fmtDate(h.ts)}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{h.texto}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={nota} onChange={e => setNota(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitNota() } }}
                placeholder="Adicionar nota..." className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 bg-white" />
              <button onClick={submitNota} disabled={!nota.trim() || savingNota}
                className="px-3 py-2.5 rounded-xl text-white transition disabled:opacity-40"
                style={{ background: cor }}>
                {savingNota ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition">
            Fechar
          </button>
          <button onClick={saveAndClose} disabled={saving}
            className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition disabled:opacity-60"
            style={{ background: stage.color }}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Card do lead ───────────────────────────────────────────────────────────────
function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95">
      <div className="flex items-start gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
          style={{ background: avatarColor(lead.nome) }}>
          {initials(lead.nome)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 text-sm truncate">{lead.nome}</div>
          <div className="text-xs text-gray-400">{fmtPhone(lead.whatsapp)}</div>
        </div>
        <div className="text-[10px] text-gray-400 shrink-0">{timeAgo(lead.created_at)}</div>
      </div>

      {lead.interesse && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-2 bg-gray-50 rounded-lg px-2 py-1.5">
          🎯 {lead.interesse}
        </p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {lead.empresa && (
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <Building2 size={10} /> {lead.empresa}
          </span>
        )}
        {lead.score && (
          <span className="text-[10px] text-amber-500 font-bold">{'★'.repeat(lead.score)}</span>
        )}
        {lead.auto_enviado && (
          <span className="text-[10px] text-green-500 font-bold ml-auto">✓ WA</span>
        )}
        {lead.historico && lead.historico.length > 0 && (
          <span className="text-[10px] text-indigo-400 font-bold ml-auto">💬 {lead.historico.length}</span>
        )}
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function CrmPage() {
  const { slug } = useParams<{ slug: string }>()
  const [evento, setEvento] = useState<Evento | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [sortBy, setSortBy] = useState<'recente' | 'score'>('recente')

  const load = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    const ev = await getEvento(slug)
    setEvento(ev)
    if (ev) {
      const ls = await getLeads(ev.id)
      setLeads(ls)
    }
    setLoading(false)
  }, [slug])

  useEffect(() => { load() }, [load])

  function updateLeadLocal(updated: Lead) {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
    if (selectedLead?.id === updated.id) setSelectedLead(updated)
  }

  const filtered = leads
    .filter(l => {
      const q = search.toLowerCase()
      const match = !q || l.nome.toLowerCase().includes(q) ||
        l.whatsapp.includes(q) || (l.empresa || '').toLowerCase().includes(q) ||
        (l.interesse || '').toLowerCase().includes(q)
      const stageMatch = !filterStage || l.status === filterStage
      return match && stageMatch
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (b.score || 0) - (a.score || 0)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const byStage = STAGES.map(s => ({
    ...s,
    leads: filtered.filter(l => l.status === s.id),
    count: leads.filter(l => l.status === s.id).length,
  }))

  async function handleExport() {
    if (!evento) return
    exportToCSV(leads, `leads-${slug}`)
  }

  const cor = evento?.cor_primaria || '#6366f1'

  if (loading) return (
    <div className="min-h-svh flex items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin" size={28} style={{ color: cor }} />
    </div>
  )

  return (
    <PasswordGate storageKey={`crm-auth-${slug}`}
      correctPassword={evento?.crm_senha || ADMIN_PASSWORD}
      title={`CRM · ${evento?.nome_expositor || slug}`}>
      <div className="min-h-svh bg-gray-50 flex flex-col">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            {evento?.logo_url && (
              <img src={evento.logo_url} alt="" className="h-8 object-contain" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-black text-gray-900 text-base truncate">
                {evento?.nome_expositor}
              </div>
              <div className="text-xs text-gray-400">{evento?.nome_evento} · {leads.length} leads</div>
            </div>
            <button onClick={load} title="Atualizar"
              className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400">
              <RefreshCw size={16} />
            </button>
            <a href={`/dashboard/${slug}`}
              className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400" title="Analytics">
              <BarChart2 size={16} />
            </a>
            <button onClick={handleExport}
              className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400" title="Exportar CSV">
              <Download size={16} />
            </button>
          </div>

          {/* Busca e filtros */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-40">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar nome, telefone, empresa..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 bg-white" />
            </div>
            <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none bg-white text-gray-600">
              <option value="">Todos</option>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label} ({leads.filter(l => l.status === s.id).length})</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none bg-white text-gray-600">
              <option value="recente">Mais recentes</option>
              <option value="score">Maior score</option>
            </select>
          </div>

          {/* Estatísticas rápidas */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {STAGES.map(s => (
              <button key={s.id} onClick={() => setFilterStage(f => f === s.id ? '' : s.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border"
                style={{
                  background: filterStage === s.id ? s.bg : 'transparent',
                  borderColor: filterStage === s.id ? s.color : '#e5e7eb',
                  color: filterStage === s.id ? s.color : '#9ca3af',
                }}>
                <span style={{ background: s.color, width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }} />
                {s.short} · {leads.filter(l => l.status === s.id).length}
              </button>
            ))}
          </div>
        </div>

        {/* Kanban */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 p-4 min-w-max h-full items-start">
            {byStage.map(col => (
              <div key={col.id} className="w-72 shrink-0 flex flex-col gap-2">
                {/* Cabeçalho da coluna */}
                <div className="flex items-center gap-2 px-1 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                  <span className="font-black text-gray-700 text-sm">{col.label}</span>
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: col.pill, color: col.color }}>
                    {col.leads.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {col.leads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
                  ))}
                  {col.leads.length === 0 && (
                    <div className="h-16 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-300 font-medium">Vazio</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Modal */}
        {selectedLead && (
          <LeadModal lead={selectedLead} cor={cor}
            onClose={() => setSelectedLead(null)}
            onUpdate={updateLeadLocal} />
        )}
      </div>
    </PasswordGate>
  )
}

// Loader inline pra não duplicar import
function Loader2({ size, className, style }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}>
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  )
}
