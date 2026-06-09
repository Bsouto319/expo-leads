import { supabase } from './supabase'

export interface CampoExtra {
  id: string
  label: string
  tipo: 'text' | 'select' | 'textarea' | 'stars' | 'yesno' | 'phone'
  obrigatorio: boolean
  opcoes?: string[]
}

export interface Lead {
  id: string
  evento_id: string
  nome: string
  whatsapp: string
  email?: string
  empresa?: string
  interesse?: string
  status: string
  score?: number
  fonte?: string
  responsavel?: string
  tags?: string[]
  historico?: HistoricoItem[]
  campos_extras_valores?: Record<string, string>
  notas?: string
  auto_enviado?: boolean
  created_at: string
}

export interface HistoricoItem {
  texto: string
  autor: string
  ts: string
}

export interface Evento {
  id: string
  slug: string
  nome_evento: string
  nome_expositor: string
  cor_primaria: string
  whatsapp_expositor?: string
  data_evento?: string
  local_evento?: string
  mensagem_auto?: string
  logo_url?: string
  uazapi_token?: string
  crm_senha?: string
  ativo: boolean
  campos_extras?: CampoExtra[]
  segmento?: 'feira' | 'concessionaria' | 'corporativo' | 'custom'
  config?: Record<string, any>
  created_at: string
}

export async function getEvento(slug: string): Promise<Evento | null> {
  const { data } = await supabase
    .from('el_eventos')
    .select('*')
    .eq('slug', slug)
    .eq('ativo', true)
    .single()
  return data
}

export async function submitLead(evento: Evento, form: {
  nome: string; whatsapp: string; email?: string; empresa?: string
  interesse?: string; score?: number; fonte?: string
  campos_extras_valores?: Record<string, string>
}) {
  const payload: any = {
    evento_id: evento.id,
    nome: form.nome,
    whatsapp: form.whatsapp,
    email: form.email || null,
    empresa: form.empresa || null,
    interesse: form.interesse || null,
    score: form.score || null,
    fonte: form.fonte || 'form',
    historico: [],
    status: 'novo',
  }
  if (form.campos_extras_valores) {
    payload.campos_extras_valores = form.campos_extras_valores
  }

  const { data, error } = await supabase
    .from('el_leads')
    .insert(payload)
    .select('id')
    .single()
  if (error) throw error

  if (evento.uazapi_token) {
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead: { id: data.id, ...form }, evento }),
    })
      .then(() => supabase.from('el_leads').update({ auto_enviado: true }).eq('id', data.id))
      .catch(() => {})
  }

  return data
}

export async function getLeads(eventoId: string): Promise<Lead[]> {
  const { data } = await supabase
    .from('el_leads')
    .select('*')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: false })
  return (data || []) as Lead[]
}

export async function updateLead(leadId: string, patch: Partial<Lead>) {
  const { error } = await supabase.from('el_leads').update(patch).eq('id', leadId)
  if (error) throw error
}

export async function updateLeadStatus(leadId: string, status: string, notas?: string) {
  await supabase
    .from('el_leads')
    .update({ status, ...(notas !== undefined ? { notas } : {}) })
    .eq('id', leadId)
}

export async function addLeadNota(lead: Lead, texto: string, autor = 'Equipe'): Promise<HistoricoItem[]> {
  const historico: HistoricoItem[] = [...(lead.historico || []), {
    texto, autor, ts: new Date().toISOString(),
  }]
  await supabase.from('el_leads').update({ historico }).eq('id', lead.id)
  return historico
}

export async function getEventos(): Promise<Evento[]> {
  const { data } = await supabase
    .from('el_eventos')
    .select('*')
    .order('created_at', { ascending: false })
  return (data || []) as Evento[]
}

export async function createEvento(ev: Partial<Evento>) {
  const { data, error } = await supabase.from('el_eventos').insert(ev).select('*').single()
  if (error) throw error
  return data as Evento
}

export async function updateEvento(id: string, patch: Partial<Evento>) {
  const { error } = await supabase.from('el_eventos').update(patch).eq('id', id)
  if (error) throw error
}

export async function getEventoAnalytics(eventoId: string) {
  const leads = await getLeads(eventoId)
  const total = leads.length
  const byStatus: Record<string, number> = {}
  const byHour: Record<number, number> = {}
  const byInteresse: Record<string, number> = {}
  const byFonte: Record<string, number> = {}
  let scoreSum = 0; let scoreCount = 0

  for (const l of leads) {
    byStatus[l.status] = (byStatus[l.status] || 0) + 1
    const h = new Date(l.created_at).getHours()
    byHour[h] = (byHour[h] || 0) + 1
    if (l.interesse) byInteresse[l.interesse] = (byInteresse[l.interesse] || 0) + 1
    const fonte = l.fonte || 'form'
    byFonte[fonte] = (byFonte[fonte] || 0) + 1
    if (l.score) { scoreSum += l.score; scoreCount++ }
  }

  const ganhos = byStatus['ganho'] || 0
  const qualificados = (byStatus['qualificado'] || 0) + (byStatus['em_proposta'] || 0) + ganhos
  const abordados = (byStatus['abordado'] || 0) + qualificados

  const funil = [
    { label: 'Captados', value: total, color: '#6366f1' },
    { label: 'Abordados', value: abordados, color: '#f59e0b' },
    { label: 'Qualificados', value: qualificados, color: '#3b82f6' },
    { label: 'Fechados', value: ganhos, color: '#10b981' },
  ]

  const topInteresses = Object.entries(byInteresse)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }))

  const horasPico = Array.from({ length: 24 }, (_, h) => ({ h, v: byHour[h] || 0 }))
  const maxHora = Math.max(...horasPico.map(x => x.v), 1)

  return {
    total,
    byStatus,
    funil,
    topInteresses,
    horasPico,
    maxHora,
    byFonte,
    avgScore: scoreCount ? (scoreSum / scoreCount).toFixed(1) : null,
    conversao: total > 0 ? Math.round((ganhos / total) * 100) : 0,
    recentes: leads.slice(0, 10),
  }
}
