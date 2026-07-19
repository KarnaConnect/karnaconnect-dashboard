import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '../components/Sidebar'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)

const PERTH = 'Australia/Perth'
function toUtc(ts) { if (!ts) return ts; const s = String(ts); return /[Zz+]|\d{2}:\d{2}$/.test(s) ? s : s.replace(' ', 'T') + 'Z' }
function perthDateShort(ts) { return new Date(toUtc(ts)).toLocaleDateString('en-AU', { timeZone: PERTH }) }
function callTs(c) { return c.started_at || c.created_at }
function isToday(ts) { return perthDateShort(ts) === perthDateShort(new Date()) }

export default function Analytics() {
  const [calls, setCalls] = useState([])
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('all')
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
    if (clientId && clientId !== 'all') query = query.eq('client_id', clientId)
    const { data } = await query
    if (data) setCalls(data)
  }

  async function handleClientChange(clientId) {
    setSelectedClient(clientId)
    await fetchCalls(clientId === 'all' ? null : clientId)
  }

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return d.toLocaleDateString('en-AU', { timeZone: PERTH })
  })
  const callsByDay = last30Days.map(day => ({
    day: day.split('/').slice(0, 2).join('/'),
    count: calls.filter(c => perthDateShort(callTs(c)) === day).length
  }))
  const maxDayCount = Math.max(...callsByDay.map(d => d.count), 1)

  const outcomes = {
    'Completed': calls.filter(c => c.call_outcome && c.call_outcome.includes('ended')).length,
    'Voicemail': calls.filter(c => c.call_outcome && c.call_outcome.includes('voicemail')).length,
    'No Answer': calls.filter(c => c.call_outcome && c.call_outcome.includes('no-answer')).length,
    'Other': calls.filter(c => !c.call_outcome || (!c.call_outcome.includes('ended') && !c.call_outcome.includes('voicemail') && !c.call_outcome.includes('no-answer'))).length,
  }
  const outcomeColors = { 'Completed': '#10a15c', 'Voicemail': '#c68a1d', 'No Answer': '#d6362f', 'Other': '#9691b3' }
  const totalOutcomes = Object.values(outcomes).reduce((a, b) => a + b, 0)

  const hourBuckets = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: `${i.toString().padStart(2, '0')}:00`,
    count: calls.filter(c => {
      const h = new Date(toUtc(callTs(c))).toLocaleString('en-AU', { timeZone: PERTH, hour: 'numeric', hour12: false })
      return parseInt(h) === i
    }).length
  }))
  const maxHourCount = Math.max(...hourBuckets.map(h => h.count), 1)
  const peakHour = hourBuckets.reduce((a, b) => a.count > b.count ? a : b)
  const todayCount = calls.filter(c => isToday(callTs(c))).length
  const durations = calls.filter(c => c.call_duration).map(c => parseFloat(c.call_duration))
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f5fa', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.9rem', color: '#9691b3' }}>
      Loading...
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; }
        body { font-family:'Plus Jakarta Sans',sans-serif; background:#f6f5fa; -webkit-font-smoothing:antialiased; }
        .layout { display:flex; min-height:100vh; }
        .main { margin-left:252px; flex:1; padding:36px 40px; min-height:100vh; }
        .topbar { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; gap:12px; }
        .page-title { font-size:1.6rem; font-weight:800; color:#151129; letter-spacing:-0.6px; }
        .page-sub { font-size:0.82rem; color:#9691b3; margin-top:3px; }
        .topbar-right { display:flex; align-items:center; gap:10px; }
        .live-badge { display:flex; align-items:center; gap:7px; background:linear-gradient(135deg,#6f5fd6,#8f86e8); color:#fff; font-size:0.72rem; font-weight:700; padding:8px 15px; border-radius:20px; box-shadow:0 4px 14px rgba(111,95,214,0.3); white-space:nowrap; }
        .badge-blink { width:6px; height:6px; background:#fff; border-radius:50%; animation:bk 1.4s infinite; }
        @keyframes bk { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .client-selector-wrap { margin-bottom:20px; display:flex; align-items:center; gap:12px; background:#fff; border-radius:12px; padding:14px 20px; border:1px solid #ece9f6; box-shadow:0 1px 4px rgba(21,17,41,0.05); }
        .client-selector-label { font-size:0.78rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; white-space:nowrap; }
        .client-selector { flex:1; padding:8px 14px; border-radius:8px; border:1.5px solid #ece9f6; font-size:0.875rem; font-family:'Plus Jakarta Sans',sans-serif; color:#151129; font-weight:600; background:#f9f8fc; cursor:pointer; outline:none; }
        .client-selector:focus { border-color:#6f5fd6; }
        .insight-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
        .insight-card { background:#fff; border-radius:14px; padding:20px 18px; border:1px solid #ece9f6; box-shadow:0 1px 4px rgba(21,17,41,0.05); position:relative; overflow:hidden; }
        .insight-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; border-radius:0 0 14px 14px; }
        .i1::after { background:linear-gradient(90deg,#6f5fd6,#8f86e8); }
        .i2::after { background:linear-gradient(90deg,#10a15c,#34d399); }
        .i3::after { background:linear-gradient(90deg,#c68a1d,#fbbf24); }
        .i4::after { background:linear-gradient(90deg,#7c4fd6,#6f5fd6); }
        .insight-label { font-size:0.68rem; text-transform:uppercase; letter-spacing:1.2px; color:#9691b3; font-weight:700; margin-bottom:6px; }
        .insight-value { font-size:1.6rem; font-weight:800; color:#151129; line-height:1; letter-spacing:-0.5px; }
        .insight-sub { font-size:0.72rem; color:#9691b3; margin-top:5px; }
        .charts-grid { display:grid; grid-template-columns:2fr 1fr; gap:20px; margin-bottom:20px; }
        .chart-card { background:#fff; border-radius:14px; border:1px solid #ece9f6; box-shadow:0 1px 4px rgba(21,17,41,0.05); overflow:hidden; }
        .chart-hdr { padding:16px 20px; border-bottom:1px solid #f4f2f9; display:flex; justify-content:space-between; align-items:center; }
        .chart-title { font-size:0.9rem; font-weight:700; color:#151129; }
        .chart-sub { font-size:0.75rem; color:#9691b3; }
        .chart-body { padding:20px; }
        .bar-chart { display:flex; align-items:flex-end; gap:3px; height:140px; }
        .bar-wrap { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; height:100%; justify-content:flex-end; }
        .bar { width:100%; border-radius:4px 4px 0 0; transition:height 0.3s ease; min-height:2px; background:linear-gradient(180deg,#6f5fd6,#8f86e8); opacity:0.85; }
        .bar:hover { opacity:1; }
        .bar-label { font-size:0.55rem; color:#9691b3; white-space:nowrap; transform:rotate(-45deg); transform-origin:center; margin-top:4px; }
        .donut-wrap { display:flex; flex-direction:column; align-items:center; padding:10px 0; }
        .donut-legend { width:100%; margin-top:16px; }
        .legend-item { display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f8f7fc; font-size:0.82rem; }
        .legend-item:last-child { border-bottom:none; }
        .legend-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; margin-right:8px; }
        .legend-name { flex:1; color:#475569; font-weight:500; display:flex; align-items:center; }
        .legend-val { font-weight:700; color:#151129; }
        .hour-chart { display:flex; align-items:flex-end; gap:2px; height:100px; }
        .hour-bar-wrap { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; height:100%; justify-content:flex-end; }
        .hour-bar { width:100%; border-radius:3px 3px 0 0; background:linear-gradient(180deg,#8f86e8,#6f5fd6); opacity:0.55; min-height:2px; }
        .hour-bar.peak { opacity:1; }
        .hour-label { font-size:0.5rem; color:#9691b3; }
        .overlay { display:none; position:fixed; inset:0; background:rgba(10,8,24,0.5); z-index:150; backdrop-filter:blur(2px); }
        .overlay.show { display:block; }
        @media (max-width:900px) {
          .main { margin-left:0; padding:76px 16px 100px; }
          .insight-grid { grid-template-columns:repeat(2,1fr); gap:10px; }
          .charts-grid { grid-template-columns:1fr; }
          .topbar { flex-direction:column; gap:10px; }
          .page-title { font-size:1.3rem; }
        }
      `}</style>

      <div className={`overlay ${mobileNav ? 'show' : ''}`} onClick={() => setMobileNav(false)} />
      <div className="layout">
        <Sidebar isAdmin={isAdmin} activePage="analytics" mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />
        <main className="main">
          <div className="topbar">
            <div>
              <div className="page-title">Analytics</div>
              <div className="page-sub">Last 30 days · {new Date().toLocaleDateString('en-AU', { timeZone: PERTH, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            <div className="topbar-right">
              <div className="live-badge"><div className="badge-blink" />LIVE</div>
            </div>
          </div>

          {isAdmin && (
            <div className="client-selector-wrap">
              <div className="client-selector-label">Viewing:</div>
              <select className="client-selector" value={selectedClient} onChange={e => handleClientChange(e.target.value)}>
                <option value="all">All Clients (Combined)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
              </select>
            </div>
          )}

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
              <div className="insight-value">{avgDuration}<span style={{ fontSize: '1rem', fontWeight: 500, color: '#9691b3' }}>s</span></div>
              <div className="insight-sub">Per call</div>
            </div>
            <div className="insight-card i4">
              <div className="insight-label">Peak Hour</div>
              <div className="insight-value">{peakHour.label}</div>
              <div className="insight-sub">{peakHour.count} calls</div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-hdr">
                <div className="chart-title">Call Volume — Last 30 Days</div>
                <div className="chart-sub">{calls.filter(c => { const d = new Date(); d.setDate(d.getDate() - 30); return new Date(toUtc(callTs(c))) > d }).length} calls</div>
              </div>
              <div className="chart-body">
                <div className="bar-chart">
                  {callsByDay.map((d, i) => (
                    <div key={i} className="bar-wrap">
                      <div className="bar" style={{ height: `${Math.max((d.count / maxDayCount) * 100, d.count > 0 ? 5 : 0)}%` }} title={`${d.day}: ${d.count} calls`} />
                      {i % 5 === 0 && <div className="bar-label">{d.day}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="chart-card">
              <div className="chart-hdr">
                <div className="chart-title">Call Outcomes</div>
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
                          <circle key={label} cx="60" cy="60" r={r} fill="none" stroke={outcomeColors[label]} strokeWidth="18"
                            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset * circ}
                            style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }} />
                        )
                        offset += pct
                        return el
                      })
                    })()}
                    <text x="60" y="56" textAnchor="middle" fontSize="14" fontWeight="800" fill="#151129">{calls.length}</text>
                    <text x="60" y="70" textAnchor="middle" fontSize="8" fill="#9691b3">calls</text>
                  </svg>
                  <div className="donut-legend">
                    {Object.entries(outcomes).map(([label, count]) => (
                      <div key={label} className="legend-item">
                        <div className="legend-name"><div className="legend-dot" style={{ background: outcomeColors[label] }} />{label}</div>
                        <div className="legend-val">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-hdr">
              <div className="chart-title">Calls by Hour of Day (AWST)</div>
              <div className="chart-sub">Peak at {peakHour.label} with {peakHour.count} calls</div>
            </div>
            <div className="chart-body">
              <div className="hour-chart">
                {hourBuckets.map((h, i) => (
                  <div key={i} className="hour-bar-wrap">
                    <div className={`hour-bar ${h.hour === peakHour.hour ? 'peak' : ''}`} style={{ height: `${Math.max((h.count / maxHourCount) * 100, h.count > 0 ? 8 : 0)}%` }} title={`${h.label}: ${h.count} calls`} />
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
