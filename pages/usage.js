import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '../components/Sidebar'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)

const PERTH = 'Australia/Perth'
export default function Usage() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [usageData, setUsageData] = useState(null)
  const [mobileNav, setMobileNav] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login' }
      else { setUser(session.user); setAuthLoading(false) }
    })
  }, [])
  useEffect(() => {
    if (!user) return
    async function init() {
      const { data: userClient } = await supabase
        .from('user_clients').select('client_id, role')
        .eq('user_id', user.id).single()
      if (userClient && userClient.role === 'admin') {
        setIsAdmin(true)
        const { data: allClients } = await supabase
          .from('clients').select('id, business_name, monthly_minutes_used, billing_start_date, plan_id').eq('active', true)
        if (allClients) {
          const { data: allPlans } = await supabase.from('plans').select('*')
          const enriched = allClients.map(c => ({ ...c, plans: allPlans?.find(p => p.id === c.plan_id) || null }))
          setClients(enriched)
        }
      } else if (userClient && userClient.client_id) {
        await fetchClientUsage(userClient.client_id)
      }
    }
    init()
  }, [user])
  async function fetchClientUsage(clientId) {
    const { data } = await supabase.from('clients').select('id, business_name, monthly_minutes_used, billing_start_date, plan_id').eq('id', clientId).single()
    if (data) {
      const { data: plan } = await supabase.from('plans').select('*').eq('id', data.plan_id).single()
      setUsageData({ ...data, plans: plan })
    }
  }
  async function handleClientSelect(clientId) {
    setSelectedClient(clientId)
    if (clientId) await fetchClientUsage(clientId)
    else setUsageData(null)
  }
  function UsageCard({ data }) {
    const used = Math.round(data.monthly_minutes_used || 0)
    const total = data.plans?.minutes_per_month || 0
    const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0
    const remaining = Math.max(total - used, 0)
    const overageMinutes = Math.max(used - total, 0)
    const overageCost = overageMinutes * (data.plans?.overage_per_minute || 0)
    const billingDate = data.billing_start_date ? new Date(data.billing_start_date).toLocaleDateString('en-AU', { timeZone: PERTH }) : 'N/A'
    const barColor = pct > 90 ? 'linear-gradient(90deg,#d6362f,#f97316)' : pct > 70 ? 'linear-gradient(90deg,#c68a1d,#fbbf24)' : 'linear-gradient(90deg,#6f5fd6,#8f86e8)'
    const statusColor = pct > 90 ? '#d6362f' : pct > 70 ? '#c68a1d' : '#10a15c'
    const statusLabel = pct > 90 ? 'Near Limit' : pct > 70 ? 'High Usage' : 'On Track'
    return (
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #ece9f6', boxShadow: '0 1px 4px rgba(21,17,41,0.05)', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ background: 'linear-gradient(135deg,#151129,#211a42)', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#6a629e', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginBottom: '6px' }}>Current Plan</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>{data.plans?.name || 'Basic'}</div>
            <div style={{ fontSize: '0.85rem', color: '#8f86e8', marginTop: '4px' }}>{data.business_name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#8f86e8' }}>${data.plans?.price_per_month || 0}</div>
            <div style={{ fontSize: '0.75rem', color: '#6a629e' }}>per month</div>
            <div style={{ marginTop: '8px', display: 'inline-block', background: statusColor + '20', border: `1px solid ${statusColor}40`, borderRadius: '20px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: '700', color: statusColor }}>{statusLabel}</div>
          </div>
        </div>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #f4f2f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Minutes Used This Month</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#151129' }}>{used} / {total} min</div>
          </div>
          <div style={{ background: '#f1eefb', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '999px', width: `${pct}%`, background: barColor, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#9691b3' }}>{pct.toFixed(1)}% used</div>
            <div style={{ fontSize: '0.75rem', color: remaining > 0 ? '#10a15c' : '#d6362f', fontWeight: '600' }}>
              {remaining > 0 ? `${remaining} min remaining` : `${overageMinutes} min over limit`}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { label: 'Minutes Included', value: `${total} min` },
            { label: 'Response Time', value: `${data.plans?.response_time_hours || 24}hr` },
            { label: 'Billing Start', value: billingDate },
          ].map((s, i) => (
            <div key={i} style={{ padding: '20px', borderRight: i < 2 ? '1px solid #f4f2f9' : 'none', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: '#9691b3', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#151129' }}>{s.value}</div>
            </div>
          ))}
        </div>
        {overageMinutes > 0 && (
          <div style={{ margin: '0 28px 20px', background: '#fef1f1', border: '1px solid #f6cccb', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#d6362f', marginBottom: '4px' }}>Overage Alert</div>
            <div style={{ fontSize: '0.82rem', color: '#7f1d1d' }}>
              {overageMinutes} minutes over plan limit. Estimated overage charge: <strong>${overageCost.toFixed(2)}</strong> at ${data.plans?.overage_per_minute}/min.
            </div>
          </div>
        )}
        <div style={{ padding: '0 28px 24px' }}>
          <div style={{ fontSize: '0.7rem', color: '#9691b3', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', marginBottom: '12px' }}>Plan Includes</div>
          {[
            `Up to ${total} minutes of AI call handling per month`,
            `${data.plans?.response_time_hours || 24} hour support response time`,
            `$${data.plans?.overage_per_minute || 1.50}/min overage rate`,
            'AI call summaries and full transcripts',
            'Call recording playback',
            'Live dashboard access',
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: i < 5 ? '1px solid #f8f7fc' : 'none', fontSize: '0.84rem', color: '#475569' }}>
              <span style={{ color: '#10a15c', fontWeight: '700', flexShrink: 0 }}>✓</span> {f}
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f5fa', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.9rem', color: '#9691b3' }}>
      Loading...
    </div>
  )
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; }
        body { font-family:'Plus Jakarta Sans',sans-serif; background:#f6f5fa; -webkit-font-smoothing:antialiased; }
        .layout { display:flex; min-height:100vh; }
        .main { margin-left:252px; flex:1; padding:36px 40px; min-height:100vh; }
        .topbar { margin-bottom:28px; }
        .page-title { font-size:1.6rem; font-weight:800; color:#151129; letter-spacing:-0.6px; }
        .page-sub { font-size:0.82rem; color:#9691b3; margin-top:3px; }
        .client-selector-wrap { margin-bottom:20px; display:flex; align-items:center; gap:12px; background:#fff; border-radius:12px; padding:14px 20px; border:1px solid #ece9f6; box-shadow:0 1px 4px rgba(21,17,41,0.05); }
        .client-selector-label { font-size:0.78rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; white-space:nowrap; }
        .client-selector { flex:1; padding:8px 14px; border-radius:8px; border:1.5px solid #ece9f6; font-size:0.875rem; font-family:'Plus Jakarta Sans',sans-serif; color:#151129; font-weight:600; background:#f9f8fc; cursor:pointer; outline:none; }
        .client-selector:focus { border-color:#6f5fd6; }
        .admin-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:20px; }
        .overlay { display:none; position:fixed; inset:0; background:rgba(10,8,24,0.5); z-index:150; backdrop-filter:blur(2px); }
        .overlay.show { display:block; }
        @media (max-width:900px) {
          .main { margin-left:0; padding:76px 16px 100px; }
          .page-title { font-size:1.3rem; }
          .admin-grid { grid-template-columns:1fr; }
          .client-selector-wrap { flex-direction:column; align-items:flex-start; gap:8px; }
        }
      `}</style>
      <div className={`overlay ${mobileNav ? 'show' : ''}`} onClick={() => setMobileNav(false)} />
      <div className="layout">
        <Sidebar isAdmin={isAdmin} activePage="usage" mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />
        <main className="main">
          <div className="topbar">
            <div className="page-title">Usage &amp; Billing</div>
            <div className="page-sub">Current billing period · {new Date().toLocaleDateString('en-AU', { timeZone: PERTH, month: 'long', year: 'numeric' })}</div>
          </div>
          {isAdmin && (
            <>
              <div className="client-selector-wrap">
                <div className="client-selector-label">Select Client:</div>
                <select className="client-selector" value={selectedClient || ''} onChange={e => handleClientSelect(e.target.value || null)}>
                  <option value="">— Pick a client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                </select>
              </div>
              {!selectedClient && (
                <div className="admin-grid">
                  {clients.map(c => (
                    <div key={c.id} style={{ background: '#fff', borderRadius: '14px', border: '1px solid #ece9f6', padding: '20px', boxShadow: '0 1px 4px rgba(21,17,41,0.05)', cursor: 'pointer' }} onClick={() => handleClientSelect(c.id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#151129' }}>{c.business_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9691b3', marginTop: '2px' }}>{c.plans?.name || 'No plan'} — ${c.plans?.price_per_month || 0}/mo</div>
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6f5fd6', background: '#f1eefb', border: '1px solid #d6d0f5', borderRadius: '6px', padding: '3px 8px' }}>View →</div>
                      </div>
                      {c.plans && (
                        <>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{Math.round(c.monthly_minutes_used || 0)} / {c.plans.minutes_per_month} min</span>
                            <span>{((c.monthly_minutes_used || 0) / c.plans.minutes_per_month * 100).toFixed(0)}%</span>
                          </div>
                          <div style={{ background: '#f1eefb', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: '999px',
                              width: `${Math.min((c.monthly_minutes_used || 0) / c.plans.minutes_per_month * 100, 100)}%`,
                              background: (c.monthly_minutes_used || 0) / c.plans.minutes_per_month > 0.9 ? 'linear-gradient(90deg,#d6362f,#f97316)' : (c.monthly_minutes_used || 0) / c.plans.minutes_per_month > 0.7 ? 'linear-gradient(90deg,#c68a1d,#fbbf24)' : 'linear-gradient(90deg,#6f5fd6,#8f86e8)'
                            }} />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {selectedClient && usageData && (
                <>
                  <button onClick={() => { setSelectedClient(null); setUsageData(null) }} style={{ marginBottom: '20px', padding: '8px 16px', background: '#fff', border: '1px solid #ece9f6', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#64748b', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    ← Back to all clients
                  </button>
                  <UsageCard data={usageData} />
                </>
              )}
            </>
          )}
          {!isAdmin && usageData && <UsageCard data={usageData} />}
          {!isAdmin && !usageData && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9691b3' }}>Loading usage data...</div>
          )}
        </main>
      </div>
    </>
  )
}
