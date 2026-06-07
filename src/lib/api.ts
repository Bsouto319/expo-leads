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
  nome: string; whatsapp: string; email?: string; empresa?: string; interesse?: string
}) {
  const { data, error } = await supabase
    .from('el_leads')
    .insert({ evento_id: evento.id, ...form })
    .select('id')
    .single()
  if (error) throw error

  // Disparo WhatsApp via webhook do n8n (fire-and-forget)
  if (evento.webhook_url) {
    const vars: Record<string, string> = {
      nome:   form.nome,
      evento: evento.nome_evento,
    }
    const mensagem = (evento.mensagem_auto || '').replace(
      /\{\{(\w+)\}\}/g,
      (_, k) => vars[k] ?? ''
    )
    fetch(evento.webhook_url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead: { id: data.id, ...form },
        mensagem,
        evento: {
          id: evento.id,
          nome: evento.nome_evento,
          nome_expositor: evento.nome_expositor,
        },
      }),
    }).catch(() => {})
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
  slug: string; nome_evento: string; nome_expositor: string;
  cor_primaria?: string; whatsapp_expositor?: string;
  data_evento?: string; local_evento?: string;
  mensagem_auto?: string; logo_url?: string; webhook_url?: string
}) {
  const { data, error } = await supabase.from('el_eventos').insert(ev).select('*').single()
  if (error) throw error
  return data
}

export async function updateEvento(id: string, patch: Partial<{
  nome_evento: string; nome_expositor: string; cor_primaria: string;
  whatsapp_expositor: string; data_evento: string; local_evento: string;
  mensagem_auto: string; logo_url: string; webhook_url: string; ativo: boolean
}>) {
  await supabase.from('el_eventos').update(patch).eq('id', id)
}
