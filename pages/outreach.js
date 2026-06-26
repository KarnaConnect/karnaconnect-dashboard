import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '../components/Sidebar'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

export default function Outreach() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('')
  const [agents, setAgents] = useState([])
  const [form, setForm] = useState({ agentId: '', phoneNumberId: '', customerNumber: '', customerName: '' })
  const [callStatus, setCallStatus] = useState(null) // null | 'calling' | 'success' | 'error'
  const [callError, setCallError] = useState('')
  const [recentCalls, setRecentCalls] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    async function init() {
      const { data: uc } = await supabase.from('user_clients').select('client_id, role').eq('user_id', user.id).single()
      if (uc?.role === 'admin') {
        setIsAdmin(true)
        const { data: cls } = await supabase.from('clients').select('id, business_name').eq('active', true).order('business_name')
        setClients(cls || [])
      } else if (uc?.client_id) {
        setSelectedClient(uc.client_id)
      }
    }
    init()
  }, [user])

  useEffect(() => {
    if (!selectedClient) return
    setAgents([])
    setForm(f => ({ ...f, agentId: '', phoneNumberId: '' }))
    fetch(`${BACKEND}/outbound-agents/${selectedClient}`)
      .then(r => r.json())
      .then(data => {
        setAgents(Array.isArray(data) ? data : [])
        if (data?.length === 1) {
          setForm(f => ({ ...f, agentId: data[0].vapi_agent_id, phoneNumberId: data[0].vapi_phone_number_id }))
        }
      })
      .catch(() => setAgents([]))
    // load recent outbound calls (last 20)
    supabase.from('calls').select('*').eq('client_id', selectedClient)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setRecentCalls(data || []))
  }, [selectedClient])

  function selectAgent(agent) {
    setForm(f => ({ ...f, agentId: agent.vapi_agent_id, phoneNumberId: agent.vapi_phone_number_id }))
  }

  async function startCall(e) {
    e.preventDefault()
    if (!form.agentId || !form.customerNumber) return
    setCallStatus('calling')
    setCallError('')
    try {
      const res = await fetch(`${BACKEND}/call/outbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: form.agentId,
          phoneNumberId: form.phoneNumberId,
          customerNumber: form.customerNumber,
          customerName: form.customerName || undefined
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
      setCallStatus('success')
      setTimeout(() => setCallStatus(null), 5000)
    } catch (err) {
      setCallError(err.message)
      setCallStatus('error')
      setTimeout(() => setCallStatus(null), 6000)
    }
  }

  if (authLoading) return null

  const selectedAgent = agents.find(a => a.vapi_agent_id === form.agentId)

  return (
    <>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#f8f9fb; font-family:'Plus Jakarta Sans',system-ui,sans-serif; }
        .layout { display:flex; min-height:100vh; }
        .main { flex:1; margin-left:240px; padding:32px; }
        @media (max-width:900px) { .main { margin-left:0; padding:80px 20px 90px; } }

        .page-header { margin-bottom:28px; }
        .page-title { font-size:1.5rem; font-weight:800; color:#0f172a; }
        .page-sub { font-size:0.85rem; color:#64748b; margin-top:4px; }

        .client-bar { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px 20px; margin-bottom:24px; display:flex; align-items:center; gap:12px; }
        .client-label { font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; white-space:nowrap; }
        .client-select { flex:1; padding:8px 12px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:0.875rem; font-family:inherit; color:#0f172a; outline:none; background:#f8fafc; }
        .client-select:focus { border-color:#534AB7; }

        .grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        @media (max-width:768px) { .grid { grid-template-columns:1fr; } }

        .card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; }
        .card-hdr { padding:20px 24px 16px; border-bottom:1px solid #f1f5f9; }
        .card-title { font-size:0.95rem; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:8px; }
        .card-body { padding:20px 24px; }

        .agent-list { display:flex; flex-direction:column; gap:8px; }
        .agent-item { display:flex; align-items:center; gap:12px; padding:12px 14px; border:1.5px solid #e2e8f0; border-radius:10px; cursor:pointer; transition:all 0.15s; }
        .agent-item:hover { border-color:#534AB7; background:#faf9ff; }
        .agent-item.selected { border-color:#534AB7; background:#f5f3ff; }
        .agent-dot { width:8px; height:8px; border-radius:50%; background:#e2e8f0; flex-shrink:0; }
        .agent-item.selected .agent-dot { background:#534AB7; }
        .agent-name { font-size:0.875rem; font-weight:600; color:#0f172a; }
        .agent-empty { font-size:0.84rem; color:#94a3b8; text-align:center; padding:20px 0; }

        .field-label { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-bottom:6px; display:block; }
        .field { width:100%; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:0.875rem; font-family:inherit; color:#0f172a; outline:none; margin-bottom:14px; transition:border-color 0.2s; background:#fff; }
        .field:focus { border-color:#534AB7; }
        .field:disabled { background:#f8fafc; color:#94a3b8; }

        .call-btn { width:100%; padding:13px; background:linear-gradient(135deg,#534AB7,#7F77DD); color:#fff; font-size:0.9rem; font-weight:700; border:none; border-radius:10px; cursor:pointer; font-family:inherit; transition:opacity 0.2s; display:flex; align-items:center; justify-content:center; gap:8px; }
        .call-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .call-btn.success { background:linear-gradient(135deg,#10b981,#059669); }
        .call-btn.error-btn { background:linear-gradient(135deg,#ef4444,#dc2626); }

        .status-bar { margin-top:12px; padding:10px 14px; border-radius:8px; font-size:0.82rem; font-weight:600; text-align:center; }
        .status-bar.success { background:#f0fdf4; color:#10b981; border:1px solid #bbf7d0; }
        .status-bar.error { background:#fef2f2; color:#ef4444; border:1px solid #fecaca; }

        .no-client { text-align:center; padding:60px 20px; color:#94a3b8; font-size:0.9rem; }
        .no-client-icon { font-size:2.5rem; margin-bottom:12px; }

        .pulsing { animation:pulse 1.5s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      <div className="layout">
        <Sidebar isAdmin={isAdmin} activePage="outreach" />
        <main className="main">
          <div className="page-header">
            <div className="page-title">📤 Outreach</div>
            <div className="page-sub">Make outbound calls with your AI agents</div>
          </div>

          {isAdmin && (
            <div className="client-bar">
              <span className="client-label">Client</span>
              <select className="client-select" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                <option value="">— Select a client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
              </select>
            </div>
          )}

          {!selectedClient ? (
            <div className="no-client">
              <div className="no-client-icon">📤</div>
              {isAdmin ? 'Select a client to start making outbound calls' : 'Loading your outreach agents...'}
            </div>
          ) : (
            <div className="grid">

              {/* Agent selector */}
              <div className="card">
                <div className="card-hdr">
                  <div className="card-title">🤖 Select Agent</div>
                </div>
                <div className="card-body">
                  {agents.length === 0 ? (
                    <div className="agent-empty">No outbound agents configured for this client yet.</div>
                  ) : (
                    <div className="agent-list">
                      {agents.map(a => (
                        <div key={a.id} className={`agent-item ${form.agentId === a.vapi_agent_id ? 'selected' : ''}`} onClick={() => selectAgent(a)}>
                          <div className="agent-dot" />
                          <div className="agent-name">{a.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Call form */}
              <div className="card">
                <div className="card-hdr">
                  <div className="card-title">📞 Make a Call</div>
                </div>
                <div className="card-body">
                  <form onSubmit={startCall}>
                    <label className="field-label">Customer Name (optional)</label>
                    <input
                      className="field"
                      placeholder="e.g. John Smith"
                      value={form.customerName}
                      onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                      disabled={callStatus === 'calling'}
                    />
                    <label className="field-label">Customer Phone Number *</label>
                    <input
                      className="field"
                      placeholder="+61 400 000 000"
                      value={form.customerNumber}
                      onChange={e => setForm(f => ({ ...f, customerNumber: e.target.value }))}
                      required
                      disabled={callStatus === 'calling'}
                    />
                    <label className="field-label">Agent</label>
                    <input
                      className="field"
                      value={selectedAgent?.label || 'No agent selected'}
                      disabled
                      style={{ color: selectedAgent ? '#534AB7' : '#94a3b8', fontWeight: selectedAgent ? 600 : 400 }}
                    />
                    <button
                      type="submit"
                      className={`call-btn ${callStatus === 'success' ? 'success' : callStatus === 'error' ? 'error-btn' : ''}`}
                      disabled={!form.agentId || !form.customerNumber || callStatus === 'calling'}
                    >
                      {callStatus === 'calling' ? <><span className="pulsing">⏳</span> Connecting...</> :
                       callStatus === 'success' ? '✅ Call Connected!' :
                       callStatus === 'error' ? '❌ Call Failed' :
                       '📞 Start Call'}
                    </button>
                    {callStatus === 'success' && (
                      <div className="status-bar success">Agent is now calling {form.customerNumber}</div>
                    )}
                    {callStatus === 'error' && (
                      <div className="status-bar error">{callError || 'Something went wrong. Please try again.'}</div>
                    )}
                  </form>
                </div>
              </div>

            </div>
          )}
        </main>
      </div>
    </>
  )
}
