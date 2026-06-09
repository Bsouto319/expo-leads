import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { getEventos, createEvento, updateEvento, type Evento, type CampoExtra } from '../lib/api'
import {
  Plus, QrCode, Users, Check, Copy,
  ToggleLeft, ToggleRight, Settings2, Trash2,
  Star, Type, List, AlignLeft, ToggleLeft as YesNoIcon, Phone,
} from 'lucide-react'
import PasswordGate from '../components/PasswordGate'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD as string
const BASE_URL = window.location.origin

const SEGMENTOS = [
  { id: 'feira',          label: 'Feira / Expo',       emoji: '🎪', desc: 'Captura geral de leads em feiras' },
  { id: 'concessionaria', label: 'Concessionária',     emoji: '🚗', desc: 'Veículo de interesse, forma de pagamento' },
  { id: 'corporativo',    label: 'Corporativo / B2B',  emoji: '🏢', desc: 'Empresa, cargo, necessidade' },
  { id: 'custom',         label: 'Personalizado',      emoji: '⚙️',  desc: 'Configure seus próprios campos' },
]

const CAMPOS_PRESET: Record<string, CampoExtra[]> = {
  concessionaria: [
    { id: 'veiculo_interesse', label: 'Veículo de interesse', tipo: 'text', obrigatorio: false },
    { id: 'versao', label: 'Versão / Trim', tipo: 'text', obrigatorio: false },
    { id: 'forma_pagamento', label: 'Forma de pagamento', tipo: 'select', obrigatorio: false, opcoes: ['Financiamento', 'À Vista', 'Consórcio', 'Leasing'] },
    { id: 'tem_veiculo_troca', label: 'Tem veículo para troca?', tipo: 'yesno', obrigatorio: false },
    { id: 'nivel_interesse', label: 'Nível de interesse', tipo: 'stars', obrigatorio: false },
  ],
  corporativo: [
    { id: 'cargo', label: 'Cargo / Função', tipo: 'text', obrigatorio: false },
    { id: 'necessidade', label: 'Principal necessidade', tipo: 'textarea', obrigatorio: false },
    { id: 'tamanho_empresa', label: 'Tamanho da empresa', tipo: 'select', obrigatorio: false, opcoes: ['1-10 pessoas', '11-50 pessoas', '51-200 pessoas', '200+ pessoas'] },
    { id: 'decisor', label: 'É o decisor da compra?', tipo: 'yesno', obrigatorio: false },
  ],
  feira: [
    { id: 'interesse_produto', label: 'Produto de interesse', tipo: 'select', obrigatorio: false, opcoes: [] },
    { id: 'nivel_interesse', label: 'Nível de interesse', tipo: 'stars', obrigatorio: false },
  ],
  custom: [],
}

const TIPO_ICONS: Record<string, React.ReactNode> = {
  text: <Type size={12} />, select: <List size={12} />, textarea: <AlignLeft size={12} />,
  stars: <Star size={12} />, yesno: <YesNoIcon size={12} />, phone: <Phone size={12} />,
}

const EMPTY: Partial<Evento> = {
  slug: '', nome_evento: '', nome_expositor: '', cor_primaria: '#6366f1',
  whatsapp_expositor: '', data_evento: '', local_evento: '', uazapi_token: '', crm_senha: '',
  segmento: 'feira', campos_extras: [],
  mensagem_auto: 'Olá {{nome}}! 👋 Foi ótimo te conhecer na {{evento}}. Em breve entramos em contato!',
}

