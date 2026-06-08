export function exportToCSV(leads: any[], filename = 'leads.csv') {
  const cols = ['Nome', 'WhatsApp', 'E-mail', 'Empresa', 'Interesse', 'Status', 'Data']
  const rows = leads.map(l => [
    l.nome || '',
    l.whatsapp || '',
    l.email || '',
    l.empresa || '',
    l.interesse || '',
    l.status || '',
    l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '',
  ])
  const csv = [cols, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
