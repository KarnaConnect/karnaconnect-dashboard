import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '../components/Sidebar'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

// Pipeline buckets, in the order Adil works them
const STAGES = [
  { key: 'hot', label: 'Hot leads', hint: 'Booked a demo or keen', color: '#d6362f', bg: '#fef1f1' },
  { key: 'wants_info', label: 'Wants more info', hint: 'Asked for details or the link', color: '#c68a1d', bg: '#fff7e8' },
  { key: 'on_the_fence', label: 'On the fence', hint: 'Interested but unsure', color: '#2f6fe0', bg: '#eef4ff' },
  { key: 'no_answer', label: 'No answer yet', hint: 'Voicemail or missed, retrying', color: '#64748b', bg: '#f6f5fa' },
  { key: 'new', label: 'Not called yet', hint: 'Fresh leads', color: '#6f5fd6', bg: '#f5f3fe' },
  { key: 'queued', label: 'In a campaign', hint: 'Waiting for their calling time', color: '#6f5fd6', bg: '#f5f3fe' },
  { key: 'not_interested', label: 'Not interested', hint: "Won't be called again", color: '#64748b', bg: '#f6f5fa' },
  { key: 'customer', label: 'Customers', hint: 'Signed up', color: '#10a15c', bg: '#eafbf1' },
]
const STAGE = Object.fromEntries(STAGES.map(s => [s.key, s]))
const OTHER = { do_not_call: { label: 'Do not call', color: '#d6362f', bg: '#fef1f1' }, unreachable: { label: 'Unreachable', color: '#64748b', bg: '#f6f5fa' } }

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }
}
async function api(path, body) {
  const res = await fetch(`${BACKEND}${path}`, body ? { method: 'POST', headers: await authHeaders(), body: JSON.stringify(body) } : { headers: await authHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

function Badge({ status }) {
  const s = STAGE[status] || OTHER[status] || { label: status, color: '#64748b', bg: '#f6f5fa' }
  return <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{s.label}</span>
}

const fmt = (d, opts = { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) => d ? new Date(d).toLocaleString('en-AU', { timeZone: 'Australia/Perth', ...opts }) : ''
const washAge = (d) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null

function splitCSVLine(line) {
  const out = []; let cur = '', q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++ } else q = !q }
    else if (ch === ',' && !q) { out.push(cur.trim()); cur = '' }
    else cur += ch
  }
  out.push(cur.trim()); return out
}
function parseCSV(text) {
  const lines = text.replace(/\r/g, '').trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const h = splitCSVLine(lines[0].toLowerCase())
  const idx = (...k) => h.findIndex(x => k.some(y => x.includes(y)))
  const c = { business_name: idx('business', 'company', 'name'), phone_number: idx('phone', 'mobile', 'number'), industry: idx('industry', 'category', 'trade'), suburb: idx('suburb', 'city', 'area'), email: idx('email'), website: idx('website', 'web', 'url') }
  return lines.slice(1).map(l => { const cols = splitCSVLine(l); const r = {}; for (const [k, i] of Object.entries(c)) if (i !== -1) r[k] = cols[i] || ''; return r }).filter(r => r.phone_number)
}

export default function Leads() {
  const [ready, setReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [data, setData] = useState({ leads: [], counts: {}, settings: {}, industries: [] })
  const [stage, setStage] = useState('hot')
  const [industry, setIndustry] = useState('')
  const [mine, setMine] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  const [form, setForm] = useState({})
  const fileRef = useRef()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      const { data: uc } = await supabase.from('user_clients').select('role').eq('user_id', session.user.id).single()
      if (uc?.role !== 'admin') { window.location.href = '/'; return }
      setIsAdmin(true); setReady(true)
    })
  }, [])

  async function load() {
    try { setData(await api('/leads')) } catch (err) { setNote({ type: 'warn', text: err.message }) }
  }
  useEffect(() => { if (ready) load() }, [ready])

  const counts = data.counts || {}
  const adilCount = data.leads.filter(l => l.follow_up_by === 'adil').length
  const indLabel = useMemo(() => Object.fromEntries((data.industries || []).map(i => [i.key, i.label])), [data.industries])

  const rows = data.leads.filter(l =>
    (mine ? l.follow_up_by === 'adil' : (stage === 'all' || l.status === stage || (stage === 'not_interested' && ['do_not_call', 'unreachable'].includes(l.status)))) &&
    (!industry || l.industry === industry) &&
    (!search || `${l.business_name} ${l.suburb || ''} ${l.phone_number} ${l.email || ''}`.toLowerCase().includes(search.toLowerCase()))
  )
  const selectedRows = data.leads.filter(l => selected.has(l.id))
  const toggle = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id))

  async function run(fn, ok) {
    setBusy(true); setNote(null)
    try { const r = await fn(); setNote({ type: 'ok', text: typeof ok === 'function' ? ok(r) : ok }); setModal(null); setSelected(new Set()); await load() }
    catch (err) { setNote({ type: 'warn', text: err.message }) }
    setBusy(false)
  }

  const bulk = (patch, msg) => run(() => api('/leads/update', { ids: [...selected], ...patch }), msg)

  function downloadForWash() {
    const csv = 'phone_number,business_name\n' + selectedRows.map(l => `${l.phone_number.replace('+61', '0')},"${(l.business_name || '').replace(/"/g, '""')}"`).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `dncr-wash-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  function onImportFile(e) {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = ev => setForm(fm => ({ ...fm, rows: parseCSV(ev.target.result) }))
    r.readAsText(f)
  }

  if (!ready) return null
  const st = data.settings || {}

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#f6f5fa; font-family:'Plus Jakarta Sans',sans-serif; color:#151129; }
        .layout { display:flex; min-height:100vh; }
        .main { flex:1; margin-left:252px; padding:36px 40px; min-width:0; }
        @media (max-width:900px) { .main { margin-left:0; padding:76px 16px 100px; } }
        .hdr { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:20px; }
        .title { font-size:1.5rem; font-weight:800; }
        .sub { font-size:0.85rem; color:#9691b3; margin-top:4px; }
        .switches { display:flex; gap:10px; flex-wrap:wrap; }
        .switch { display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #ece9f6; border-radius:10px; padding:8px 12px; font-size:0.8rem; font-weight:600; cursor:pointer; user-select:none; }
        .dot { width:30px; height:18px; border-radius:10px; background:#d9d5ea; position:relative; transition:.2s; }
        .dot::after { content:''; position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:50%; background:#fff; transition:.2s; }
        .dot.on { background:#6f5fd6; } .dot.on::after { left:14px; }
        .dot.red.on { background:#d6362f; }
        .stages { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; margin-bottom:16px; }
        .stage { background:#fff; border:1.5px solid #ece9f6; border-radius:12px; padding:12px 14px; cursor:pointer; text-align:left; font-family:inherit; }
        .stage:hover { border-color:#c9c2f0; }
        .stage.active { border-color:#6f5fd6; box-shadow:0 0 0 3px rgba(111,95,214,0.12); }
        .stage-n { font-size:1.4rem; font-weight:800; }
        .stage-l { font-size:0.78rem; font-weight:700; margin-top:2px; }
        .stage-h { font-size:0.68rem; color:#9691b3; margin-top:2px; }
        .mine { display:flex; align-items:center; justify-content:space-between; gap:12px; background:linear-gradient(135deg,#151129,#2a2156); color:#fff; border-radius:12px; padding:14px 18px; margin-bottom:16px; cursor:pointer; }
        .mine.active { outline:3px solid #8f86e8; }
        .toolbar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
        .field { padding:9px 12px; border:1.5px solid #ece9f6; border-radius:8px; font-size:0.84rem; font-family:inherit; color:#151129; background:#fff; outline:none; }
        .field:focus { border-color:#6f5fd6; }
        .btn { padding:9px 16px; border-radius:8px; font-size:0.82rem; font-weight:700; font-family:inherit; cursor:pointer; border:1.5px solid #ece9f6; background:#fff; color:#151129; white-space:nowrap; }
        .btn.primary { background:linear-gradient(135deg,#6f5fd6,#8f86e8); color:#fff; border:none; }
        .btn.danger { color:#d6362f; border-color:#f6cccb; background:#fef1f1; }
        .btn:disabled { opacity:.5; cursor:not-allowed; }
        .bulk { display:flex; gap:8px; flex-wrap:wrap; align-items:center; background:#f5f3fe; border:1px solid #e1dcf7; border-radius:10px; padding:10px 12px; margin-bottom:12px; font-size:0.8rem; font-weight:600; }
        .card { background:#fff; border:1px solid #ece9f6; border-radius:14px; overflow-x:auto; }
        table { width:100%; border-collapse:collapse; font-size:0.8rem; }
        th { text-align:left; padding:10px 12px; background:#fbfaff; color:#64748b; font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px; border-bottom:1px solid #ece9f6; white-space:nowrap; }
        td { padding:10px 12px; border-bottom:1px solid #f4f2f9; vertical-align:top; }
        tr:last-child td { border-bottom:none; }
        .muted { color:#9691b3; font-size:0.72rem; }
        .summary { color:#475569; font-size:0.74rem; max-width:340px; margin-top:3px; line-height:1.4; }
        .note { padding:11px 14px; border-radius:10px; font-size:0.8rem; margin-bottom:14px; line-height:1.5; }
        .note.ok { background:#eafbf1; color:#0b7a45; border:1px solid #bcedd4; }
        .note.warn { background:#fff7e8; color:#8a5a00; border:1px solid #f6dfb0; }
        .note.info { background:#eef4ff; color:#1e4fa8; border:1px solid #cfe0ff; }
        .empty { text-align:center; padding:48px 20px; color:#9691b3; font-size:0.85rem; }
        .overlay { position:fixed; inset:0; background:rgba(10,8,24,.5); z-index:500; display:flex; align-items:center; justify-content:center; padding:16px; }
        .modal { background:#fff; border-radius:18px; width:100%; max-width:520px; max-height:90vh; overflow-y:auto; }
        .mh { background:linear-gradient(135deg,#151129,#211a42); color:#fff; padding:20px 24px; }
        .mh h3 { font-size:1rem; font-weight:800; } .mh p { font-size:0.76rem; color:#b9b3ea; margin-top:3px; }
        .mb { padding:20px 24px; display:flex; flex-direction:column; gap:10px; }
        .mb label { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b; }
        .mf { display:flex; gap:10px; justify-content:flex-end; padding:0 24px 20px; }
        a { color:#6f5fd6; }
      `}</style>
      <div className="layout">
        <Sidebar isAdmin={isAdmin} activePage="leads" />
        <main className="main">
          <div className="hdr">
            <div>
              <div className="title">Leads</div>
              <div className="sub">Mash finds local businesses, calls them at the best time for their industry, and sorts every conversation here.</div>
            </div>
            <div className="switches">
              <div className="switch" onClick={() => run(() => api('/leads/settings', { autoFollowups: !st.auto_followups }), st.auto_followups ? 'Mash will stop making follow-up calls. Follow-ups will be flagged for you instead.' : 'Mash will make follow-up calls again.')}>
                <span className={`dot ${st.auto_followups ? 'on' : ''}`} /> Mash follow-up calls
              </div>
              <div className="switch" onClick={() => run(() => api('/leads/settings', { paused: !st.paused }), st.paused ? 'Outreach resumed.' : 'All outreach paused. No calls will go out until you resume.')}>
                <span className={`dot red ${st.paused ? 'on' : ''}`} /> {st.paused ? 'Paused' : 'Pause all calls'}
              </div>
            </div>
          </div>

          {note && <div className={`note ${note.type}`}>{note.text}</div>}
          {st.paused && <div className="note warn">All outreach is paused. No campaign or follow-up calls will go out.</div>}

          <div className={`mine ${mine ? 'active' : ''}`} onClick={() => { setMine(m => !m); setSelected(new Set()) }}>
            <div>
              <div style={{ fontWeight: 800 }}>Your calls to make: {adilCount}</div>
              <div style={{ fontSize: '0.76rem', color: '#b9b3ea', marginTop: 2 }}>Hot leads, callbacks and anything Mash has handed to you.</div>
            </div>
            <span className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}>{mine ? 'Show all' : 'Show mine'}</span>
          </div>

          <div className="stages">
            {STAGES.map(s => (
              <button key={s.key} className={`stage ${!mine && stage === s.key ? 'active' : ''}`} onClick={() => { setMine(false); setStage(s.key); setSelected(new Set()) }}>
                <div className="stage-n" style={{ color: s.color }}>{(counts[s.key] || 0) + (s.key === 'not_interested' ? (counts.do_not_call || 0) + (counts.unreachable || 0) : 0)}</div>
                <div className="stage-l">{s.label}</div>
                <div className="stage-h">{s.hint}</div>
              </button>
            ))}
          </div>

          <div className="toolbar">
            <select className="field" value={industry} onChange={e => setIndustry(e.target.value)}>
              <option value="">All industries</option>
              {(data.industries || []).map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
            <input className="field" placeholder="Search business, suburb, phone" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
            <button className="btn" onClick={() => { setForm({ industry: industry || 'trades', area: 'Cockburn Central', radiusKm: 8 }); setModal('find') }}>Find leads</button>
            <button className="btn" onClick={() => { setForm({ rows: [] }); setModal('import') }}>Import CSV</button>
          </div>

          {selected.size > 0 && (
            <div className="bulk">
              <span>{selected.size} selected</span>
              <button className="btn primary" onClick={() => { const d = new Date(); d.setMinutes(0); setForm({ name: 'Mash outreach', startDate: d.toISOString().slice(0, 10), startTime: '09:00' }); setModal('campaign') }}>Call with Mash</button>
              <button className="btn" onClick={downloadForWash}>Download for DNCR wash</button>
              <button className="btn" onClick={() => { setForm({ washedAt: new Date().toISOString().slice(0, 10), registered: '' }); setModal('wash') }}>Record DNCR wash</button>
              <button className="btn" onClick={() => bulk({ followUpBy: 'adil' }, "Added to your calls.")}>I'll call them</button>
              <button className="btn" onClick={() => { setForm({ followUpAt: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10) }); setModal('followup') }}>Mash follow-up</button>
              <button className="btn" onClick={() => bulk({ status: 'customer' }, 'Marked as customers.')}>Customer</button>
              <button className="btn" onClick={() => bulk({ status: 'not_interested' }, 'Marked not interested.')}>Not interested</button>
              <button className="btn danger" onClick={() => bulk({ status: 'do_not_call' }, "They'll never be called again.")}>Do not call</button>
            </div>
          )}

          <div className="card">
            {rows.length === 0 ? (
              <div className="empty">{data.leads.length === 0 ? 'No leads yet. Use "Find leads" to search local businesses by industry, or import a CSV.' : 'Nothing in this view.'}</div>
            ) : (
              <table>
                <thead><tr>
                  <th><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)))} /></th>
                  <th>Business</th><th>Contact</th><th>Status</th><th>Last call</th><th>Next step</th><th>DNCR wash</th>
                </tr></thead>
                <tbody>
                  {rows.map(l => {
                    const age = washAge(l.dncr_checked_at)
                    return (
                      <tr key={l.id}>
                        <td><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} /></td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{l.business_name}</div>
                          <div className="muted">{indLabel[l.industry] || l.industry}{l.suburb ? ` · ${l.suburb}` : ''}</div>
                          {l.website && <a className="muted" href={/^https?:/.test(l.website) ? l.website : `https://${l.website}`} target="_blank" rel="noreferrer">website</a>}
                        </td>
                        <td>
                          <a href={`tel:${l.phone_number}`} style={{ fontFamily: 'monospace' }}>{l.phone_number.replace('+61', '0')}</a>
                          {l.email && <div className="muted">{l.email}{l.email_opt_out ? ' (unsubscribed)' : l.email_sent_at ? ' · emailed' : ''}</div>}
                        </td>
                        <td><Badge status={l.status} /></td>
                        <td>
                          {l.last_called_at ? <>
                            <div className="muted">{fmt(l.last_called_at)}{l.last_outcome ? ` · ${l.last_outcome}` : ''}</div>
                            {l.last_summary && <div className="summary">{l.last_summary}</div>}
                            {l.last_call_id && <a className="muted" href={`${BACKEND}/recording/${l.last_call_id}`} target="_blank" rel="noreferrer">Listen</a>}
                          </> : <span className="muted">Not called</span>}
                        </td>
                        <td>
                          {l.follow_up_by ? <>
                            <div style={{ fontWeight: 700, color: l.follow_up_by === 'adil' ? '#d6362f' : '#6f5fd6' }}>{l.follow_up_by === 'adil' ? 'You call' : 'Mash calls'}</div>
                            <div className="muted">{fmt(l.follow_up_at)}</div>
                            {l.follow_up_note && <div className="summary">{l.follow_up_note}</div>}
                          </> : <span className="muted">—</span>}
                        </td>
                        <td>{age === null ? <span className="muted">Not washed</span> : <span style={{ color: age > 30 ? '#d6362f' : '#0b7a45', fontWeight: 600 }}>{age > 30 ? 'Expired' : `${age}d ago`}</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="muted" style={{ marginTop: 10 }}>Business listings from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors.</div>
        </main>
      </div>

      {modal && (
        <div className="overlay" onClick={() => !busy && setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {modal === 'find' && <>
              <div className="mh"><h3>Find local businesses</h3><p>Searches public business listings with a phone number, and picks up emails from their websites.</p></div>
              <div className="mb">
                <label>Industry</label>
                <select className="field" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}>
                  {(data.industries || []).map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
                </select>
                <label>Suburb or area</label>
                <input className="field" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="e.g. Rockingham" />
                <label>Radius (km)</label>
                <input className="field" type="number" min="1" max="30" value={form.radiusKm} onChange={e => setForm(f => ({ ...f, radiusKm: e.target.value }))} />
                <div className="note info" style={{ margin: 0 }}>Nothing gets called. New leads land in "Not called yet". Big chains are skipped.</div>
              </div>
              <div className="mf"><button className="btn" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn primary" disabled={busy || !form.area} onClick={() => run(() => api('/leads/find', form), r => `Found ${r.stats.found} listings near ${form.area}: added ${r.stats.added} new (${r.stats.withEmail} with email). Skipped ${r.stats.noPhone} without a phone, ${r.stats.chains} chains, ${r.stats.alreadyListed} already listed, ${r.stats.doNotCall} on do-not-call.`)}>{busy ? 'Searching… (up to a minute)' : 'Find leads'}</button></div>
            </>}

            {modal === 'import' && <>
              <div className="mh"><h3>Import leads from CSV</h3><p>Columns: business_name, phone_number, industry, suburb, email, website</p></div>
              <div className="mb">
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={onImportFile} className="field" />
                {form.rows?.length > 0 && <div className="note info" style={{ margin: 0 }}>{form.rows.length} rows ready. Rows without a business name, a valid Australian number or a recognisable industry are skipped.</div>}
              </div>
              <div className="mf"><button className="btn" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn primary" disabled={busy || !form.rows?.length} onClick={() => run(() => api('/leads/import', { rows: form.rows }), r => `Imported ${r.stats.added} leads (${r.stats.duplicates} already listed, ${r.stats.invalid} skipped, ${r.stats.doNotCall} on do-not-call).`)}>Import</button></div>
            </>}

            {modal === 'wash' && <>
              <div className="mh"><h3>Record a Do Not Call Register wash</h3><p>{selected.size} leads selected</p></div>
              <div className="mb">
                <div className="note info" style={{ margin: 0 }}>1. Click "Download for DNCR wash". 2. Upload that file at <a href="https://www.donotcall.gov.au/industry/" target="_blank" rel="noreferrer">donotcall.gov.au</a>. 3. Paste any numbers it says are registered below. They go straight on the do-not-call list.</div>
                <label>Date washed</label>
                <input type="date" className="field" value={form.washedAt} max={new Date().toISOString().slice(0, 10)} onChange={e => setForm(f => ({ ...f, washedAt: e.target.value }))} />
                <label>Registered numbers (one per line, can be empty)</label>
                <textarea className="field" rows={5} value={form.registered} onChange={e => setForm(f => ({ ...f, registered: e.target.value }))} placeholder="0412 345 678" />
              </div>
              <div className="mf"><button className="btn" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn primary" disabled={busy || !form.washedAt} onClick={() => run(() => api('/leads/dncr', { ids: [...selected], washedAt: form.washedAt, registeredNumbers: form.registered.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean) }), r => `Wash recorded for ${r.washed} leads. ${r.blocked} registered numbers moved to do-not-call.`)}>Save wash</button></div>
            </>}

            {modal === 'campaign' && <>
              <div className="mh"><h3>Call with Mash</h3><p>{selected.size} leads · one campaign per industry, at that industry's best calling times</p></div>
              <div className="mb">
                <label>Campaign name</label>
                <input className="field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <label>Start from</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="date" className="field" style={{ flex: 1 }} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                  <input type="time" className="field" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div className="note info" style={{ margin: 0 }}>
                  {[...new Set(selectedRows.map(l => l.industry))].map(k => { const i = (data.industries || []).find(x => x.key === k); return i ? <div key={k}><strong>{i.label}:</strong> {i.days.join(', ')} {i.windows.map(w => w.join('–')).join(' and ')}</div> : null })}
                  <div style={{ marginTop: 6 }}>One call at a time. Every lead must have a Do Not Call Register wash from the last 30 days.</div>
                </div>
                {selectedRows.some(l => (washAge(l.dncr_checked_at) ?? 99) > 30) && <div className="note warn" style={{ margin: 0 }}>{selectedRows.filter(l => (washAge(l.dncr_checked_at) ?? 99) > 30).length} selected leads need a DNCR wash first.</div>}
              </div>
              <div className="mf"><button className="btn" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn primary" disabled={busy} onClick={() => run(() => api('/leads/campaign', { ids: [...selected], name: form.name, startAt: new Date(`${form.startDate}T${form.startTime}:00`).toISOString() }), r => `Created ${r.campaigns.length} campaign${r.campaigns.length === 1 ? '' : 's'}: ${r.campaigns.map(c => `${c.name} (${c.contacts})`).join(', ')}. Mash will only call inside each industry's window.`)}>{busy ? 'Creating…' : 'Start calling'}</button></div>
            </>}

            {modal === 'followup' && <>
              <div className="mh"><h3>Mash follow-up call</h3><p>Mash calls back from this date, inside the industry's calling window.</p></div>
              <div className="mb">
                <label>From</label>
                <input type="date" className="field" value={form.followUpAt} onChange={e => setForm(f => ({ ...f, followUpAt: e.target.value }))} />
              </div>
              <div className="mf"><button className="btn" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn primary" disabled={busy} onClick={() => bulk({ followUpBy: 'mash', followUpAt: `${form.followUpAt}T01:00:00Z` }, 'Mash will follow up.')}>Schedule</button></div>
            </>}
          </div>
        </div>
      )}
    </>
  )
}
