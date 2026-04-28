import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

// --- UTILS ---
const formatDuration = (s) => {
  if (!s) return '—';
  const sec = parseFloat(s);
  if (sec < 60) return `${Math.round(sec)}s`;
  const mins = Math.floor(sec / 60);
  const remainingSec = Math.round(sec % 60);
  return `${mins}m ${remainingSec}s`;
};

export default function Dashboard() {
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [stats, setStats] = useState({ total: 0, today: 0, avgDuration: 0, completed: 0 })
  const [time, setTime] = useState(new Date())

  // --- CONFIG ---
  // Replace these with your actual Supabase credentials or use process.env
  const SUPABASE_URL = 'https://enxajqahxnbgxwigvsjz.supabase.co'
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'

  const supabase = useMemo(() => createClient(SUPABASE_URL, SUPABASE_KEY), [])

  // --- EFFECTS ---
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    async function fetchCalls() {
      try {
        const { data, error } = await supabase
          .from('calls')
          .select('*')
          .order('created_at', { ascending: false })

        if (data) {
          setCalls(data)
          const todayStr = new Date().toDateString()
          const todayCalls = data.filter(c => new Date(c.created_at).toDateString() === todayStr)
          const durations = data.filter(c => c.call_duration).map(c => parseFloat(c.call_duration))
          const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
          const completed = data.filter(c => c.call_outcome?.includes('ended')).length
          setStats({ total: data.length, today: todayCalls.length, avgDuration: avg, completed })
        }
      } catch (err) {
        console.error("Fetch error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchCalls()
  }, [supabase])

  // --- HELPERS ---
  const outcomeColor = (outcome) => {
    if (!outcome) return '#64748b'
    if (outcome.includes('ended')) return '#10b981'
    if (outcome.includes('voicemail')) return '#f59e0b'
    if (outcome.includes('no-answer')) return '#ef4444'
    return '#2563eb'
  }

  const outcomeLabel = (outcome) => {
    if (!outcome) return 'Unknown'
    if (outcome.includes('ended')) return 'Completed'
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

        .sidebar {
          position:fixed; top:0; left:0; width:256px; height:100vh;
          background:linear-gradient(180deg,#0b1325 0%,#0f1e3d 100%);
          display:flex; flex-direction:column; z-index:100;
          border-right:1px solid rgba(37,99,235,0.15);
        }
        .sidebar-top { padding:28px 24px 22px; border-bottom:1px solid rgba(255,255,255,0.06); }
        .logo-row { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
        .logo-atom {
          width:36px; height:36px; border-radius:10px;
          background:linear-gradient(135deg,#2563eb,#06b6d4);
          display:flex; align-items:center; justify-content:center;
          font-size:1.1rem; box-shadow:0 4px 12px rgba(37,99,235,0.4);
        }
        .logo-text { font-family:'Syne',sans-serif; font-size:1.25rem; font-weight:800; color:#fff; letter-spacing:-0.5px; }
        .logo-text span { color:#06b6d4; }
        .logo-sub { font-size:0.68rem; color:#3b5280; text-transform:uppercase; letter-spacing:2px; font-weight:500; padding-left:46px; }

        .live-bar {
          margin:16px 24px 0; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2);
          border-radius:8px; padding:8px 12px; display:flex; align-items:center; gap:8px;
        }
        .live-dot {
          width:8px; height:8px; border-radius:50%; background:#10b981;
          animation:livePulse 2s infinite;
        }
        @keyframes livePulse {
          0%{box-shadow:0 0 0 0 rgba(16,185,129,0.4)}
          70%{box-shadow:0 0 0 8px rgba(16,185,129,0)}
          100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}
        }
        .live-text { font-size:0.75rem; color:#10b981; font-weight:600; }
        .live-time { font-size:0.7rem; color:#3b5280; margin-left:auto; font-variant-numeric:tabular-nums; }

        .sidebar-nav { padding:20px 12px; flex:1; }
        .nav-section-label { font-size:0.62rem; text-transform:uppercase; letter-spacing:2px; color:#2a3f6b; font-weight:600; padding:0 12px; margin-bottom:8px; margin-top:8px; }
        .nav-item { display:flex; align-items:center; gap:11px; padding:10px 14px; border-radius:10px; margin-bottom:3px; color:#4d6a9a; font-size:0.875rem; font-weight:500; cursor:pointer; transition:all 0.2s; position:relative; }
        .nav-item.active { background:linear-gradient(135deg,rgba(37,99,235,0.2),rgba(6,182,212,0.1)); color:#fff; border:1px solid rgba(37,99,235,0.3); }
        .nav-item.active::before { content:''; position:absolute; left:0; top:50%; transform:translateY(-50%); width:3px; height:60%; background:linear-gradient(180deg,#2563eb,#06b6d4); border-radius:0 3px 3px 0; }
        .nav-icon { font-size:1rem; width:18px; text-align:center; }

        .main { margin-left:256px; padding:36px 40px; min-height:100vh; }
        .topbar { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; }
        .page-title { font-family:'Syne',sans-serif; font-size:1.75rem; font-weight:800; color:#0b1325; letter-spacing:-0.8px; }
        .page-sub { font-size:0.85rem; color:#94a3b8; margin-top:4px; }

        .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; margin-bottom:28px; }
        .stat-card { background:white; border-radius:16px; padding:22px 20px; border:1px solid #e8edf8; position:relative; overflow:hidden; box-shadow:0 2px 8px rgba(15,30,61,0.06); transition:all 0.2s; }
        .stat-card:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(15,30,61,0.1); }
        .stat-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; }
        .stat-card.c1::after { background:linear-gradient(90deg,#2563eb,#06b6d4); }
        .stat-card.c2::after { background:linear-gradient(90deg,#10b981,#06b6d4); }
        .stat-card.c3::after { background:linear-gradient(90deg,#f59e0b,#f97316); }
        .stat-card.c4::after { background:linear-gradient(90deg,#8b5cf6,#2563eb); }
        .stat-value { font-family:'Syne',sans-serif; font-size:2rem; font-weight:800; color:#0b1325; line-height:1; }
        .stat-label { font-size:0.72rem; text-transform:uppercase; letter-spacing:1.2px; color:#94a3b8; font-weight:600; margin-bottom:8px; }

        .table-card { background:white; border-radius:16px; border:1px solid #e8edf8; box-shadow:0 2px 8px rgba(15,30,61,0.06); overflow:hidden; }
        .table-header { padding:20px 24px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; background:#fafbff; }
        table { width:100%; border-collapse:collapse; }
        th { padding:11px 20px; text-align:left; font-size:0.7rem; text-transform:uppercase; letter-spacing:1.2px; color:#94a3b8; font-weight:700; border-bottom:1px solid #f1f5f9; }
        td { padding:15px 20px; font-size:0.875rem; color:#334155; border-bottom:1px solid #f8fafc; }
        .call-row { cursor:pointer; transition:background 0.1s; }
        .call-row:hover { background:#f8fbff; }

        .duration-chip { background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:3px 8px; font-size:0.8rem; color:#475569; font-weight:500; }
        .outcome-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; }
        
        .summary-expand td { background:#f8fbff; padding:20px 40px; border-left:4px solid #2563eb; animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { opacity:0; transform:translateY(-5px); } to { opacity:1; transform:translateY(0); } }
        .summary-label { font-size:0.7rem; text-transform:uppercase; letter-spacing:1px; color:#2563eb; font-weight:700; margin-bottom:8px; }
        
        .loading-shimmer { height:20px; background:#f1f5f9; background-image: linear-gradient(90deg, #f1f5f9 0px, #f8fafc 40px, #f1f5f9 80px); background-size: 600px; animation: shimmer 2s infinite linear; border-radius: 4px; margin-bottom:10px; }
        @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
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
            <div className="nav-item active"><span className="nav-icon">📞</span> Call Dashboard</div>
            <div className="nav-item"><span className="nav-icon">👥</span> Clients</div>
            <div className="nav-item"><span className="nav-icon">🤖</span> Agents</div>
          </nav>
        </div>

        {/* MAIN */}
        <main className="main">
          <div className="topbar">
            <div>
              <div className="page-title">Call Dashboard</div>
              <div className="page-sub">{new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>

          {/* STATS */}
          <div className="stats-grid">
            <div className="stat-card c1">
              <div className="stat-label">Total Calls</div>
              <div className="stat-value">{loading ? '...' : stats.total}</div>
            </div>
            <div className="stat-card c2">
              <div className="stat-label">Today</div>
              <div className="stat-value">{loading ? '...' : stats.today}</div>
            </div>
            <div className="stat-card c3">
              <div className="stat-label">Avg Duration</div>
              <div className="stat-value">{loading ? '...' : stats.avgDuration}<span style={{fontSize:'1rem', color:'#94a3b8'}}>s</span></div>
            </div>
            <div className="stat-card c4">
              <div className="stat-label">Completed</div>
              <div className="stat-value">{loading ? '...' : stats.completed}</div>
            </div>
          </div>

          {/* TABLE */}
          <div className="table-card">
            <div className="table-header">
              <div className="table-title">⚛ Recent Calls</div>
              <div className="table-count">{loading ? 'Syncing...' : `${calls.length} entries`}</div>
            </div>

            {loading ? (
              <div style={{padding:'30px'}}>
                <div className="loading-shimmer"></div>
                <div className="loading-shimmer" style={{width:'80%'}}></div>
                <div className="loading-shimmer" style={{width:'90%'}}></div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Caller</th>
                    <th>Duration</th>
                    <th>Outcome</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map(call => (
                    <React.Fragment key={call.id}>
                      <tr className="call-row" onClick={() => setExpanded(expanded === call.id ? null : call.id)}>
                        <td>
                          <div style={{fontWeight:600}}>{new Date(call.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</div>
                          <div style={{fontSize:'0.7rem', color:'#94a3b8'}}>{new Date(call.created_at).toLocaleDateString('en-AU')}</div>
                        </td>
                        <td style={{fontWeight:600}}>{call.caller_number || 'Internal'}</td>
                        <td><span className="duration-chip">{formatDuration(call.call_duration)}</span></td>
                        <td>
                          <span className="outcome-badge" style={{
                            background: outcomeColor(call.call_outcome) + '15',
                            color: outcomeColor(call.call_outcome),
                            border: `1px solid ${outcomeColor(call.call_outcome)}30`
                          }}>
                            ● {outcomeLabel(call.call_outcome)}
                          </span>
                        </td>
                        <td style={{color:'#2563eb', fontWeight:500}}>{call.call_summary ? (expanded === call.id ? 'Close' : 'View Summary') : '—'}</td>
                      </tr>
                      {expanded === call.id && call.call_summary && (
                        <tr className="summary-expand">
                          <td colSpan={5}>
                            <div className="summary-label">⚛ AI Analysis — Mash AI</div>
                            <p style={{lineHeight:1.6, color:'#475569'}}>{call.call_summary}</p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
