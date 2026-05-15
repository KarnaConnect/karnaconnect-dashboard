import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)

const PERTH = 'Australia/Perth'

function MashLogo({ size = 32 }) {
  const s = size
  const bar = s * 0.08
  const r = bar / 2
  const h = s * 0.47
  const cy = s / 2
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <circle cx={s/2} cy={s/2} r={s/2} fill="#EEEDFE"/>
      <rect x={s*0.22} y={cy - h*0.33} width={bar} height={h*0.66} rx={r} fill="#534AB7"/>
      <rect x={s*0.33} y={cy - h*0.55} width={bar} height={h*1.1} rx={r} fill="#534AB7"/>
      <rect x={s*0.44} y={cy - h*0.7} width={bar} height={h*1.4} rx={r} fill="#7F77DD"/>
      <rect x={s*0.55} y={cy - h*0.55} width={bar} height={h*1.1} rx={r} fill="#534AB7"/>
      <rect x={s*0.66} y={cy - h*0.33} width={bar} height={h*0.66} rx={r} fill="#534AB7"/>
    </svg>
  )
}

export default function Sidebar({ isAdmin, activePage, mobileOpen, onClose }) {
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

  const navItems = [
    { icon: '📞', label: 'Call Dashboard', page: 'dashboard', href: '/', show: true },
    { icon: '👥', label: 'Clients', page: 'clients', href: '/clients', show: isAdmin },
    { icon: '📊', label: 'Analytics', page: 'analytics', href: '/analytics', show: true },
    { icon: '💳', label: 'Usage & Billing', page: 'usage', href: '/usage', show: true },
    { icon: '🔗', label: 'CRM Connect', page: 'crm', href: null, show: true, action: () => setShowCRM(true) },
    { icon: '⚙️', label: 'Settings', page: 'settings', href: '/settings', show: true },
  ]

  return (
    <>
      <style>{`
        .sidebar {
          width:240px; flex-shrink:0;
          background:linear-gradient(180deg,#1a1535 0%,#211a42 100%);
          display:flex; flex-direction:column;
          position:fixed; top:0; left:0; height:100vh;
          z-index:200;
          border-right:1px solid rgba(127,119,221,0.15);
          transition:transform 0.3s ease;
        }
        @media (max-width:900px) { .sidebar { transform:translateX(-100%); } }
        .sidebar.mobile-open { transform:translateX(0) !important; }
        .sidebar-top { padding:24px 20px 18px; border-bottom:1px solid rgba(255,255,255,0.05); }
        .logo-row { display:flex; align-items:center; gap:10px; }
        .logo-text { font-size:1.2rem; font-weight:800; color:#fff; letter-spacing:-0.3px; white-space:nowrap; }
        .logo-text span { color:#AFA9EC; }
        .logo-sub { font-size:0.62rem; color:#3C3489; text-transform:uppercase; letter-spacing:2px; margin-top:5px; padding-left:42px; }
        .live-pill {
          margin:14px 20px 0;
          background:rgba(83,74,183,0.15);
          border:1px solid rgba(127,119,221,0.25);
          border-radius:8px; padding:7px 11px;
          display:flex; align-items:center; gap:8px;
        }
        .live-dot {
          width:7px; height:7px; border-radius:50%;
          background:#AFA9EC; flex-shrink:0;
          box-shadow:0 0 0 0 rgba(175,169,236,0.5);
          animation:lp 2s infinite;
        }
        @keyframes lp { 0%{box-shadow:0 0 0 0 rgba(175,169,236,0.5)} 70%{box-shadow:0 0 0 7px rgba(175,169,236,0)} 100%{box-shadow:0 0 0 0 rgba(175,169,236,0)} }
        .live-label { font-size:0.72rem; color:#AFA9EC; font-weight:700; flex:1; white-space:nowrap; }
        .live-clock { font-family:monospace; font-size:0.68rem; color:#534AB7; font-variant-numeric:tabular-nums; white-space:nowrap; }
        .nav-wrap { padding:16px 10px; flex:1; overflow-y:auto; }
        .nav-group-label { font-size:0.6rem; text-transform:uppercase; letter-spacing:2px; color:#3C3489; font-weight:700; padding:0 10px; margin:12px 0 6px; }
        .nav-item {
          display:flex; align-items:center; gap:9px; padding:9px 12px;
          border-radius:9px; margin-bottom:2px; color:#534AB7;
          font-size:0.83rem; font-weight:500; cursor:pointer; transition:all 0.18s;
          position:relative; white-space:nowrap; overflow:hidden;
        }
        .nav-item.active {
          background:linear-gradient(135deg,rgba(83,74,183,0.3),rgba(127,119,221,0.15));
          color:#CECBF6; border:1px solid rgba(127,119,221,0.3);
        }
        .nav-item.active::before {
          content:''; position:absolute; left:0; top:20%; bottom:20%;
          width:3px; background:linear-gradient(180deg,#7F77DD,#AFA9EC);
          border-radius:0 3px 3px 0;
        }
        .nav-item:hover:not(.active) { background:rgba(255,255,255,0.04); color:#AFA9EC; }
        .nav-icon { font-size:0.95rem; width:17px; text-align:center; flex-shrink:0; }
        .sidebar-foot { padding:14px 20px; border-top:1px solid rgba(255,255,255,0.04); font-size:0.68rem; color:#3C3489; line-height:1.8; }
        .logout-btn {
          width:100%; margin-top:8px; padding:8px 12px;
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);
          border-radius:8px; color:#534AB7; font-size:0.78rem; font-weight:600;
          cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif;
          transition:all 0.2s; text-align:left; display:flex; align-items:center; gap:8px;
        }
        .logout-btn:hover { background:rgba(220,38,38,0.1); color:#ef4444; border-color:rgba(220,38,38,0.2); }
        .modal-overlay { position:fixed; inset:0; background:rgba(26,21,53,0.7); z-index:500; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
        .modal { background:#fff; border-radius:16px; width:100%; max-width:480px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.3); }
        .modal-hdr { background:linear-gradient(135deg,#1a1535,#211a42); padding:24px 28px; }
        .modal-title { font-size:1.1rem; font-weight:800; color:#fff; margin-bottom:4px; }
        .modal-sub { font-size:0.8rem; color:#534AB7; }
        .modal-body { padding:24px 28px; }
        .field-label { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-bottom:6px; display:block; }
        .field { width:100%; padding:10px 14px; border-radius:8px; border:1.5px solid #e2e8f0; font-size:0.875rem; font-family:'Plus Jakarta Sans',sans-serif; color:#08112b; outline:none; margin-bottom:16px; transition:border-color 0.2s; }
        .field:focus { border-color:#534AB7; }
        .checkbox-group { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
        .checkbox-item { display:flex; align-items:center; gap:8px; font-size:0.875rem; color:#334155; cursor:pointer; }
        .checkbox-item input { accent-color:#534AB7; width:16px; height:16px; }
        .modal-footer { display:flex; gap:10px; padding:0 28px 24px; }
        .btn-primary { flex:1; padding:11px; background:linear-gradient(135deg,#534AB7,#7F77DD); color:#fff; font-size:0.875rem; font-weight:700; border:none; border-radius:8px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; }
        .btn-secondary { padding:11px 20px; background:#f8fafc; color:#64748b; font-size:0.875rem; font-weight:600; border:1.5px solid #e2e8f0; border-radius:8px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; }
        .success-msg { text-align:center; padding:20px 0; }
        .success-icon { font-size:2.5rem; margin-bottom:12px; }
        .success-title { font-size:1.1rem; font-weight:800; color:#08112b; margin-bottom:6px; }
        .success-sub { font-size:0.84rem; color:#94a3b8; }
      `}</style>

      <div className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
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
            {time.toLocaleTimeString('en-AU', { timeZone: PERTH, hour:'2-digit', minute:'2-digit', second:'2-digit' })}
          </div>
        </div>

        <nav className="nav-wrap">
          <div className="nav-group-label">Main</div>
          {navItems.filter(n => n.show).map(n => (
            <div
              key={n.page}
              className={`nav-item ${activePage === n.page ? 'active' : ''}`}
              onClick={() => {
                if (n.action) n.action()
                else if (n.href) window.location.href = n.href
              }}
            >
              <span className="nav-icon">{n.icon}</span>{n.label}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div style={{color:'#3C3489'}}>by KarnaConnect</div>
          <div style={{color:'#26215C', marginTop:'2px'}}>© 2026 Mash</div>
          <button className="logout-btn" onClick={handleLogout}>🚪 Sign Out</button>
        </div>
      </div>

      {showCRM && (
        <div className="modal-overlay" onClick={() => { setShowCRM(false); setCrmSent(false) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <div className="modal-title">🔗 Request CRM Integration</div>
              <div className="modal-sub">Connect Mash to your existing CRM or business system</div>
            </div>
            <div className="modal-body">
              {crmSent ? (
                <div className="success-msg">
                  <div className="success-icon">✅</div>
                  <div className="success-title">Request Sent!</div>
                  <div className="success-sub">The KarnaConnect team will be in touch within your plan's response time.</div>
                </div>
              ) : (
                <>
                  <label className="field-label">Which CRM or system do you use?</label>
                  <select className="field" value={crmForm.crm} onChange={e => setCrmForm({...crmForm, crm: e.target.value})}>
                    <option value="">— Select your CRM —</option>
                    <option>HubSpot</option>
                    <option>Salesforce</option>
                    <option>Zoho CRM</option>
                    <option>ServiceM8</option>
                    <option>Tradify</option>
                    <option>Google Sheets</option>
                    <option>REI Master</option>
                    <option>Console Cloud</option>
                    <option>Other</option>
                  </select>
                  <label className="field-label">What would you like to sync?</label>
                  <div className="checkbox-group">
                    {['New caller details', 'Call summaries', 'Booking requests', 'Follow-up tasks', 'All call data'].map(opt => (
                      <label key={opt} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={crmForm.sync.includes(opt)}
                          onChange={e => {
                            const updated = e.target.checked
                              ? [...crmForm.sync, opt]
                              : crmForm.sync.filter(s => s !== opt)
                            setCrmForm({...crmForm, sync: updated})
                          }}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                  <label className="field-label">Additional notes (optional)</label>
                  <textarea
                    className="field"
                    rows={3}
                    placeholder="Any specific requirements..."
                    value={crmForm.notes}
                    onChange={e => setCrmForm({...crmForm, notes: e.target.value})}
                    style={{resize:'none'}}
