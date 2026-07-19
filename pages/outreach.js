import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '../components/Sidebar'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

function statusBadge(status) {
  const map = {
    scheduled: { bg: '#eef4ff', color: '#2f6fe0', label: 'Scheduled' },
    running: { bg: '#fff7e8', color: '#c68a1d', label: 'Running' },
    completed: { bg: '#eafbf1', color: '#10a15c', label: 'Completed' },
    cancelled: { bg: '#f6f5fa', color: '#64748b', label: 'Cancelled' },
    failed: { bg: '#fef1f1', color: '#d6362f', label: 'Failed' },
    pending: { bg: '#f6f5fa', color: '#64748b', label: 'Pending' },
    calling: { bg: '#fff7e8', color: '#c68a1d', label: 'Calling' },
    called: { bg: '#eafbf1', color: '#10a15c', label: 'Called' },
  }
  const s = map[status] || { bg: '#f6f5fa', color: '#64748b', label: status }
  return <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700 }}>{s.label}</span>
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean)
  if (!lines.length) return []
  const header = lines[0].toLowerCase().split(',').map(h => h.trim())
  const nameIdx = header.findIndex(h => h.includes('name'))
  const phoneIdx = header.findIndex(h => h.includes('phone') || h.includes('number') || h.includes('mobile'))
  if (phoneIdx === -1) return null
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    return { name: nameIdx !== -1 ? cols[nameIdx] : '', phone_number: cols[phoneIdx] }
  }).filter(r => r.phone_number)
}

