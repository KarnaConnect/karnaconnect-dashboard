import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)

const PERTH = 'Australia/Perth'
const perthDate = (ts) => new Date(ts).toLocaleString('en-AU', { 
  timeZone: PERTH, 
  day: '2-digit', 
  month: 'short', 
  hour: '2-digit', 
  minute: '2-digit' 
})
const perthDateShort = (ts) => new Date(ts).toLocaleDateString('en-AU', { timeZone: PERTH })
const isToday = (ts) => perthDateShort(ts) === perthDateShort(new Date())

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
  const [clientName, setClientName] = useState('Global Overview')

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
        const { data: cd } = await supabase.from('clients').select('business_name')
          .eq('id', userClient.client_id).single()
        if (cd) setClientName(cd.business_name)
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
      setClientName('Global Overview')
      await fetchCalls(null)
    } else {
      const client = clients.find(c => c.id === clientId)
      if (client) setClientName(client.business_name)
      await fetchCalls(clientId)
    }
  }

  const togglePanel = (callId, panel) => {
    setExpanded(prev => ({ ...prev, [callId]: prev[callId] === panel ? null : panel }))
  }

  const statCards = [
    { label: 'Total Volume', value: stats.total, sub: 'Lifetime calls', color: '#3b82f6' },
    { label: 'Today', value: stats.today, sub: 'New interactions', color: '#10b981' },
    { label: 'Avg Session', value: stats.avgDuration, unit: 's', sub: 'Handling time', color: '#f59e0b' },
    { label: 'Success Rate', value: stats.total > 0 ? Math.round((stats.completed/stats.total)*100) : 0, unit: '%', sub: 'Completion', color: '#8b5cf6' },
  ]

  if (authLoading) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', color:'#64748b', fontWeight:700}}>Refining Interface...</div>

  return (
    <div className="dashboard-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');
        :root { --bg: #f8fafc; --sidebar: #0f172a; --accent: #2563eb; --text-main: #1e293b; --text-muted: #64748b; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text-main); }
        .dashboard-container { display: flex; min-height: 100vh; }
        .sidebar { width: 280px; background: var(--sidebar); color: white; padding: 32px 20px; position: fixed; height: 100vh; z-index: 1000; }
        .logo-section { display: flex; align-items: center; gap: 12px; margin-bottom: 40px; }
        .logo-box { background: linear-gradient(135deg, #3b82f6, #2563eb); width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
        .logo-text { font-weight: 800; font-size: 1.25rem; letter-spacing: -0.5px; }
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; cursor: pointer; color: #94a3b8; margin-bottom: 4px; transition: 0.2s; }
        .nav-item.active { background: rgba(37,99,235,0.15); color: #60a5fa; }
        .main-content { flex: 1; margin-left: 280px; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .live-status { background: white; padding: 8px 16px; border-radius: 99px; display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 700; border: 1px solid #e2e8f0; }
        .pulse { width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16,185,129, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16,185,129, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16,185,129, 0); } }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px; }
        .stat-card { background: white; padding: 24px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .stat-val { font-size: 2rem; font-weight: 800; margin: 8px 0; }
        .content-card { background: white; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; }
        .table-header { padding: 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 16px 24px; font-size: 0.75rem; color: var(--text-muted); background: #f8fafc; }
        td { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
        .caller-id { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--accent); }
        .icon-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid #e2e8f0; cursor: pointer; background: white; transition: 0.2s; }
        .icon-btn.active { background: var(--sidebar); color: white; }
        .expand-box { background: #f8fafc; padding: 24px; border-radius: 16px; margin: 10px 24px 24px; border: 1px dashed #cbd5e1; }
        @media (max-width: 1024px) { .sidebar { width: 80px; } .logo-text, .nav-text { display: none; } .main-content { margin-left: 80px; } .stats-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-box">⚛</div>
          <div className="logo-text">Karna<span>Connect</span></div>
        </div>
        <nav style={{ flex: 1 }}>
          <div className="nav-item active">📊 <span className="nav-text">Dashboard</span></div>
          <div className="nav-item">👥 <span className="nav-text">Clients</span></div>
        </nav>
        <div className="nav-item" onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}>
          🚪 <span className="nav-text">Logout</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div>
            <h1 style={{fontSize: '1.75rem', fontWeight: 800}}>Call Intel</h1>
            <p style={{color: 'var(--text-muted)'}}>{clientName}</p>
          </div>
          <div className="live-status">
            <div className="pulse" />
            LIVE MONITORING | {time.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </header>

        <section className="stats-grid">
          {statCards.map(s => (
            <div key={s.label} className="stat-card">
              <div style={{fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)'}}>{s.label}</div>
              <div className="stat-val" style={{ color: s.color }}>{s.value}{s.unit}</div>
              <div style={{fontSize: '0.75rem', color: '#94a3b8'}}>{s.sub}</div>
            </div>
          ))}
        </section>

        <div className="content-card">
          <div className="table-header">
            <h3 style={{fontWeight: 700}}>Recent Activity</h3>
            {isAdmin && (
              <select style={{padding: '8px', borderRadius: '8px'}} onChange={(e) => handleClientChange(e.target.value)}>
                <option value="all">All Clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
              </select>
            )}
          </div>

          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Caller</th>
                <th>Outcome</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {calls.map(call => (
                <div key={call.id} style={{ display: 'contents' }}>
                  <tr>
                    <td>{perthDate(call.created_at)}</td>
                    <td className="caller-id">{call.caller_number || 'Unknown'}</td>
                    <td>{call.call_outcome || 'In Progress'}</td>
                    <td>
                      <button className={`icon-btn ${expanded[call.id] === 'summary' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'summary')}>📄</button>
                      <button className={`icon-btn ${expanded[call.id] === 'transcript' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'transcript')}>📋</button>
                    </td>
                  </tr>
                  {expanded[call.id] && (
                    <tr>
                      <td colSpan="4">
                        <div className="expand-box">
                          {expanded[call.id] === 'summary' ? (
                            <p>{call.call_summary || 'No summary.'}</p>
                          ) : (
                            <div style={{maxHeight: '200px', overflowY: 'auto'}}>
                              {call.full_transcript || 'No transcript.'}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </div>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