// ── Campo Extra Editor ─────────────────────────────────────────────────────────
function CampoExtraRow({ campo, onChange, onRemove }: {
  campo: CampoExtra; onChange: (c: CampoExtra) => void; onRemove: () => void
}) {
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-200 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs">
          {TIPO_ICONS[campo.tipo]} {campo.tipo}
        </div>
        <input value={campo.label} onChange={e => onChange({ ...campo, label: e.target.value })}
          placeholder="Rótulo do campo" className="flex-1 text-sm px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-400" />
        <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
          <input type="checkbox" checked={campo.obrigatorio} onChange={e => onChange({ ...campo, obrigatorio: e.target.checked })} className="rounded" />
          Obrig.
        </label>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition">
          <Trash2 size={13} />
        </button>
      </div>
      <div className="flex gap-2">
        <select value={campo.tipo} onChange={e => onChange({ ...campo, tipo: e.target.value as any })}
          className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none bg-white">
          {['text', 'select', 'textarea', 'stars', 'yesno', 'phone'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {campo.tipo === 'select' && (
          <input value={(campo.opcoes || []).join(', ')}
            onChange={e => onChange({ ...campo, opcoes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="Opção 1, Opção 2, Opção 3"
            className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-400" />
        )}
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Evento | null>(null)
  const [form, setForm] = useState<Partial<Evento>>({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [qrEvento, setQrEvento] = useState<Evento | null>(null)
  const [copied, setCopied] = useState('')
  async function load() {
    const data = await getEventos()
    setEventos(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function set(field: string, value: any) { setForm(f => ({ ...f, [field]: value })) }

  function openNew() {
    setEditando(null)
    setForm({ ...EMPTY })
    setShowForm(true)
  }

  function openEdit(ev: Evento) {
    setEditando(ev)
    setForm({ ...ev })
    setShowForm(true)
  }

  function applySegmento(seg: string) {
    set('segmento', seg)
    const preset = CAMPOS_PRESET[seg as keyof typeof CAMPOS_PRESET] || []
    set('campos_extras', preset.map(c => ({ ...c, id: `${c.id}_${Date.now()}` })))
  }

  function addCampo() {
    const campos = [...(form.campos_extras || []), {
      id: `campo_${Date.now()}`, label: '', tipo: 'text' as const, obrigatorio: false,
    }]
    set('campos_extras', campos)
  }

  function updateCampo(idx: number, c: CampoExtra) {
    const campos = [...(form.campos_extras || [])]
    campos[idx] = c
    set('campos_extras', campos)
  }

  function removeCampo(idx: number) {
    const campos = [...(form.campos_extras || [])]
    campos.splice(idx, 1)
    set('campos_extras', campos)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editando) {
        await updateEvento(editando.id, form)
      } else {
        await createEvento(form)
      }
      setShowForm(false)
      setEditando(null)
      setForm({ ...EMPTY })
      await load()
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally { setSaving(false) }
  }

  async function toggleAtivo(ev: Evento) {
    await updateEvento(ev.id, { ativo: !ev.ativo })
    setEventos(es => es.map(e => e.id === ev.id ? { ...e, ativo: !e.ativo } : e))
  }

  function copyLink(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-400 placeholder-white/30'

  return (
    <PasswordGate storageKey="admin-auth" correctPassword={ADMIN_PASSWORD} title="ExpoLeads Admin">
      <div className="min-h-svh bg-gray-950 text-white">

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="font-black text-lg">ExpoLeads <span className="text-indigo-400">Pro</span></div>
            <div className="text-white/30 text-xs">Plataforma enterprise de captação</div>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition text-sm font-black">
            <Plus size={14} /> Novo evento
          </button>
        </div>

        {/* Form de criação/edição */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <div className="relative bg-gray-900 rounded-t-3xl md:rounded-3xl w-full max-w-2xl max-h-[95vh] overflow-y-auto z-10">
              <form onSubmit={handleSave} className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white text-lg">{editando ? 'Editar evento' : 'Novo evento'}</h3>
                  <button type="button" onClick={() => setShowForm(false)} className="text-white/40 hover:text-white p-1">✕</button>
                </div>

                {/* Segmento */}
                <div>
                  <label className="text-xs font-bold text-white/40 block mb-2 uppercase tracking-wide">Segmento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SEGMENTOS.map(s => (
                      <button key={s.id} type="button" onClick={() => applySegmento(s.id)}
                        className="text-left px-3 py-3 rounded-xl border-2 transition"
                        style={{
                          borderColor: form.segmento === s.id ? '#6366f1' : 'rgba(255,255,255,0.08)',
                          background: form.segmento === s.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                        }}>
                        <div className="text-base mb-0.5">{s.emoji}</div>
                        <div className="font-bold text-white text-xs">{s.label}</div>
                        <div className="text-white/40 text-[10px]">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dados básicos */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-white/40 block mb-1.5 uppercase">Slug (URL) *</label>
                    <input required value={form.slug || ''} readOnly={!!editando}
                      onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      placeholder="empresa-expo-2025" className={`${inputCls} font-mono`} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-white/40 block mb-1.5 uppercase">Cor principal</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={form.cor_primaria || '#6366f1'}
                        onChange={e => set('cor_primaria', e.target.value)}
                        className="w-12 h-10 rounded-xl border border-white/10 cursor-pointer p-1 bg-transparent" />
                      <input value={form.cor_primaria || '#6366f1'}
                        onChange={e => set('cor_primaria', e.target.value)}
                        className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/40 block mb-1.5 uppercase">Expositor / Empresa *</label>
                  <input required value={form.nome_expositor || ''} onChange={e => set('nome_expositor', e.target.value)}
                    placeholder="Nome da empresa" className={inputCls} />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/40 block mb-1.5 uppercase">Nome do evento *</label>
                  <input required value={form.nome_evento || ''} onChange={e => set('nome_evento', e.target.value)}
                    placeholder="Ex: Salão do Automóvel 2025" className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-white/40 block mb-1.5 uppercase">Local</label>
                    <input value={form.local_evento || ''} onChange={e => set('local_evento', e.target.value)}
                      placeholder="Pavilhão A, São Paulo" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-white/40 block mb-1.5 uppercase">Data</label>
                    <input type="date" value={form.data_evento || ''} onChange={e => set('data_evento', e.target.value)}
                      className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-white/40 block mb-1.5 uppercase">Logo URL</label>
                    <input value={form.logo_url || ''} onChange={e => set('logo_url', e.target.value)}
                      placeholder="https://..." className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-white/40 block mb-1.5 uppercase">Senha CRM</label>
                    <input value={form.crm_senha || ''} onChange={e => set('crm_senha', e.target.value)}
                      placeholder="Deixe vazio = senha admin" className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/40 block mb-1.5 uppercase">Mensagem WhatsApp automática</label>
                  <textarea value={form.mensagem_auto || ''} onChange={e => set('mensagem_auto', e.target.value)}
                    rows={2} placeholder="Olá {{nome}}! Foi ótimo te conhecer na {{evento}}..."
                    className={`${inputCls} resize-none`} />
                  <p className="text-white/30 text-xs mt-1">Variáveis: {'{{nome}}'} {'{{evento}}'}</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/40 block mb-1.5 uppercase">UAZAPI Token (WhatsApp)</label>
                  <input value={form.uazapi_token || ''} onChange={e => set('uazapi_token', e.target.value)}
                    placeholder="Token da instância UAZAPI" className={`${inputCls} font-mono text-xs`} />
                </div>

                {/* Campos extras */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wide">
                      Campos do formulário ({(form.campos_extras || []).length})
                    </label>
                    <button type="button" onClick={addCampo}
                      className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition">
                      <Plus size={12} /> Adicionar campo
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(form.campos_extras || []).map((campo, i) => (
                      <CampoExtraRow key={campo.id || i} campo={campo}
                        onChange={c => updateCampo(i, c)}
                        onRemove={() => removeCampo(i)} />
                    ))}
                    {(form.campos_extras || []).length === 0 && (
                      <p className="text-white/30 text-xs text-center py-3 border border-white/10 rounded-xl">
                        Nenhum campo extra. Campos padrão: nome, WhatsApp, email, empresa, interesse.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black transition">
                    {saving ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar evento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista de eventos */}
        <div className="p-5 space-y-3 max-w-4xl mx-auto">
          {loading && <div className="text-white/40 text-center py-12">Carregando...</div>}
          {!loading && eventos.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🎪</div>
              <p className="text-white/40">Nenhum evento criado ainda.</p>
              <button onClick={openNew} className="mt-4 px-6 py-3 rounded-xl bg-indigo-600 text-white font-black text-sm">
                Criar primeiro evento
              </button>
            </div>
          )}

          {eventos.map(ev => {
            const formUrl = `${BASE_URL}/form/${ev.slug}`
            const crmUrl  = `${BASE_URL}/crm/${ev.slug}`
            const dashUrl = `${BASE_URL}/dashboard/${ev.slug}`
            const tabletUrl = `${formUrl}?tablet=1`
            const qrUrl   = `${formUrl}?qr=1`
            const seg = SEGMENTOS.find(s => s.id === ev.segmento)

            return (
              <div key={ev.id} className="bg-gray-900 rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Color dot + info */}
                    <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ background: ev.cor_primaria }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-white text-base">{ev.nome_expositor}</span>
                        {seg && <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/60">{seg.emoji} {seg.label}</span>}
                        {!ev.ativo && <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full">Inativo</span>}
                      </div>
                      <div className="text-white/50 text-xs mt-0.5 truncate">{ev.nome_evento}</div>
                      {ev.local_evento && <div className="text-white/30 text-xs truncate">📍 {ev.local_evento}</div>}
                    </div>
                    <button onClick={() => toggleAtivo(ev)} className="text-white/40 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition" title={ev.ativo ? 'Desativar' : 'Ativar'}>
                      {ev.ativo ? <ToggleRight size={20} className="text-green-400" /> : <ToggleLeft size={20} />}
                    </button>
                    <button onClick={() => openEdit(ev)} className="text-white/40 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition">
                      <Settings2 size={16} />
                    </button>
                  </div>

                  {/* Links */}
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { label: '📋 Formulário', url: formUrl },
                      { label: '📲 Tablet/Stand', url: tabletUrl },
                      { label: '🗂 CRM', url: crmUrl },
                      { label: '📊 Analytics', url: dashUrl },
                    ].map(({ label, url }) => (
                      <div key={label} className="flex gap-1">
                        <a href={url} target="_blank"
                          className="flex-1 text-center text-[11px] font-bold py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition truncate px-2">
                          {label}
                        </a>
                        <button onClick={() => copyLink(url, `${ev.id}-${label}`)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-white/40 hover:text-white shrink-0">
                          {copied === `${ev.id}-${label}` ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* QR Code e URL do QR */}
                  <div className="mt-2 flex gap-2 items-center">
                    <button onClick={() => setQrEvento(qrEvento?.id === ev.id ? null : ev)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition">
                      <QrCode size={13} /> {qrEvento?.id === ev.id ? 'Ocultar QR' : 'Ver QR Code'}
                    </button>
                    <span className="font-mono text-white/20 text-xs truncate">/form/{ev.slug}</span>
                  </div>

                  {/* QR Code expandido */}
                  {qrEvento?.id === ev.id && (
                    <div className="mt-3 flex flex-col items-center gap-3 p-4 bg-white rounded-2xl">
                      <QRCodeSVG value={qrUrl} size={180} level="H"
                        imageSettings={ev.logo_url ? { src: ev.logo_url, height: 36, width: 36, excavate: true } : undefined} />
                      <p className="text-gray-600 text-xs text-center">
                        Escaneie para preencher o formulário<br />
                        <span className="font-mono text-gray-400">{qrUrl}</span>
                      </p>
                      <div className="flex gap-2 w-full">
                        <button onClick={() => copyLink(qrUrl, `qr-${ev.id}`)}
                          className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition flex items-center justify-center gap-1.5">
                          {copied === `qr-${ev.id}` ? <><Check size={12} className="text-green-500" /> Copiado!</> : <><Copy size={12} /> Copiar link QR</>}
                        </button>
                        <a href={crmUrl} target="_blank"
                          className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5">
                          <Users size={12} /> Abrir CRM
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PasswordGate>
  )
}
