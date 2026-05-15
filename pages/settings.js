import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '../components/Sidebar'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)

const PERTH = 'Australia/Perth'

export default function Settings() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [activeTab, setActiveTab] = useState('account')
  const [clientData, setClientData] = useState(null)
  const [clients, setClients] = useState([])
  const [plans, setPlans] = useState([])

  // Account form
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [saveMsg, setSaveMsg] = useState('')

  // Password form
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')

  // Admin client management
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [planMsg, setPlanMsg] = useState('')

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
          .from('clients').select('id, business_name, contact_name, contact_email, phone_number, monthly_minutes_used, plan_id, active').eq('active', true)
        if (allClients) setClients(allClients)
        const { data: allPlans } = await supabase.from('plans').select('*')
        if (allPlans) setPlans(allPlans)
      } else if (userClient && userClient.client_id) {
        const { data: cd } = await supabase.from('clients')
          .select('business_name, contact_name, contact_email, phone_number')
          .eq('id', userClient.client_id).single()
        if (cd) {
          setClientData(cd)
          setContactName(cd.contact_name || '')
          setContactEmail(cd.contact_email || '')
          setContactPhone(cd.phone_number || '')
        }
      }
    }
    init()
  }, [user])

  async function handleSaveAccount() {
    const { data: userClient } = await supabase
      .from('user_clients').select('client_id')
      .eq('user_id', user.id).single()

    if (!userClient?.client_id) return

    const { error } = await supabase.from('clients').update({
      contact_name: contactName,
      contact_email: contactEmail,
      phone_number: contactPhone
    }).eq('id', userClient.client_id)

    setSaveMsg(error ? '❌ Error saving. Please try again.' : '✅ Details saved successfully.')
    setTimeout(() => setSaveMsg(''), 3000)
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordMsg('❌ Passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg('❌ Password must be at least 8 characters.')
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordMsg(error ? '❌ Error updating password.' : '✅ Password updated successfully.')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPasswordMsg(''), 3000)
  }

  async function handleResetMinutes() {
    if (!selectedClientId) return
    const { error } = await supabase.from('clients')
      .update({ monthly_minutes_used: 0, billing_start_date: new Date().toISOString().split('T')[0] })
      .eq('id', selectedClientId)
    setResetMsg(error ? '❌ Error resetting minutes.' : '✅ Minutes reset successfully.')
    setTimeout(() => setResetMsg(''), 3000)
  }

  async function handleChangePlan() {
    if (!selectedClientId || !selectedPlanId) return
    const { error } = await supabase.from('clients')
      .update({ plan_id: selectedPlanId })
      .eq('id', selectedClientId)
    setPlanMsg(error ? '❌ Error updating plan.' : '✅ Plan updated successfully.')
    setTimeout(() => setPlanMsg(''), 3000)
  }

  async function handleExportData() {
    const { data: userClient } = await supabase
      .from('user_clients').select('client_id')
      .eq('user_id', user.id).single()

    let query = supabase.from('calls').select('*').order('created_at', { ascending: false })
    if (userClient?.client_id) query = query.eq('client_id', userClient.client_id)

    const { data } = await query
    if (!data) return

    const csv = [
      ['Date', 'Caller', 'Duration (s)', 'Outcome', 'Summary'].join(','),
      ...data.map(c => [
        new Date(c.created_at).toLocaleString('en-AU', { timeZone: PERTH }),
        c.caller_number || '',
        c.call_duration || '',
        c.call_outcome || '',
        `"${(c.call_summary || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `calls-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eef2f9', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.9rem', color: '#94a3b8' }}>
      Loading...
    </div>
  )

  const tabs = isAdmin
    ? [{ id: 'account', label: '👤 Account' }, { id: 'clients', label: '👥 Client Management' }, { id: 'password', label: '🔒 Password' }]
    : [{ id: 'account', label: '👤 Account' }, { id: 'password', label: '🔒 Password' }, { id: 'export', label: '📥 Export Data' }]

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
        .tabs { display:flex; gap:4px; background:#fff; border-radius:12px; padding:6px; border:1px solid #e2e8f5; box-shadow:0 1px 4px rgba(8,17,43,0.05); margin-bottom:24px; width:fit-content; }
        .tab { padding:8px 18px; border-radius:8px; font-size:0.83rem; font-weight:600; cursor:pointer; color:#64748b; transition:all 0.15s; white-space:nowrap; }
        .tab.active { background:linear-gradient(135deg,#2563eb,#06b6d4); color:#fff; box-shadow:0 2px 8px rgba(37,99,235,0.3); }
        .tab:hover:not(.active) { background:#f1f5f9; color:#1a1535; }
        .card { background:#fff; border-radius:14px; border:1px solid #e2e8f5; box-shadow:0 1px 4px rgba(8,17,43,0.05); padding:28px; margin-bottom:20px; }
        .card-title { font-size:1rem; font-weight:700; color:#1a1535; margin-bottom:6px; }
        .card-sub { font-size:0.82rem; color:#94a3b8; margin-bottom:24px; }
        .field-label { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-bottom:6px; display:block; }
        .field { width:100%; padding:11px 14px; border-radius:8px; border:1.5px solid #e2e8f0; font-size:0.875rem; font-family:'Plus Jakarta Sans',sans-serif; color:#1a1535; outline:none; margin-bottom:16px; transition:border-color 0.2s; background:#fff; }
        .field:focus { border-color:#2563eb; }
        .field:disabled { background:#f8fafc; color:#94a3b8; }
        .btn-primary { padding:11px 24px; background:linear-gradient(135deg,#2563eb,#06b6d4); color:#fff; font-size:0.875rem; font-weight:700; border:none; border-radius:8px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; box-shadow:0 2px 8px rgba(37,99,235,0.25); transition:opacity 0.2s; }
        .btn-primary:hover { opacity:0.9; }
        .btn-danger { padding:11px 24px; background:#ef4444; color:#fff; font-size:0.875rem; font-weight:700; border:none; border-radius:8px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:opacity 0.2s; }
        .btn-danger:hover { opacity:0.9; }
        .btn-secondary { padding:11px 24px; background:#f8fafc; color:#64748b; font-size:0.875rem; font-weight:600; border:1.5px solid #e2e8f0; border-radius:8px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.2s; }
        .btn-secondary:hover { border-color:#2563eb; color:#2563eb; }
        .msg { font-size:0.82rem; font-weight:600; margin-top:10px; }
        .divider { border:none; border-top:1px solid #f1f5f9; margin:20px 0; }
        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .client-row { display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #f1f5f9; font-size:0.875rem; }
        .client-row:last-child { border-bottom:none; }
        .overlay { display:none; position:fixed; inset:0; background:rgba(8,17,43,0.5); z-index:150; backdrop-filter:blur(2px); }
        .overlay.show { display:block; }
        @media (max-width:900px) {
          .mobile-topbar { display:flex; }
          .main { margin-left:0; padding:80px 16px 24px; }
          .topbar { flex-direction:column; gap:10px; }
          .page-title { font-size:1.3rem; }
          .tabs { flex-wrap:wrap; width:100%; }
          .grid-2 { grid-template-columns:1fr; }
        }
      `}</style>

      <div className={`overlay ${mobileNav ? 'show' : ''}`} onClick={() => setMobileNav(false)} />

      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setMobileNav(!mobileNav)}>☰</button>
        <div className="mobile-logo">M<span>ash</span></div>
        <div style={{width:'32px'}} />
      </div>

      <div className="layout">
        <Sidebar isAdmin={isAdmin} activePage="settings" mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />

        <main className="main">
          <div className="topbar">
            <div>
              <div className="page-title">Settings</div>
              <div className="page-sub">{isAdmin ? 'Enterprise Admin Settings' : 'Account Settings'}</div>
            </div>
          </div>

          <div className="tabs">
            {tabs.map(t => (
              <div key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </div>
            ))}
          </div>

          {/* ACCOUNT TAB */}
          {activeTab === 'account' && (
            <div className="card">
              <div className="card-title">Contact Details</div>
              <div className="card-sub">{isAdmin ? 'Your KarnaConnect account details' : 'Update your business contact information'}</div>

              <label className="field-label">Full Name</label>
              <input className="field" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Your full name" disabled={isAdmin} />

              <label className="field-label">Email Address</label>
              <input className="field" value={isAdmin ? user?.email : contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Email address" disabled={isAdmin} />

              <label className="field-label">Phone Number</label>
              <input className="field" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Phone number" disabled={isAdmin} />

              {!isAdmin && (
                <>
                  <button className="btn-primary" onClick={handleSaveAccount}>Save Changes</button>
                  {saveMsg && <div className="msg">{saveMsg}</div>}
                </>
              )}
            </div>
          )}

          {/* PASSWORD TAB */}
          {activeTab === 'password' && (
            <div className="card">
              <div className="card-title">Change Password</div>
              <div className="card-sub">Choose a strong password of at least 8 characters</div>

              <label className="field-label">New Password</label>
              <input className="field" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" />

              <label className="field-label">Confirm New Password</label>
              <input className="field" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />

              <button className="btn-primary" onClick={handleChangePassword}>Update Password</button>
              {passwordMsg && <div className="msg">{passwordMsg}</div>}
            </div>
          )}

          {/* EXPORT TAB — clients only */}
          {activeTab === 'export' && !isAdmin && (
            <div className="card">
              <div className="card-title">Export Call Data</div>
              <div className="card-sub">Download all your call records as a CSV file — opens in Excel or Google Sheets</div>
              <button className="btn-secondary" onClick={handleExportData}>📥 Download CSV Export</button>
            </div>
          )}

          {/* CLIENT MANAGEMENT TAB — admin only */}
          {activeTab === 'clients' && isAdmin && (
            <>
              {/* Change plan */}
              <div className="card">
                <div className="card-title">Change Client Plan</div>
                <div className="card-sub">Upgrade or downgrade a client's subscription plan</div>
                <div className="grid-2">
                  <div>
                    <label className="field-label">Select Client</label>
                    <select className="field" value={selectedClientId} onChange={e => { setSelectedClientId(e.target.value); setSelectedPlanId(clients.find(c => c.id === e.target.value)?.plan_id || '') }}>
                      <option value="">— Select client —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">New Plan</label>
                    <select className="field" value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)}>
                      <option value="">— Select plan —</option>
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price_per_month}/mo ({p.minutes_per_month} min)</option>)}
                    </select>
                  </div>
                </div>
                <button className="btn-primary" onClick={handleChangePlan}>Update Plan</button>
                {planMsg && <div className="msg">{planMsg}</div>}
              </div>

              {/* Reset minutes */}
              <div className="card">
                <div className="card-title">Reset Monthly Minutes</div>
                <div className="card-sub">Reset a client's monthly usage counter — do this at the start of each billing cycle</div>
                <label className="field-label">Select Client</label>
                <select className="field" style={{maxWidth:'360px'}} value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                  <option value="">— Select client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.business_name} — {Math.round(c.monthly_minutes_used || 0)} min used</option>)}
                </select>
                <button className="btn-danger" onClick={handleResetMinutes}>Reset Minutes to Zero</button>
                {resetMsg && <div className="msg">{resetMsg}</div>}
              </div>

              {/* Client overview */}
              <div className="card">
                <div className="card-title">All Clients Overview</div>
                <div className="card-sub">Quick view of all active clients and their current plan</div>
                {clients.map(c => (
                  <div key={c.id} className="client-row">
                    <div>
                      <div style={{fontWeight:'700', color:'#1a1535', fontSize:'0.875rem'}}>{c.business_name}</div>
                      <div style={{fontSize:'0.75rem', color:'#94a3b8', marginTop:'2px'}}>{c.contact_email}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:'0.78rem', fontWeight:'700', color:'#2563eb'}}>{plans.find(p => p.id === c.plan_id)?.name || 'No plan'}</div>
                      <div style={{fontSize:'0.72rem', color:'#94a3b8', marginTop:'2px'}}>{Math.round(c.monthly_minutes_used || 0)} min used</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}
