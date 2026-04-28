import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function Dashboard() {
  const [calls, setCalls] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [stats, setStats] = useState({ total: 0, today: 0, avgDuration: 0 })

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
        setStats({ total: data.length, today: todayCalls.length, avgDuration: avg })
      }
    }
    fetchCalls()
  }, [])

  const outcomeColor = (outcome) => {
    if (!outcome) return '#64748b'
    if (outcome.includes('customer-ended')) return '#10b981'
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
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #f8fafc; font-family: 'DM Sans', sans-serif; }
        .shell { min-height: 100vh; background: #f8fafc; }

        /* SIDEBAR */
        .sidebar {
          position: fixed; top: 0; left: 0; width: 240px; height: 100vh;
          background: #0f172a; display: flex; flex-direction: column;
          padding: 0; z-index: 100;
        }
        .sidebar-logo {
          padding: 28px 24px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .sidebar-logo-text {
          font-family: 'Syne', sans-serif; font-size: 1.3rem; font-weight: 800;
          color: white; letter-spacing: -0.5px;
        }
        .sidebar-logo-text span { color: #06b6d4; }
        .sidebar-logo-sub {
          font-size: 0.7rem; color: #64748b; text-transform: uppercase;
          letter-spacing: 1.5px; margin-top: 4px;
        }
        .sidebar-nav { padding: 24px 12px; flex: 1; }
        .nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-radius: 8px; margin-bottom: 4px;
          color: #94a3b8; font-size: 0.875rem; font-weight: 500; cursor: pointer;
          transition: all 0.2s;
        }
        .nav-item.active { background: rgba(37,99,235,0.2); color: #2563eb; }
        .nav-item:hover:not(.active) { background: rgba(255,255,255,0.05); color: white; }
        .nav-icon { font-size: 1rem; width: 20px; text-align: center; }
        .sidebar-footer {
          padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.08);
          font-size: 0.75rem; color: #475569;
        }
        .status-dot {
          display: inline-block; width: 7px; height: 7px;
          background: #10b981; border-radius: 50%; margin-right: 6px;
          animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        /* MAIN */
        .main { margin-left: 240px; padding: 40px; min-height: 100vh; }

        /* TOPBAR */
        .topbar {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 36px;
        }
        .topbar-title {
          font-family: 'Syne', sans-serif; font-size: 1.6rem;
          font-weight: 800; color: #0f172a; letter-spacing: -0.5px;
        }
        .topbar-date { font-size: 0.85rem; color: #94a3b8; margin-top: 2px; }
        .topbar-badge {
          background: linear-gradient(135deg, #2563eb, #06b6d4);
          color: white; font-size: 0.75rem; font-weight: 600;
          padding: 6px 14px; border-radius: 20px; letter-spacing: 0.5px;
        }

        /* STAT CARDS */
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 32px; }
        .stat-card {
          background: white; border-radius: 14px; padding: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          position: relative; overflow: hidden;
        }
        .stat-card::before {
          content: ''; position: absolute; top: 0; left: 0;
          width: 100%; height: 3px;
          background: linear-gradient(90deg, #2563eb, #06b6d4);
        }
        .stat-label {
          font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;
          color: #94a3b8; font-weight: 600; margin-bottom: 10px;
        }
        .stat-value {
          font-family: 'Syne', sans-serif; font-size: 2.2rem;
          font-weight: 800; color: #0f172a; line-height: 1;
        }
        .stat-sub { font-size: 0.8rem; color: #64748b; margin-top: 6px; }

        /* TABLE */
        .table-card {
          background: white; border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .table-header {
          padding: 20px 24px; border-bottom: 1px solid #f1f5f9;
          display: flex; justify-content: space-between; align-items: center;
        }
        .table-title {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 1rem; color: #0f172a;
        }
        .table-count {
          font-size: 0.8rem; color: #94a3b8; background: #f8fafc;
          padding: 4px 10px; border-radius: 20px; border: 1px solid #e2e8f0;
        }
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #f8fafc; }
        th {
          padding: 12px 20px; text-align: left; font-size: 0.72rem;
          text-transform: uppercase; letter-spacing: 1px;
          color: #94a3b8; font-weight: 600; border-bottom: 1px solid #f1f5f9;
        }
        td { padding: 16px 20px; font-size: 0.875rem; color: #334155; border-bottom: 1px solid #f8fafc; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #fafbff; }
        .call-row { cursor: pointer; transition: background 0.15s; }
        .outcome-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;
        }
        .summary-row td {
          background: #f8fafc; padding: 16px 24px;
          font-size: 0.85rem; color: #475569; line-height: 1.7;
          border-left: 3px solid #2563eb;
        }
        .empty-state {
          text-align: center; padding: 60px 20px; color: #94a3b8;
        }
        .empty-icon { font-size: 2.5rem; margin-bottom: 12px; }
        .empty-title { font-family: 'Syne', sans-serif; font-size: 1.1rem; color: #475569; font-weight: 700; margin-bottom: 6px; }
      `}</style>

      <div className="shell">
        <div className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-text">Karna<span>Connect</span></div>
            <div className="sidebar-logo-sub">AI Command Centre</div>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-item active">
              <span className="nav-icon">📞</span> Call Dashboard
            </div>
            <div className="nav-item">
              <span className="nav-icon">👥</span> Clients
            </div>
            <div className="nav-item">
              <span className="nav-icon">🤖</span> Agents
            </div>
            <div className="nav-item">
              <span className="nav-icon">📊</span> Analytics
            </div>
            <div className="nav-item">
              <span className="nav-icon">⚙️</span> Settings
            </div>
          </nav>
          <div className="sidebar-footer">
            <span className="status-dot"></span>Mash is live
          </div>
        </div>

        <main className="main">
          <div className="topbar">
            <div>
              <div className="topbar-title">Call Dashboard</div>
              <div className="topbar-date">{new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            <div className="topbar-badge">⚡ Live</div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Calls</div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-sub">All time</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Today's Calls</div>
              <div className="stat-value">{stats.today}</div>
              <div className="stat-sub">{new Date().toLocaleDateString('en-AU')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg Duration</div>
              <div className="stat-value">{stats.avgDuration}<span style={{fontSize:'1rem', fontWeight:400}}> s</span></div>
              <div className="stat-sub">Seconds per call</div>
            </div>
          </div>

          <div className="table-card">
            <div className="table-header">
              <div className="table-title">Recent Calls</div>
              <div className="table-count">{calls.length} total</div>
            </div>
            {calls.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <div className="empty-title">No calls yet</div>
                <div>Once Mash handles calls, they'll appear here automatically.</div>
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
                        <td>{new Date(call.created_at).toLocaleString('en-AU')}</td>
                        <td style={{fontWeight: 500}}>{call.caller_number || 'Unknown'}</td>
                        <td>{call.call_duration ? `${parseFloat(call.call_duration).toFixed(0)}s` : '-'}</td>
                        <td>
                          <span className="outcome-badge" style={{
                            background: outcomeColor(call.call_outcome) + '18',
                            color: outcomeColor(call.call_outcome)
                          }}>
                            ● {outcomeLabel(call.call_outcome)}
                          </span>
                        </td>
                        <td style={{color: call.call_summary ? '#2563eb' : '#cbd5e1'}}>
                          {call.call_summary ? '▼ View summary' : '—'}
                        </td>
                      </tr>
                      {expanded === call.id && call.call_summary && (
                        <tr key={call.id + '-exp'}>
                          <td colSpan={5} className="summary-row">
                            <strong style={{color:'#0f172a'}}>AI Call Summary</strong><br />{call.call_summary}
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
