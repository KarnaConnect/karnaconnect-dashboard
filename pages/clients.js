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
        const { data: allClients } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
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
    const action = currentStatus ? 'deactivate' : 'activate'
    if (!confirm(`Are you sure you want to ${action} this client?`)) return
    const { error } = await supabase.from('clients').update({ active: !currentStatus }).eq('id', clientId)
    if (error) alert('Error updating client status: ' + error.message)
    else setClients(prev => prev.map(c => c.id === clientId ? { ...c, active: !currentStatus } : c))
  }

  async function updateClientPlan(clientId, planId) {
    const { error } = await supabase.from('clients').update({ plan_id: planId || null }).eq('id', clientId)
    if (error) alert('Error updating plan: ' + error.message)
    else setClients(prev => prev.map(c => c.id === clientId ? { ...c, plan_id: planId || null } : c))
  }

  function viewAsClient(client) {
    sessionStorage.setItem('impersonating', JSON.stringify({ clientId: client.id, clientName: client.business_name }))
    window.location.href = '/'
  }

  async function assignTrial(clientId) {
    if (!confirm('Assign a 7-day free trial to this client?')) return
    const trialExpiry = new Date()
    trialExpiry.setDate(trialExpiry.getDate() + 7)
    const { error } = await supabase.from('clients').update({
      plan_id: '84d891b4-c10c-4f39-ab8b-60e0821604ac',
      is_trial: true,
      trial_expires_at: trialExpiry.toISOString().split('T')[0],
      active: true
    }).eq('id', clientId)
    if (error) { alert('Error assigning trial: ' + error.message); return }
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, plan_id: '84d891b4-c10c-4f39-ab8b-60e0821604ac', is_trial: true, trial_expires_at: trialExpiry.toISOString().split('T')[0], active: true } : c))
    alert('Trial assigned! Client now has 7 days access.')
  }

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
        .topbar-right { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .search-wrap { position:relative; }
        .search-input { padding:9px 14px 9px 36px; border-radius:10px; border:1.5px solid #ece9f6; font-size:0.875rem; font-family:'Plus Jakarta Sans',sans-serif; color:#151129; outline:none; background:#fff; width:240px; }
        .search-input:focus { border-color:#6f5fd6; }
        .search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:0.85rem; color:#9691b3; }
        .add-btn { display:flex; align-items:center; gap:7px; padding:9px 16px; background:linear-gradient(135deg,#6f5fd6,#8f86e8); color:#fff; font-size:0.82rem; font-weight:700; border:none; border-radius:10px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; box-shadow:0 2px 8px rgba(111,95,214,0.25); white-space:nowrap; }
        .stats-row { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:24px; }
        .stat-card { background:#fff; border-radius:14px; padding:20px; border:1px solid #ece9f6; box-shadow:0 1px 4px rgba(21,17,41,0.05); position:relative; overflow:hidden; }
        .stat-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; }
        .s1::after { background:linear-gradient(90deg,#6f5fd6,#8f86e8); }
        .s2::after { background:linear-gradient(90deg,#10a15c,#34d399); }
        .s3::after { background:linear-gradient(90deg,#c68a1d,#fbbf24); }
        .stat-label { font-size:0.68rem; text-transform:uppercase; letter-spacing:1.2px; color:#9691b3; font-weight:700; margin-bottom:6px; }
        .stat-value { font-size:1.8rem; font-weight:800; color:#151129; line-height:1; }
        .stat-sub { font-size:0.72rem; color:#9691b3; margin-top:5px; }
        .table-card { background:#fff; border-radius:14px; border:1px solid #ece9f6; box-shadow:0 1px 4px rgba(21,17,41,0.05); overflow:hidden; }
        .table-hdr { padding:18px 22px; border-bottom:1px solid #f4f2f9; display:flex; justify-content:space-between; align-items:center; background:#fbfaff; }
        .table-hdr-title { font-size:0.95rem; font-weight:700; color:#151129; }
        .table-count { font-size:0.75rem; color:#9691b3; background:#f1eefb; padding:3px 11px; border-radius:20px; font-weight:600; }
        table { width:100%; border-collapse:collapse; }
        thead tr { background:#fbfaff; }
        th { padding:10px 18px; text-align:left; font-size:0.67rem; text-transform:uppercase; letter-spacing:1.2px; color:#9691b3; font-weight:700; border-bottom:1px solid #f4f2f9; white-space:nowrap; }
        td { padding:14px 18px; font-size:0.845rem; color:#334155; border-bottom:1px solid #f8f7fc; vertical-align:middle; }
        tbody tr:last-child td { border-bottom:none; }
        tbody tr:hover td { background:#fbfaff; }
        .client-name { font-weight:700; color:#151129; }
        .client-email { font-size:0.78rem; color:#9691b3; margin-top:2px; }
        .usage-wrap { min-width:120px; }
        .usage-bar { background:#f1eefb; border-radius:999px; height:5px; overflow:hidden; margin-top:4px; }
        .usage-fill { height:100%; border-radius:999px; }
        .usage-text { font-size:0.72rem; color:#64748b; }
        .status-dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:6px; }
        .status-active { background:#10a15c; }
        .status-inactive { background:#9691b3; }
        .action-btn { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:7px; border:1px solid #ece9f6; background:#fbfaff; cursor:pointer; font-size:0.85rem; margin-right:3px; }
        .action-btn:hover { border-color:#6f5fd6; background:#f1eefb; }
        .vapi-id { font-family:'JetBrains Mono',monospace; font-size:0.7rem; color:#9691b3; }
        .empty-state { text-align:center; padding:60px 20px; }
        .empty-title { font-size:1.05rem; font-weight:800; color:#151129; margin-bottom:5px; }
        .empty-sub { font-size:0.84rem; color:#9691b3; }
        .mobile-client-cards { display:none; }
        .client-mobile-card { background:#fff; border-radius:12px; border:1px solid #ece9f6; padding:16px; margin-bottom:12px; box-shadow:0 1px 4px rgba(21,17,41,0.05); }
        .client-mobile-card-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
        .client-mobile-actions { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; }
        .plan-select { padding:3px 6px; border-radius:8px; border:1.5px solid #ece9f6; font-size:0.78rem; font-family:'Plus Jakarta Sans',sans-serif; color:#334155; background:#fff; cursor:pointer; outline:none; max-width:130px; }
        .plan-select:focus { border-color:#6f5fd6; }
        .overlay { display:none; position:fixed; inset:0; background:rgba(10,8,24,0.5); z-index:150; backdrop-filter:blur(2px); }
        .overlay.show { display:block; }
        @media (max-width:900px) {
          .main { margin-left:0; padding:76px 16px 100px; }
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
                <input className="search-input" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button className="add-btn" onClick={() => window.open('/onboarding', '_blank')}>+ Add Client</button>
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
              <div className="stat-value">${clients.reduce((sum, c) => { const plan = plans.find(p => p.id === c.plan_id); return sum + (plan?.price_per_month || 0) }, 0)}</div>
              <div className="stat-sub">Recurring</div>
            </div>
          </div>

          <div className="table-card">
            <div className="table-hdr">
              <div className="table-hdr-title">All Clients</div>
              <div className="table-count">{filtered.length} clients</div>
            </div>
            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-title">{search ? 'No clients found' : 'No clients yet'}</div>
                <div className="empty-sub">{search ? 'Try a different search' : 'Add your first client using the onboarding form'}</div>
              </div>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>Business</th><th>Contact</th><th>Plan</th><th>Usage</th><th>Agent ID</th><th>Status</th><th>Joined</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(client => {
                      const pct = getUsagePct(client)
                      const barColor = pct > 90 ? '#d6362f' : pct > 70 ? '#c68a1d' : '#6f5fd6'
                      return (
                        <tr key={client.id}>
                          <td>
                            <div className="client-name">{client.business_name}</div>
                            <div className="client-email">{client.contact_email}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.84rem', fontWeight: '500' }}>{client.contact_name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#9691b3' }}>{client.phone_number}</div>
                          </td>
                          <td>
                            <select className="plan-select" value={client.plan_id || ''} onChange={e => updateClientPlan(client.id, e.target.value)}>
                              <option value="">No plan</option>
                              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </td>
                          <td>
                            <div className="usage-wrap">
                              <div className="usage-text">{Math.round(client.monthly_minutes_used || 0)} min used</div>
                              <div className="usage-bar"><div className="usage-fill" style={{ width: pct + '%', background: barColor }} /></div>
                            </div>
                          </td>
                          <td><div className="vapi-id">{client.vapi_agent_id ? client.vapi_agent_id.substring(0, 12) + '...' : '—'}</div></td>
                          <td><span className={`status-dot status-${client.active ? 'active' : 'inactive'}`} />{client.active ? 'Active' : 'Inactive'}</td>
                          <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>{client.created_at ? new Date(client.created_at).toLocaleDateString('en-AU', { timeZone: PERTH }) : '—'}</td>
                          <td>
                            <span className="action-btn" title="View as Client" onClick={() => viewAsClient(client)}>👁</span>
                            <span className="action-btn" title="Usage & Billing" onClick={() => window.location.href = '/usage'}>💳</span>
                            <span className="action-btn" title="View in VAPI" onClick={() => window.open('https://dashboard.vapi.ai', '_blank')}>🤖</span>
                            <span className="action-btn" title={client.active ? 'Deactivate' : 'Activate'} onClick={() => toggleClientStatus(client.id, client.active)} style={{ color: client.active ? '#d6362f' : '#10a15c' }}>{client.active ? '🔴' : '🟢'}</span>
                            <span className="action-btn" title="Assign Trial" onClick={() => assignTrial(client.id)} style={{ color: '#6f5fd6' }}>🎯</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div className="mobile-client-cards">
                  {filtered.map(client => {
                    const pct = getUsagePct(client)
                    const barColor = pct > 90 ? '#d6362f' : pct > 70 ? '#c68a1d' : '#6f5fd6'
                    return (
                      <div key={client.id} className="client-mobile-card">
                        <div className="client-mobile-card-top">
                          <div>
                            <div className="client-name">{client.business_name}</div>
                            <div className="client-email">{client.contact_email}</div>
                            <div style={{ marginTop: '6px' }}>
                              <select className="plan-select" value={client.plan_id || ''} onChange={e => updateClientPlan(client.id, e.target.value)}>
                                <option value="">No plan</option>
                                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={`status-dot status-${client.active ? 'active' : 'inactive'}`} />
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{client.active ? 'Active' : 'Inactive'}</span>
                          </div>
                        </div>
                        <div className="usage-wrap">
                          <div className="usage-text">{Math.round(client.monthly_minutes_used || 0)} min used</div>
                          <div className="usage-bar"><div className="usage-fill" style={{ width: pct + '%', background: barColor }} /></div>
                        </div>
                        <div className="client-mobile-actions">
                          <span className="action-btn" title="View as Client" onClick={() => viewAsClient(client)}>👁</span>
                          <span className="action-btn" title="Billing" onClick={() => window.location.href = '/usage'}>💳</span>
                          <span className="action-btn" title="VAPI" onClick={() => window.open('https://dashboard.vapi.ai', '_blank')}>🤖</span>
                          <span className="action-btn" onClick={() => toggleClientStatus(client.id, client.active)} style={{ color: client.active ? '#d6362f' : '#10a15c' }}>{client.active ? '🔴' : '🟢'}</span>
                          <span className="action-btn" onClick={() => assignTrial(client.id)} style={{ color: '#6f5fd6' }}>🎯</span>
                        </div>
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
