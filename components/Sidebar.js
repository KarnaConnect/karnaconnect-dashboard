import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)

const PERTH = 'Australia/Perth'

function MashLogo({ size = 32 }) {
  const s = size
  const bar = s * 0.16
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <circle cx={s / 2} cy={s / 2} r={s / 2} fill="#251f47" />
      <rect x={s * 0.25} y={s * 0.375} width={bar} height={s * 0.25} rx={1.5} fill="#8f86e8" />
      <rect x={s * 0.39} y={s * 0.28} width={bar} height={s * 0.44} rx={1.5} fill="#8f86e8" />
      <rect x={s * 0.53} y={s * 0.2} width={bar} height={s * 0.59} rx={1.5} fill="#b9b3f2" />
      <rect x={s * 0.67} y={s * 0.28} width={bar} height={s * 0.44} rx={1.5} fill="#8f86e8" />
    </svg>
  )
}

const NAV_DEFS = [
  { icon: 'calls',     label: 'Calls',     page: 'dashboard', href: '/',          show: true },
  { icon: 'outreach',  label: 'Outreach',  page: 'outreach',  href: '/outreach',  show: 'canOutreach' },
  { icon: 'clients',   label: 'Clients',   page: 'clients',   href: '/clients',   show: 'isAdmin' },
  { icon: 'analytics', label: 'Analytics', page: 'analytics', href: '/analytics', show: 'canAnalytics' },
  { icon: 'billing',   label: 'Billing',   page: 'usage',     href: '/usage',     show: true },
  { icon: 'crm',       label: 'CRM',       page: 'crm',       href: null,         show: true, action: true },
  { icon: 'settings',  label: 'Settings',  page: 'settings',  href: '/settings',  show: true },
]

