import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)

const PERTH = 'Australia/Perth'
function perthDateShort(ts) { return new Date(ts).toLocaleDateString('en-AU', { timeZone: PERTH }) }
function isToday(ts) { return perthDateShort(ts) === perthDateShort(new Date()) }

export default function Analytics() {
  const [calls, setCalls] = useState([])
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('all')
  const [mobileNav, setMobileNav] = useState(false)
  const [time, setTime] = useState(new Date())

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
          .from('clients').select('id, business_name').eq('active', true)
        if (allClients) setClients(allClients)
        await fetchCalls(null)
      } else if (userClient && userClient.client_id) {
        await fetchCalls(userClient.client_id)
      }
    }
    init()
  }, [user])

  async function fetchCalls(clientId) {
    let query = supabase.from('calls').select('*').order('created_at', { ascending: false })
    if (clientId && clientId !== 'all') {
      query = query.eq('client_id', clientId)
    }
    const { data } = await query
    if (data) setCalls(data)
  }

  async function handleClientChange(clientId) {
    setSelectedClient(clientId)
    if (clientId === 'all') {
      await fetchCalls(null)
    } else {
      await fetchCalls(clientId)
    }
  }

  // --- Analytics calculations ---
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return d.toLocaleDateString('en-AU', { timeZone: PERTH })
  })

  const callsByDay = last30Days.map(day => ({
    day: day.split('/').slice(0, 2).join('/'),
    count: calls.filter(c => perthDateShort(c.created_at) === day).length
  }))

  const maxDayCount = Math.max(...callsByDay.map(d => d.count), 1)

  const outcomes = {
    'Completed': calls.filter(c => c.call_outcome && c.call_outcome.includes('ended')).length,
    'Voicemail': calls.filter(c => c.call_outcome && c.call_outcome.includes('voicemail')).length,
    'No Answer': calls.filter(c => c.call_outcome && c.call_outcome.includes('no-answer')).length,
    'Other': calls.filter(c => !c.call_outcome || (!c.call_outcome.includes('ended') && !c.call_outcome.includes('voicemail') && !c.call_outcome.includes('no-answer'))).length,
  }

  const outcomeColors = { 'Completed': '#10b981', 'Voicemail': '#f59e0b', 'No Answer': '#ef4444', 'Other': '#94a3b8' }
  const totalOutcomes = Object.values(outcomes).reduce((a, b) => a + b, 0)

  const hourBuckets = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: `${i.toString().padStart(2, '0')}:00`,
    count: calls.filter(c => {
      const h = new Date(c.created_at).toLocaleString('en-AU', { timeZone: PERTH, hour: 'numeric', hour12: false })
      return parseInt(h) === i
    }).length
  }))
  const maxHourCount = Math.max(...hourBuckets.map(h => h.count), 1)
  const peakHour = hourBuckets.reduce((a, b) => a.count > b.count ? a : b)

  const busyDay = callsByDay.reduce((a, b) => a.count > b.count ? a : b)
  const todayCount = calls.filter(c => isToday(c.created_at)).length
  const durations = calls.filter(c => c.call_duration).map(c => parseFloat(c.call_duration))
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0

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
        .topbar-right { display:flex; align-items:center; gap:10px; }
        .live-badge { display:flex; align-items:center; gap:7px; background:linear-gradient(135deg,#2563eb,#06b6d4); color:#fff; font-size:0.72rem; font-weight:700; padding:8px 15px; border-radius:20px; box-shadow:0 4px 14px rgba(37,99,235,0.3); white-space:nowrap; }
        .badge-blink { width:6px; height:6px; background:#fff; border-radius:50%; animation:bk 1.4s infinite; }
        @keyframes bk { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .client-selector-wrap { margin-bottom:20px; display:flex; align-items:center; gap:12px; background:#fff; border-radius:12px; padding:14px 20px; border:1px solid #e2e8f5; box-shadow:0 1px 4px rgba(8,17,43,0.05); }
        .client-selector-label { font-size:0.78rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; white-space:nowrap; }
        .client-selector { flex:1; padding:8px 14px; border-radius:8px; border:1.5px solid #e2e8f0; font-size:0.875rem; font-family:'Plus Jakarta Sans',sans-serif; color:#08112b; font-weight:600; background:#f8fafc; cursor:pointer; outline:none; }
        .client-selector:focus { border-color:#2563eb; }
        .insight-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
        .insight-card { background:#fff; border-radius:14px; padding:20px 18px; border:1px solid #e2e8f5; box-shadow:0 1px 4px rgba(8,17,43,0.05); position:relative; overflow:hidden; }
        .insight-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; border-radius:0 0 14px 14px; }
        .i1::after { background:linear-gradient(90deg,#2563eb,#06b6d4); }
        .i2::after { background:linear-gradient(90deg,#10b981,#34d399); }
        .i3::after { background:linear-gradient(90deg,#f59e0b,#fbbf24); }
        .i4::after { background:linear-gradient(90deg,#8b5cf6,#2563eb); }
        .insight-label { font-size:0.68rem; text-transform:uppercase; letter-spacing:1.2px; color:#94a3b8; font-weight:700; margin-bottom:6px; }
        .insight-value { font-size:1.6rem; font-weight:800; color:#08112b; line-height:1; letter-spacing:-0.5px; }
        .insight-sub { font-size:0.72rem; color:#94a3b8; margin-top:5px; }
        .charts-grid { display:grid; grid-template-columns:2fr 1fr; gap:20px; margin-bottom:20px; }
        .chart-card { background:#fff; border-radius:14px; border:1px solid #e2e8f5; box-shadow:0 1px 4px rgba(8,17,43,0.05); overflow:hidden; }
        .chart-hdr { padding:16px 20px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; }
        .chart-title { font-size:0.9rem; font-weight:700; color:#08112b; }
        .chart-sub { font-size:0.75rem; color:#94a3b8; }
        .chart-body { padding:20px; }
        .bar-chart { display:flex; align-items:flex-end; gap:3px; height:140px; }
        .bar-wrap { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; height:100%; justify-content:flex-end; }
        .bar { width:100%; border-radius:4px 4px 0 0; transition:height 0.3s ease; min-height:2px; background:linear-gradient(180deg,#2563eb,#06b6d4); opacity:0.85; }
        .bar:hover { opacity:1; }
        .bar-label { font-size:0.55rem; color:#94a3b8; white-space:nowrap; transform:rotate(-45deg); transform-origin:center; margin-top:4px; }
        .donut-wrap { display:flex; flex-direction:column; align-items:center; padding:10px 0; }
        .donut-legend { width:100%; margin-top:16px; }
        .legend-item { display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f8fafc; font-size:0.82rem; }
        .legend-item:last-child { border-bottom:none; }
        .legend-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; margin-right:8px; }
        .legend-name { flex:1; color:#475569; font-weight:500; display:flex; align-items:center; }
        .legend-val { font-weight:700; color:#08112b; }
        .hour-chart { display:flex; align-items:flex-end; gap:2px; height:100px; }
        .hour-bar-wrap { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; height:100%; justify-content:flex-end; }
        .hour-bar { width:100%; border-radius:3px 3px 0 0; background:linear-gradient(180deg,#8b5cf6,#2563eb); opacity:0.7; min-height:2px; }
        .hour-bar.peak { opacity:1; background:linear-gradient(180deg,#06b6d4,#2563eb); }
        .hour-label { font-size:0.5rem; color:#94a3b8; }
        .overlay { display:none; position:fixed; inset:0; background:rgba(8,17,43,0.5); z-index:150; backdrop-filter:blur(2px); }
        .overlay.show { display:block; }
        @media (max-width:900px) {
          .sidebar { transform:translateX(-100%); }
          .sidebar.mobile-open { transform:translateX(0); }
          .mobile-topbar { display:flex; }
          .main { margin-left:0; padding:80px 16px 24px; }
          .insight-grid { grid-template-columns:repeat(2,1fr); gap:12px; }
          .charts-grid { grid-template-columns:1fr; }
          .topbar { flex-direction:column; gap:10px; }
          .page-title { font-size:1.3rem; }
        }
        @media (max-width:480px) {
          .insight-grid { grid-template-columns:repeat(2,1fr); gap:10px; }
          .main { padding:76px 12px 20px; }
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
  <div className="nav-item active" onClick={() => window.location.href = '/'}><span className="nav-icon">📞</span>Call Dashboard</div>
  <div className="nav-item"><span className="nav-icon">👥</span>Clients</div>
  <div className="nav-item"><span className="nav-icon">🤖</span>Agents</div>
  <div className="nav-group-label">Insights</div>
  <div className="nav-item" onClick={() => window.location.href = '/analytics'}><span className="nav-icon">📊</span>Analytics</div>
  <div className="nav-item" onClick={() => window.location.href = '/usage'}><span className="nav-icon">💳</span>Usage & Billing</div>
  <div className="nav-item"><span className="nav-icon">📋</span>Transcripts</div>
  <div className="nav-group-label">System</div>
  <div className="nav-item"><span className="nav-icon">🔗</span>CRM Connect</div>
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
              <div className="page-title">Analytics</div>
              <div className="page-sub">Last 30 days · {new Date().toLocaleDateString('en-AU', { timeZone: PERTH, weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>
            </div>
            <div className="topbar-right">
              <div className="live-badge"><div className="badge-blink" />LIVE</div>
            </div>
          </div>

          {isAdmin && (
            <div className="client-selector-wrap">
              <div className="client-selector-label">📋 Viewing:</div>
              <select className="client-selector" value={selectedClient} onChange={e => handleClientChange(e.target.value)}>
                <option value="all">All Clients (Combined)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
              </select>
            </div>
          )}

          {/* INSIGHT CARDS */}
          <div className="insight-grid">
            <div className="insight-card i1">
              <div className="insight-label">Total Calls</div>
              <div className="insight-value">{calls.length}</div>
              <div className="insight-sub">All time</div>
            </div>
            <div className="insight-card i2">
              <div className="insight-label">Today</div>
              <div className="insight-value">{todayCount}</div>
              <div className="insight-sub">{new Date().toLocaleDateString('en-AU', { timeZone: PERTH })}</div>
            </div>
            <div className="insight-card i3">
              <div className="insight-label">Avg Duration</div>
              <div className="insight-value">{avgDuration}<span style={{fontSize:'1rem',fontWeight:500,color:'#94a3b8'}}>s</span></div>
              <div className="insight-sub">Per call</div>
            </div>
            <div className="insight-card i4">
              <div className="insight-label">Peak Hour</div>
              <div className="insight-value">{peakHour.label}</div>
              <div className="insight-sub">{peakHour.count} calls</div>
            </div>
          </div>

          {/* CHARTS ROW 1 */}
          <div className="charts-grid">
            {/* CALL VOLUME BAR CHART */}
            <div className="chart-card">
              <div className="chart-hdr">
                <div className="chart-title">📈 Call Volume — Last 30 Days</div>
                <div className="chart-sub">{calls.filter(c => {
                  const d = new Date(); d.setDate(d.getDate() - 30)
                  return new Date(c.created_at) > d
                }).length} calls</div>
              </div>
              <div className="chart-body">
                <div className="bar-chart">
                  {callsByDay.map((d, i) => (
                    <div key={i} className="bar-wrap">
                      <div
                        className="bar"
                        style={{ height: `${Math.max((d.count / maxDayCount) * 100, d.count > 0 ? 5 : 0)}%` }}
                        title={`${d.day}: ${d.count} calls`}
                      />
                      {i % 5 === 0 && <div className="bar-label">{d.day}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* OUTCOME DONUT */}
            <div className="chart-card">
              <div className="chart-hdr">
                <div className="chart-title">🎯 Call Outcomes</div>
                <div className="chart-sub">{totalOutcomes} total</div>
              </div>
              <div className="chart-body">
                <div className="donut-wrap">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    {(() => {
                      let offset = 0
                      const r = 45
                      const circ = 2 * Math.PI * r
                      return Object.entries(outcomes).map(([label, count]) => {
                        if (count === 0) return null
                        const pct = count / Math.max(totalOutcomes, 1)
                        const dash = pct * circ
                        const el = (
                          <circle
                            key={label}
                            cx="60" cy="60" r={r}
                            fill="none"
                            stroke={outcomeColors[label]}
                            strokeWidth="18"
                            strokeDasharray={`${dash} ${circ - dash}`}
                            strokeDashoffset={-offset * circ}
                            style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
                          />
                        )
                        offset += pct
                        return el
                      })
                    })()}
                    <text x="60" y="56" textAnchor="middle" fontSize="14" fontWeight="800" fill="#08112b">{calls.length}</text>
                    <text x="60" y="70" textAnchor="middle" fontSize="8" fill="#94a3b8">calls</text>
                  </svg>
                  <div className="donut-legend">
                    {Object.entries(outcomes).map(([label, count]) => (
                      <div key={label} className="legend-item">
                        <div className="legend-name">
                          <div className="legend-dot" style={{ background: outcomeColors[label] }} />
                          {label}
                        </div>
                        <div className="legend-val">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CALLS BY HOUR */}
          <div className="chart-card">
            <div className="chart-hdr">
              <div className="chart-title">🕐 Calls by Hour of Day (AWST)</div>
              <div className="chart-sub">Peak at {peakHour.label} with {peakHour.count} calls</div>
            </div>
            <div className="chart-body">
              <div className="hour-chart">
                {hourBuckets.map((h, i) => (
                  <div key={i} className="hour-bar-wrap">
                    <div
                      className={`hour-bar ${h.hour === peakHour.hour ? 'peak' : ''}`}
                      style={{ height: `${Math.max((h.count / maxHourCount) * 100, h.count > 0 ? 8 : 0)}%` }}
                      title={`${h.label}: ${h.count} calls`}
                    />
                    {i % 3 === 0 && <div className="hour-label">{h.label.replace(':00', '')}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>
    </>
  )
}
