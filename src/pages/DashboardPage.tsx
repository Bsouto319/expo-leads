import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getEvento, getEventoAnalytics, type Evento } from '../lib/api'
import { Loader2, TrendingUp, Users, Target, Star, Download, ArrowLeft, BarChart2 } from 'lucide-react'
import PasswordGate from '../components/PasswordGate'
import { exportToCSV } from '../utils/export'
import { getLeads } from '../lib/api'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD as string

function MetricCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-black text-gray-900 leading-none">{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
        <div className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  )
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-gray-700">{label}</span>
        <span className="font-black" style={{ color }}>{value} <span className="text-gray-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function HourBar({ h, v, max }: { h: number; v: number; max: number }) {
  const pct = max > 0 ? Math.round((v / max) * 100) : 0
  const label = h < 10 ? `0${h}h` : `${h}h`
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div className="w-full flex items-end justify-center" style={{ height: 64 }}>
        <div className="w-full rounded-t-md transition-all duration-500"
          style={{ height: `${Math.max(pct, v > 0 ? 8 : 0)}%`, background: v > 0 ? '#6366f1' : '#f3f4f6', minHeight: v > 0 ? 4 : 0 }} />
      </div>
      <span className="text-[9px] text-gray-400 font-medium">{label}</span>
      {v > 0 && <span className="text-[9px] font-black text-indigo-600">{v}</span>}
    </div>
  )
}

