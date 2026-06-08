import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getEvento, getLeads, updateLeadStatus } from '../lib/api'
import { RefreshCw, Phone, Mail, Building2 } from 'lucide-react'
import PasswordGate from '../components/PasswordGate'

const COLUMNS = [
  { id: 'novo',        label: 'Novo',        color: '#64748b', bg: '#f1f5f9', header: '#e2e8f0' },
  { id: 'contatado',   label: 'Contatado',   color: '#d97706', bg: '#fffbeb', header: '#fef3c7' },
  { id: 'qualificado', label: 'Qualificado', color: '#2563eb', bg: '#eff6ff', header: '#dbeafe' },
  { id: 'perdido',     label: 'Perdido',     color: '#9ca3af', bg: '#f9fafb', header: '#f3f4f6' },
]

const AVATAR_COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#84cc16']

function initials(nome: string) {
  const parts = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0]?.[0] || '?').toUpperCase()
}

function avatarColor(nome: string) {
  const sum = (nome || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

function fmt(phone: string) {
  const d = (phone || '').replace(/\D/g, '').replace(/^55/, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return phone
}

function whatsappUrl(phone: string) {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 11) return `https://wa.me/55${digits}`
  if (digits.length === 13) return `https://wa.me/${digits}`
  return `https://wa.me/55${digits}`
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

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: 'Sora, sans-serif', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  )
}

function Tag({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700, color, background: bg }}>
      {children}
    </span>
  )
}

