import type { VercelRequest, VercelResponse } from '@vercel/node'

const UAZAPI_URL = 'https://btechsoutoshop.uazapi.com'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { lead, evento } = req.body as {
    lead: { nome: string; whatsapp: string }
    evento: { nome_evento: string; nome_expositor: string; mensagem_auto: string; uazapi_token: string }
  }

  if (!evento?.uazapi_token) return res.status(200).json({ skip: true })

  const vars: Record<string, string> = {
    nome:   lead.nome,
    evento: evento.nome_evento,
  }
  const mensagem = (evento.mensagem_auto || '').replace(
    /\{\{(\w+)\}\}/g,
    (_, k) => vars[k] ?? ''
  )

  const uazRes = await fetch(`${UAZAPI_URL}/message/sendText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token: evento.uazapi_token,
    },
    body: JSON.stringify({
      number:  lead.whatsapp,
      text:    mensagem,
      delay:   1200,
    }),
  })

  const body = await uazRes.json().catch(() => ({}))
  return res.status(200).json({ ok: uazRes.ok, body })
}