export default function DashboardPage() {
  const { slug } = useParams<{ slug: string }>()
  const [evento, setEvento] = useState<Evento | null>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    Promise.all([getEvento(slug), getEvento(slug).then(ev => ev ? getEventoAnalytics(ev.id) : null)])
      .then(([ev, an]) => { setEvento(ev); setAnalytics(an); setLoading(false) })
  }, [slug])

  async function handleExport() {
    if (!evento) return
    const leads = await getLeads(evento.id)
    exportToCSV(leads, `leads-${slug}`)
  }

  const cor = evento?.cor_primaria || '#6366f1'

  if (loading) return (
    <div className="min-h-svh flex items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-indigo-500" size={32} />
    </div>
  )

  return (
    <PasswordGate storageKey={`crm-auth-${slug}`}
      correctPassword={evento?.crm_senha || ADMIN_PASSWORD}
      title={`Dashboard · ${evento?.nome_expositor || slug}`}>
      <div className="min-h-svh bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3">
          <a href={`/crm/${slug}`} className="text-gray-400 hover:text-gray-700 transition p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={18} />
          </a>
          <div className="flex-1 min-w-0">
            <div className="font-black text-gray-900 text-base truncate">{evento?.nome_expositor}</div>
            <div className="text-xs text-gray-400">{evento?.nome_evento} · Analytics</div>
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition">
            <Download size={14} /> Exportar CSV
          </button>
          <a href={`/form/${slug}`} target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold transition"
            style={{ background: cor }}>
            + Leads
          </a>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

          {/* Métricas principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Total de leads" value={analytics?.total || 0}
              icon={<Users size={22} />} color="#6366f1" />
            <MetricCard label="Fechados" value={analytics?.byStatus?.ganho || 0}
              sub={`${analytics?.conversao || 0}% do total`}
              icon={<Target size={22} />} color="#10b981" />
            <MetricCard label="Score médio" value={analytics?.avgScore ? `${analytics.avgScore}★` : '—'}
              sub="intenção de compra"
              icon={<Star size={22} />} color="#f59e0b" />
            <MetricCard label="Em abordagem" value={
              (analytics?.byStatus?.abordado || 0) + (analytics?.byStatus?.qualificado || 0) +
              (analytics?.byStatus?.em_proposta || 0)
            }
              sub="qualificados + proposta"
              icon={<TrendingUp size={22} />} color="#3b82f6" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Funil de conversão */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={16} className="text-gray-400" />
                <h3 className="font-black text-gray-800 text-sm uppercase tracking-wide">Funil de Conversão</h3>
              </div>
              <div className="space-y-4">
                {(analytics?.funil || []).map((f: any) => (
                  <FunnelBar key={f.label} label={f.label} value={f.value}
                    max={analytics?.funil[0]?.value || 1} color={f.color} />
                ))}
              </div>
            </div>

            {/* Leads por hora */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={16} className="text-gray-400" />
                <h3 className="font-black text-gray-800 text-sm uppercase tracking-wide">Leads por Hora do Dia</h3>
              </div>
              <div className="flex items-end gap-0.5 px-1">
                {(analytics?.horasPico || []).map((x: any) => (
                  <HourBar key={x.h} h={x.h} v={x.v} max={analytics?.maxHora || 1} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Top interesses */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-black text-gray-800 text-sm uppercase tracking-wide mb-4">🎯 Top Interesses</h3>
              {(analytics?.topInteresses || []).length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Nenhum interesse registrado ainda</p>
              ) : (
                <div className="space-y-3">
                  {analytics.topInteresses.map((item: any, i: number) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-xs font-black text-indigo-500">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-semibold text-gray-700 truncate">{item.label}</span>
                          <span className="font-black text-indigo-600 ml-2">{item.value}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-400"
                            style={{ width: `${Math.round((item.value / analytics.topInteresses[0].value) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fonte dos leads + Status */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-black text-gray-800 text-sm uppercase tracking-wide mb-3">📊 Status do Pipeline</h3>
                <div className="space-y-2">
                  {[
                    { key: 'novo', label: 'Novos', color: '#6366f1' },
                    { key: 'abordado', label: 'Abordados', color: '#f59e0b' },
                    { key: 'qualificado', label: 'Qualificados', color: '#3b82f6' },
                    { key: 'em_proposta', label: 'Em Proposta', color: '#8b5cf6' },
                    { key: 'ganho', label: 'Fechados', color: '#10b981' },
                    { key: 'perdido', label: 'Perdidos', color: '#ef4444' },
                  ].map(s => {
                    const v = analytics?.byStatus?.[s.key] || 0
                    const total = analytics?.total || 1
                    return (
                      <div key={s.key} className="flex items-center gap-2 text-sm">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="flex-1 text-gray-600">{s.label}</span>
                        <span className="font-bold text-gray-800">{v}</span>
                        <span className="text-gray-400 text-xs w-10 text-right">{Math.round((v / total) * 100)}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-black text-gray-800 text-sm uppercase tracking-wide mb-3">📱 Origem</h3>
                <div className="space-y-2">
                  {[
                    { key: 'form', label: 'Link / Desktop', emoji: '🖥️' },
                    { key: 'qr', label: 'QR Code (celular)', emoji: '📲' },
                    { key: 'tablet', label: 'Tablet (stand)', emoji: '📊' },
                  ].map(f => {
                    const v = analytics?.byFonte?.[f.key] || 0
                    return v > 0 ? (
                      <div key={f.key} className="flex items-center gap-2 text-sm">
                        <span>{f.emoji}</span>
                        <span className="flex-1 text-gray-600">{f.label}</span>
                        <span className="font-bold text-gray-800">{v}</span>
                      </div>
                    ) : null
                  })}
                  {Object.keys(analytics?.byFonte || {}).length === 0 && (
                    <p className="text-gray-400 text-xs">Nenhuma origem registrada ainda</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Leads recentes */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-800 text-sm uppercase tracking-wide">⚡ Últimos Leads</h3>
              <a href={`/crm/${slug}`} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                Ver todos →
              </a>
            </div>
            <div className="divide-y divide-gray-50">
              {(analytics?.recentes || []).map((lead: any) => {
                const dt = new Date(lead.created_at)
                return (
                  <div key={lead.id} className="py-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-black text-indigo-600">
                      {lead.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm truncate">{lead.nome}</div>
                      {lead.interesse && <div className="text-xs text-gray-400 truncate">{lead.interesse}</div>}
                    </div>
                    <div className="text-xs text-gray-400 shrink-0">
                      {dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}
              {(!analytics?.recentes?.length) && (
                <p className="text-gray-400 text-sm text-center py-6">Nenhum lead ainda</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PasswordGate>
  )
}
