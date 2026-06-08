export function exportToCSV(leads: any[], filename = 'leads.csv') {
  const cols = ['Nome', 'Telefone', 'E-mail', 'Empresa', 'Interesse', 'Status', 'Notas', 'Data', 'Hora']

  const statusLabel: Record<string, string> = {
    novo: 'Novo',
    contatado: 'Contatado',
    qualificado: 'Qualificado',
    perdido: 'Perdido',
  }

  const rows = leads.map(l => {
    // Telefone: mantém como veio no formulário (sem reformatar)
    const telefone = String(l.whatsapp || '').replace(/\D/g, '')

    const dt = l.created_at ? new Date(l.created_at) : null
    return [
      l.nome || '',
      telefone,
      l.email || '',
      l.empresa || '',
      l.interesse || '',
      statusLabel[l.status] || l.status || '',
      (l.notas || '').replace(/\n/g, ' '),
      dt ? dt.toLocaleDateString('pt-BR') : '',
      dt ? dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
    ]
  })

  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`

  const header = cols.map(c => `"${c}"`).join(';')
  const body = rows.map(row => row.map(escape).join(';')).join('\n')
  const csv = `sep=;\n${header}\n${body}`

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
