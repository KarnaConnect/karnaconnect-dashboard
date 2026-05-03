import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

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
  const [time, setTime] = useState(new Date())
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

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
          .from('clients')
          .select('id, business_name, monthly_minutes_used, billing_start_date, plan_id, plans(name, minutes_per_month, price_per_month, overage_per_minute, response_time_hours)')
          .eq('active', true)
        if (allClients) setClients(allClients)
      } else if (userClient && userClient.client_id) {
        await fetchClientUsage(userClient.client_id)
      }
    }
    init()
  }, [user])

  async function fetchClientUsage(clientId) {
    const { data } = await supabase
      .from('clients')
      .select('id, business_name, monthly_minutes_used, billing_start_date, plans(name, minutes_per_month, price_per_month, overage_per_minute, response_time_hours)')
      .eq('id', clientId).single()
    if (data) setUsageData(data)
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
    const billingDate = data.billing_start_date
      ? new Date(data.billing_start_date).toLocaleDateString('en-AU', { timeZone: PERTH })
      : 'N/A'

    const barColor = pct > 90
      ? 'linear-gradient(90deg, #ef4444, #f97316)'
      : pct > 70
      ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
      : 'linear-gradient(90deg, #2563eb, #06b6d4)'

    const statusColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981'
    const statusLabel = pct > 90 ? '⚠ Near Limit' : pct > 70 ? '↑ High Usage' : '✓ On Track'

    return (
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f5', boxShadow: '0 1px 4px rgba(8,17,43,0.05)', overflow: 'hidden', marginBottom: '20px' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #08112b, #0d1a3a)', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#3d5a8a', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginBottom: '6px' }}>Current Plan</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>{data.plans?.name || 'Basic'}</div>
            <div style={{ fontSize: '0.85rem', color: '#3d5a8a', marginTop: '4px' }}>{data.business_name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#06b6d4' }}>${data.plans?.price_per_month || 0}</div>
            <div style={{ fontSize: '0.75rem', color: '#3d5a8a' }}>per month</div>
            <div style={{ marginTop: '8px', display: 'inline-block', background: statusColor + '20', border: `1px solid ${statusColor}40`, borderRadius: '20px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: '700', color: statusColor }}>
              {statusLabel}
            </div>
          </div>
        </div>

        {/* Usage meter */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Minutes Used This Month</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#08112b' }}>{used} / {total} min</div>
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '999px', width: `${pct}%`, background: barColor, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{pct.toFixed(1)}% used</div>
            <div style={{ fontSize: '0.75rem', color: remaining > 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
              {remaining > 0 ? `${remaining} min remaining` : `${overageMinutes} min over limit`}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0' }}>
          {[
            { label: 'Minutes Included', value: `${total} min`, icon: '⏱' },
            { label: 'Response Time', value: `${data.plans?.response_time_hours || 24}hr`, icon: '💬' },
            { label: 'Billing Start', value: billingDate, icon: '📅' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '20px', borderRight: i < 2 ? '1px solid #f1f5f9' : 'none', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#08112b' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Overage warning */}
        {overageMinutes > 0 && (
          <div style={{ margin: '0 28px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#dc2626', marginBottom: '4px' }}>⚠ Overage Alert</div>
            <div style={{ fontSize: '0.82rem', color: '#7f1d1d' }}>
              {overageMinutes} minutes over plan limit. Estimated overage charge: <strong>${overageCost.toFixed(2)}</strong> at ${data.plans?.overage_per_minute}/min.
            </div>
          </div>
        )}

        {/* Plan features */}
        <div style={{ padding: '0 28px 24px' }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', marginBottom: '12px' }}>Plan Includes</div>
          {[
            `Up to ${total} minutes of AI call handling per month`,
            `${data.plans?.response_time_hours || 24} hour support response time`,
            `$${data.plans?.overage_per_minute || 1.50}/min overage rate`,
            'AI call summaries and full transcripts',
            'Call recording playback',
            'Live dashboard access',
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: i < 5 ? '1px solid #f8fafc' : 'none', fontSize: '0.84rem', color: '#475569' }}>
              <span style={{ color: '#10b981', fontWeight: '700', flexShrink: 0 }}>✓</span> {f}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eef2f9', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.9rem', color: '#94a3b8' }}>
      Loading...
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; }
        body { font-family:'Plus Jakarta Sans',sans-serif; background:#eef2f9; -webkit-font-smoothing:antialiased; }
        .layout { display:flex; min-height:100vh; }
        .sidebar { width:240px; flex-shrink:0; background:linear-gradient(180deg,#08112b 0%,#0d1a3a 100%); display:flex; flex-direction:column; position:fixed; top:0; left:0; height:100vh; z-index:200; border-right:1px solid rgba(37,99,235,0.12); transition:transform 0.3s ease; }
        .sidebar-top { padding:24px 20px 18px; border-bottom:1px solid rgba(255,255,255,0.05); }
        .logo-row { display:flex; align-items:center; gap:9px; }
        .logo-atom { width:34px; height:34px; border-radius:9px; flex-shrink:0; background:linear-gradient(135deg,#2563eb,#06b6d4); display:flex; align-items:center; justify-content:center; font-size:1rem; box-shadow:0 4px 12px rgba(37,99,235,0.35); }
        .logo-text { font-size:1.15rem; font-weight:800; color:#fff; letter-spacing:-0.3px; white-space:nowrap; }
        .logo-text span { color:#06b6d4; }
        .logo-sub { font-size:0.62rem; color:#2a3f6b; text-transform:uppercase; letter-spacing:2px; margin-top:5px; padding-left:43px; }
        .live-pill { margin:14px 20px 0; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.18); border-radius:8px; padding:7px 11px; display:flex; align-items:center; gap:8px; }
        .live-dot { width:7px; height:7px; border-radius:50%; background:#10b981; flex-shrink:0; animation:lp 2s infinite; box-shadow:0 0 0 0 rgba(16,185,129,0.5); }
        @keyframes lp { 0%{box-shadow:0 0 0 0 rgba(16,185,129,0.5)} 70%{box-shadow:0 0 0 7px rgba(16,185,129,0)} 100%{box-shadow:0 0 0 0 rgba(16,185,129,0)} }
        .live-label { font-size:0.72rem; color:#10b981; font-weight:700; flex:1; white-space:nowrap; }
        .live-clock { font-family:'JetBrains Mono',monospace; font-size:0.68rem; color:#2a4070; font-variant-numeric:tabular-nums; white-space:nowrap; }
        .nav-wrap { padding:16px 10px; flex:1; overflow-y:auto; }
        .nav-group-label { font-size:0.6rem; text-transform:uppercase; letter-spacing:2px; color:#1e3060; font-weight:700; padding:0 10px; margin:12px 0 6px; }
        .nav-item { display:flex; align-items:center; gap:9px; padding:9px 12px; border-radius:9px; margin-bottom:2px; color:#3d5a8a; font-size:0.83rem; font-weight:500; cursor:pointer; transition:all 0.18s; position:relative; white-space:nowrap; overflow:hidden; }
        .nav-item.active { background:linear-gradient(135deg,rgba(37,99,235,0.18),rgba(6,182,212,0.08)); color:#e8f0ff; border:1px solid rgba(37,99,235,0.25); }
        .nav-item.active::before { content:''; position:absolute; left:0; top:20%; bottom:20%; width:3px; background:linear-gradient(180deg,#2563eb,#06b6d4); border-radius:0 3px 3px 0; }
        .nav-item:hover:not(.active) { background:rgba(255,255,255,0.04); color:#7a9cc8; }
        .nav-icon { font-size:0.95rem; width:17px; text-align:center; flex-shrink:0; }
        .sidebar-foot { padding:14px 20px; border-top:1px solid rgba(255,255,255,0.04); font-size:0.68rem; color:#1e3060; line-height:1.8; }
        .logout-btn { width:100%; margin-top:8px; padding:8px 12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); border-radius:8px; color:#3d5a8a; font-size:0.78rem; font-weight:600; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.2s; text-align:left; display:flex; align-items:center; gap:8px; }
        .logout-btn:hover { background:rgba(239,68,68,0.1); color:#ef4444; border-color:rgba(239,68,68,0.2); }
        .mobile-topbar { display:none; position:fixed; top:0; left:0; right:0; z-index:100; background:#08112b; padding:14px 20px; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(37,99,235,0.15); }
        .hamburger { background:none; border:none; color:#94a3b8; font-size:1.3rem; cursor:pointer; padding:4px; }
        .mobile-logo { font-size:1.05rem; font-weight:800; color:#fff; }
        .mobile-logo span { color:#06b6d4; }
        .main { margin-left:240px; flex:1; padding:36px 32px; min-height:100vh; }
        .topbar { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; gap:12px; }
        .page-title { font-size:1.6rem; font-weight:800; color:#08112b; letter-spacing:-0.6px; }
        .page-sub { font-size:0.82rem; color:#94a3b8; margin-top:3px; }
        .client-selector-wrap { margin-bottom:20px; display:flex; align-items:center; gap:12px; background:#fff; border-radius:12px; padding:14px 20px; border:1px solid #e2e8f5; box-shadow:0 1px 4px rgba(8,17,43,0.05); }
        .client-selector-label { font-size:0.78rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; white-space:nowrap; }
        .client-selector { flex:1; padding:8px 14px; border-radius:8px; border:1.5px solid #e2e8f0; font-size:0.875rem; font-family:'Plus Jakarta Sans',sans-serif; color:#08112b; font-weight:600; background:#f8fafc; cursor:pointer; outline:none; }
        .client-selector:focus { border-color:#2563eb; }
        .admin-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:20px; }
        .overlay { display:none; position:fixed; inset:0; background:rgba(8,17,43,0.5); z-index:150; backdrop-filter:blur(2px); }
        .overlay.show { display:block; }
        @media (max-width:900px) {
          .sidebar { transform:translateX(-100%); }
          .sidebar.mobile-open { transform:translateX(0); }
          .mobile-topbar { display:flex; }
          .main { margin-left:0; padding:80px 16px 24px; }
          .topbar { flex-direction:column; gap:10px; }
          .page-title { font-size:1.3rem; }
          .admin-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className={`overlay ${mobileNav ? 'show' : ''}`} onClick={() => setMobileNav(false)} />

      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setMobileNav(!mobileNav)}>☰</button>
        <div className="mobile-logo">Karna<span>Connect</span></div>
        <div style={{width:'32px'}} />
      </div>

      <div className="layout">
        <div className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
          <div className="sidebar-top">
            <div className="logo-row">
              <div className="logo-atom">⚛</div>
              <div className="logo-text">Karna<span>Connect</span></div>
            </div>
            <div className="logo-sub">{isAdmin ? 'Enterprise Admin' : 'AI Command Centre'}</div>
          </div>
          <div className="live-pill">
            <div className="live-dot" />
            <div className="live-label">Mash is live</div>
            <div className="live-clock">
              {time.toLocaleTimeString('en-AU', { timeZone: PERTH, hour:'2-digit', minute:'2-digit', second:'2-digit' })}
            </div>
          </div>
          <nav className="nav-wrap">
            <div className="nav-group-label">Main</div>
            <div className="nav-item" onClick={() => window.location.href = '/'}><span className="nav-icon">📞</span>Call Dashboard</div>
            <div className="nav-item"><span className="nav-icon">👥</span>Clients</div>
            <div className="nav-item"><span className="nav-icon">🤖</span>Agents</div>
            <div className="nav-group-label">Insights</div>
            <div className="nav-item" onClick={() => window.location.href = '/analytics'}><span className="nav-icon">📊</span>Analytics</div>
            <div className="nav-item"><span className="nav-icon">📋</span>Transcripts</div>
            <div className="nav-group-label">System</div>
            <div className="nav-item"><span className="nav-icon">🔗</span>CRM Connect</div>
            <div className="nav-item active"><span className="nav-icon">💳</span>Usage & Billing</div>
            <div className="nav-item"><span className="nav-icon">⚙️</span>Settings</div>
          </nav>
          <div className="sidebar-foot">
            <div>South Lake WA 6164</div>
            <div style={{color:'#152550', marginTop:'2px'}}>© 2026 KarnaConnect</div>
            <button className="logout-btn" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}>🚪 Sign Out</button>
          </div>
        </div>

        <main className="main">
          <div className="topbar">
            <div>
              <div className="page-title">Usage & Billing</div>
              <div className="page-sub">Current billing period · {new Date().toLocaleDateString('en-AU', { timeZone: PERTH, month: 'long', year: 'numeric' })}</div>
            </div>
          </div>

          {/* ADMIN VIEW — all clients */}
          {isAdmin && (
            <>
              <div className="client-selector-wrap">
                <div className="client-selector-label">📋 Select Client:</div>
                <select className="client-selector" value={selectedClient || ''} onChange={e => handleClientSelect(e.target.value || null)}>
                  <option value="">— Pick a client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                </select>
              </div>

              {!selectedClient && (
                <div className="admin-grid">
                  {clients.map(c => (
                    <div key={c.id} style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f5', padding: '20px', boxShadow: '0 1px 4px rgba(8,17,43,0.05)', cursor: 'pointer' }} onClick={() => handleClientSelect(c.id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#08112b' }}>{c.business_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{c.plans?.name || 'No plan'} — ${c.plans?.price_per_month || 0}/mo</div>
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '3px 8px' }}>
                          View →
                        </div>
                      </div>
                      {c.plans && (
                        <>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{Math.round(c.monthly_minutes_used || 0)} / {c.plans.minutes_per_month} min</span>
                            <span>{((c.monthly_minutes_used || 0) / c.plans.minutes_per_month * 100).toFixed(0)}%</span>
                          </div>
                          <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: '999px',
                              width: `${Math.min((c.monthly_minutes_used || 0) / c.plans.minutes_per_month * 100, 100)}%`,
                              background: (c.monthly_minutes_used || 0) / c.plans.minutes_per_month > 0.9
                                ? 'linear-gradient(90deg, #ef4444, #f97316)'
                                : (c.monthly_minutes_used || 0) / c.plans.minutes_per_month > 0.7
                                ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                : 'linear-gradient(90deg, #2563eb, #06b6d4)'
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
                  <button onClick={() => { setSelectedClient(null); setUsageData(null) }} style={{ marginBottom: '20px', padding: '8px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#64748b', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    ← Back to all clients
                  </button>
                  <UsageCard data={usageData} />
                </>
              )}
            </>
          )}

          {/* CLIENT VIEW */}
          {!isAdmin && usageData && <UsageCard data={usageData} />}
          {!isAdmin && !usageData && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>Loading usage data...</div>
          )}
        </main>
      </div>
    </>
  )
}
