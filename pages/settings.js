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
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
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
      .from('user_clients').select('client_id').eq('user_id', user.id).single()
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
      .update({ plan_id: selectedPlanId }).eq('id', selectedClientId)
    setPlanMsg(error ? '❌ Error updating plan.' : '✅ Plan updated successfully.')
    setTimeout(() => setPlanMsg(''), 3000)
  }

  async function handleExportData() {
    const { data: userClient } = await supabase
      .from('user_clients').select('client_id').eq('user_id', user.id).single()
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fb', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.9rem', color: '#94a3b8' }}>
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
        body { font-family:'Plus Jakarta Sans',sans-serif; background:#f8f9fb; -webkit-font-smoothing:antialiased; }
        .layout { display:flex; min-height:100vh; }
        .mobile-topbar { display:none; position:fixed; top:0; left:0; right:0; z-index:100; background:#fff; padding:14px 20px; align-items:center; justify-content:space-between; border-bottom:1px solid #f1f5f9; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
        .mobile-logo { font-size:1.05rem; font-weight:800; color:#1a1535; }
        .mobile-logo span { color:#7F77DD; }
        .main { margin-left:240px; flex:1; padding:36px 32px; min-height:100vh; }
        .topbar { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; gap:12px; }
        .page-title { font-size:1.6rem; font-weight:800; color:#0f172a; letter-spacing:-0.6px; }
        .page-sub { font-size:0.82rem; color:#94a3b8; margin-top:3px; }
        .tabs { display:flex; gap:4px; background:#fff; border-radius:12px; padding:6px; border:1px solid #f1f5f9; box-shadow:0 1px 3px rgba(0,0,0,0.04); margin-bottom:24px; width:fit-content; }
        .tab { padding:8px 18px; border-radius:8px; font-size:0.83rem; font-weight:600; cursor:pointer; color:#64748b; transition:all 0.15s; white-space:nowrap; }
        .tab.active { background:linear-gradient(135deg,#534AB7,#7F77DD); color:#fff; box-shadow:0 2px 8px rgba(83,74,183,0.3); }
        .tab:hover:not(.active) { background:#f8f9fb; color:#0f172a; }
        .card { background:#fff; border-radius:14px; border:1px solid #f1f5f9; box-shadow:0 1px 3px rgba(0,0,0,0.04); padding:28px; margin-bottom:20px; }
        .card-title { font-size:1rem; font-weight:700; color:#0f172a; margin-bottom:6px; }
        .card-sub { font-size:0.82rem; color:#94a3b8; margin-bottom:24px; }
        .field-label { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-bottom:6px; display:block; }
        .field { width:100%; padding:11px 14px; border-radius:8px; border:1.5px solid #f1f5f9; font-size:0.875rem; font-family:'Plus Jakarta Sans',sans-serif; color:#0f172a; outline:none; margin-bottom:16px; transition:border-color 0.2s; background:#fff; }
        .field:focus { border-color:#534AB7; }
        .field:disabled { background:#f8f9fb; color:#94a3b8; }
        .btn-primary { padding:11px 24px; background:linear-gradient(135deg,#534AB7,#7F77DD); color:#fff; font-size:0.875rem; font-weight:700; border:none; border-radius:8px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; box-shadow:0 2px 8px rgba(83,74,183,0.25); transition:opacity 0.2s; }
        .btn-primary:hover { opacity:0.9; }
        .btn-danger { padding:11px 24px; background:#ef4444; color:#fff; font-size:0.875rem; font-weight:700; border:none; border-radius:8px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:opacity 0.2s; }
        .btn-danger:hover { opacity:0.9; }
        .btn-secondary { padding:11px 24px; background:#f8f9fb; color:#64748b; font-size:0.875rem; font-weight:600; border:1.5px solid #f1f5f9; border-radius:8px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.2s; }
        .btn-secondary:hover { border-color:#534AB7; color:#534AB7; }
        .msg { font-size:0.82rem; font-weight:600; margin-top:10px; }
        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .client-row { display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #f8f9fb; font-size:0.875rem; }
        .client-row:last-child { border-bottom:none; }
        .mobile-only-logout { display:none; }
        @media (max-width:900px) {
          .mobile-topbar { display:flex; }
          .main { margin-left:0; padding:80px 16px 100px; }
          .topbar { flex-direction:column; gap:10px; }
          .page-title { font-size:1.3rem; }
          .tabs { flex-wrap:wrap; width:100%; }
          .grid-2 { grid-template-columns:1fr; }
          .mobile-only-logout { display:block; }
        }
      `}</style>

      <div className="mobile-topbar">
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

          {activeTab === 'export' && !isAdmin && (
            <div className="card">
              <div className="card-title">Export Call Data</div>
              <div className="card-sub">Download all your call records as a CSV file</div>
              <button className="btn-secondary" onClick={handleExportData}>📥 Download CSV Export</button>
            </div>
          )}

          {activeTab === 'clients' && isAdmin && (
            <>
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

              <div className="card">
                <div className="card-title">Reset Monthly Minutes</div>
                <div className="card-sub">Reset a client's monthly usage counter</div>
                <label className="field-label">Select Client</label>
                <select className="field" style={{maxWidth:'360px'}} value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                  <option value="">— Select client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.business_name} — {Math.round(c.monthly_minutes_used || 0)} min used</option>)}
                </select>
                <button className="btn-danger" onClick={handleResetMinutes}>Reset Minutes to Zero</button>
                {resetMsg && <div className="msg">{resetMsg}</div>}
              </div>

              <div className="card">
                <div className="card-title">All Clients Overview</div>
                <div className="card-sub">Quick view of all active clients and their current plan</div>
                {clients.map(c => (
                  <div key={c.id} className="client-row">
                    <div>
                      <div style={{fontWeight:'700', color:'#0f172a', fontSize:'0.875rem'}}>{c.business_name}</div>
                      <div style={{fontSize:'0.75rem', color:'#94a3b8', marginTop:'2px'}}>{c.contact_email}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:'0.78rem', fontWeight:'700', color:'#534AB7'}}>{plans.find(p => p.id === c.plan_id)?.name || 'No plan'}</div>
                      <div style={{fontSize:'0.72rem', color:'#94a3b8', marginTop:'2px'}}>{Math.round(c.monthly_minutes_used || 0)} min used</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* NOTIFICATIONS */}
          <div className="card">
            <div className="card-title">Push Notifications</div>
            <div className="card-sub">Get notified on your phone when Mash handles a call</div>
            <button
              className="btn-primary"
              onClick={async () => {
                if (!('Notification' in window)) {
                  alert('Notifications not supported on this device')
                  return
                }
                const permission = await Notification.requestPermission()
                if (permission === 'granted') {
                  try {
                    const { initializeApp, getApps } = await import('firebase/app')
                    const { getMessaging, getToken } = await import('firebase/messaging')
                    const firebaseConfig = {
                      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
                    }
                    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
                    const messaging = getMessaging(app)
                    const token = await getToken(messaging, {
                      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
                    })
                    if (token) {
                      await fetch('/api/save-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          token, 
                          userId: user.id, 
                          clientId: isAdmin ? null : (await supabase.from('user_clients').select('client_id').eq('user_id', user.id).single()).data?.client_id,
                          isAdmin 
                        })
                      })
                      alert('✅ Notifications enabled!')
                    }
                  } catch (err) {
                    console.error('Notification setup error:', err)
                    alert('❌ Error setting up notifications: ' + err.message)
                  }
                } else {
                  alert('❌ Notifications blocked. Please enable in your phone settings.')
                }
              }}
            >
              🔔 Enable Push Notifications
            </button>
          </div>

          {/* MOBILE ONLY LOGOUT */}
          <div className="mobile-only-logout" style={{marginTop:'20px', paddingTop:'20px', borderTop:'1px solid #f1f5f9'}}>
            <button
              style={{padding:'12px 24px', background:'none', border:'1.5px solid #fecaca', borderRadius:'10px', color:'#ef4444', fontSize:'0.875rem', fontWeight:'700', cursor:'pointer', fontFamily:'Plus Jakarta Sans,sans-serif'}}
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
            >
              🚪 Sign Out
            </button>
          </div>

        </main>
      </div>
    </>
  )
}
