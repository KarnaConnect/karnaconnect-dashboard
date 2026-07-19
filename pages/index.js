import React, { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '../components/Sidebar'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL
const PERTH = 'Australia/Perth'

function toUtc(ts) { if (!ts) return ts; const s = String(ts); return /[Zz+]|\d{2}:\d{2}$/.test(s) ? s : s.replace(' ', 'T') + 'Z' }
function perthDate(ts) { return new Date(toUtc(ts)).toLocaleString('en-AU', { timeZone: PERTH }) }
function perthDateShort(ts) { return new Date(toUtc(ts)).toLocaleDateString('en-AU', { timeZone: PERTH }) }
function callTs(call) { return call.started_at || call.created_at }
function isToday(ts) { return perthDateShort(ts) === perthDateShort(new Date()) }

export default function Dashboard() {
  const [calls, setCalls] = useState([])
  const [expanded, setExpanded] = useState({})
  const [stats, setStats] = useState({ total: 0, today: 0, avgDuration: 0, completed: 0, totalDuration: 0, hoursActive: 0 })
  const [mobileNav, setMobileNav] = useState(false)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('all')
  const [clientName, setClientName] = useState('All Clients')
  const [clientStartDate, setClientStartDate] = useState(null)
  const [pullRefreshing, setPullRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [callerHistory, setCallerHistory] = useState(null)
  const [features, setFeatures] = useState({ recordings: true, transcripts: true, analytics: true, outreach: true, campaigns: true })
  const [impersonating, setImpersonating] = useState(null)
  const currentClientIdRef = useRef(null)
  const currentStartDateRef = useRef(null)
  const touchStartY = useRef(null)

  useEffect(() => {
    const hash = window.location.hash
    if (hash && (hash.includes('type=invite') || hash.includes('type=recovery'))) {
      window.location.href = '/reset-password' + hash
      return
    }
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
        const imp = sessionStorage.getItem('impersonating')
        if (imp) {
          try {
            const { clientId, clientName: impName } = JSON.parse(imp)
            setImpersonating({ clientId, clientName: impName })
            const { data: cd } = await supabase.from('clients').select('business_name, created_at, billing_start_date, plan_id')
              .eq('id', clientId).single()
            if (cd) {
              setClientName(cd.business_name)
              const start = cd.billing_start_date || cd.created_at
              setClientStartDate(start)
              if (cd.plan_id) {
                const { data: plan } = await supabase.from('plans').select('features').eq('id', cd.plan_id).single()
                if (plan?.features) setFeatures(f => ({ ...f, ...plan.features }))
              }
              await fetchCalls(clientId, start)
            }
          } catch (e) {
            sessionStorage.removeItem('impersonating')
            await fetchCalls(null)
          }
        } else {
          await fetchCalls(null)
        }
      } else if (userClient && userClient.client_id) {
        setIsAdmin(false)
        const { data: cd } = await supabase.from('clients').select('business_name, created_at, billing_start_date, plan_id')
          .eq('id', userClient.client_id).single()
        let start = null
        if (cd) {
          setClientName(cd.business_name)
          start = cd.billing_start_date || cd.created_at
          setClientStartDate(start)
          if (cd.plan_id) {
            const { data: plan } = await supabase.from('plans').select('features').eq('id', cd.plan_id).single()
            if (plan?.features) setFeatures(f => ({ ...f, ...plan.features }))
          }
        }
        await fetchCalls(userClient.client_id, start)
      }
    }
    init()
  }, [user])

  useEffect(() => { currentClientIdRef.current = selectedClient === 'all' ? null : selectedClient }, [selectedClient])
  useEffect(() => { currentStartDateRef.current = clientStartDate }, [clientStartDate])

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('calls-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls' }, () => {
        fetchCalls(currentClientIdRef.current, currentStartDateRef.current)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  function handleTouchStart(e) {
    if (window.scrollY === 0) touchStartY.current = e.touches[0].clientY
  }
  function handleTouchMove(e) {
    if (touchStartY.current === null) return
    const dist = e.touches[0].clientY - touchStartY.current
    if (dist > 0 && dist < 100) setPullDistance(dist)
  }
  async function handleTouchEnd() {
    if (pullDistance > 60) {
      setPullRefreshing(true)
      await fetchCalls(currentClientIdRef.current, currentStartDateRef.current)
      setPullRefreshing(false)
    }
    setPullDistance(0)
    touchStartY.current = null
  }

  async function fetchCalls(clientId, startDate) {
    let query = supabase.from('calls').select('*').order('created_at', { ascending: false })
    if (clientId) query = query.eq('client_id', clientId)
    const { data } = await query
    if (data) {
      setCalls(data)
      const todayCalls = data.filter(c => isToday(callTs(c)))
      const durations = data.filter(c => c.call_duration).map(c => parseFloat(c.call_duration))
      const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
      const completed = data.filter(c => c.call_outcome && c.call_outcome.includes('ended')).length
      const totalDuration = data.filter(c => c.call_duration).reduce((sum, c) => sum + parseFloat(c.call_duration), 0)
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const clientStart = startDate ? new Date(startDate) : null
      const countFrom = clientStart && clientStart > startOfMonth ? clientStart : startOfMonth
      const hoursActive = (now - countFrom) / 3600000
      setStats({ total: data.length, today: todayCalls.length, avgDuration: avg, completed, totalDuration, hoursActive })
    }
  }

  async function handleClientChange(clientId) {
    setSelectedClient(clientId)
    setExpanded({})
    if (clientId === 'all') { setClientName('All Clients'); setClientStartDate(null); await fetchCalls(null, null) }
    else {
      const { data: cd } = await supabase.from('clients').select('business_name, created_at, billing_start_date').eq('id', clientId).single()
      if (cd) {
        setClientName(cd.business_name)
        const start = cd.billing_start_date || cd.created_at
        setClientStartDate(start)
        await fetchCalls(clientId, start)
      }
    }
  }

  function togglePanel(callId, panel) {
    setExpanded(prev => ({ ...prev, [callId]: prev[callId] === panel ? null : panel }))
  }

  function openCallerHistory(number) {
    if (!number) return
    const history = calls.filter(c => c.caller_number === number).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setCallerHistory({ number, calls: history })
  }

  const getOutcome = (o) => {
    if (!o)                          return { label: 'Unknown',   color: '#9691b3', bg: '#f6f5fa', border: '#ece9f6' }
    if (o === 'customer-ended-call') return { label: 'Answered',  color: '#10a15c', bg: '#eafbf1', border: '#bcedd4' }
    if (o === 'assistant-ended-call')return { label: 'Completed', color: '#2f6fe0', bg: '#eef4ff', border: '#cfe0fb' }
    if (o.includes('voicemail'))     return { label: 'Voicemail', color: '#c68a1d', bg: '#fff7e8', border: '#f5deab' }
    if (o.includes('no-answer'))     return { label: 'No Answer', color: '#d6362f', bg: '#fef1f1', border: '#f6cccb' }
    if (o.includes('ended'))         return { label: 'Completed', color: '#10a15c', bg: '#eafbf1', border: '#bcedd4' }
    return { label: o, color: '#6f5fd6', bg: '#f1eefb', border: '#d6d0f5' }
  }

  const getCallIntent = (summary) => {
    if (!summary) return null
    const s = summary.toLowerCase()
    const m = (label, color, bg, border) => ({ label, color, bg, border })
    if (s.includes('urgent') || s.includes('emergency') || s.includes('asap') || s.includes('breakdown'))
      return m('Urgent',    '#d6362f', '#fef1f1', '#f6cccb')
    if (s.includes('complaint') || s.includes('unhappy') || s.includes('dissatisfied') || s.includes('issue') || s.includes('wrong') || s.includes('problem'))
      return m('Complaint', '#c68a1d', '#fff7e8', '#f5deab')
    if (s.includes('pick up') || s.includes('pickup') || s.includes('collect') || s.includes('ready') || s.includes('car ready'))
      return m('Pickup',    '#7c4fd6', '#f4f0fc', '#ddd0f7')
    if (s.includes('payment') || s.includes('invoice') || s.includes('pay') || s.includes('bill') || s.includes('owing'))
      return m('Payment',   '#0e8fa3', '#e9fbfd', '#bdedf3')
    if (s.includes('book') || s.includes('appointment') || s.includes('schedule') || s.includes('service') || s.includes('repair'))
      return m('Booking',   '#2f6fe0', '#eef4ff', '#cfe0fb')
    if (s.includes('quote') || s.includes('price') || s.includes('cost') || s.includes('how much') || s.includes('estimate'))
      return m('Quote',     '#10a15c', '#eafbf1', '#bcedd4')
    if (s.includes('follow') || s.includes('callback') || s.includes('call back') || s.includes('return'))
      return m('Follow Up', '#0e8fa3', '#e9fbfd', '#bdedf3')
    if (s.includes('order') || s.includes('purchase') || s.includes('buy') || s.includes('part'))
      return m('Order',     '#7c4fd6', '#f4f0fc', '#ddd0f7')
    return m('Enquiry',   '#726b90', '#f6f5fa', '#e5e2ef')
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #f1eefb', borderTopColor: '#6f5fd6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ fontSize: '0.85rem', color: '#9691b3', fontWeight: '500' }}>Loading...</div>
        <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
      </div>
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
        .main { margin-left:252px; flex:1; min-height:100vh; }
        .hero-header { background:#151129; padding:34px 40px 30px; position:relative; overflow:hidden; }
        .hero-header::after { content:''; position:absolute; right:-80px; top:-100px; width:360px; height:360px; background:radial-gradient(circle,rgba(143,134,232,0.12) 0%,transparent 70%); pointer-events:none; }
        .hero-eyebrow { font-size:0.68rem; text-transform:uppercase; letter-spacing:2.5px; color:#8f86e8; font-weight:700; margin-bottom:9px; }
        .hero-title { font-size:1.9rem; font-weight:800; color:#fff; letter-spacing:-0.7px; margin-bottom:5px; }
        .hero-sub { font-size:0.84rem; color:#6a629e; }
        .hero-row { display:flex; justify-content:space-between; align-items:flex-start; }
        .hero-right { display:flex; align-items:center; gap:10px; flex-shrink:0; }
        .live-pill-hero { display:flex; align-items:center; gap:7px; background:rgba(34,197,94,0.13); border:1px solid rgba(34,197,94,0.25); border-radius:20px; padding:7px 14px; }
        .live-dot-hero { width:6px; height:6px; border-radius:50%; background:#22c55e; animation:heroPulse 2s infinite; }
        @keyframes heroPulse { 0%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)} 70%{box-shadow:0 0 0 6px rgba(34,197,94,0)} 100%{box-shadow:0 0 0 0 rgba(34,197,94,0)} }
        .live-text-hero { font-size:0.72rem; color:#4ade80; font-weight:700; }
        .admin-pill { display:flex; align-items:center; gap:7px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:20px; padding:7px 14px; font-size:0.72rem; color:#c9c4f5; font-weight:700; }
        .content { padding:30px 40px 100px; }
        .client-selector-wrap { display:flex; align-items:center; gap:14px; background:#fff; border-radius:14px; padding:15px 20px; border:1px solid #ece9f6; box-shadow:0 1px 2px rgba(21,17,41,0.04); margin-bottom:26px; }
        .client-selector-label { font-size:0.72rem; font-weight:700; color:#8b86a8; text-transform:uppercase; letter-spacing:1.5px; white-space:nowrap; }
        .client-selector { flex:1; padding:8px 14px; border-radius:9px; border:1.5px solid #ece9f6; font-size:0.875rem; font-family:'Plus Jakarta Sans',sans-serif; color:#151129; font-weight:600; background:#f9f8fc; cursor:pointer; outline:none; }
        .client-selector:focus { border-color:#6f5fd6; }
        .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:26px; }
        .stat-card { background:#fff; border-radius:16px; padding:24px 22px; border:1px solid #ece9f6; box-shadow:0 1px 2px rgba(21,17,41,0.04); }
        .stat-icon-badge { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; margin-bottom:16px; font-size:1.1rem; }
        .stat-label { font-size:0.68rem; text-transform:uppercase; letter-spacing:1.5px; color:#9691b3; font-weight:700; margin-bottom:8px; }
        .stat-value { font-size:2.05rem; font-weight:800; color:#151129; line-height:1; letter-spacing:-1.3px; }
        .stat-unit { font-size:1rem; font-weight:600; color:#9691b3; letter-spacing:0; }
        .stat-sub { font-size:0.75rem; color:#9691b3; margin-top:9px; }
        .calls-card { background:#fff; border-radius:18px; border:1px solid #ece9f6; box-shadow:0 1px 2px rgba(21,17,41,0.04); overflow:hidden; }
        .calls-hdr { padding:20px 24px; border-bottom:1px solid #f4f2f9; display:flex; justify-content:space-between; align-items:center; }
        .calls-hdr-title { font-size:1.02rem; font-weight:700; color:#151129; letter-spacing:-0.2px; }
        .calls-hdr-count { font-size:0.72rem; color:#6f5fd6; background:#f1eefb; padding:4px 12px; border-radius:20px; font-weight:700; }
        .calls-table { width:100%; border-collapse:collapse; }
        .calls-table thead tr { background:#fbfaff; }
        .calls-table th { padding:12px 24px; text-align:left; font-size:0.65rem; text-transform:uppercase; letter-spacing:1.5px; color:#9691b3; font-weight:700; border-bottom:1px solid #f4f2f9; }
        .calls-table td { padding:16px 24px; font-size:0.845rem; color:#334155; border-bottom:1px solid #f8f7fc; vertical-align:middle; }
        .calls-table tbody tr:last-child td { border-bottom:none; }
        .calls-table tbody tr:hover td { background:#fbfaff; }
        .caller-num { font-weight:700; color:#151129; font-family:'JetBrains Mono',monospace; font-size:0.82rem; cursor:pointer; }
        .caller-num:hover { color:#6f5fd6; text-decoration:underline; }
        .date-text { color:#9691b3; font-size:0.78rem; }
        .outcome-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 11px; border-radius:20px; font-size:0.72rem; font-weight:700; }
        .intent-badge { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:20px; font-size:0.68rem; font-weight:700; }
        .action-btn { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:9px; border:1px solid #ece9f6; background:#fbfaff; cursor:pointer; transition:all 0.15s; margin-right:4px; color:#6f5fd6; font-size:0.9rem; }
        .action-btn:hover, .action-btn.active { border-color:#6f5fd6; background:#f1eefb; }
        .expand-row td { padding:0 !important; border-bottom:1px solid #f4f2f9 !important; }
        .expand-inner { padding:20px 24px; background:#fbfaff; }
        .expand-label { font-size:0.65rem; text-transform:uppercase; letter-spacing:1.5px; color:#6f5fd6; font-weight:700; margin-bottom:10px; }
        .transcript-scroll { max-height:260px; overflow-y:auto; }
        .transcript-line { margin-bottom:6px; padding:10px 14px; border-radius:10px; font-size:0.84rem; color:#334155; line-height:1.6; }
        .transcript-line.ai { background:#f1eefb; border-left:3px solid #6f5fd6; }
        .transcript-line.user { background:#eafbf1; border-left:3px solid #10a15c; }
        .transcript-speaker { font-size:0.62rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:3px; }
        .transcript-line.ai .transcript-speaker { color:#6f5fd6; }
        .transcript-line.user .transcript-speaker { color:#10a15c; }
        .summary-box { background:#fff; border:1px solid #ece9f6; border-radius:10px; padding:16px; font-size:0.875rem; color:#475569; line-height:1.8; }
        .history-overlay { position:fixed; inset:0; background:rgba(10,8,24,0.4); z-index:200; backdrop-filter:blur(2px); }
        .history-panel { position:fixed; top:0; right:0; bottom:0; width:420px; max-width:100vw; background:#fff; z-index:201; box-shadow:-8px 0 40px rgba(0,0,0,0.12); display:flex; flex-direction:column; }
        .history-hdr { padding:24px; border-bottom:1px solid #ece9f6; display:flex; justify-content:space-between; align-items:flex-start; flex-shrink:0; }
        .history-title { font-size:1rem; font-weight:800; color:#151129; }
        .history-sub { font-size:0.78rem; color:#9691b3; margin-top:3px; }
        .history-close { width:32px; height:32px; border-radius:8px; border:1.5px solid #ece9f6; background:#fbfaff; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1rem; color:#64748b; }
        .history-close:hover { border-color:#d6362f; color:#d6362f; background:#fef1f1; }
        .history-body { flex:1; overflow-y:auto; padding:16px 24px; }
        .history-item { padding:14px 0; border-bottom:1px solid #f8f7fc; }
        .history-item:last-child { border-bottom:none; }
        .history-item-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
        .mobile-cards { display:none; }
        .call-card { padding:16px 20px; border-bottom:1px solid #f8f7fc; }
        .call-card:last-child { border-bottom:none; }
        .call-card-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
        .call-card-actions { display:flex; gap:6px; margin-top:10px; flex-wrap:wrap; }
        .call-card-btn { display:inline-flex; align-items:center; gap:5px; padding:6px 12px; border-radius:8px; border:1px solid #ece9f6; background:#fbfaff; cursor:pointer; font-size:0.75rem; font-weight:600; color:#6f5fd6; font-family:'Plus Jakarta Sans',sans-serif; }
        .call-card-btn:hover, .call-card-btn.active { border-color:#6f5fd6; background:#f1eefb; }
        .empty-state { text-align:center; padding:64px 20px; }
        .empty-title { font-size:1rem; font-weight:700; color:#151129; margin-bottom:6px; }
        .empty-sub { font-size:0.84rem; color:#9691b3; }
        @media (max-width:900px) {
          .main { margin-left:0; }
          .hero-header { padding:76px 20px 24px; }
          .hero-title { font-size:1.4rem; }
          .content { padding:20px 16px 100px; }
          .stats-grid { grid-template-columns:repeat(2,1fr); gap:10px; }
          .stat-value { font-size:1.6rem; }
          .stat-card { padding:18px 16px; }
          .calls-table { display:none; }
          .mobile-cards { display:block; }
          .client-selector-wrap { flex-direction:column; align-items:flex-start; gap:8px; }
          .hero-row { flex-direction:column; gap:12px; }
        }
      `}</style>

      <div className="layout" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {(pullDistance > 10 || pullRefreshing) && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '12px', background: 'rgba(111,95,214,0.95)', transition: 'transform 0.2s',
            transform: `translateY(${pullRefreshing ? 0 : Math.min(pullDistance - 10, 50)}px)`
          }}>
            <div style={{
              width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)',
              borderTopColor: '#fff', borderRadius: '50%',
              animation: pullRefreshing ? 'spin 0.8s linear infinite' : 'none', marginRight: '8px'
            }} />
            <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '600' }}>
              {pullRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        )}

        <Sidebar isAdmin={isAdmin} activePage="dashboard" mobileOpen={mobileNav} onClose={() => setMobileNav(false)} features={features} />

        <main className="main">
          {impersonating && (
            <div style={{
              position: 'sticky', top: 0, zIndex: 90,
              background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', padding: '10px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderRadius: '10px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(245,158,11,0.3)'
            }}>
              <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#151129' }}>
                👁 Viewing as {impersonating.clientName} — client view
              </span>
              <button
                onClick={() => { sessionStorage.removeItem('impersonating'); window.location.reload() }}
                style={{ background: 'rgba(21,17,41,0.15)', border: 'none', borderRadius: '7px', padding: '5px 14px', fontWeight: '700', fontSize: '0.82rem', color: '#151129', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                ✕ Exit
              </button>
            </div>
          )}

          <div className="hero-header">
            <div className="hero-row">
              <div>
                <div className="hero-eyebrow">AI Receptionist</div>
                <div className="hero-title">{impersonating ? impersonating.clientName : isAdmin ? 'Enterprise Dashboard' : clientName}</div>
                <div className="hero-sub">
                  {new Date().toLocaleDateString('en-AU', { timeZone: PERTH, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
              <div className="hero-right">
                {isAdmin && !impersonating && <div className="admin-pill">⚡ Admin</div>}
                <div className="live-pill-hero">
                  <div className="live-dot-hero" />
                  <span className="live-text-hero">Live</span>
                </div>
              </div>
            </div>
          </div>

          <div className="content">
            {isAdmin && !impersonating && (
              <div className="client-selector-wrap">
                <div className="client-selector-label">Viewing</div>
                <select className="client-selector" value={selectedClient} onChange={e => handleClientChange(e.target.value)}>
                  <option value="all">All Clients</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                </select>
              </div>
            )}

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon-badge" style={{ background: '#f1eefb' }}>📞</div>
                <div className="stat-label">Total Calls</div>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-sub">All time · {stats.today} today</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-badge" style={{ background: '#eafbf1' }}>✅</div>
                <div className="stat-label">Calls Handled</div>
                <div className="stat-value">{stats.completed}</div>
                <div className="stat-sub">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% answer rate</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-badge" style={{ background: '#fff7e8' }}>⏱</div>
                <div className="stat-label">Hours Saved</div>
                <div className="stat-value">{stats.totalDuration > 0 ? (stats.totalDuration / 3600).toFixed(1) : '0'}<span className="stat-unit"> hrs</span></div>
                <div className="stat-sub">Of staff phone time</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-badge" style={{ background: '#f4f0fc' }}>💰</div>
                <div className="stat-label">Cost Saved</div>
                <div className="stat-value">${stats.hoursActive > 0 ? Math.round(stats.hoursActive * 8) : 0}</div>
                <div className="stat-sub">Est. equivalent 24/7 call centre cost</div>
              </div>
            </div>

            <div className="calls-card">
              <div className="calls-hdr">
                <div className="calls-hdr-title">Recent Calls</div>
                <div className="calls-hdr-count">{calls.length} total</div>
              </div>

              {calls.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-title">No calls yet</div>
                  <div className="empty-sub">Calls handled by Mash will appear here.</div>
                </div>
              ) : (
                <>
                  {/* DESKTOP TABLE */}
                  <table className="calls-table">
                    <thead>
                      <tr>
                        <th>Date &amp; Time</th>
                        <th>Caller</th>
                        {isAdmin && selectedClient === 'all' && <th>Client</th>}
                        <th>Outcome &amp; Intent</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calls.map(call => {
                        const callClientName = isAdmin && selectedClient === 'all'
                          ? (clients.find(c => c.id === call.client_id)?.business_name || 'KarnaConnect') : null
                        const intent = getCallIntent(call.call_summary)
                        const oc = getOutcome(call.call_outcome)
                        return (
                          <React.Fragment key={call.id}>
                            <tr>
                              <td><span className="date-text">{perthDate(callTs(call))}</span></td>
                              <td>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                                  {call.channel === 'whatsapp'
                                    ? <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: '#eafbf1', color: '#10a15c' }}>💬 WhatsApp</span>
                                    : <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: call.direction === 'outbound' ? '#eef4ff' : '#eafbf1', color: call.direction === 'outbound' ? '#2f6fe0' : '#10a15c' }}>{call.direction === 'outbound' ? '↗ Out' : '↙ In'}</span>}
                                  <span className="caller-num" onClick={() => openCallerHistory(call.caller_number)}>{call.caller_number || 'Unknown'}</span>
                                </span>
                              </td>
                              {isAdmin && selectedClient === 'all' && <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{callClientName}</td>}
                              <td style={{ whiteSpace: 'nowrap', width: '1%' }}>
                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <span className="outcome-badge" style={{ background: oc.bg, color: oc.color, border: `1px solid ${oc.border}` }}>{oc.label}</span>
                                  {intent && <span className="intent-badge" style={{ background: intent.bg, color: intent.color, border: `1px solid ${intent.border}` }}>{intent.label}</span>}
                                </div>
                              </td>
                              <td style={{ whiteSpace: 'nowrap', width: '1%' }}>
                                {call.recording_url && ((isAdmin && !impersonating) || features.recordings) && <span className={`action-btn ${expanded[call.id] === 'recording' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'recording')} title="Recording"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></span>}
                                {call.call_summary && <span className={`action-btn ${expanded[call.id] === 'summary' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'summary')} title="Summary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275z"/></svg></span>}
                                {call.full_transcript && ((isAdmin && !impersonating) || features.transcripts) && <span className={`action-btn ${expanded[call.id] === 'transcript' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'transcript')} title="Transcript"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>}
                              </td>
                            </tr>
                            {expanded[call.id] && (
                              <tr className="expand-row">
                                <td colSpan={isAdmin && selectedClient === 'all' ? 5 : 4}>
                                  <div className="expand-inner">
                                    {expanded[call.id] === 'recording' && call.recording_url && (
                                      <>
                                        <div className="expand-label">Recording</div>
                                        <audio controls style={{ width: '100%', borderRadius: '8px', height: '36px' }}>
                                          <source src={`${BACKEND}/recording/${call.vapi_call_id}`} type="audio/wav" />
                                        </audio>
                                      </>
                                    )}
                                    {expanded[call.id] === 'summary' && call.call_summary && (
                                      <>
                                        <div className="expand-label">AI Summary</div>
                                        <div className="summary-box">{call.call_summary}</div>
                                      </>
                                    )}
                                    {expanded[call.id] === 'transcript' && call.full_transcript && (
                                      <>
                                        <div className="expand-label">Transcript</div>
                                        <div className="transcript-scroll">
                                          {call.full_transcript.split('\n').map((line, i) => {
                                            const isAI = line.startsWith('AI:')
                                            const isUser = line.startsWith('User:')
                                            return line.trim() ? (
                                              <div key={i} className={`transcript-line ${isAI ? 'ai' : isUser ? 'user' : ''}`}>
                                                {(isAI || isUser) && <span className="transcript-speaker">{isAI ? 'Mash' : 'Caller'}</span>}
                                                {line.replace('AI: ', '').replace('User: ', '')}
                                              </div>
                                            ) : null
                                          })}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>

                  {/* MOBILE CARDS */}
                  <div className="mobile-cards">
                    {calls.map(call => {
                      const callClientName = isAdmin && selectedClient === 'all'
                        ? (clients.find(c => c.id === call.client_id)?.business_name || 'KarnaConnect') : null
                      const intent = getCallIntent(call.call_summary)
                      const oc = getOutcome(call.call_outcome)
                      return (
                        <React.Fragment key={call.id}>
                          <div className="call-card">
                            <div className="call-card-top">
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                  {call.channel === 'whatsapp'
                                    ? <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '20px', background: '#eafbf1', color: '#10a15c' }}>💬 WhatsApp</span>
                                    : <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '20px', background: call.direction === 'outbound' ? '#eef4ff' : '#eafbf1', color: call.direction === 'outbound' ? '#2f6fe0' : '#10a15c' }}>{call.direction === 'outbound' ? '↗ Out' : '↙ In'}</span>}
                                  <div style={{ fontWeight: '700', color: '#151129', fontSize: '0.9rem', fontFamily: 'JetBrains Mono,monospace', cursor: 'pointer' }} onClick={() => openCallerHistory(call.caller_number)}>{call.caller_number || 'Unknown'}</div>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#9691b3' }}>{perthDate(callTs(call))}</div>
                                {callClientName && <div style={{ fontSize: '0.7rem', color: '#6f5fd6', fontWeight: '600', marginTop: '2px' }}>{callClientName}</div>}
                              </div>
                              <span className="outcome-badge" style={{ background: oc.bg, color: oc.color, border: `1px solid ${oc.border}` }}>{oc.label}</span>
                            </div>
                            {intent && <span className="intent-badge" style={{ background: intent.bg, color: intent.color, border: `1px solid ${intent.border}`, marginBottom: '8px', display: 'inline-flex' }}>{intent.label}</span>}
                            <div className="call-card-actions">
                              {call.recording_url && ((isAdmin && !impersonating) || features.recordings) && <span className={`call-card-btn ${expanded[call.id] === 'recording' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'recording')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> Recording</span>}
                              {call.call_summary && <span className={`call-card-btn ${expanded[call.id] === 'summary' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'summary')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275z"/></svg> Summary</span>}
                              {call.full_transcript && ((isAdmin && !impersonating) || features.transcripts) && <span className={`call-card-btn ${expanded[call.id] === 'transcript' ? 'active' : ''}`} onClick={() => togglePanel(call.id, 'transcript')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Transcript</span>}
                            </div>
                            {expanded[call.id] && (
                              <div className="expand-inner" style={{ marginTop: '10px', borderRadius: '10px' }}>
                                {expanded[call.id] === 'recording' && call.recording_url && (
                                  <>
                                    <div className="expand-label">Recording</div>
                                    <audio controls style={{ width: '100%', borderRadius: '8px', height: '36px' }}>
                                      <source src={`${BACKEND}/recording/${call.vapi_call_id}`} type="audio/wav" />
                                    </audio>
                                  </>
                                )}
                                {expanded[call.id] === 'summary' && call.call_summary && (
                                  <>
                                    <div className="expand-label">AI Summary</div>
                                    <div className="summary-box">{call.call_summary}</div>
                                  </>
                                )}
                                {expanded[call.id] === 'transcript' && call.full_transcript && (
                                  <>
                                    <div className="expand-label">Transcript</div>
                                    <div className="transcript-scroll">
                                      {call.full_transcript.split('\n').map((line, i) => {
                                        const isAI = line.startsWith('AI:')
                                        const isUser = line.startsWith('User:')
                                        return line.trim() ? (
                                          <div key={i} className={`transcript-line ${isAI ? 'ai' : isUser ? 'user' : ''}`}>
                                            {(isAI || isUser) && <span className="transcript-speaker">{isAI ? 'Mash' : 'Caller'}</span>}
                                            {line.replace('AI: ', '').replace('User: ', '')}
                                          </div>
                                        ) : null
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* CALLER HISTORY PANEL */}
      {callerHistory && (
        <>
          <div className="history-overlay" onClick={() => setCallerHistory(null)} />
          <div className="history-panel">
            <div className="history-hdr">
              <div>
                <div className="history-title">{callerHistory.number}</div>
                <div className="history-sub">{callerHistory.calls.length} call{callerHistory.calls.length !== 1 ? 's' : ''} on record</div>
              </div>
              <button className="history-close" onClick={() => setCallerHistory(null)}>✕</button>
            </div>
            <div className="history-body">
              {callerHistory.calls.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9691b3', fontSize: '0.85rem' }}>No history found.</div>
              ) : callerHistory.calls.map(c => {
                const intent = getCallIntent(c.call_summary)
                const oc = getOutcome(c.call_outcome)
                return (
                  <div key={c.id} className="history-item">
                    <div className="history-item-top">
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{perthDate(callTs(c))}</span>
                      <span className="outcome-badge" style={{ background: oc.bg, color: oc.color, border: `1px solid ${oc.border}`, fontSize: '0.68rem', padding: '3px 8px' }}>{oc.label}</span>
                    </div>
                    {intent && <span className="intent-badge" style={{ background: intent.bg, color: intent.color, border: `1px solid ${intent.border}`, marginBottom: '8px', display: 'inline-flex' }}>{intent.label}</span>}
                    {c.call_summary && <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.6', background: '#f6f5fa', borderRadius: '8px', padding: '10px 12px' }}>{c.call_summary}</div>}
                    {c.call_duration && <div style={{ fontSize: '0.72rem', color: '#9691b3', marginTop: '6px' }}>{Math.round(parseFloat(c.call_duration))}s</div>}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}
