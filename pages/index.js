import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)

const PERTH = 'Australia/Perth'
function perthDate(ts) { return new Date(ts).toLocaleString('en-AU', { timeZone: PERTH }) }
function perthDateShort(ts) { return new Date(ts).toLocaleDateString('en-AU', { timeZone: PERTH }) }
function isToday(ts) { return perthDateShort(ts) === perthDateShort(new Date()) }

export default function Dashboard() {
  const [calls, setCalls] = useState([])
  const [expanded, setExpanded] = useState({})
  const [stats, setStats] = useState({ total: 0, today: 0, avgDuration: 0, completed: 0 })
  const [time, setTime] = useState(new Date())
  const [mobileNav, setMobileNav] = useState(false)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('all')
  const [clientName, setClientName] = useState('All Clients')
  const [brandColor, setBrandColor] = useState('#2563eb')
  const [brandTagline, setBrandTagline] = useState('AI Command Centre')

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
        setIsAdmin(false)
        const { data: cd } = await supabase.from('clients')
          .select('business_name, brand_name, brand_color, brand_tagline')
          .eq('id', userClient.client_id).single()
        if (cd) {
          setClientName(cd.brand_name || cd.business_name)
          if (cd.brand_color) setBrandColor(cd.brand_color)
          if (cd.brand_tagline) setBrandTagline(cd.brand_tagline)
        }
        await fetchCalls(userClient.client_id)
      }
    }
    init()
  }, [user])

  async function fetchCalls(clientId) {
    let query = supabase.from('calls').select('*').order('created_at', { ascending: false })
    if (clientId) query = query.eq('client_id', clientId)

    const { data } = await query
    if (data) {
      setCalls(data)
      const todayCalls = data.filter(c => isToday(c.created_at))
      const durations = data.filter(c => c.call_duration).map(c => parseFloat(c.call_duration))
      const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
      const completed = data.filter(c => c.call_outcome && c.call_outcome.includes('ended')).length
      setStats({ total: data.length, today: todayCalls.length, avgDuration: avg, completed })
    }
  }

  async function handleClientChange(clientId) {
    setSelectedClient(clientId)
    setExpanded({})
    if (clientId === 'all') {
      setClientName('All Clients')
      await fetchCalls(null)
    } else {
      const client = clients.find(c => c.id === clientId)
      if (client) setClientName(client.business_name)
      await fetchCalls(clientId)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function togglePanel(callId, panel) {
    setExpanded(prev => {
      const current = prev[callId]
      if (current === panel) return { ...prev, [callId]: null }
      return { ...prev, [callId]: panel }
    })
  }

  const outcomeColor = (o) => {
    if (!o) return '#64748b'
    if (o.includes('ended')) return '#10b981'
    if (o.includes('voicemail')) return '#f59e0b'
    if (o.includes('no-answer')) return '#ef4444'
    return '#2563eb'
  }

  const outcomeLabel = (o) => {
    if (!o) return 'Unknown'
    if (o === 'customer-ended-call') return 'Completed'
    if (o === 'assistant-ended-call') return 'Completed'
    if (o === 'voicemail') return 'Voicemail'
    if (o === 'no-answer') return 'No Answer'
    return o
  }

  const statCards = [
    { label: 'Total Calls', value: stats.total, unit: '', sub: 'All time', icon: '📞', c: 'c1' },
    { label: 'Today', value: stats.today, unit: '', sub: perthDateShort(new Date()), icon: '📅', c: 'c2' },
    { label: 'Avg Duration', value: stats.avgDuration, unit: 's', sub: 'Per call', icon: '⏱', c: 'c3' },
    { label: 'Completed', value: stats.completed, unit: '', sub: 'Calls handled', icon: '✅', c: 'c4' },
  ]

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
        .live-dot { width:7px; height:7px; border-radius:50%; background:#10b981; flex-shrink:0; box-shadow:0 0 0 0 rgba(16,185,129,0.5); animation:lp 2s infinite; }
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
        .page-title { font-size:1.6rem; font-weight:800; color:#08112b; letter-spacing:-0.6px; line-height:1.2; }
        .page-sub { font-size:0.82rem; color:#94a3b8; margin-top:3px; }
        .topbar-right { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .user-chip { font-size:0.75rem; color:#64748b; background:#fff; padding:7px 12px; border-radius:20px; border:1px solid #e2e8f0; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .live-badge { display:flex; align-items:center; gap:7px; flex-shrink:0; background:linear-gradient(135deg,#2563eb,#06b6d4); color:#fff; font-size:0.72rem; font-weight:700; padding:8px 15px; border-radius:20px; letter-spacing:0.5px; box-shadow:0 4px 14px rgba(37,99,235,0.3); white-space:nowrap; }
        .badge-blink { width:6px; height:6px; background:#fff; border-radius:50%; animation:bk 1.4s infinite; }
        @keyframes bk { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .client-selector-wrap { margin-bottom:20px; display:flex; align-items:center; gap:12px; background:#fff; border-radius:12px; padding:14px 20px; border:1px solid #e2e8f5; box-shadow:0 1px 4px rgba(8,17,43,0.05); }
        .client-selector-label { font-size:0.78rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; white-space:nowrap; }
        .client-selector { flex:1; padding:8px 14px; border-radius:8px; border:1.5px solid #e2e8f0; font-size:0.875rem; font-family:'Plus Jakarta Sans',sans-serif; color:#08112b; font-weight:600; background:#f8fafc; cursor:pointer; outline:none; transition:border-color 0.2s; }
        .client-selector:focus { border-color:#2563eb; }
        .client-badge { display:inline-flex; align-items:center; gap:6px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; border-radius:20px; font-size:0.72rem; font-weight:700; padding:4px 12px; }
        .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
        .stat-card { background:#fff; border-radius:14px; padding:20px 18px; border:1px solid #e2e8f5; box-shadow:0 1px 4px rgba(8,17,43,0.05); position:relative; overflow:hidden; transition:transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform:translateY(-2px); box-shadow:0 6px 18px rgba(8,17,43,0.09); }
        .stat-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; border-radius:0 0 14px 14px; }
        .c1::after { background:linear-gradient(90deg,#2563eb,#06b6d4); }
        .c2::after { background:linear-gradient(90deg,#10b981,#34d399); }
        .c3::after { background:linear-gradient(90deg,#f59e0b,#fbbf24); }
        .c4::after { background:linear-gradient(90deg,#8b5cf6,#2563eb); }
        .stat-icon { width:38px; height:38px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:1rem; margin-bottom:12px; }
        .c1 .stat-icon { background:#eff6ff; }
        .c2 .stat-icon { background:#f0fdf4; }
        .c3 .stat-icon { background:#fffbeb; }
        .c4 .stat-icon { background:#f5f3ff; }
        .stat-label { font-size:0.68rem; text-transform:uppercase; letter-spacing:1.2px; color:#94a3b8; font-weight:700; margin-bottom:6px; }
        .stat-value { font-size:1.9rem; font-weight:800; color:#08112b; line-height:1; letter-spacing:-0.5px; }
        .stat-unit { font-size:0.95rem; font-weight:500; color:#94a3b8; }
        .stat-sub { font-size:0.72rem; color:#94a3b8; margin-top:5px; }
        .table-card { background:#fff; border-radius:14px; border:1px solid #e2e8f5; box-shadow:0 1px 4px rgba(8,17,43,0.05); overflow:hidden; }
        .table-hdr { padding:18px 22px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg,#fafbff,#f8fafc); }
        .table-hdr-title { font-size:0.95rem; font-weight:700; color:#08112b; display:flex; align-items:center; gap:7px; }
        .table-count { font-size:0.75rem; color:#94a3b8; background:#f1f5f9; padding:3px 11px; border-radius:20px; border:1px solid #e2e8f0; font-weight:600; }
        .desktop-table { width:100%; border-collapse:collapse; }
        .desktop-table thead tr { background:#fafbff; }
        .desktop-table th { padding:10px 18px; text-align:left; font-size:0.67rem; text-transform:uppercase; letter-spacing:1.2px; color:#94a3b8; font-weight:700; border-bottom:1px solid #f1f5f9; white-space:nowrap; }
        .desktop-table td { padding:14px 18px; font-size:0.845rem; color:#334155; border-bottom:1px solid #f8fafc; vertical-align:middle; }
        .desktop-table td.date-col { white-space:nowrap; color:#64748b; font-size:0.8rem; width:160px; }
        .desktop-table td.caller-col { white-space:nowrap; width:150px; }
        .desktop-table td.outcome-col { white-space:nowrap; width:130px; }
        .desktop-table td.client-col { white-space:nowrap; width:140px; font-size:0.78rem; color:#64748b; }
        .desktop-table td.actions-col { width:120px; white-space:nowrap; }
        .desktop-table tbody tr:last-child td { border-bottom:none; }
        .action-btn { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:8px; border:1px solid #e2e8f0; background:#f8fafc; cursor:pointer; font-size:0.9rem; transition:all 0.15s; margin-right:4px; }
        .action-btn:hover { border-color:#2563eb; background:#eff6ff; }
        .action-btn.active { border-color:#2563eb; background:#eff6ff; }
        .expand-row td { padding:0 !important; border-bottom:1px solid #e8edf8 !important; }
        .expand-inner { padding:20px 24px; background:#f8fbff; }
        .expand-section { margin-bottom:16px; }
        .expand-section:last-child { margin-bottom:0; }
        .expand-label { font-size:0.66rem; text-transform:uppercase; letter-spacing:1px; color:#2563eb; font-weight:700; margin-bottom:8px; }
        .transcript-line { margin-bottom:8px; padding:8px 12px; border-radius:8px; font-size:0.84rem; color:#334155; line-height:1.6; }
        .transcript-line.ai { background:#eff6ff; border-left:3px solid #2563eb; }
        .transcript-line.user { background:#f0fdf4; border-left:3px solid #10b981; }
        .transcript-speaker { font-size:0.66rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:3px; }
        .transcript-line.ai .transcript-speaker { color:#2563eb; }
        .transcript-line.user .transcript-speaker { color:#10b981; }
        .transcript-scroll { max-height:280px; overflow-y:auto; border-radius:8px; }
        .caller-num { font-weight:700; color:#08112b; font-family:'JetBrains Mono',monospace; font-size:0.82rem; }
        .outcome-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; font-size:0.72rem; font-weight:700; white-space:nowrap; }
        .mobile-cards { display:none; }
        .call-card { border-bottom:1px solid #f1f5f9; padding:16px 20px; }
        .call-card:last-child { border-bottom:none; }
        .call-card-top { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:10px; }
        .call-card-num { font-weight:700; color:#08112b; font-size:0.9rem; }
        .call-card-date { font-size:0.72rem; color:#94a3b8; margin-top:2px; }
        .call-card-client { font-size:0.7rem; color:#2563eb; font-weight:600; margin-top:2px; }
        .call-card-actions { display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; }
        .call-card-action-btn { display:inline-flex; align-items:center; gap:5px; padding:6px 10px; border-radius:8px; border:1px solid #e2e8f0; background:#f8fafc; cursor:pointer; font-size:0.75rem; font-weight:600; color:#475569; transition:all 0.15s; }
        .call-card-action-btn:hover { border-color:#2563eb; background:#eff6ff; color:#2563eb; }
        .call-card-action-btn.active { border-color:#2563eb; background:#eff6ff; color:#2563eb; }
        .call-card-expand { margin-top:12px; background:#f8fbff; border-radius:10px; padding:14px; border:1px solid #e8edf8; }
        .empty-state { text-align:center; padding:60px 20px; }
        .empty-icon { width:56px; height:56px; border-radius:14px; background:linear-gradient(135deg,#eff6ff,#e0f2fe); display:flex; align-items:center; justify-content:center; font-size:1.6rem; margin:0 auto 14px; }
        .empty-title { font-size:1.05rem; font-weight:800; color:#08112b; margin-bottom:5px; }
        .empty-sub { font-size:0.84rem; color:#94a3b8; }
        @media (max-width:900px) {
          .sidebar { transform:translateX(-100%); }
          .sidebar.mobile-open { transform:translateX(0); }
          .mobile-topbar { display:flex; }
          .main { margin-left:0; padding:80px 16px 24px; }
          .stats-grid { grid-template-columns:repeat(2,1fr); gap:12px; }
          .stat-card { padding:16px 14px; }
          .stat-value { font-size:1.6rem; }
          .topbar { flex-direction:column; gap:10px; margin-bottom:20px; }
          .page-title { font-size:1.3rem; }
          .desktop-table { display:none; }
          .mobile-cards { display:block; }
          .table-hdr { padding:14px 16px; }
          .user-chip { display:none; }
          .client-selector-wrap { flex-direction:column; align-items:flex-start; gap:8px; }
        }
        @media (max-width:480px) {
          .stats-grid { grid-template-columns:repeat(2,1fr); gap:10px; }
          .stat-value { font-size:1.45rem; }
          .main { padding:76px 12px 20px; }
        }
        .overlay { display:none; position:fixed; inset:0; background:rgba(8,17,43,0.5); z-index:150; backdrop-filter:blur(2px); }
        .overlay.show { display:block; }
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
              <div className="logo-atom" style={{background: `linear-gradient(135deg, ${brandColor}, #06b6d4)`}}>⚛</div>
  <div className="logo-text" style={{color:'#fff'}}>{isAdmin ? 'KarnaConnect' : clientName}</div>
</div>
<div className="logo-sub">{isAdmin ? 'Enterprise Admin' : brandTagline}</div>
          </div>
          <div className="live-pill">
            <div className="live-dot" />
            <div className="page-title">{isAdmin ? 'Call Dashboard' : `${clientName} — Calls`}</div>
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
  <div className="nav-item"><span className="nav-icon">📋</span>Transcripts</div>
  <div className="nav-group-label">System</div>
  <div className="nav-item"><span className="nav-icon">🔗</span>CRM Connect</div>
  <div className="nav-item"><span className="nav-icon">⚙️</span>Settings</div>
</nav>
          <div className="sidebar-foot">
            <div>South Lake WA 6164</div>
            <div style={{color:'#152550', marginTop:'2px'}}>© 2026 KarnaConnect</div>
            <button className="logout-btn" onClick={handleLogout}>🚪 Sign Out</button>
          </div>
        </div>

        <main className="main">
          <div className="topbar">
            <div>
              <div className="page-title">{isAdmin ? 'Call Dashboard' : `${clientName} — Calls`}</div>
              <div className="page-sub">
                {new Date().toLocaleDateString('en-AU', { timeZone: PERTH, weekday:'long', year:'numeric', month:'long', day:'numeric' })}
              </div>
            </div>
            <div className="topbar-right">
              {isAdmin && <div className="client-badge">⚡ Enterprise Admin</div>}
              {user && <div className="user-chip">👤 {user.email}</div>}
              <div className="live-badge"><div className="badge-blink" />LIVE MONITORING</div>
            </div>
          </div>

          {/* ADMIN CLIENT SELECTOR */}
          {isAdmin && (
            <div className="client-selector-wrap">
              <div className="client-selector-label">📋 Viewing:</div>
              <select
                className="client-selector"
                value={selectedClient}
                onChange={e => handleClientChange(e.target.value)}
              >
                <option value="all">All Clients (Combined)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.business_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="stats-grid">
            {statCards.map(s => (
              <div key={s.label} className={`stat-card ${s.c}`}>
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}<span className="stat-unit">{s.unit}</span></div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="table-card">
            <div className="table-hdr">
              <div className="table-hdr-title">⚛ {clientName} — Calls</div>
              <div className="table-count">{calls.length} records</div>
            </div>

            {calls.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <div className="empty-title">No calls yet</div>
                <div className="empty-sub">Once Mash handles calls, they'll appear here.</div>
              </div>
            ) : (
              <>
                <table className="desktop-table">
                  <thead>
                    <tr>
                      <th>Date & Time (AWST)</th>
                      <th>Caller</th>
                      {isAdmin && selectedClient === 'all' && <th>Client</th>}
                      <th>Outcome</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map(call => {
                      const callClientName = isAdmin && selectedClient === 'all'
                        ? (clients.find(c => c.id === call.client_id)?.business_name || 'KarnaConnect')
                        : null
                      return (
                        <>
                          <tr key={call.id}>
                            <td className="date-col">{perthDate(call.created_at)}</td>
                            <td className="caller-col"><span className="caller-num">{call.caller_number || 'Unknown'}</span></td>
                            {isAdmin && selectedClient === 'all' && (
                              <td className="client-col">{callClientName}</td>
                            )}
                            <td className="outcome-col">
                              <span className="outcome-badge" style={{
                                background: outcomeColor(call.call_outcome) + '15',
                                color: outcomeColor(call.call_outcome),
                                border: `1px solid ${outcomeColor(call.call_outcome)}30`
                              }}>● {outcomeLabel(call.call_outcome)}</span>
                            </td>
                            <td className="actions-col">
                              {call.recording_url && (
                                <span className={`action-btn ${expanded[call.id] === 'recording' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'recording')} title="Play Recording">🎙</span>
                              )}
                              {call.call_summary && (
                                <span className={`action-btn ${expanded[call.id] === 'summary' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'summary')} title="View Summary">📄</span>
                              )}
                              {call.full_transcript && (
                                <span className={`action-btn ${expanded[call.id] === 'transcript' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'transcript')} title="View Transcript">📋</span>
                              )}
                            </td>
                          </tr>
                          {expanded[call.id] && (
                            <tr key={call.id + '-exp'} className="expand-row">
                              <td colSpan={isAdmin && selectedClient === 'all' ? 5 : 4}>
                                <div className="expand-inner">
                                  {expanded[call.id] === 'recording' && call.recording_url && (
                                    <div className="expand-section">
                                      <div className="expand-label">🎙 Call Recording</div>
                                      <audio controls style={{ width:'100%', borderRadius:'8px', height:'36px', accentColor:'#2563eb' }}>
                                        <source src={call.recording_url} type="audio/wav" />
                                      </audio>
                                    </div>
                                  )}
                                  {expanded[call.id] === 'summary' && call.call_summary && (
                                    <div className="expand-section">
                                      <div className="expand-label">⚛ AI Summary — Mash</div>
                                      <p style={{ fontSize:'0.875rem', color:'#475569', lineHeight:'1.75' }}>{call.call_summary}</p>
                                    </div>
                                  )}
                                  {expanded[call.id] === 'transcript' && call.full_transcript && (
                                    <div className="expand-section">
                                      <div className="expand-label">📋 Full Transcript</div>
                                      <div className="transcript-scroll">
                                        {call.full_transcript.split('\n').map((line, i) => {
                                          const isAI = line.startsWith('AI:')
                                          const isUser = line.startsWith('User:')
                                          return line.trim() ? (
                                            <div key={i} className={`transcript-line ${isAI ? 'ai' : isUser ? 'user' : ''}`}>
                                              {(isAI || isUser) && (
                                                <span className="transcript-speaker">{isAI ? '⚛ Mash' : '👤 Caller'}</span>
                                              )}
                                              {line.replace('AI: ', '').replace('User: ', '')}
                                            </div>
                                          ) : null
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>

                <div className="mobile-cards">
                  {calls.map(call => {
                    const callClientName = isAdmin && selectedClient === 'all'
                      ? (clients.find(c => c.id === call.client_id)?.business_name || 'KarnaConnect')
                      : null
                    return (
                      <div key={call.id} className="call-card">
                        <div className="call-card-top">
                          <div>
                            <div className="call-card-num">{call.caller_number || 'Unknown'}</div>
                            <div className="call-card-date">{perthDate(call.created_at)}</div>
                            {callClientName && <div className="call-card-client">📋 {callClientName}</div>}
                          </div>
                          <span className="outcome-badge" style={{
                            background: outcomeColor(call.call_outcome) + '15',
                            color: outcomeColor(call.call_outcome),
                            border: `1px solid ${outcomeColor(call.call_outcome)}30`
                          }}>● {outcomeLabel(call.call_outcome)}</span>
                        </div>
                        <div className="call-card-actions">
                          {call.recording_url && (
                            <span className={`call-card-action-btn ${expanded[call.id] === 'recording' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'recording')}>🎙 Recording</span>
                          )}
                          {call.call_summary && (
                            <span className={`call-card-action-btn ${expanded[call.id] === 'summary' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'summary')}>📄 Summary</span>
                          )}
                          {call.full_transcript && (
                            <span className={`call-card-action-btn ${expanded[call.id] === 'transcript' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'transcript')}>📋 Transcript</span>
                          )}
                        </div>
                        {expanded[call.id] && (
                          <div className="call-card-expand">
                            {expanded[call.id] === 'recording' && call.recording_url && (
                              <>
                                <div className="expand-label">🎙 Call Recording</div>
                                <audio controls style={{ width:'100%', borderRadius:'6px', height:'32px' }}>
                                  <source src={call.recording_url} type="audio/wav" />
                                </audio>
                              </>
                            )}
                            {expanded[call.id] === 'summary' && call.call_summary && (
                              <>
                                <div className="expand-label">⚛ AI Summary</div>
                                <p style={{ fontSize:'0.84rem', color:'#475569', lineHeight:'1.7' }}>{call.call_summary}</p>
                              </>
                            )}
                            {expanded[call.id] === 'transcript' && call.full_transcript && (
                              <>
                                <div className="expand-label">📋 Full Transcript</div>
                                <div style={{ maxHeight:'200px', overflowY:'auto', marginTop:'6px' }}>
                                  {call.full_transcript.split('\n').map((line, i) => (
                                    line.trim() ? (
                                      <div key={i} className={`transcript-line ${line.startsWith('AI:') ? 'ai' : 'user'}`}>
                                        <span className="transcript-speaker">{line.startsWith('AI:') ? '⚛ Mash' : '👤 Caller'}</span>
                                        {line.replace('AI: ', '').replace('User: ', '')}
                                      </div>
                                    ) : null
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
