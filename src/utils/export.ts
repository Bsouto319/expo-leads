export function exportToCSV(leads: any[], filename = 'leads.csv') {
  const cols = ['Nome', 'Telefone', 'E-mail', 'Empresa', 'Interesse', 'Status', 'Notas', 'Data cadastro']

  const statusLabel: Record<string, string> = {
    novo: 'Novo',
    contatado: 'Contatado',
    qualificado: 'Qualificado',
    perdido: 'Perdido',
  }

  const rows = leads.map(l => {
    // Telefone: mantém como veio no formulário (sem reformatar)
    const telefone = String(l.whatsapp || '').replace(/\D/g, '')

    return [
      l.nome || '',
      telefone,
      l.email || '',
      l.empresa || '',
      l.interesse || '',
      statusLabel[l.status] || l.status || '',
      (l.notas || '').replace(/\n/g, ' '),
      l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '',
    ]
  })

  // sep=; força Excel a usar ponto-e-vírgula como separador
  // Prefixo ' nas células numéricas para Excel não converter telefone em número
  const escape = (v: string) => {
    const s = String(v)
    // Número puro: adiciona apóstrofo para preservar zeros à esquerda
    if (/^\d+$/.test(s)) return `"='${s}'"`
    return `"${s.replace(/"/g, '""')}"`
  }

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
