import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '../components/Sidebar'

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
  const [stats, setStats] = useState({ total: 0, today: 0, avgDuration: 0, completed: 0, totalDuration: 0, hoursActive: 0 })
  const [mobileNav, setMobileNav] = useState(false)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('all')
  const [clientName, setClientName] = useState('All Clients')
  const [clientStartDate, setClientStartDate] = useState(null)

  useEffect(() => {
    const hash = window.location.hash
    if (hash && (hash.includes('type=invite') || hash.includes('type=recovery'))) {
      window.location.href = '/reset-password' + hash
      return
    }
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
        const { data: cd } = await supabase.from('clients').select('business_name, created_at, billing_start_date')
          .eq('id', userClient.client_id).single()
        if (cd) {
          setClientName(cd.business_name)
          setClientStartDate(cd.billing_start_date || cd.created_at)
        }
        await fetchCalls(userClient.client_id, cd?.billing_start_date || cd?.created_at)
      }
    }
    init()
  }, [user])

  async function fetchCalls(clientId, startDate) {
    let query = supabase.from('calls').select('*').order('created_at', { ascending: false })
    if (clientId) query = query.eq('client_id', clientId)
    const { data } = await query
    if (data) {
      setCalls(data)
      const todayCalls = data.filter(c => isToday(c.created_at))
      const durations = data.filter(c => c.call_duration).map(c => parseFloat(c.call_duration))
      const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
      const completed = data.filter(c => c.call_outcome && c.call_outcome.includes('ended')).length
      const totalDuration = data.filter(c => c.call_duration).reduce((sum, c) => sum + parseFloat(c.call_duration), 0)
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const clientStart = startDate ? new Date(startDate) : null
      const countFrom = clientStart && clientStart > startOfMonth ? clientStart : startOfMonth
      const hoursActive = (now - countFrom) / 3600000
      setStats({ total: data.length, today: todayCalls.length, avgDuration: avg, completed, totalDuration, hoursActive })
    }
  }

  async function handleClientChange(clientId) {
    setSelectedClient(clientId)
    setExpanded({})
    if (clientId === 'all') { setClientName('All Clients'); setClientStartDate(null); await fetchCalls(null, null) }
    else {
      const { data: cd } = await supabase.from('clients').select('business_name, created_at, billing_start_date').eq('id', clientId).single()
      if (cd) {
        setClientName(cd.business_name)
        const start = cd.billing_start_date || cd.created_at
        setClientStartDate(start)
        await fetchCalls(clientId, start)
      }
    }
  }

  function togglePanel(callId, panel) {
    setExpanded(prev => ({ ...prev, [callId]: prev[callId] === panel ? null : panel }))
  }

  const outcomeColor = (o) => {
    if (!o) return '#94a3b8'
    if (o.includes('ended')) return '#10b981'
    if (o.includes('voicemail')) return '#f59e0b'
    if (o.includes('no-answer')) return '#ef4444'
    return '#534AB7'
  }

  const outcomeLabel = (o) => {
    if (!o) return 'Unknown'
    if (o === 'customer-ended-call' || o === 'assistant-ended-call') return 'Completed'
    if (o === 'voicemail') return 'Voicemail'
    if (o === 'no-answer') return 'No Answer'
    return o
  }

  const getCallIntent = (summary) => {
    if (!summary) return null
    const s = summary.toLowerCase()
    if (s.includes('urgent') || s.includes('emergency') || s.includes('asap')) return { label: 'Urgent', icon: '🔴', color: '#ef4444' }
    if (s.includes('quote') || s.includes('price') || s.includes('cost') || s.includes('how much')) return { label: 'Quote', icon: '💰', color: '#10b981' }
    if (s.includes('book') || s.includes('appointment') || s.includes('schedule')) return { label: 'Booking', icon: '📅', color: '#534AB7' }
    if (s.includes('complaint') || s.includes('unhappy') || s.includes('problem') || s.includes('issue')) return { label: 'Complaint', icon: '⚠️', color: '#f59e0b' }
    if (s.includes('order') || s.includes('purchase') || s.includes('buy')) return { label: 'Order', icon: '📦', color: '#8b5cf6' }
    if (s.includes('follow') || s.includes('callback') || s.includes('call back')) return { label: 'Follow Up', icon: '🔄', color: '#06b6d4' }
    return { label: 'Enquiry', icon: '❓', color: '#94a3b8' }
  }

  if (authLoading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fff', fontFamily:'Plus Jakarta Sans,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:'40px', height:'40px', border:'3px solid #EEEDFE', borderTopColor:'#534AB7', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
        <div style={{ fontSize:'0.85rem', color:'#94a3b8', fontWeight:'500' }}>Loading...</div>
        <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; }
        body { font-family:'Plus Jakarta Sans',sans-serif; background:#f8f9fb; -webkit-font-smoothing:antialiased; }
        .layout { display:flex; min-height:100vh; }
        .main { margin-left:240px; flex:1; min-height:100vh; }
        .hero-header { background:linear-gradient(135deg,#1a1535 0%,#2d1f5e 100%); padding:32px 36px 28px; position:relative; overflow:hidden; }
        .hero-header::after { content:''; position:absolute; right:-60px; top:-60px; width:300px; height:300px; background:radial-gradient(circle,rgba(127,119,221,0.15) 0%,transparent 70%); pointer-events:none; }
        .hero-eyebrow { font-size:0.7rem; text-transform:uppercase; letter-spacing:2.5px; color:#7F77DD; font-weight:700; margin-bottom:8px; }
        .hero-title { font-size:1.7rem; font-weight:800; color:#fff; letter-spacing:-0.5px; margin-bottom:4px; }
        .hero-sub { font-size:0.82rem; color:#534AB7; }
        .hero-row { display:flex; justify-content:space-between; align-items:flex-start; }
        .hero-right { display:flex; align-items:center; gap:10px; flex-shrink:0; }
        .live-pill-hero { display:flex; align-items:center; gap:6px; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.25); border-radius:20px; padding:6px 12px; }
        .live-dot-hero { width:6px; height:6px; border-radius:50%; background:#10b981; animation:lp 2s infinite; }
        @keyframes lp { 0%{box-shadow:0 0 0 0 rgba(16,185,129,0.5)} 70%{box-shadow:0 0 0 6px rgba(16,185,129,0)} 100%{box-shadow:0 0 0 0 rgba(16,185,129,0)} }
        .live-text-hero { font-size:0.72rem; color:#10b981; font-weight:700; }
        .admin-pill { display:flex; align-items:center; gap:6px; background:rgba(175,169,236,0.15); border:1px solid rgba(175,169,236,0.25); border-radius:20px; padding:6px 12px; font-size:0.72rem; color:#AFA9EC; font-weight:700; }
        .content { padding:28px 36px 100px; }
        .client-selector-wrap { display:flex; align-items:center; gap:12px; background:#fff; border-radius:12px; padding:14px 18px; border:1px solid #f1f5f9; box-shadow:0 1px 3px rgba(0,0,0,0.04); margin-bottom:24px; }
        .client-selector-label { font-size:0.72rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1.5px; white-space:nowrap; }
        .client-selector { flex:1; padding:7px 12px; border-radius:8px; border:1.5px solid #f1f5f9; font-size:0.875rem; font-family:'Plus Jakarta Sans',sans-serif; color:#0f172a; font-weight:600; background:#f8f9fb; cursor:pointer; outline:none; transition:border-color 0.2s; }
        .client-selector:focus { border-color:#534AB7; }
        .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
        .stat-card { background:#fff; border-radius:14px; padding:22px 18px; border:1px solid #f1f5f9; box-shadow:0 1px 3px rgba(0,0,0,0.04); transition:transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,0.06); }
        .stat-icon { font-size:1.4rem; margin-bottom:12px; }
        .stat-label { font-size:0.68rem; text-transform:uppercase; letter-spacing:1.5px; color:#94a3b8; font-weight:700; margin-bottom:6px; }
        .stat-value { font-size:2.2rem; font-weight:800; color:#0f172a; line-height:1; letter-spacing:-1.5px; }
        .stat-unit { font-size:1rem; font-weight:500; color:#94a3b8; letter-spacing:0; }
        .stat-sub { font-size:0.72rem; color:#94a3b8; margin-top:6px; }
        .stat-accent { height:3px; border-radius:999px; margin-top:16px; }
        .calls-card { background:#fff; border-radius:16px; border:1px solid #f1f5f9; box-shadow:0 1px 3px rgba(0,0,0,0.04); overflow:hidden; }
        .calls-hdr { padding:20px 24px; border-bottom:1px solid #f8f9fb; display:flex; justify-content:space-between; align-items:center; }
        .calls-hdr-title { font-size:1rem; font-weight:700; color:#0f172a; }
        .calls-hdr-count { font-size:0.72rem; color:#7F77DD; background:#f5f3ff; padding:3px 10px; border-radius:20px; font-weight:700; }
        .calls-table { width:100%; border-collapse:collapse; }
        .calls-table thead tr { background:#f8f9fb; }
        .calls-table th { padding:11px 20px; text-align:left; font-size:0.65rem; text-transform:uppercase; letter-spacing:1.5px; color:#94a3b8; font-weight:700; border-bottom:1px solid #f1f5f9; }
        .calls-table td { padding:15px 20px; font-size:0.845rem; color:#334155; border-bottom:1px solid #f8f9fb; vertical-align:middle; }
        .calls-table tbody tr:last-child td { border-bottom:none; }
        .calls-table tbody tr:hover td { background:#fafafa; }
        .caller-num { font-weight:700; color:#0f172a; font-family:'JetBrains Mono',monospace; font-size:0.82rem; }
        .date-text { color:#94a3b8; font-size:0.78rem; }
        .outcome-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; font-size:0.72rem; font-weight:700; }
        .intent-badge { display:inline-flex; align-items:center; gap:4px; margin-left:6px; padding:3px 8px; border-radius:20px; font-size:0.68rem; font-weight:700; }
        .action-btn { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:8px; border:1px solid #f1f5f9; background:#f8f9fb; cursor:pointer; font-size:0.85rem; transition:all 0.15s; margin-right:3px; }
        .action-btn:hover { border-color:#534AB7; background:#f5f3ff; }
        .action-btn.active { border-color:#534AB7; background:#f5f3ff; }
        .expand-row td { padding:0 !important; border-bottom:1px solid #f1f5f9 !important; }
        .expand-inner { padding:20px 24px; background:#fafafa; }
        .expand-label { font-size:0.65rem; text-transform:uppercase; letter-spacing:1.5px; color:#7F77DD; font-weight:700; margin-bottom:10px; }
        .transcript-scroll { max-height:260px; overflow-y:auto; }
        .transcript-line { margin-bottom:6px; padding:10px 14px; border-radius:10px; font-size:0.84rem; color:#334155; line-height:1.6; }
        .transcript-line.ai { background:#f5f3ff; border-left:3px solid #534AB7; }
        .transcript-line.user { background:#f0fdf4; border-left:3px solid #10b981; }
        .transcript-speaker { font-size:0.62rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:3px; }
        .transcript-line.ai .transcript-speaker { color:#534AB7; }
        .transcript-line.user .transcript-speaker { color:#10b981; }
        .summary-box { background:#fff; border:1px solid #f1f5f9; border-radius:10px; padding:16px; font-size:0.875rem; color:#475569; line-height:1.8; }
        .mobile-cards { display:none; }
        .call-card { padding:16px 20px; border-bottom:1px solid #f8f9fb; }
        .call-card:last-child { border-bottom:none; }
        .call-card-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
        .call-card-badges { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:10px; }
        .call-card-actions { display:flex; gap:6px; flex-wrap:wrap; }
        .call-card-btn { display:inline-flex; align-items:center; gap:5px; padding:6px 11px; border-radius:8px; border:1px solid #f1f5f9; background:#f8f9fb; cursor:pointer; font-size:0.74rem; font-weight:600; color:#64748b; transition:all 0.15s; }
        .call-card-btn:hover, .call-card-btn.active { border-color:#534AB7; background:#f5f3ff; color:#534AB7; }
        .call-card-expand { margin-top:12px; background:#fafafa; border-radius:10px; padding:14px; border:1px solid #f1f5f9; }
        .empty-state { text-align:center; padding:64px 20px; }
        .empty-icon { font-size:2.5rem; margin-bottom:14px; }
        .empty-title { font-size:1rem; font-weight:700; color:#0f172a; margin-bottom:6px; }
        .empty-sub { font-size:0.84rem; color:#94a3b8; }
        @media (max-width:900px) {
          .main { margin-left:0; }
          .hero-header { padding:80px 20px 24px; }
          .hero-title { font-size:1.4rem; }
          .content { padding:20px 16px 100px; }
          .stats-grid { grid-template-columns:repeat(2,1fr); gap:10px; }
          .stat-value { font-size:1.8rem; }
          .calls-table { display:none; }
          .mobile-cards { display:block; }
          .client-selector-wrap { flex-direction:column; align-items:flex-start; gap:8px; }
          .hero-row { flex-direction:column; gap:12px; }
        }
        @media (max-width:480px) {
          .stats-grid { gap:8px; }
          .hero-header { padding:76px 16px 20px; }
          .content { padding:16px 12px 100px; }
        }
      `}</style>

      <div className="layout">
        <Sidebar isAdmin={isAdmin} activePage="dashboard" mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />

        <main className="main">
          <div className="hero-header">
            <div className="hero-row">
              <div>
                <div className="hero-eyebrow">AI Receptionist</div>
                <div className="hero-title">{isAdmin ? 'Enterprise Dashboard' : clientName}</div>
                <div className="hero-sub">
                  {new Date().toLocaleDateString('en-AU', { timeZone: PERTH, weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                </div>
              </div>
              <div className="hero-right">
                {isAdmin && <div className="admin-pill">⚡ Admin</div>}
                <div className="live-pill-hero">
                  <div className="live-dot-hero" />
                  <span className="live-text-hero">Live</span>
                </div>
              </div>
            </div>
          </div>

          <div className="content">
            {isAdmin && (
              <div className="client-selector-wrap">
                <div className="client-selector-label">Viewing</div>
                <select className="client-selector" value={selectedClient} onChange={e => handleClientChange(e.target.value)}>
                  <option value="all">All Clients</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                </select>
              </div>
            )}

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📞</div>
                <div className="stat-label">Total Calls</div>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-sub">All time · {stats.today} today</div>
                <div className="stat-accent" style={{background:'linear-gradient(90deg,#534AB7,#7F77DD)'}} />
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-label">Calls Handled</div>
                <div className="stat-value">{stats.completed}</div>
                <div className="stat-sub">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% answer rate</div>
                <div className="stat-accent" style={{background:'linear-gradient(90deg,#10b981,#34d399)'}} />
              </div>
              <div className="stat-card">
                <div className="stat-icon">⏱</div>
                <div className="stat-label">Hours Saved</div>
                <div className="stat-value">{stats.totalDuration > 0 ? (stats.totalDuration / 3600).toFixed(1) : '0'}</div>
                <div className="stat-sub">Of staff phone time</div>
                <div className="stat-accent" style={{background:'linear-gradient(90deg,#f59e0b,#fbbf24)'}} />
              </div>
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-label">Cost Saved</div>
                <div className="stat-value">${stats.hoursActive > 0 ? Math.round(stats.hoursActive * 8) : 0}</div>
                <div className="stat-sub">Est. equivalent cost of a 24/7 call centre service</div>
                <div className="stat-accent" style={{background:'linear-gradient(90deg,#8b5cf6,#534AB7)'}} />
              </div>
            </div>

            <div className="calls-card">
              <div className="calls-hdr">
                <div className="calls-hdr-title">Recent Calls</div>
                <div className="calls-hdr-count">{calls.length} total</div>
              </div>

              {calls.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <div className="empty-title">No calls yet</div>
                  <div className="empty-sub">Calls handled by Mash will appear here.</div>
                </div>
              ) : (
                <>
                  <table className="calls-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Caller</th>
                        {isAdmin && selectedClient === 'all' && <th>Client</th>}
                        <th>Outcome & Intent</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calls.map(call => {
                        const callClientName = isAdmin && selectedClient === 'all'
                          ? (clients.find(c => c.id === call.client_id)?.business_name || 'KarnaConnect')
                          : null
                        const intent = getCallIntent(call.call_summary)
                        return (
                          <>
                            <tr key={call.id}>
                              <td><span className="date-text">{perthDate(call.created_at)}</span></td>
                              <td><span className="caller-num">{call.caller_number || 'Unknown'}</span></td>
                              {isAdmin && selectedClient === 'all' && <td style={{fontSize:'0.78rem', color:'#64748b'}}>{callClientName}</td>}
                              <td>
                                <span className="outcome-badge" style={{
                                  background: outcomeColor(call.call_outcome) + '12',
                                  color: outcomeColor(call.call_outcome),
                                  border: `1px solid ${outcomeColor(call.call_outcome)}25`
                                }}>
                                  <span style={{width:'5px', height:'5px', borderRadius:'50%', background: outcomeColor(call.call_outcome), display:'inline-block', flexShrink:0}} />
                                  {outcomeLabel(call.call_outcome)}
                                </span>
                                {intent && (
                                  <span className="intent-badge" style={{
                                    background: intent.color + '12',
                                    color: intent.color,
                                    border: `1px solid ${intent.color}25`
                                  }}>
                                    {intent.icon} {intent.label}
                                  </span>
                                )}
                              </td>
                              <td>
                                {call.recording_url && <span className={`action-btn ${expanded[call.id] === 'recording' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'recording')} title="Recording">🎙</span>}
                                {call.call_summary && <span className={`action-btn ${expanded[call.id] === 'summary' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'summary')} title="Summary">✨</span>}
                                {call.full_transcript && <span className={`action-btn ${expanded[call.id] === 'transcript' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'transcript')} title="Transcript">📋</span>}
                              </td>
                            </tr>
                            {expanded[call.id] && (
                              <tr key={call.id + '-exp'} className="expand-row">
                                <td colSpan={isAdmin && selectedClient === 'all' ? 5 : 4}>
                                  <div className="expand-inner">
                                    {expanded[call.id] === 'recording' && call.recording_url && (
                                      <>
                                        <div className="expand-label">🎙 Recording</div>
                                        <audio controls style={{ width:'100%', borderRadius:'8px', height:'36px', accentColor:'#534AB7' }}>
                                          <source src={call.recording_url} type="audio/wav" />
                                        </audio>
                                      </>
                                    )}
                                    {expanded[call.id] === 'summary' && call.call_summary && (
                                      <>
                                        <div className="expand-label">✨ AI Summary</div>
                                        <div className="summary-box">{call.call_summary}</div>
                                      </>
                                    )}
                                    {expanded[call.id] === 'transcript' && call.full_transcript && (
                                      <>
                                        <div className="expand-label">📋 Transcript</div>
                                        <div className="transcript-scroll">
                                          {call.full_transcript.split('\n').map((line, i) => {
                                            const isAI = line.startsWith('AI:')
                                            const isUser = line.startsWith('User:')
                                            return line.trim() ? (
                                              <div key={i} className={`transcript-line ${isAI ? 'ai' : isUser ? 'user' : ''}`}>
                                                {(isAI || isUser) && <span className="transcript-speaker">{isAI ? '⚡ Mash' : '👤 Caller'}</span>}
                                                {line.replace('AI: ', '').replace('User: ', '')}
                                              </div>
                                            ) : null
                                          })}
                                        </div>
                                      </>
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
                      const intent = getCallIntent(call.call_summary)
                      return (
                        <div key={call.id} className="call-card">
                          <div className="call-card-top">
                            <div>
                              <div style={{fontWeight:'700', color:'#0f172a', fontSize:'0.9rem', fontFamily:'JetBrains Mono,monospace'}}>{call.caller_number || 'Unknown'}</div>
                              <div style={{fontSize:'0.72rem', color:'#94a3b8', marginTop:'2px'}}>{perthDate(call.created_at)}</div>
                              {callClientName && <div style={{fontSize:'0.7rem', color:'#7F77DD', fontWeight:'600', marginTop:'2px'}}>{callClientName}</div>}
                            </div>
                            <span className="outcome-badge" style={{
                              background: outcomeColor(call.call_outcome) + '12',
                              color: outcomeColor(call.call_outcome),
                              border: `1px solid ${outcomeColor(call.call_outcome)}25`
                            }}>
                              <span style={{width:'5px', height:'5px', borderRadius:'50%', background: outcomeColor(call.call_outcome), display:'inline-block'}} />
                              {outcomeLabel(call.call_outcome)}
                            </span>
                          </div>
                          <div className="call-card-badges">
                            {intent && (
                              <span style={{
                                display:'inline-flex', alignItems:'center', gap:'4px',
                                padding:'3px 9px', borderRadius:'20px',
                                fontSize:'0.68rem', fontWeight:'700',
                                background: intent.color + '12',
                                color: intent.color,
                                border: `1px solid ${intent.color}25`
                              }}>
                                {intent.icon} {intent.label}
                              </span>
                            )}
                          </div>
                          <div className="call-card-actions">
                            {call.recording_url && <span className={`call-card-btn ${expanded[call.id] === 'recording' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'recording')}>🎙 Recording</span>}
                            {call.call_summary && <span className={`call-card-btn ${expanded[call.id] === 'summary' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'summary')}>✨ Summary</span>}
                            {call.full_transcript && <span className={`call-card-btn ${expanded[call.id] === 'transcript' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'transcript')}>📋 Transcript</span>}
                          </div>
                          {expanded[call.id] && (
                            <div className="call-card-expand">
                              {expanded[call.id] === 'recording' && call.recording_url && (
                                <><div className="expand-label">🎙 Recording</div>
                                <audio controls style={{ width:'100%', borderRadius:'6px', height:'32px' }}><source src={call.recording_url} type="audio/wav" /></audio></>
                              )}
                              {expanded[call.id] === 'summary' && call.call_summary && (
                                <><div className="expand-label">✨ Summary</div>
                                <p style={{ fontSize:'0.84rem', color:'#475569', lineHeight:'1.7', marginTop:'6px' }}>{call.call_summary}</p></>
                              )}
                              {expanded[call.id] === 'transcript' && call.full_transcript && (
                                <><div className="expand-label">📋 Transcript</div>
                                <div style={{ maxHeight:'200px', overflowY:'auto', marginTop:'6px' }}>
                                  {call.full_transcript.split('\n').map((line, i) => (
                                    line.trim() ? (
                                      <div key={i} className={`transcript-line ${line.startsWith('AI:') ? 'ai' : 'user'}`}>
                                        <span className="transcript-speaker">{line.startsWith('AI:') ? '⚡ Mash' : '👤 Caller'}</span>
                                        {line.replace('AI: ', '').replace('User: ', '')}
                                      </div>
                                    ) : null
                                  ))}
                                </div></>
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
          </div>
        </main>
      </div>
    </>
  )
}