function KanbanCard({ lead, onMove, onOpen, col }: { lead: any; onMove: (lead: any, status: string, e?: any) => void; onOpen: (lead: any) => void; col: typeof COLUMNS[0] }) {
  const nextCols = COLUMNS.filter(c => c.id !== lead.status)
  return (
    <div onClick={() => onOpen(lead)}
      style={{ background: 'white', border: `1px solid ${col.header}`, borderRadius: 10, padding: '12px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}>
      {/* Avatar + nome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(lead.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 11, fontFamily: 'Sora, sans-serif' }}>{initials(lead.nome)}</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.nome}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{fmt(lead.whatsapp)}</div>
        </div>
        <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>{timeAgo(lead.created_at)}</span>
      </div>
      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {lead.empresa && <Tag color="#2563eb" bg="#eff6ff"><Building2 size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> {lead.empresa}</Tag>}
        {lead.interesse && <Tag color="#7c3aed" bg="#f5f3ff">⭐ {lead.interesse.slice(0, 20)}{lead.interesse.length > 20 ? '…' : ''}</Tag>}
      </div>
      {/* Mover */}
      <div style={{ display: 'flex', gap: 4, borderTop: '1px solid #f1f5f9', paddingTop: 8 }} onClick={e => e.stopPropagation()}>
        {nextCols.slice(0, 3).map(c => (
          <button key={c.id} onClick={e => onMove(lead, c.id, e)}
            style={{ fontSize: 9, padding: '3px 7px', borderRadius: 20, border: `1.5px solid ${c.color}`, color: c.color, background: 'transparent', cursor: 'pointer', fontWeight: 700 }}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function MobileList({ leads, onOpen }: { leads: any[]; onOpen: (lead: any) => void }) {
  return (
    <div>
      {COLUMNS.map(col => {
        const colLeads = leads.filter((l: any) => l.status === col.id)
        if (colLeads.length === 0) return null
        return (
          <div key={col.id} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: col.header, borderBottom: `2px solid ${col.header}`, position: 'sticky', top: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: col.color, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Sora, sans-serif' }}>{col.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: col.color }}>{colLeads.length}</span>
            </div>
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {colLeads.map((lead: any) => (
                <button key={lead.id} onClick={() => onOpen(lead)}
                  style={{ width: '100%', textAlign: 'left', background: 'white', border: `1px solid ${col.header}`, borderLeft: `4px solid ${col.color}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(lead.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: 'white', fontWeight: 800, fontSize: 12, fontFamily: 'Sora, sans-serif' }}>{initials(lead.nome)}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{lead.nome}</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>{fmt(lead.whatsapp)}</div>
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{timeAgo(lead.created_at)}</span>
                  </div>
                  {(lead.empresa || lead.interesse) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {lead.empresa && <Tag color="#2563eb" bg="#eff6ff">{lead.empresa}</Tag>}
                      {lead.interesse && <Tag color="#7c3aed" bg="#f5f3ff">{lead.interesse.slice(0, 24)}{lead.interesse.length > 24 ? '…' : ''}</Tag>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      })}
      {leads.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 0', fontSize: 14 }}>Nenhum lead ainda</div>
      )}
    </div>
  )
}

export default function CrmPage() {
  const { slug } = useParams<{ slug: string }>()
  const [evento, setEvento] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [notesText, setNotesText] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    if (!slug) return
    const ev = await getEvento(slug)
    setEvento(ev)
    if (ev) setLeads(await getLeads(ev.id))
    setLoading(false)
  }

  useEffect(() => { load() }, [slug])

  async function moveStatus(lead: any, status: string, e?: any) {
    e?.stopPropagation()
    setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, status } : l))
    await updateLeadStatus(lead.id, status)
    if (selected?.id === lead.id) setSelected((s: any) => ({ ...s, status }))
  }

  async function saveNotes() {
    if (!selected) return
    setSaving(true)
    await updateLeadStatus(selected.id, selected.status, notesText)
    setLeads(ls => ls.map(l => l.id === selected.id ? { ...l, notas: notesText } : l))
    setSelected((s: any) => ({ ...s, notas: notesText }))
    setSaving(false)
    setSelected(null)
  }

  function openLead(lead: any) { setSelected(lead); setNotesText(lead.notas || '') }

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f5fb' }}>
      <RefreshCw className="animate-spin text-gray-400" size={28} />
    </div>
  )

  if (!evento) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Evento não encontrado.</div>
  )

  const cor = evento.cor_primaria || '#2563eb'
  const crmSenha = evento.crm_senha || import.meta.env.VITE_ADMIN_PASSWORD

  const filtered = leads.filter(l =>
    !filter ||
    (l.nome || '').toLowerCase().includes(filter.toLowerCase()) ||
    (l.whatsapp || '').includes(filter) ||
    (l.empresa || '').toLowerCase().includes(filter.toLowerCase())
  )

  const total      = leads.length
  const novos      = leads.filter(l => l.status === 'novo').length
  const qualif     = leads.filter(l => l.status === 'qualificado').length
  const contatados = leads.filter(l => l.status === 'contatado').length

  return (
    <PasswordGate storageKey={`crm-${slug}`} correctPassword={crmSenha} title={`CRM — ${evento.nome_expositor}`}>
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#f0f5fb', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Topbar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${cor}cc,${cor})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: 11, fontFamily: 'Sora, sans-serif' }}>{initials(evento.nome_expositor)}</span>
          </div>
          <div>
            <p style={{ color: '#0f172a', fontWeight: 800, fontSize: 15, margin: 0, lineHeight: 1.2, fontFamily: 'Sora, sans-serif' }}>{evento.nome_expositor}</p>
            <p style={{ color: '#94a3b8', fontSize: 11, margin: 0 }}>{evento.nome_evento}</p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <StatBox label="Total"      value={total}      color="#0f172a" />
          <StatBox label="Novos"      value={novos}      color="#64748b" />
          <StatBox label="Contatados" value={contatados} color="#d97706" />
          <StatBox label="Qualif."    value={qualif}     color="#2563eb" />
        </div>

        {/* Busca + refresh */}
        <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 320 }}>
          <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Buscar nome, empresa, telefone..."
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif' }} />
          <button onClick={load}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: 14, cursor: 'pointer' }}>
            ↻
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>Carregando leads...</div>
      ) : (
        <>
          {/* Mobile: lista por seção */}
          <div style={{ display: 'block' }} className="md-hide">
            <MobileList leads={filtered} onOpen={openLead} />
          </div>

          {/* Desktop: Kanban */}
          <div style={{ flex: 1, overflowX: 'auto', padding: '20px 16px' }}>
            <div style={{ display: 'flex', gap: 12, minWidth: 'max-content', height: '100%', alignItems: 'flex-start' }}>
              {COLUMNS.map(col => {
                const colLeads = filtered.filter(l => l.status === col.id)
                return (
                  <div key={col.id} style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRadius: 14, overflow: 'hidden', background: col.bg, border: `1px solid ${col.header}` }}>
                    <div style={{ padding: '10px 14px', background: col.header, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 800, fontSize: 12, color: col.color, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Sora, sans-serif' }}>{col.label}</span>
                      <span style={{ marginLeft: 'auto', background: 'white', color: col.color, fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>{colLeads.length}</span>
                    </div>
                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
                      {colLeads.map(lead => (
                        <KanbanCard key={lead.id} lead={lead} col={col} onMove={moveStatus} onOpen={openLead} />
                      ))}
                      {colLeads.length === 0 && (
                        <div style={{ color: '#cbd5e1', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>Nenhum lead</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Modal detalhe */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 520, padding: '28px 24px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: avatarColor(selected.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: 'white', fontWeight: 800, fontSize: 18, fontFamily: 'Sora, sans-serif' }}>{initials(selected.nome)}</span>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>{selected.nome}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#94a3b8' }}>{new Date(selected.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#f1f5f9', color: '#64748b', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
            </div>

            {/* Infos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <InfoBox label="WhatsApp" value={fmt(selected.whatsapp)} />
              <InfoBox label="E-mail"   value={selected.email || '—'} />
              {selected.empresa  && <InfoBox label="Empresa"   value={selected.empresa} />}
              {selected.interesse && <InfoBox label="Interesse" value={selected.interesse} />}
            </div>

            {/* Contato rápido */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <a href={whatsappUrl(selected.whatsapp)} target="_blank" rel="noreferrer"
                style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#22c55e', color: 'white', fontSize: 13, fontWeight: 800, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Sora, sans-serif' }}>
                <Phone size={15} /> WhatsApp
              </a>
              {selected.email && (
                <a href={`mailto:${selected.email}`}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#eff6ff', color: '#2563eb', fontSize: 13, fontWeight: 800, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Sora, sans-serif' }}>
                  <Mail size={15} /> E-mail
                </a>
              )}
            </div>

            {/* Status */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Mover para</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {COLUMNS.map(col => (
                  <button key={col.id} onClick={() => moveStatus(selected, col.id)}
                    style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `2px solid ${col.color}`, transition: 'all 0.15s',
                      background: selected.status === col.id ? col.color : 'transparent',
                      color: selected.status === col.id ? 'white' : col.color }}>
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Anotações</p>
              <textarea value={notesText} onChange={e => setNotesText(e.target.value)}
                placeholder="Anotações sobre o lead..."
                rows={3}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
            </div>

            <button onClick={saveNotes} disabled={saving}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: cor, color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'Sora, sans-serif' }}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>

          </div>
        </div>
      )}
    </div>
    </PasswordGate>
  )
}
