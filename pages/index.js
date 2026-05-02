import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)

const PERTH = 'Australia/Perth'
function perthDate(ts) { return new Date(ts).toLocaleString('en-AU', { timeZone: PERTH }) }
function perthDateShort(ts) { return new Date(ts).toLocaleDateString('en-AU', { timeZone: PERTH }) }
function isToday(ts) { return perthDateShort(ts) === perthDateShort(new Date()) }

export default function Dashboard() {
  const [calls, setCalls] = useState([])
  const [expanded, setExpanded] = useState({})
  const [stats, setStats] = useState({ total: 0, today: 0, avgDuration: 0, completed: 0 })
  const [time, setTime] = useState(new Date())
  const [mobileNav, setMobileNav] = useState(false)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [clientName, setClientName] = useState('All Clients')

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
    async function fetchCalls() {
      const { data: userClient } = await supabase
        .from('user_clients').select('client_id, role')
        .eq('user_id', user.id).single()

      let query = supabase.from('calls').select('*').order('created_at', { ascending: false })

      if (userClient && userClient.client_id) {
        query = query.eq('client_id', userClient.client_id)
        const { data: cd } = await supabase.from('clients').select('business_name')
          .eq('id', userClient.client_id).single()
        if (cd) setClientName(cd.business_name)
      }

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
    fetchCalls()
  }, [user])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function togglePanel(callId, panel) {
    setExpanded(prev => {
      const current = prev[callId]
      if (current === panel) return { ...prev, [callId]: null }
      return { ...prev, [callId]: panel }
    })
  }

  const outcomeColor = (o) => {
    if (!o) return '#64748b'
    if (o.includes('ended')) return '#10b981'
    if (o.includes('voicemail')) return '#f59e0b'
    if (o.includes('no-answer')) return '#ef4444'
    return '#2563eb'
  }

  const outcomeLabel = (o) => {
    if (!o) return 'Unknown'
    if (o === 'customer-ended-call') return 'Completed'
    if (o === 'assistant-ended-call') return 'Completed'
    if (o === 'voicemail') return 'Voicemail'
    if (o === 'no-answer') return 'No Answer'
    return o
  }

  const statCards = [
    { label: 'Total Calls', value: stats.total, unit: '', sub: 'All time', icon: '📞', c: 'c1' },
    { label: 'Today', value: stats.today, unit: '', sub: perthDateShort(new Date()), icon: '📅', c: 'c2' },
    { label: 'Avg Duration', value: stats.avgDuration, unit: 's', sub: 'Per call', icon: '⏱', c: 'c3' },
    { label: 'Completed', value: stats.completed, unit: '', sub: 'Calls handled', icon: '✅', c: 'c4' },
  ]

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
        .sidebar {
          width:240px; flex-shrink:0;
          background:linear-gradient(180deg,#08112b 0%,#0d1a3a 100%);
          display:flex; flex-direction:column;
          position:fixed; top:0; left:0; height:100vh;
          z-index:200; border-right:1px solid rgba(37,99,235,0.12);
          transition:transform 0.3s ease;
        }
        .sidebar-top { padding:24px 20px 18px; border-bottom:1px solid rgba(255,255,255,0.05); }
        .logo-row { display:flex; align-items:center; gap:9px; }
        .logo-atom { width:34px; height:34px; border-radius:9px; flex-shrink:0; background:linear-gradient(135deg,#2563eb,#06b6d4); display:flex; align-items:center; justify-content:center; font-size:1rem; box-shadow:0 4px 12px rgba(37,99,235,0.35); }
        .logo-text { font-size:1.15rem; font-weight:800; color:#fff; letter-spacing:-0.3px; white-space:nowrap; }
        .logo-text span { color:#06b6d4; }
        .logo-sub { font-size:0.62rem; color:#2a3f6b; text-transform:uppercase; letter-spacing:2px; margin-top:5px; padding-left:43px; }
        .live-pill { margin:14px 20px 0; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.18); border-radius:8px; padding:7px 11px; display:flex; align-items:center; gap:8px; }
        .live-dot { width:7px; height:7px; border-radius:50%; background:#10b981; flex-shrink:0; box-shadow:0 0 0 0 rgba(16,185,129,0.5); animation:lp 2s infinite; }
        @keyframes lp { 0%{box-shadow:0 0 0 0 rgba(16,185,129,0.5)} 70%{box-shadow:0 0 0 7px rgba(16,185,129,0)} 100%{box-shadow:0 0 0 0 rgba(16,185,129,0)} }
        .live-label { font-size:0.72rem; color:#10b981; font-weight:700; flex:1; white-space:nowrap; }
        .live-clock { font-family:'JetBrains Mono',monospace; font-size:0.68rem; color:#2a4070; font-variant-numeric:tabular-nums; white-space:nowrap; }
        .nav-wrap { padding:16px 10px; flex:1; overflow-y:auto; }
        .nav-group-label { font-size:0.6rem; text-transform:uppercase; letter-spacing:2px; color:#1e3060; font-weight:700; padding:0 10px; margin:12px 0 6px; }
        .nav-item { display:flex; align-items:center; gap:9px; padding:9px 12px; border-radius:9px; margin-bottom:2px; color:#3d5a8a; font-size:0.83rem; font-weight:500; cursor:pointer; transition:all 0.18s; position:relative; white-space:nowrap; overflow:hidden; }
        .nav-item.active { background:linear-gradient(135deg,rgba(37,99,235,0.18),rgba(6,182,212,0.08)); color:#e8f0ff; border:1px solid rgba(37,99,235,0.25); }
        .nav-item.active::before { content:''; position:absolute; left:0; top:20%; bottom:20%; width:3px; background:linear-gradient(180deg,#2563eb,#06b6d4); border-radius:0 3px 3px 0; }
        .nav-item:hover:not(.active) { background:rgba(255,255,255,0.04); color:#7a9cc8; }
        .nav-icon { font-size:0.95rem; width:17px; text-align:center; flex-shrink:0; }
        .sidebar-foot { padding:14px 20px; border-top:1px solid rgba(255,255,255,0.04); font-size:0.68rem; color:#1e3060; line-height:1.8; }
        .logout-btn { width:100%; margin-top:8px; padding:8px 12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); border-radius:8px; color:#3d5a8a; font-size:0.78rem; font-weight:600; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.2s; text-align:left; display:flex; align-items:center; gap:8px; }
        .logout-btn:hover { background:rgba(239,68,68,0.1); color:#ef4444; border-color:rgba(239,68,68,0.2); }
        .mobile-topbar { display:none; position:fixed; top:0; left:0; right:0; z-index:100; background:#08112b; padding:14px 20px; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(37,99,235,0.15); }
        .hamburger { background:none; border:none; color:#94a3b8; font-size:1.3rem; cursor:pointer; padding:4px; }
        .mobile-logo { font-size:1.05rem; font-weight:800; color:#fff; }
        .mobile-logo span { color:#06b6d4; }
        .main { margin-left:240px; flex:1; padding:36px 32px; min-height:100vh; }
        .topbar { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; gap:12px; }
        .page-title { font-size:1.6rem; font-weight:800; color:#08112b; letter-spacing:-0.6px; line-height:1.2; }
        .page-sub { font-size:0.82rem; color:#
