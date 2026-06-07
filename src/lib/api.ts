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

export async function submitLead(eventoId: string, form: {
  nome: string; whatsapp: string; email?: string; empresa?: string; interesse?: string
}) {
  const { data, error } = await supabase
    .from('el_leads')
    .insert({ evento_id: eventoId, ...form })
    .select('id')
    .single()
  if (error) throw error
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
  await supabase.from('el_leads').update({ status, ...(notas !== undefined ? { notas } : {}) }).eq('id', leadId)
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
  data_evento?: string; local_evento?: string; mensagem_auto?: string; logo_url?: string
}) {
  const { data, error } = await supabase.from('el_eventos').insert(ev).select('*').single()
  if (error) throw error
  return data
}

export async function updateEvento(id: string, patch: Partial<{
  nome_evento: string; nome_expositor: string; cor_primaria: string;
  whatsapp_expositor: string; data_evento: string; local_evento: string;
  mensagem_auto: string; logo_url: string; ativo: boolean
}>) {
  await supabase.from('el_eventos').update(patch).eq('id', id)
}