const ICON_PATHS = {
  calls:    ['M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z'],
  outreach: ['M22 2L11 13', 'M22 2L15 22 11 13 2 9 22 2'],
  clients:  ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75'],
  analytics:['M18 20V10', 'M12 20V4', 'M6 20v-6'],
  billing:  ['M1 4h22v16H1z', 'M1 10h22'],
  crm:      ['M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71'],
  settings: ['M12 15a3 3 0 100-6 3 3 0 000 6z', 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'],
}

function Icon({ name, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

export default function Sidebar({ isAdmin, activePage, mobileOpen, onClose, features = {} }) {
  const [showCRM, setShowCRM] = useState(false)
  const [crmForm, setCrmForm] = useState({ crm: '', sync: [], notes: '' })
  const [crmSubmitting, setCrmSubmitting] = useState(false)
  const [crmSent, setCrmSent] = useState(false)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function handleCRMSubmit() {
    if (!crmForm.crm) return
    setCrmSubmitting(true)
    try {
      await fetch('/api/crm-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crmForm)
      })
    } catch (e) {}
    setCrmSent(true)
    setCrmSubmitting(false)
  }

  const canAnalytics = isAdmin || features.analytics !== false
  const canOutreach = isAdmin || features.outreach !== false
  const flags = { isAdmin, canAnalytics, canOutreach }
  const navItems = NAV_DEFS.filter(n => n.show === true || flags[n.show])

  const bottomNavItems = navItems.filter(n => n.page !== 'crm').slice(0, 4)
  if (!bottomNavItems.find(n => n.page === 'settings')) {
    bottomNavItems.push(NAV_DEFS.find(n => n.page === 'settings'))
  }

  function handleNavClick(n) {
    if (n.action) setShowCRM(true)
    else if (n.href) window.location.href = n.href
  }

  return (
    <>
      <style>{`
        .sidebar { width:252px; flex-shrink:0; background:#151129; display:flex; flex-direction:column; position:fixed; top:0; left:0; height:100vh; z-index:200; border-right:1px solid rgba(255,255,255,0.06); }
        @media (max-width:900px) { .sidebar { display:none; } }
        .sidebar-top { padding:26px 22px 20px; border-bottom:1px solid rgba(255,255,255,0.05); }
        .logo-row { display:flex; align-items:center; gap:10px; }
        .logo-text { font-size:1.15rem; font-weight:800; color:#fff; letter-spacing:-0.3px; }
        .logo-text span { color:#8f86e8; }
        .logo-sub { font-size:0.62rem; color:#5d5590; text-transform:uppercase; letter-spacing:2px; margin-top:8px; font-weight:600; }
        .live-pill { margin:16px 18px 0; background:rgba(143,134,232,0.08); border:1px solid rgba(143,134,232,0.18); border-radius:10px; padding:9px 12px; display:flex; align-items:center; gap:9px; }
        .live-dot { width:6px; height:6px; border-radius:50%; background:#8f86e8; flex-shrink:0; animation:mashPulse 2s infinite; }
        @keyframes mashPulse { 0%{box-shadow:0 0 0 0 rgba(143,134,232,0.45)} 70%{box-shadow:0 0 0 6px rgba(143,134,232,0)} 100%{box-shadow:0 0 0 0 rgba(143,134,232,0)} }
        .live-label { font-size:0.72rem; color:#b9b3f2; font-weight:600; flex:1; }
        .live-clock { font-family:'JetBrains Mono',monospace; font-size:0.68rem; color:#6a629e; font-variant-numeric:tabular-nums; }
        .nav-wrap { padding:18px 12px; flex:1; overflow-y:auto; }
        .nav-item { display:flex; align-items:center; gap:11px; padding:10px 13px; border-radius:9px; margin-bottom:2px; color:#8b83bd; font-size:0.84rem; font-weight:600; cursor:pointer; text-decoration:none; transition:all 0.15s; }
        .nav-item.active { background:rgba(143,134,232,0.14); color:#e3e0fa; border:1px solid rgba(143,134,232,0.25); }
        .nav-item:hover:not(.active) { background:rgba(255,255,255,0.04); color:#b9b3f2; }
        .nav-icon { width:18px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .nav-item.active .nav-icon { color:#b9b3f2; }
        .nav-item:not(.active) .nav-icon { color:#6a629e; }
        .sidebar-foot { padding:16px 22px; border-top:1px solid rgba(255,255,255,0.04); font-size:0.68rem; color:#454071; line-height:1.7; }
        .logout-btn { width:100%; margin-top:10px; padding:9px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; color:#7a72ab; font-size:0.78rem; font-weight:600; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; display:flex; align-items:center; gap:8px; }
        .logout-btn:hover { background:rgba(214,54,47,0.1); color:#d6362f; border-color:rgba(214,54,47,0.2); }
        .mobile-topbar { display:none; position:fixed; top:0; left:0; right:0; z-index:300; background:#151129; padding:14px 18px; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.06); }
        @media (max-width:900px) { .mobile-topbar { display:flex; } }
        .mobile-topbar-logo { display:flex; align-items:center; gap:9px; }
        .mobile-topbar-text { font-size:1.05rem; font-weight:800; color:#fff; }
        .mobile-topbar-text span { color:#8f86e8; }
        .bottom-nav { display:none; position:fixed; bottom:0; left:0; right:0; z-index:300; background:#fff; border-top:1px solid #ece9f6; padding:6px 4px 14px; box-shadow:0 -2px 10px rgba(21,17,41,0.05); }
        @media (max-width:900px) { .bottom-nav { display:flex; } }
        .bottom-nav-items { display:flex; width:100%; }
        .bottom-nav-item { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; padding:6px 2px; cursor:pointer; position:relative; color:#9691b3; text-decoration:none; }
        .bottom-nav-item.active { color:#6f5fd6; }
        .bottom-nav-label { font-size:0.58rem; font-weight:600; }
        .bottom-nav-item.active::before { content:''; position:absolute; top:-6px; left:30%; right:30%; height:2px; background:linear-gradient(90deg,#6f5fd6,#8f86e8); border-radius:0 0 2px 2px; }
        .modal-overlay { position:fixed; inset:0; background:rgba(10,8,24,0.55); z-index:500; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
        .modal { background:#fff; border-radius:20px; width:100%; max-width:480px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.2); }
        .modal-hdr { background:linear-gradient(135deg,#151129,#211a42); padding:24px 28px; }
        .modal-title { font-size:1.1rem; font-weight:800; color:#fff; margin-bottom:4px; }
        .modal-sub { font-size:0.8rem; color:#8f86e8; }
        .modal-body { padding:24px 28px; }
        .field-label { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-bottom:6px; display:block; }
        .field { width:100%; padding:10px 14px; border-radius:8px; border:1.5px solid #ece9f6; font-size:0.875rem; font-family:'Plus Jakarta Sans',sans-serif; color:#151129; outline:none; margin-bottom:16px; }
        .field:focus { border-color:#6f5fd6; }
        .checkbox-group { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
        .checkbox-item { display:flex; align-items:center; gap:8px; font-size:0.875rem; color:#334155; cursor:pointer; }
        .checkbox-item input { accent-color:#6f5fd6; width:16px; height:16px; }
        .modal-footer { display:flex; gap:10px; padding:0 28px 24px; }
        .btn-primary { flex:1; padding:11px; background:linear-gradient(135deg,#6f5fd6,#8f86e8); color:#fff; font-size:0.875rem; font-weight:700; border:none; border-radius:10px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; }
        .btn-secondary { padding:11px 20px; background:#f8f9fb; color:#64748b; font-size:0.875rem; font-weight:600; border:1.5px solid #ece9f6; border-radius:10px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; }
        .success-msg { text-align:center; padding:20px 0; }
        .success-title { font-size:1.1rem; font-weight:800; color:#151129; margin-bottom:6px; }
        .success-sub { font-size:0.84rem; color:#94a3b8; }
      `}</style>

      {/* DESKTOP SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-top">
          <div className="logo-row">
            <MashLogo size={34} />
            <div className="logo-text">M<span>ash</span></div>
          </div>
          <div className="logo-sub">{isAdmin ? 'Enterprise Admin' : 'AI Receptionist'}</div>
        </div>
        <div className="live-pill">
          <div className="live-dot" />
          <div className="live-label">Mash is live</div>
          <div className="live-clock">
            {time.toLocaleTimeString('en-AU', { timeZone: PERTH, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
        <nav className="nav-wrap">
          {navItems.map(n => (
            <div key={n.page} className={`nav-item ${activePage === n.page ? 'active' : ''}`} onClick={() => handleNavClick(n)}>
              <span className="nav-icon"><Icon name={n.icon} /></span>
              {n.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div>by KarnaConnect</div>
          <div style={{ color: '#2c2854', marginTop: '1px' }}>© 2026 Mash</div>
          <button className="logout-btn" onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* MOBILE TOP BAR */}
      <div className="mobile-topbar">
        <div className="mobile-topbar-logo">
          <MashLogo size={28} />
          <div className="mobile-topbar-text">M<span>ash</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: '700' }}>Live</span>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="bottom-nav">
        <div className="bottom-nav-items">
          {bottomNavItems.map(n => (
            <div key={n.page} className={`bottom-nav-item ${activePage === n.page ? 'active' : ''}`} onClick={() => handleNavClick(n)}>
              <Icon name={n.icon} size={20} />
              <span className="bottom-nav-label">{n.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CRM MODAL */}
      {showCRM && (
        <div className="modal-overlay" onClick={() => { setShowCRM(false); setCrmSent(false) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <div className="modal-title">Request CRM Integration</div>
              <div className="modal-sub">Connect Mash to your existing CRM or business system</div>
            </div>
            <div className="modal-body">
              {crmSent ? (
                <div className="success-msg">
                  <div className="success-title">Request Sent!</div>
                  <div className="success-sub">The KarnaConnect team will be in touch within your plan's response time.</div>
                </div>
              ) : (
                <>
                  <label className="field-label">Which CRM do you use?</label>
                  <select className="field" value={crmForm.crm} onChange={e => setCrmForm({ ...crmForm, crm: e.target.value })}>
                    <option value="">— Select your CRM —</option>
                    <option>HubSpot</option><option>Salesforce</option><option>Zoho CRM</option>
                    <option>ServiceM8</option><option>Tradify</option><option>Google Sheets</option>
                    <option>REI Master</option><option>Console Cloud</option><option>Other</option>
                  </select>
                  <label className="field-label">What would you like to sync?</label>
                  <div className="checkbox-group">
                    {['New caller details', 'Call summaries', 'Booking requests', 'Follow-up tasks', 'All call data'].map(opt => (
                      <label key={opt} className="checkbox-item">
                        <input type="checkbox" checked={crmForm.sync.includes(opt)}
                          onChange={e => {
                            const updated = e.target.checked ? [...crmForm.sync, opt] : crmForm.sync.filter(s => s !== opt)
                            setCrmForm({ ...crmForm, sync: updated })
                          }} />
                        {opt}
                      </label>
                    ))}
                  </div>
                  <label className="field-label">Additional notes (optional)</label>
                  <textarea className="field" rows={3} placeholder="Any specific requirements..."
                    value={crmForm.notes} onChange={e => setCrmForm({ ...crmForm, notes: e.target.value })} style={{ resize: 'none' }} />
                </>
              )}
            </div>
            {!crmSent && (
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowCRM(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleCRMSubmit} disabled={crmSubmitting || !crmForm.crm}>
                  {crmSubmitting ? 'Sending...' : 'Submit Request →'}
                </button>
              </div>
            )}
            {crmSent && (
              <div className="modal-footer">
                <button className="btn-primary" onClick={() => { setShowCRM(false); setCrmSent(false) }}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
