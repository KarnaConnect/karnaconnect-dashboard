import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function Dashboard() {
  const [calls, setCalls] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [stats, setStats] = useState({ total: 0, today: 0, avgDuration: 0, completed: 0 })
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const supabase = createClient(
      'https://enxajqahxnbgxwigvsjz.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
    )
    async function fetchCalls() {
      const { data } = await supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) {
        setCalls(data)
        const today = new Date().toDateString()
        const todayCalls = data.filter(c => new Date(c.created_at).toDateString() === today)
        const durations = data.filter(c => c.call_duration).map(c => parseFloat(c.call_duration))
        const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
        const completed = data.filter(c => c.call_outcome && c.call_outcome.includes('ended')).length
        setStats({ total: data.length, today: todayCalls.length, avgDuration: avg, completed })
      }
    }
    fetchCalls()
  }, [])

  const outcomeColor = (outcome) => {
    if (!outcome) return '#64748b'
    if (outcome.includes('ended')) return '#10b981'
    if (outcome.includes('voicemail')) return '#f59e0b'
    if (outcome.includes('no-answer')) return '#ef4444'
    return '#2563eb'
  }

  const outcomeLabel = (outcome) => {
    if (!outcome) return 'Unknown'
    if (outcome === 'customer-ended-call') return 'Completed'
    if (outcome === 'assistant-ended-call') return 'Completed'
    if (outcome === 'voicemail') return 'Voicemail'
    if (outcome === 'no-answer') return 'No Answer'
    return outcome
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { background:#f0f4ff; font-family:'DM Sans',sans-serif; }

        /* ── SIDEBAR ── */
        .sidebar {
          position:fixed; top:0; left:0; width:256px; height:100vh;
          background:linear-gradient(180deg,#0b1325 0%,#0f1e3d 100%);
          display:flex; flex-direction:column; z-index:100;
          border-right:1px solid rgba(37,99,235,0.15);
        }
        .sidebar-top {
          padding:28px 24px 22px;
          border-bottom:1px solid rgba(255,255,255,0.06);
        }
        .logo-row { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
        .logo-atom {
          width:36px; height:36px; border-radius:10px;
          background:linear-gradient(135deg,#2563eb,#06b6d4);
          display:flex; align-items:center; justify-content:center;
          font-size:1.1rem; box-shadow:0 4px 12px rgba(37,99,235,0.4);
          flex-shrink:0;
        }
        .logo-text {
          font-family:'Syne',sans-serif; font-size:1.25rem;
          font-weight:800; color:#fff; letter-spacing:-0.5px;
        }
        .logo-text span { color:#06b6d4; }
        .logo-sub {
          font-size:0.68rem; color:#3b5280; text-transform:uppercase;
          letter-spacing:2px; font-weight:500; padding-left:46px;
        }
        .live-bar {
          margin:16px 24px 0;
          background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2);
          border-radius:8px; padding:8px 12px;
          display:flex; align-items:center; gap:8px;
        }
        .live-dot {
          width:8px; height:8px; border-radius:50%; background:#10b981;
          box-shadow:0 0 0 0 rgba(16,185,129,0.4);
          animation:livePulse 2s infinite;
          flex-shrink:0;
        }
        @keyframes livePulse {
          0%{box-shadow:0 0 0 0 rgba(16,185,129,0.4)}
          70%{box-shadow:0 0 0 8px rgba(16,185,129,0)}
          100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}
        }
        .live-text { font-size:0.75rem; color:#10b981; font-weight:600; }
        .live-time { font-size:0.7rem; color:#3b5280; margin-left:auto; font-variant-numeric:tabular-nums; }

        .sidebar-nav { padding:20px 12px; flex:1; }
        .nav-section-label {
          font-size:0.62rem; text-transform:uppercase; letter-spacing:2px;
          color:#2a3f6b; font-weight:600; padding:0 12px; margin-bottom:8px; margin-top:8px;
        }
        .nav-item {
          display:flex; align-items:center; gap:11px; padding:10px 14px;
          border-radius:10px; margin-bottom:3px; color:#4d6a9a;
          font-size:0.875rem; font-weight:500; cursor:pointer; transition:all 0.2s;
          position:relative;
        }
        .nav-item.active {
          background:linear-gradient(135deg,rgba(37,99,235,0.2),rgba(6,182,212,0.1));
          color:#fff; border:1px solid rgba(37,99,235,0.3);
        }
        .nav-item.active::before {
          content:''; position:absolute; left:0; top:50%; transform:translateY(-50%);
          width:3px; height:60%; background:linear-gradient(180deg,#2563eb,#06b6d4);
          border-radius:0 3px 3px 0;
        }
        .nav-item:hover:not(.active) { background:rgba(255,255,255,0.04); color:#94a3b8; }
        .nav-icon { font-size:1rem; width:18px; text-align:center; }

        .sidebar-footer {
          padding:16px 24px;
          border-top:1px solid rgba(255,255,255,0.05);
          font-size:0.72rem; color:#2a3f6b;
        }
        .footer-brand { color:#3b5280; margin-top:4px; }

        /* ── MAIN ── */
        .main { margin-left:256px; padding:36px 40px; min-height:100vh; }

        /* TOPBAR */
        .topbar {
          display:flex; justify-content:space-between; align-items:flex-start;
          margin-bottom:32px;
        }
        .page-title {
          font-family:'Syne',sans-serif; font-size:1.75rem;
          font-weight:800; color:#0b1325; letter-spacing:-0.8px;
        }
        .page-sub { font-size:0.85rem; color:#94a3b8; margin-top:4px; }
        .topbar-right { display:flex; align-items:center; gap:12px; }
        .live-badge {
          display:flex; align-items:center; gap:7px;
          background:linear-gradient(135deg,#2563eb,#06b6d4);
          color:white; font-size:0.75rem; font-weight:700;
          padding:8px 16px; border-radius:20px; letter-spacing:0.5px;
          box-shadow:0 4px 14px rgba(37,99,235,0.35);
        }
        .badge-dot { width:6px; height:6px; background:white; border-radius:50%; animation:blink 1.4s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        /* STAT CARDS */
        .stats-grid {
          display:grid; grid-template-columns:repeat(4,1fr); gap:18px; margin-bottom:28px;
        }
        .stat-card {
          background:white; border-radius:16px; padding:22px 20px;
          border:1px solid #e8edf8; position:relative; overflow:hidden;
          box-shadow:0 2px 8px rgba(15,30,61,0.06);
          transition:transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(15,30,61,0.1); }
        .stat-card::after {
          content:''; position:absolute; bottom:0; left:0; right:0; height:3px;
        }
        .stat-card.c1::after { background:linear-gradient(90deg,#2563eb,#06b6d4); }
        .stat-card.c2::after { background:linear-gradient(90deg,#10b981,#06b6d4); }
        .stat-card.c3::after { background:linear-gradient(90deg,#f59e0b,#f97316); }
        .stat-card.c4::after { background:linear-gradient(90deg,#8b5cf6,#2563eb); }
        .stat-icon {
          width:40px; height:40px; border-radius:10px; display:flex;
          align-items:center; justify-content:center; font-size:1.1rem;
          margin-bottom:14px;
        }
        .stat-icon.c1 { background:#eff6ff; }
        .stat-icon.c2 { background:#f0fdf4; }
        .stat-icon.c3 { background:#fffbeb; }
        .stat-icon.c4 { background:#f5f3ff; }
        .stat-label {
          font-size:0.72rem; text-transform:uppercase; letter-spacing:1.2px;
          color:#94a3b8; font-weight:600; margin-bottom:8px;
        }
        .stat-value {
          font-family:'Syne',sans-serif; font-size:2rem;
          font-weight:800; color:#0b1325; line-height:1;
        }
        .stat-unit { font-size:1rem; font-weight:500; color:#94a3b8; }
        .stat-sub { font-size:0.75rem; color:#94a3b8; margin-top:6px; }

        /* TABLE CARD */
        .table-card {
          background:white; border-radius:16px;
          border:1px solid #e8edf8;
          box-shadow:0 2px 8px rgba(15,30,61,0.06);
          overflow:hidden;
        }
        .table-header {
          padding:20px 24px; border-bottom:1px solid #f1f5f9;
          display:flex; justify-content:space-between; align-items:center;
          background:linear-gradient(135deg,#fafbff,#f8fafc);
        }
        .table-title {
          font-family:'Syne',sans-serif; font-weight:700;
          font-size:1rem; color:#0b1325; display:flex; align-items:center; gap:8px;
        }
        .table-count {
          font-size:0.78rem; color:#94a3b8; background:#f1f5f9;
          padding:4px 12px; border-radius:20px; border:1px solid #e2e8f0; font-weight:500;
        }
        table { width:100%; border-collapse:collapse; }
        thead tr { background:#fafbff; }
        th {
          padding:11px 20px; text-align:left; font-size:0.7rem;
          text-transform:uppercase; letter-spacing:1.2px;
          color:#94a3b8; font-weight:700; border-bottom:1px solid #f1f5f9;
        }
        td {
          padding:15px 20px; font-size:0.875rem; color:#334155;
          border-bottom:1px solid #f8fafc; vertical-align:middle;
        }
        tbody tr:last-child td { border-bottom:none; }
        .call-row { cursor:pointer; transition:background 0.15s; }
        .call-row:hover td { background:#fafbff; }
        .caller-num { font-weight:600; color:#0b1325; font-variant-numeric:tabular-nums; }
        .duration-chip {
          display:inline-flex; align-items:center; gap:4px;
          background:#f8fafc; border:1px solid #e2e8f0;
          border-radius:6px; padding:3px 8px;
          font-size:0.8rem; color:#475569; font-weight:500;
        }
        .outcome-badge {
          display:inline-flex; align-items:center; gap:5px;
          padding:4px 10px; border-radius:20px;
          font-size:0.75rem; font-weight:600; letter-spacing:0.3px;
        }
        .summary-link {
          font-size:0.8rem; color:#2563eb; font-weight:500;
          display:flex; align-items:center; gap:4px;
        }
        .summary-expand td {
          background:#f8fbff; padding:16px 24px 16px 40px;
          font-size:0.85rem; color:#475569; line-height:1.75;
          border-left:3px solid #2563eb; border-bottom:1px solid #e8edf8;
        }
        .summary-label {
          font-size:0.7rem; text-transform:uppercase; letter-spacing:1px;
          color:#2563eb; font-weight:700; margin-bottom:6px;
        }

        /* EMPTY */
        .empty-state { text-align:center; padding:70px 20px; }
        .empty-icon {
          width:64px; height:64px; border-radius:16px;
          background:linear-gradient(135deg,#eff6ff,#e0f2fe);
          display:flex; align-items:center; justify-content:center;
          font-size:1.8rem; margin:0 auto 16px;
        }
        .empty-title {
          font-family:'Syne',sans-serif; font-size:1.1rem;
          color:#0b1325; font-weight:700; margin-bottom:6px;
        }
        .empty-sub { font-size:0.875rem; color:#94a3b8; }
      `}</style>

      <div>
        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sidebar-top">
            <div className="logo-row">
              <div className="logo-atom">⚛</div>
              <div className="logo-text">Karna<span>Connect</span></div>
            </div>
            <div className="logo-sub">AI Command Centre</div>
          </div>
          <div className="live-bar">
            <div className="live-dot"></div>
            <div className="live-text">Mash is live</div>
            <div className="live-time">
              {time.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-label">Main</div>
            <div className="nav-item active">
              <span className="nav-icon">📞</span> Call Dashboard
            </div>
            <div className="nav-item">
              <span className="nav-icon">👥</span> Clients
            </div>
            <div className="nav-item">
              <span className="nav-icon">🤖</span> Agents
            </div>
            <div className="nav-section-label" style={{marginTop:'16px'}}>Insights</div>
            <div className="nav-item">
              <span className="nav-icon">📊</span> Analytics
            </div>
            <div className="nav-item">
              <span className="nav-icon">📋</span> Transcripts
            </div>
            <div className="nav-section-label" style={{marginTop:'16px'}}>System</div>
            <div className="nav-item">
              <span className="nav-icon">🔗</span> CRM Connect
            </div>
            <div className="nav-item">
              <span className="nav-icon">⚙️</span> Settings
            </div>
          </nav>

          <div className="sidebar-footer">
            <div>South Lake, WA 6164</div>
            <div className="footer-brand">© 2026 KarnaConnect</div>
          </div>
        </div>

        {/* MAIN */}
        <main className="main">
          <div className="topbar">
            <div>
              <div className="page-title">Call Dashboard</div>
              <div className="page-sub">
                {new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div className="topbar-right">
              <div className="live-badge">
                <div className="badge-dot"></div>
                LIVE MONITORING
              </div>
            </div>
          </div>

          {/* STATS */}
          <div className="stats-grid">
            <div className="stat-card c1">
              <div className="stat-icon c1">📞</div>
              <div className="stat-label">Total Calls</div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-sub">All time</div>
            </div>
            <div className="stat-card c2">
              <div className="stat-icon c2">📅</div>
              <div className="stat-label">Today</div>
              <div className="stat-value">{stats.today}</div>
              <div className="stat-sub">{new Date().toLocaleDateString('en-AU')}</div>
            </div>
            <div className="stat-card c3">
              <div className="stat-icon c3">⏱</div>
              <div className="stat-label">Avg Duration</div>
              <div className="stat-value">{stats.avgDuration}<span className="stat-unit">s</span></div>
              <div className="stat-sub">Per call</div>
            </div>
            <div className="stat-card c4">
              <div className="stat-icon c4">✅</div>
              <div className="stat-label">Completed</div>
              <div className="stat-value">{stats.completed}</div>
              <div className="stat-sub">Calls handled</div>
            </div>
          </div>

          {/* TABLE */}
          <div className="table-card">
            <div className="table-header">
              <div className="table-title">⚛ Recent Calls</div>
              <div className="table-count">{calls.length} records</div>
            </div>
            {calls.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <div className="empty-title">No calls yet</div>
                <div className="empty-sub">Once Mash handles calls, they'll appear here automatically.</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Caller</th>
                    <th>Duration</th>
                    <th>Outcome</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map(call => (
                    <>
                      <tr
                        key={call.id}
                        className="call-row"
                        onClick={() => setExpanded(expanded === call.id ? null : call.id)}
                      >
                        <td style={{color:'#64748b', fontSize:'0.82rem'}}>
                          {new Date(call.created_at).toLocaleString('en-AU')}
                        </td>
                        <td><span className="caller-num">{call.caller_number || 'Unknown'}</span></td>
                        <td>
                          <span className="duration-chip">
                            ⏱ {call.call_duration ? `${parseFloat(call.call_duration).toFixed(0)}s` : '—'}
                          </span>
                        </td>
                        <td>
                          <span className="outcome-badge" style={{
                            background: outcomeColor(call.call_outcome) + '15',
                            color: outcomeColor(call.call_outcome),
                            border: `1px solid ${outcomeColor(call.call_outcome)}30`
                          }}>
                            ● {outcomeLabel(call.call_outcome)}
                          </span>
                        </td>
                        <td>
                          {call.call_summary
                            ? <span className="summary-link">{expanded === call.id ? '▲ Hide' : '▼ View'} summary</span>
                            : <span style={{color:'#e2e8f0'}}>—</span>
                          }
                        </td>
                      </tr>
                      {expanded === call.id && call.call_summary && (
                        <tr key={call.id + '-exp'} className="summary-expand">
                          <td colSpan={5}>
                            <div className="summary-label">⚛ AI Call Summary — Mash</div>
                            {call.call_summary}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
