import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '../components/Sidebar'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)

const PERTH = 'Australia/Perth'

export default function Clients() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [clients, setClients] = useState([])
  const [plans, setPlans] = useState([])
  const [mobileNav, setMobileNav] = useState(false)
  const [search, setSearch] = useState('')

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
          .select('*')
          .order('created_at', { ascending: false })
        if (allClients) setClients(allClients)

        const { data: allPlans } = await supabase.from('plans').select('*')
        if (allPlans) setPlans(allPlans)
      } else {
        window.location.href = '/'
      }
    }
    init()
  }, [user])

  const filtered = clients.filter(c =>
    c.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_email?.toLowerCase().includes(search.toLowerCase())
  )

  function getPlanName(planId) {
    return plans.find(p => p.id === planId)?.name || 'No plan'
  }

  function getUsagePct(client) {
    const plan = plans.find(p => p.id === client.plan_id)
    if (!plan) return 0
    return Math.min((client.monthly_minutes_used || 0) / plan.minutes_per_month * 100, 100)
  }
async function toggleClientStatus(clientId, currentStatus) {
  async function assignTrial(clientId) {
    if (!confirm('Assign a 7-day free trial to this client?')) return

    const trialExpiry = new Date()
    trialExpiry.setDate(trialExpiry.getDate() + 7)

    const { error } = await supabase
      .from('clients')
      .update({
        plan_id: '84d891b4-c10c-4f39-ab8b-60e0821604ac',
        is_trial: true,
        trial_expires_at: trialExpiry.toISOString().split('T')[0],
        active: true
      })
      .eq('id', clientId)

    if (error) {
      alert('Error assigning trial: ' + error.message)
    } else {
      setClients(prev => prev.map(c =>
        c.id === clientId ? {
          ...c,
          plan_id: '84d891b4-c10c-4f39-ab8b-60e0821604ac',
          is_trial: true,
          trial_expires_at: trialExpiry.toISOString().split('T')[0],
          active: true
        } : c
      ))
      alert('Trial assigned successfully! Client now has 7 days access.')
    }
  }
    const action = currentStatus ? 'deactivate' : 'activate'
    if (!confirm(`Are you sure you want to ${action} this client?`)) return

    const { error } = await supabase
      .from('clients')
      .update({ active: !currentStatus })
      .eq('id', clientId)

    if (error) {
      alert('Error updating client status: ' + error.message)
    } else {
      setClients(prev => prev.map(c => 
        c.id === clientId ? { ...c, active: !currentStatus } : c
      ))
    }
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
        .mobile-topbar { display:none; position:fixed; top:0; left:0; right:0; z-index:100; background:#1a1535; padding:14px 20px; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(37,99,235,0.15); }
        .hamburger { background:none; border:none; color:#94a3b8; font-size:1.3rem; cursor:pointer; padding:4px; }
        .mobile-logo { font-size:1.05rem; font-weight:800; color:#fff; }
        .mobile-logo span { color:#06b6d4; }
        .main { margin-left:240px; flex:1; padding:36px 32px; min-height:100vh; }
        .topbar { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; gap:12px; }
        .page-title { font-size:1.6rem; font-weight:800; color:#1a1535; letter-spacing:-0.6px; }
        .page-sub { font-size:0.82rem; color:#94a3b8; margin-top:3px; }
        .topbar-right { display:flex; align-items:center; gap:10px; }
        .search-wrap { position:relative; }
        .search-input { padding:9px 14px 9px 36px; border-radius:10px; border:1.5px solid #e2e8f0; font-size:0.875rem; font-family:'Plus Jakarta Sans',sans-serif; color:#1a1535; outline:none; background:#fff; width:240px; transition:border-color 0.2s; }
        .search-input:focus { border-color:#2563eb; }
        .search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:0.85rem; color:#94a3b8; }
        .add-btn { display:flex; align-items:center; gap:7px; padding:9px 16px; background:linear-gradient(135deg,#2563eb,#06b6d4); color:#fff; font-size:0.82rem; font-weight:700; border:none; border-radius:10px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; box-shadow:0 2px 8px rgba(37,99,235,0.25); white-space:nowrap; }
        .add-btn:hover { opacity:0.9; }
        .stats-row { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:24px; }
        .stat-card { background:#fff; border-radius:14px; padding:20px; border:1px solid #e2e8f5; box-shadow:0 1px 4px rgba(8,17,43,0.05); position:relative; overflow:hidden; }
        .stat-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; }
        .s1::after { background:linear-gradient(90deg,#2563eb,#06b6d4); }
        .s2::after { background:linear-gradient(90deg,#10b981,#34d399); }
        .s3::after { background:linear-gradient(90deg,#f59e0b,#fbbf24); }
        .stat-label { font-size:0.68rem; text-transform:uppercase; letter-spacing:1.2px; color:#94a3b8; font-weight:700; margin-bottom:6px; }
        .stat-value { font-size:1.8rem; font-weight:800; color:#1a1535; line-height:1; }
        .stat-sub { font-size:0.72rem; color:#94a3b8; margin-top:5px; }
        .table-card { background:#fff; border-radius:14px; border:1px solid #e2e8f5; box-shadow:0 1px 4px rgba(8,17,43,0.05); overflow:hidden; }
        .table-hdr { padding:18px 22px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg,#fafbff,#f8fafc); }
        .table-hdr-title { font-size:0.95rem; font-weight:700; color:#1a1535; }
        .table-count { font-size:0.75rem; color:#94a3b8; background:#f1f5f9; padding:3px 11px; border-radius:20px; border:1px solid #e2e8f0; font-weight:600; }
        table { width:100%; border-collapse:collapse; }
        thead tr { background:#fafbff; }
        th { padding:10px 18px; text-align:left; font-size:0.67rem; text-transform:uppercase; letter-spacing:1.2px; color:#94a3b8; font-weight:700; border-bottom:1px solid #f1f5f9; white-space:nowrap; }
        td { padding:14px 18px; font-size:0.845rem; color:#334155; border-bottom:1px solid #f8fafc; vertical-align:middle; }
        tbody tr:last-child td { border-bottom:none; }
        tbody tr:hover td { background:#fafbff; }
        .client-name { font-weight:700; color:#1a1535; }
        .client-email { font-size:0.78rem; color:#94a3b8; margin-top:2px; }
        .plan-badge { display:inline-flex; align-items:center; padding:3px 9px; border-radius:20px; font-size:0.72rem; font-weight:700; }
        .plan-Basic { background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; }
        .plan-Standard { background:#f0fdf4; color:#10b981; border:1px solid #bbf7d0; }
        .plan-Premium { background:#f5f3ff; color:#8b5cf6; border:1px solid #ddd6fe; }
        .plan-none { background:#f8fafc; color:#94a3b8; border:1px solid #e2e8f0; }
        .usage-wrap { min-width:120px; }
        .usage-bar { background:#f1f5f9; border-radius:999px; height:5px; overflow:hidden; margin-top:4px; }
        .usage-fill { height:100%; border-radius:999px; }
        .usage-text { font-size:0.72rem; color:#64748b; }
        .status-dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:6px; }
        .status-active { background:#10b981; }
        .status-inactive { background:#94a3b8; }
        .action-btn { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:7px; border:1px solid #e2e8f0; background:#f8fafc; cursor:pointer; font-size:0.85rem; transition:all 0.15s; margin-right:3px; }
        .action-btn:hover { border-color:#2563eb; background:#eff6ff; }
        .vapi-id { font-family:'JetBrains Mono',monospace; font-size:0.7rem; color:#94a3b8; }
        .empty-state { text-align:center; padding:60px 20px; }
        .empty-icon { width:56px; height:56px; border-radius:14px; background:linear-gradient(135deg,#eff6ff,#e0f2fe); display:flex; align-items:center; justify-content:center; font-size:1.6rem; margin:0 auto 14px; }
        .empty-title { font-size:1.05rem; font-weight:800; color:#1a1535; margin-bottom:5px; }
        .empty-sub { font-size:0.84rem; color:#94a3b8; }
        .overlay { display:none; position:fixed; inset:0; background:rgba(8,17,43,0.5); z-index:150; backdrop-filter:blur(2px); }
        .overlay.show { display:block; }
        @media (max-width:900px) {
  .mobile-topbar { display:flex; }
  .main { margin-left:0; padding:80px 16px 24px; }
  .topbar { flex-direction:column; gap:10px; }
  .page-title { font-size:1.3rem; }
  .stats-row { grid-template-columns:repeat(3,1fr); gap:10px; }
  .search-input { width:100%; }
  .search-wrap { width:100%; }
  table { display:none; }
  .mobile-client-cards { display:block; }
}
      `}</style>

      <div className={`overlay ${mobileNav ? 'show' : ''}`} onClick={() => setMobileNav(false)} />

      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setMobileNav(!mobileNav)}>☰</button>
        <div className="mobile-logo">M<span>ash</span></div>
        <div style={{width:'32px'}} />
      </div>

      <div className="layout">
        <Sidebar isAdmin={isAdmin} activePage="clients" mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />

        <main className="main">
          <div className="topbar">
            <div>
              <div className="page-title">Clients</div>
              <div className="page-sub">Manage all Mash clients</div>
            </div>
            <div className="topbar-right">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input
                  className="search-input"
                  placeholder="Search clients..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button className="add-btn" onClick={() => window.open('/onboarding', '_blank')}>
                + Add Client
              </button>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-card s1">
              <div className="stat-label">Total Clients</div>
              <div className="stat-value">{clients.length}</div>
              <div className="stat-sub">All time</div>
            </div>
            <div className="stat-card s2">
              <div className="stat-label">Active</div>
              <div className="stat-value">{clients.filter(c => c.active).length}</div>
              <div className="stat-sub">Currently live</div>
            </div>
            <div className="stat-card s3">
              <div className="stat-label">Monthly Revenue</div>
              <div className="stat-value">${clients.reduce((sum, c) => {
                const plan = plans.find(p => p.id === c.plan_id)
                return sum + (plan?.price_per_month || 0)
              }, 0)}</div>
              <div className="stat-sub">Recurring</div>
            </div>
          </div>

          <div className="table-card">
            <div className="table-hdr">
              <div className="table-hdr-title">👥 All Clients</div>
              <div className="table-count">{filtered.length} clients</div>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <div className="empty-title">{search ? 'No clients found' : 'No clients yet'}</div>
                <div className="empty-sub">{search ? 'Try a different search term' : 'Add your first client using the onboarding form'}</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Contact</th>
                    <th>Plan</th>
                    <th>Usage</th>
                    <th>Agent ID</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(client => {
                    const pct = getUsagePct(client)
                    const barColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#2563eb'
                    const planName = getPlanName(client.plan_id)
                    return (
                      <tr key={client.id}>
                        <td>
                          <div className="client-name">{client.business_name}</div>
                          <div className="client-email">{client.contact_email}</div>
                        </td>
                        <td>
                          <div style={{fontSize:'0.84rem', fontWeight:'500'}}>{client.contact_name}</div>
                          <div style={{fontSize:'0.75rem', color:'#94a3b8'}}>{client.phone_number}</div>
                        </td>
                        <td>
                          <span className={`plan-badge plan-${planName.replace(' ','') || 'none'}`}>
                            {planName}
                          </span>
                        </td>
                        <td>
                          <div className="usage-wrap">
                            <div className="usage-text">{Math.round(client.monthly_minutes_used || 0)} min used</div>
                            <div className="usage-bar">
                              <div className="usage-fill" style={{ width: pct + '%', background: barColor }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="vapi-id">{client.vapi_agent_id ? client.vapi_agent_id.substring(0, 12) + '...' : '—'}</div>
                        </td>
                        <td>
                          <span className={`status-dot status-${client.active ? 'active' : 'inactive'}`} />
                          {client.active ? 'Active' : 'Inactive'}
                        </td>
                        <td style={{fontSize:'0.78rem', color:'#64748b', whiteSpace:'nowrap'}}>
                          {client.created_at ? new Date(client.created_at).toLocaleDateString('en-AU', { timeZone: PERTH }) : '—'}
                        </td>
                       <td>
  <span className="action-btn" title="View Dashboard" onClick={() => window.location.href = '/?client=' + client.id}>📊</span>
  <span className="action-btn" title="Usage & Billing" onClick={() => window.location.href = '/usage'}>💳</span>
  <span className="action-btn" title="View in VAPI" onClick={() => window.open('https://dashboard.vapi.ai', '_blank')}>🤖</span>
  <span 
    className="action-btn" 
    title={client.active ? 'Deactivate Client' : 'Activate Client'}
    onClick={() => toggleClientStatus(client.id, client.active)}
    style={{color: client.active ? '#ef4444' : '#10b981'}}
  >{client.active ? '🔴' : '🟢'}</span>
    <span 
  className="action-btn" 
  title="Assign 7-day Trial"
  onClick={() => assignTrial(client.id)}
  style={{color: '#534AB7'}}
>🎯</span>
</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
