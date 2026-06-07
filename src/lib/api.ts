import { supabase } from './supabase'

export async function getEvento(slug: string) {
  const { data } = await supabase
    .from('el_eventos')
    .select('*')
    .eq('slug', slug)
    .eq('ativo', true)
    .single()
  return data
}

export async function submitLead(evento: any, form: {
  nome: string; whatsapp: string; email?: string; empresa?: string
  interesse?: string; campos_extras_valores?: Record<string, string>
}) {
  const { data, error } = await supabase
    .from('el_leads')
    .insert({
      evento_id: evento.id,
      nome:      form.nome,
      whatsapp:  form.whatsapp,
      email:     form.email,
      empresa:   form.empresa,
      interesse: form.interesse,
      ...(form.campos_extras_valores ? { notas: JSON.stringify(form.campos_extras_valores) } : {}),
    })
    .select('id')
    .single()
  if (error) throw error

  // Disparo WhatsApp via Vercel → UAZAPI
  if (evento.uazapi_token) {
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead: { id: data.id, ...form }, evento }),
    })
      .then(() =>
        supabase.from('el_leads').update({ auto_enviado: true }).eq('id', data.id)
      )
      .catch(() => {})
  }

  return data
}

export async function getLeads(eventoId: string) {
  const { data } = await supabase
    .from('el_leads')
    .select('*')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function updateLeadStatus(leadId: string, status: string, notas?: string) {
  await supabase
    .from('el_leads')
    .update({ status, ...(notas !== undefined ? { notas } : {}) })
    .eq('id', leadId)
}

export async function getEventos() {
  const { data } = await supabase
    .from('el_eventos')
    .select('*')
    .order('created_at', { ascending: false })
  return data || []
}

export async function createEvento(ev: {
  slug: string; nome_evento: string; nome_expositor: string
  cor_primaria?: string; whatsapp_expositor?: string
  data_evento?: string; local_evento?: string
  mensagem_auto?: string; logo_url?: string
  uazapi_token?: string; campos_extras?: CampoExtra[]
}) {
  const { data, error } = await supabase.from('el_eventos').insert(ev).select('*').single()
  if (error) throw error
  return data
}

export async function updateEvento(id: string, patch: Partial<{
  nome_evento: string; nome_expositor: string; cor_primaria: string
  whatsapp_expositor: string; data_evento: string; local_evento: string
  mensagem_auto: string; logo_url: string; uazapi_token: string
  campos_extras: CampoExtra[]; ativo: boolean
}>) {
  await supabase.from('el_eventos').update(patch).eq('id', id)
}

export interface CampoExtra {
  id: string
  label: string
  tipo: 'text' | 'select' | 'textarea'
  obrigatorio: boolean
  opcoes?: string[]  // para tipo select
}