export default function Outreach() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('')
  const [agents, setAgents] = useState([])
  const [tab, setTab] = useState('single')
  const [form, setForm] = useState({ agentId: '', phoneNumberId: '', customerNumber: '', customerName: '' })
  const [callStatus, setCallStatus] = useState(null)
  const [callError, setCallError] = useState('')
  const [campaigns, setCampaigns] = useState([])
  const [expandedCampaign, setExpandedCampaign] = useState(null)
  const [campaignContacts, setCampaignContacts] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [newCampaign, setNewCampaign] = useState({ name: '', agentId: '', scheduledDate: '', scheduledTime: '', contacts: [] })
  const [csvError, setCsvError] = useState('')
  const [creating, setCreating] = useState(false)
  const fileRef = useRef()

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
        const list = Array.isArray(data) ? data : []
        setAgents(list)
        if (list.length === 1) setForm(f => ({ ...f, agentId: list[0].vapi_agent_id, phoneNumberId: list[0].vapi_phone_number_id }))
      })
      .catch(() => setAgents([]))
    loadCampaigns()
  }, [selectedClient])

  async function loadCampaigns() {
    if (!selectedClient) return
    const res = await fetch(`${BACKEND}/campaigns/${selectedClient}`)
    const data = await res.json()
    setCampaigns(Array.isArray(data) ? data : [])
  }

  async function loadContacts(campaignId) {
    if (campaignContacts[campaignId]) return
    const res = await fetch(`${BACKEND}/campaigns/${campaignId}/contacts`)
    const data = await res.json()
    setCampaignContacts(prev => ({ ...prev, [campaignId]: data }))
  }

  function toggleCampaign(id) {
    if (expandedCampaign === id) { setExpandedCampaign(null); return }
    setExpandedCampaign(id)
    loadContacts(id)
  }

  async function cancelCampaign(id) {
    await fetch(`${BACKEND}/campaigns/${id}/cancel`, { method: 'POST' })
    loadCampaigns()
  }

  async function startCall(e) {
    e.preventDefault()
    if (!form.agentId || !form.customerNumber) return
    setCallStatus('calling'); setCallError('')
    try {
      const res = await fetch(`${BACKEND}/call/outbound`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: form.agentId, phoneNumberId: form.phoneNumberId, customerNumber: form.customerNumber, customerName: form.customerName || undefined })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
      setCallStatus('success')
      setTimeout(() => setCallStatus(null), 5000)
    } catch (err) {
      setCallError(err.message); setCallStatus('error')
      setTimeout(() => setCallStatus(null), 6000)
    }
  }

  function downloadSampleCSV() {
    const content = 'name,phone_number\nJohn Smith,+61400000001\nSarah Jones,+61400000002\nMichael Brown,+61400000003'
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'sample_contacts.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function handleCSV(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const parsed = parseCSV(ev.target.result)
      if (parsed === null) { setCsvError('Could not find a phone number column. Ensure headers include "phone_number" or "mobile".'); return }
      if (!parsed.length) { setCsvError('No contacts found in file.'); return }
      setCsvError('')
      setNewCampaign(c => ({ ...c, contacts: parsed }))
    }
    reader.readAsText(file)
  }

  async function createCampaign() {
    if (!newCampaign.name || !newCampaign.agentId || !newCampaign.scheduledDate || !newCampaign.scheduledTime || !newCampaign.contacts.length) return
    setCreating(true)
    const agent = agents.find(a => a.vapi_agent_id === newCampaign.agentId)
    const scheduledAt = new Date(`${newCampaign.scheduledDate}T${newCampaign.scheduledTime}:00`).toISOString()
    try {
      const res = await fetch(`${BACKEND}/campaigns`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient, outboundAgentId: agent?.id, name: newCampaign.name, scheduledAt, contacts: newCampaign.contacts })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowModal(false)
      setNewCampaign({ name: '', agentId: '', scheduledDate: '', scheduledTime: '', contacts: [] })
      await loadCampaigns()
    } catch (err) {
      alert('Failed to create campaign: ' + err.message)
    }
    setCreating(false)
  }

  const selectedAgent = agents.find(a => a.vapi_agent_id === form.agentId)
  if (authLoading) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#f6f5fa; font-family:'Plus Jakarta Sans',sans-serif; }
        .layout { display:flex; min-height:100vh; }
        .main { flex:1; margin-left:252px; padding:36px 40px; }
        @media (max-width:900px) { .main { margin-left:0; padding:76px 16px 100px; } }
        .page-header { margin-bottom:24px; }
        .page-title { font-size:1.5rem; font-weight:800; color:#151129; }
        .page-sub { font-size:0.85rem; color:#9691b3; margin-top:4px; }
        .client-bar { background:#fff; border:1px solid #ece9f6; border-radius:12px; padding:16px 20px; margin-bottom:20px; display:flex; align-items:center; gap:12px; }
        .client-label { font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#9691b3; white-space:nowrap; }
        .client-select { flex:1; padding:8px 12px; border:1.5px solid #ece9f6; border-radius:8px; font-size:0.875rem; font-family:inherit; color:#151129; outline:none; background:#f9f8fc; }
        .client-select:focus { border-color:#6f5fd6; }
        .tabs { display:flex; gap:4px; background:#ece9f6; border-radius:10px; padding:4px; margin-bottom:24px; width:fit-content; }
        .tab { padding:8px 20px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; color:#8b86a8; }
        .tab.active { background:#fff; color:#6f5fd6; box-shadow:0 1px 3px rgba(21,17,41,0.08); }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        @media (max-width:768px) { .grid { grid-template-columns:1fr; } }
        .card { background:#fff; border:1px solid #ece9f6; border-radius:16px; overflow:hidden; }
        .card-hdr { padding:18px 24px 14px; border-bottom:1px solid #f4f2f9; }
        .card-title { font-size:0.95rem; font-weight:800; color:#151129; }
        .card-body { padding:20px 24px; }
        .agent-list { display:flex; flex-direction:column; gap:8px; }
        .agent-item { display:flex; align-items:center; gap:12px; padding:12px 14px; border:1.5px solid #ece9f6; border-radius:10px; cursor:pointer; }
        .agent-item:hover { border-color:#6f5fd6; background:#faf9ff; }
        .agent-item.selected { border-color:#6f5fd6; background:#f5f3fe; }
        .agent-dot { width:8px; height:8px; border-radius:50%; background:#ece9f6; flex-shrink:0; }
        .agent-item.selected .agent-dot { background:#6f5fd6; }
        .agent-name { font-size:0.875rem; font-weight:600; color:#151129; }
        .agent-empty { font-size:0.84rem; color:#9691b3; text-align:center; padding:20px 0; }
        .field-label { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-bottom:6px; display:block; }
        .field { width:100%; padding:10px 14px; border:1.5px solid #ece9f6; border-radius:8px; font-size:0.875rem; font-family:inherit; color:#151129; outline:none; margin-bottom:14px; background:#fff; }
        .field:focus { border-color:#6f5fd6; }
        .field:disabled { background:#f9f8fc; color:#9691b3; }
        .call-btn { width:100%; padding:13px; background:linear-gradient(135deg,#6f5fd6,#8f86e8); color:#fff; font-size:0.9rem; font-weight:700; border:none; border-radius:10px; cursor:pointer; font-family:inherit; display:flex; align-items:center; justify-content:center; gap:8px; }
        .call-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .call-btn.success { background:linear-gradient(135deg,#10a15c,#34d399); }
        .call-btn.error-btn { background:linear-gradient(135deg,#d6362f,#ef4444); }
        .status-bar { margin-top:12px; padding:10px 14px; border-radius:8px; font-size:0.82rem; font-weight:600; text-align:center; }
        .status-bar.success { background:#eafbf1; color:#10a15c; border:1px solid #bcedd4; }
        .status-bar.error { background:#fef1f1; color:#d6362f; border:1px solid #f6cccb; }
        .campaign-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
        .new-btn { padding:9px 18px; background:linear-gradient(135deg,#6f5fd6,#8f86e8); color:#fff; font-size:0.82rem; font-weight:700; border:none; border-radius:8px; cursor:pointer; font-family:inherit; }
        .campaign-list { display:flex; flex-direction:column; gap:10px; }
        .campaign-card { background:#fff; border:1px solid #ece9f6; border-radius:12px; overflow:hidden; }
        .campaign-row { padding:16px 20px; display:flex; align-items:center; gap:14px; cursor:pointer; }
        .campaign-row:hover { background:#faf9ff; }
        .campaign-info { flex:1; min-width:0; }
        .campaign-name { font-size:0.9rem; font-weight:700; color:#151129; }
        .campaign-meta { font-size:0.75rem; color:#9691b3; margin-top:2px; }
        .campaign-progress { font-size:0.78rem; font-weight:600; color:#6f5fd6; white-space:nowrap; }
        .campaign-actions { display:flex; gap:6px; align-items:center; }
        .cancel-btn { padding:5px 12px; background:#fef1f1; color:#d6362f; border:1px solid #f6cccb; border-radius:6px; font-size:0.72rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .contact-table { width:100%; border-collapse:collapse; font-size:0.8rem; }
        .contact-table th { text-align:left; padding:8px 12px; background:#fbfaff; color:#64748b; font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #ece9f6; }
        .contact-table td { padding:8px 12px; border-bottom:1px solid #f4f2f9; color:#334155; }
        .contact-table tr:last-child td { border-bottom:none; }
        .no-client { text-align:center; padding:60px 20px; color:#9691b3; font-size:0.9rem; }
        .empty-campaigns { text-align:center; padding:40px 20px; color:#9691b3; font-size:0.85rem; background:#fbfaff; border-radius:12px; border:1px dashed #ece9f6; }
        .overlay { position:fixed; inset:0; background:rgba(10,8,24,0.5); z-index:500; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
        .modal { background:#fff; border-radius:20px; width:100%; max-width:560px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 60px rgba(0,0,0,0.2); }
        .modal-hdr { background:linear-gradient(135deg,#151129,#211a42); padding:22px 28px; position:sticky; top:0; z-index:1; }
        .modal-title { font-size:1.05rem; font-weight:800; color:#fff; }
        .modal-sub { font-size:0.78rem; color:#8f86e8; margin-top:2px; }
        .modal-body { padding:24px 28px; }
        .modal-footer { display:flex; gap:10px; padding:0 28px 24px; }
        .btn-primary { flex:1; padding:11px; background:linear-gradient(135deg,#6f5fd6,#8f86e8); color:#fff; font-size:0.875rem; font-weight:700; border:none; border-radius:10px; cursor:pointer; font-family:inherit; }
        .btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
        .btn-secondary { padding:11px 20px; background:#f8f9fb; color:#64748b; font-size:0.875rem; font-weight:600; border:1.5px solid #ece9f6; border-radius:10px; cursor:pointer; font-family:inherit; }
        .date-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .csv-drop { border:2px dashed #ece9f6; border-radius:10px; padding:24px; text-align:center; cursor:pointer; margin-bottom:14px; }
        .csv-drop:hover { border-color:#6f5fd6; background:#faf9ff; }
        .csv-drop-text { font-size:0.82rem; color:#64748b; }
        .csv-drop-hint { font-size:0.72rem; color:#9691b3; margin-top:4px; }
        .contacts-preview { background:#fbfaff; border-radius:8px; padding:10px 14px; margin-bottom:14px; font-size:0.78rem; color:#334155; }
        .contacts-preview-hdr { font-weight:700; color:#151129; margin-bottom:6px; }
        .contacts-preview-row { padding:3px 0; border-bottom:1px solid #ece9f6; display:flex; gap:12px; }
        .contacts-preview-row:last-child { border-bottom:none; }
        .csv-error { color:#d6362f; font-size:0.78rem; margin-bottom:10px; }
      `}</style>
      <div className="layout">
        <Sidebar isAdmin={isAdmin} activePage="outreach" />
        <main className="main">
          <div className="page-header">
            <div className="page-title">Outreach</div>
            <div className="page-sub">Single calls and campaign management</div>
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
            <div className="no-client">{isAdmin ? 'Select a client to start' : 'Loading...'}</div>
          ) : (
            <>
              <div className="tabs">
                <div className={`tab ${tab === 'single' ? 'active' : ''}`} onClick={() => setTab('single')}>Single Call</div>
                <div className={`tab ${tab === 'campaigns' ? 'active' : ''}`} onClick={() => setTab('campaigns')}>Campaigns</div>
              </div>
              {tab === 'single' && (
                <div className="grid">
                  <div className="card">
                    <div className="card-hdr"><div className="card-title">Select Agent</div></div>
                    <div className="card-body">
                      {agents.length === 0
                        ? <div className="agent-empty">No outbound agents configured yet.</div>
                        : <div className="agent-list">
                            {agents.map(a => (
                              <div key={a.id} className={`agent-item ${form.agentId === a.vapi_agent_id ? 'selected' : ''}`}
                                onClick={() => setForm(f => ({ ...f, agentId: a.vapi_agent_id, phoneNumberId: a.vapi_phone_number_id }))}>
                                <div className="agent-dot" />
                                <div className="agent-name">{a.label}</div>
                              </div>
                            ))}
                          </div>
                      }
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-hdr"><div className="card-title">Make a Call</div></div>
                    <div className="card-body">
                      <form onSubmit={startCall}>
                        <label className="field-label">Customer Name (optional)</label>
                        <input className="field" placeholder="e.g. John Smith" value={form.customerName}
                          onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} disabled={callStatus === 'calling'} />
                        <label className="field-label">Customer Phone Number *</label>
                        <input className="field" placeholder="+61 400 000 000" value={form.customerNumber}
                          onChange={e => setForm(f => ({ ...f, customerNumber: e.target.value }))} required disabled={callStatus === 'calling'} />
                        <label className="field-label">Agent</label>
                        <input className="field" value={selectedAgent?.label || 'No agent selected'} disabled
                          style={{ color: selectedAgent ? '#6f5fd6' : '#9691b3', fontWeight: selectedAgent ? 600 : 400 }} />
                        <button type="submit"
                          className={`call-btn ${callStatus === 'success' ? 'success' : callStatus === 'error' ? 'error-btn' : ''}`}
                          disabled={!form.agentId || !form.customerNumber || callStatus === 'calling'}>
                          {callStatus === 'calling' ? 'Connecting...' : callStatus === 'success' ? 'Call Connected!' : callStatus === 'error' ? 'Call Failed' : 'Start Call'}
                        </button>
                        {callStatus === 'success' && <div className="status-bar success">Agent is calling {form.customerNumber}</div>}
                        {callStatus === 'error' && <div className="status-bar error">{callError || 'Something went wrong.'}</div>}
                      </form>
                    </div>
                  </div>
                </div>
              )}
              {tab === 'campaigns' && (
                <div>
                  <div className="campaign-hdr">
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</div>
                    <button className="new-btn" onClick={() => setShowModal(true)}>+ New Campaign</button>
                  </div>
                  {campaigns.length === 0
                    ? <div className="empty-campaigns">No campaigns yet.<br />Create one to start making bulk outbound calls.</div>
                    : <div className="campaign-list">
                        {campaigns.map(c => (
                          <div key={c.id} className="campaign-card">
                            <div className="campaign-row" onClick={() => toggleCampaign(c.id)}>
                              <div className="campaign-info">
                                <div className="campaign-name">{c.name}</div>
                                <div className="campaign-meta">
                                  {c.outbound_agents?.label} · {new Date(c.scheduled_at).toLocaleString('en-AU', { timeZone: 'Australia/Perth', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              <div className="campaign-progress">{c.called_count}/{c.total_contacts} called</div>
                              <div className="campaign-actions">
                                {statusBadge(c.status)}
                                {c.status === 'scheduled' && <button className="cancel-btn" onClick={e => { e.stopPropagation(); cancelCampaign(c.id) }}>Cancel</button>}
                                <span style={{ color: '#9691b3', fontSize: '0.8rem' }}>{expandedCampaign === c.id ? '▲' : '▼'}</span>
                              </div>
                            </div>
                            {expandedCampaign === c.id && (
                              <div style={{ borderTop: '1px solid #f4f2f9', overflowX: 'auto' }}>
                                {!campaignContacts[c.id]
                                  ? <div style={{ padding: '16px 20px', color: '#9691b3', fontSize: '0.82rem' }}>Loading contacts...</div>
                                  : <table className="contact-table">
                                      <thead><tr><th>Name</th><th>Phone</th><th>Status</th></tr></thead>
                                      <tbody>
                                        {campaignContacts[c.id].map(ct => (
                                          <tr key={ct.id}>
                                            <td>{ct.name || '—'}</td>
                                            <td style={{ fontFamily: 'monospace' }}>{ct.phone_number}</td>
                                            <td>{statusBadge(ct.status)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                }
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}
            </>
          )}
        </main>
      </div>
      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <div className="modal-title">New Campaign</div>
              <div className="modal-sub">Schedule a bulk outbound call campaign</div>
            </div>
            <div className="modal-body">
              <label className="field-label">Campaign Name *</label>
              <input className="field" placeholder="e.g. June Vehicle Pickups" value={newCampaign.name}
                onChange={e => setNewCampaign(c => ({ ...c, name: e.target.value }))} />
              <label className="field-label">Agent *</label>
              <select className="field" value={newCampaign.agentId} onChange={e => setNewCampaign(c => ({ ...c, agentId: e.target.value }))}>
                <option value="">— Select agent —</option>
                {agents.map(a => <option key={a.id} value={a.vapi_agent_id}>{a.label}</option>)}
              </select>
              <label className="field-label">Schedule *</label>
              <div className="date-row">
                <input type="date" className="field" value={newCampaign.scheduledDate}
                  onChange={e => setNewCampaign(c => ({ ...c, scheduledDate: e.target.value }))} />
                <input type="time" className="field" value={newCampaign.scheduledTime}
                  onChange={e => setNewCampaign(c => ({ ...c, scheduledTime: e.target.value }))} />
              </div>
              <label className="field-label">Contact List (CSV) *</label>
              <div className="csv-drop" onClick={() => fileRef.current?.click()}>
                <div className="csv-drop-text">{newCampaign.contacts.length > 0 ? `${newCampaign.contacts.length} contacts loaded` : 'Click to upload CSV'}</div>
                <div className="csv-drop-hint">Columns: name, phone_number · <span style={{ color: '#6f5fd6', cursor: 'pointer', textDecoration: 'underline' }} onClick={e => { e.stopPropagation(); downloadSampleCSV() }}>Download sample</span></div>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleCSV} />
              {csvError && <div className="csv-error">{csvError}</div>}
              {newCampaign.contacts.length > 0 && (
                <div className="contacts-preview">
                  <div className="contacts-preview-hdr">Preview ({Math.min(3, newCampaign.contacts.length)} of {newCampaign.contacts.length})</div>
                  {newCampaign.contacts.slice(0, 3).map((c, i) => (
                    <div key={i} className="contacts-preview-row">
                      <span style={{ color: '#64748b', minWidth: 80 }}>{c.name || '—'}</span>
                      <span style={{ fontFamily: 'monospace' }}>{c.phone_number}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={createCampaign} disabled={creating || !newCampaign.name || !newCampaign.agentId || !newCampaign.scheduledDate || !newCampaign.scheduledTime || !newCampaign.contacts.length}>
                {creating ? 'Creating...' : 'Create Campaign →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
