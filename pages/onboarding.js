import { useState, useEffect } from 'react'

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('success') === 'true') setSubmitted(true)
    }
  }, [])
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    business_name: '', industry: '', contact_name: '', contact_email: '',
    contact_phone: '', address: '', website: '', agent_name: '',
    business_description: '', services: '', service_area: '',
    business_hours: '', after_hours: '', agent_goal: '',
    tone: 'Friendly and professional', always_say: '', never_say: '',
    faqs: '', plan_name: 'Basic'
  })

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const isTrial = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('trial') === 'true'

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, is_trial: isTrial })
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      if (isTrial) {
        // Skip Stripe — go straight to success
        setSubmitted(true)
        return
      }

      // Redirect to Stripe checkout
      const checkoutRes = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_name: form.plan_name,
          client_id: data.client_id,
          business_name: form.business_name,
          contact_email: form.contact_email
        })
      })
      const checkoutData = await checkoutRes.json()
      if (checkoutData.url) {
        window.location.href = checkoutData.url
      } else {
        setError(checkoutData.error || 'Payment setup failed. Please try again.')
        setSubmitting(false)
      }
    } catch (err) {
      setError(`Error: ${err.message}`)
      setSubmitting(false)
    }
  }

  const totalSteps = 5

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Plus Jakarta Sans',sans-serif; background:linear-gradient(135deg,#eef2f9 0%,#e8f0fe 100%); min-height:100vh; display:flex; align-items:flex-start; justify-content:center; padding:40px 20px; -webkit-font-smoothing:antialiased; }
        .wrap { width:100%; max-width:620px; }
        .logo-row { display:flex; align-items:center; gap:10px; margin-bottom:32px; }
        .logo-atom { width:38px; height:38px; border-radius:10px; background:linear-gradient(135deg,#2563eb,#06b6d4); display:flex; align-items:center; justify-content:center; font-size:1.1rem; box-shadow:0 4px 12px rgba(37,99,235,0.35); }
        .logo-text { font-size:1.25rem; font-weight:800; color:#08112b; letter-spacing:-0.3px; }
        .logo-text span { color:#06b6d4; }
        .progress-wrap { margin-bottom:28px; }
        .progress-label { display:flex; justify-content:space-between; font-size:0.75rem; color:#94a3b8; font-weight:600; margin-bottom:8px; }
        .progress-bar { background:#e2e8f0; border-radius:999px; height:6px; overflow:hidden; }
        .progress-fill { height:100%; border-radius:999px; background:linear-gradient(90deg,#2563eb,#06b6d4); transition:width 0.4s ease; }
        .card { background:white; border-radius:16px; border:1px solid #e2e8f5; box-shadow:0 4px 20px rgba(8,17,43,0.08); padding:36px; margin-bottom:16px; }
        .step-label { font-size:0.7rem; text-transform:uppercase; letter-spacing:2px; color:#2563eb; font-weight:700; margin-bottom:8px; }
        .step-title { font-size:1.3rem; font-weight:800; color:#08112b; letter-spacing:-0.3px; margin-bottom:6px; }
        .step-sub { font-size:0.85rem; color:#94a3b8; margin-bottom:28px; line-height:1.6; }
        .field-label { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-bottom:6px; display:block; }
        .field { width:100%; padding:11px 14px; border-radius:8px; border:1.5px solid #e2e8f0; font-size:0.875rem; font-family:'Plus Jakarta Sans',sans-serif; color:#08112b; outline:none; margin-bottom:16px; transition:border-color 0.2s; background:#fff; }
        .field:focus { border-color:#2563eb; }
        textarea.field { resize:vertical; min-height:90px; }
        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .plan-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
        .plan-card { border:2px solid #e2e8f0; border-radius:12px; padding:16px; cursor:pointer; transition:all 0.2s; text-align:center; }
        .plan-card.selected { border-color:#2563eb; background:#eff6ff; }
        .plan-card:hover:not(.selected) { border-color:#94a3b8; }
        .plan-name { font-size:0.95rem; font-weight:800; color:#08112b; margin-bottom:4px; }
        .plan-price { font-size:1.3rem; font-weight:800; color:#2563eb; }
        .plan-price span { font-size:0.75rem; font-weight:500; color:#94a3b8; }
        .plan-minutes { font-size:0.75rem; color:#64748b; margin-top:4px; }
        .btn-row { display:flex; gap:10px; justify-content:space-between; margin-top:8px; }
        .btn-primary { flex:1; padding:13px; background:linear-gradient(135deg,#2563eb,#06b6d4); color:#fff; font-size:0.9rem; font-weight:700; border:none; border-radius:10px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; box-shadow:0 4px 14px rgba(37,99,235,0.3); transition:opacity 0.2s; }
        .btn-primary:hover { opacity:0.9; }
        .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
        .btn-back { padding:13px 20px; background:#f8fafc; color:#64748b; font-size:0.9rem; font-weight:600; border:1.5px solid #e2e8f0; border-radius:10px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; }
        .btn-back:hover { border-color:#94a3b8; }
        .error-msg { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; font-size:0.82rem; padding:12px 14px; border-radius:8px; margin-top:12px; }
        .success-wrap { text-align:center; padding:20px 0; }
        .success-icon { font-size:3rem; margin-bottom:16px; }
        .success-title { font-size:1.4rem; font-weight:800; color:#08112b; margin-bottom:8px; }
        .success-sub { font-size:0.875rem; color:#64748b; line-height:1.7; max-width:420px; margin:0 auto; }
        .required { color:#ef4444; margin-left:2px; }
        @media (max-width:600px) {
          body { padding:20px 16px; }
          .card { padding:24px 20px; }
          .grid-2 { grid-template-columns:1fr; }
          .plan-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="wrap">
        <div className="logo-row">
          <div className="logo-atom">⚛</div>
          <div className="logo-text">Karna<span>Connect</span></div>
        </div>

        {!submitted && (
          <div className="progress-wrap">
            <div className="progress-label">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round((step / totalSteps) * 100)}% complete</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(step / totalSteps) * 100}%` }} />
            </div>
          </div>
        )}

        <div className="card">
          {submitted ? (
            <div className="success-wrap">
              <div className="success-icon">🎉</div>
              <div className="success-title">You're all set!</div>
              <div className="success-sub">
                Thank you {form.contact_name}! We've received your details and are setting up your AI agent for {form.business_name}. The KarnaConnect team will be in touch within 24 hours to get you live.
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1 — Business basics */}
              {step === 1 && (
                <>
                  <div className="step-label">Step 1 — Business Details</div>
                  <div className="step-title">Tell us about your business</div>
                  <div className="step-sub">This helps us personalise your AI agent for your industry and clients.</div>

                  <label className="field-label">Business Name <span className="required">*</span></label>
                  <input className="field" value={form.business_name} onChange={e => update('business_name', e.target.value)} placeholder="e.g. Perth Pro Plumbing" />

                  <label className="field-label">Industry <span className="required">*</span></label>
                  <select className="field" value={form.industry} onChange={e => update('industry', e.target.value)}>
                    <option value="">— Select your industry —</option>
                    <option>Trades (Plumbing, Electrical, etc.)</option>
                    <option>Building & Construction</option>
                    <option>Property & Real Estate</option>
                    <option>Building Inspections</option>
                    <option>Legal Services</option>
                    <option>Healthcare & Medical</option>
                    <option>Accounting & Finance</option>
                    <option>Retail & E-commerce</option>
                    <option>Hospitality & Food</option>
                    <option>Professional Services</option>
                    <option>Other</option>
                  </select>

                  <div className="grid-2">
                    <div>
                      <label className="field-label">Contact Name <span className="required">*</span></label>
                      <input className="field" value={form.contact_name} onChange={e => update('contact_name', e.target.value)} placeholder="Your full name" />
                    </div>
                    <div>
                      <label className="field-label">Contact Phone <span className="required">*</span></label>
                      <input className="field" value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} placeholder="04xx xxx xxx" />
                    </div>
                  </div>

                  <label className="field-label">Contact Email <span className="required">*</span></label>
                  <input className="field" type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} placeholder="you@yourbusiness.com.au" />

                  <div className="grid-2">
                    <div>
                      <label className="field-label">Business Address</label>
                      <input className="field" value={form.address} onChange={e => update('address', e.target.value)} placeholder="Suburb, State" />
                    </div>
                    <div>
                      <label className="field-label">Website</label>
                      <input className="field" value={form.website} onChange={e => update('website', e.target.value)} placeholder="www.yourbusiness.com.au" />
                    </div>
                  </div>

                  <div className="btn-row">
                    <button className="btn-primary"
                      disabled={!form.business_name || !form.industry || !form.contact_name || !form.contact_email || !form.contact_phone}
                      onClick={() => setStep(2)}>
                      Continue →
                    </button>
                  </div>
                </>
              )}

              {/* STEP 2 — Agent setup */}
              {step === 2 && (
                <>
                  <div className="step-label">Step 2 — Agent Setup</div>
                  <div className="step-title">Set up your AI agent</div>
                  <div className="step-sub">Give your agent a name and tell us what your business does so we can train it properly.</div>

                  <label className="field-label">Agent Name <span className="required">*</span></label>
                  <input className="field" value={form.agent_name} onChange={e => update('agent_name', e.target.value)} placeholder="e.g. Alex, Sam, Aria" />

                  <label className="field-label">Business Description <span className="required">*</span></label>
                  <textarea className="field" value={form.business_description} onChange={e => update('business_description', e.target.value)} placeholder="Briefly describe what your business does and who your customers are..." />

                  <label className="field-label">Services Offered</label>
                  <textarea className="field" value={form.services} onChange={e => update('services', e.target.value)} placeholder="List your main services, one per line e.g.&#10;Pre-purchase building inspections&#10;Termite and pest inspections&#10;Construction stage inspections" />

                  <label className="field-label">Service Area</label>
                  <input className="field" value={form.service_area} onChange={e => update('service_area', e.target.value)} placeholder="e.g. All Perth metro suburbs including Mandurah and Yanchep" />

                  <div className="btn-row">
                    <button className="btn-back" onClick={() => setStep(1)}>← Back</button>
                    <button className="btn-primary"
                      disabled={!form.agent_name || !form.business_description}
                      onClick={() => setStep(3)}>
                      Continue →
                    </button>
                  </div>
                </>
              )}

              {/* STEP 3 — Operating details */}
              {step === 3 && (
                <>
                  <div className="step-label">Step 3 — Operating Details</div>
                  <div className="step-title">When and how do you operate?</div>
                  <div className="step-sub">This helps your agent handle calls correctly during and after business hours.</div>

                  <label className="field-label">Business Hours</label>
                  <input className="field" value={form.business_hours} onChange={e => update('business_hours', e.target.value)} placeholder="e.g. Monday to Friday 8am–5pm, Saturday 9am–1pm" />

                  <label className="field-label">After Hours Message</label>
                  <textarea className="field" value={form.after_hours} onChange={e => update('after_hours', e.target.value)} placeholder="What should the agent tell callers outside business hours? e.g. Let them know you'll call back first thing next business day" />

                  <label className="field-label">Main Goal of the Agent <span className="required">*</span></label>
                  <select className="field" value={form.agent_goal} onChange={e => update('agent_goal', e.target.value)}>
                    <option value="">— Select the agent's main goal —</option>
                    <option value="Take caller details and have the team call back">Take caller details and have the team call back</option>
                    <option value="Answer questions and capture enquiry details">Answer questions and capture enquiry details</option>
                    <option value="Book appointments and capture details">Book appointments and capture details</option>
                    <option value="Qualify leads and capture contact details">Qualify leads and capture contact details</option>
                    <option value="Handle after hours calls only">Handle after hours calls only</option>
                  </select>

                  <div className="btn-row">
                    <button className="btn-back" onClick={() => setStep(2)}>← Back</button>
                    <button className="btn-primary"
                      disabled={!form.agent_goal}
                      onClick={() => setStep(4)}>
                      Continue →
                    </button>
                  </div>
                </>
              )}

              {/* STEP 4 — Personality */}
              {step === 4 && (
                <>
                  <div className="step-label">Step 4 — Agent Personality</div>
                  <div className="step-title">How should your agent sound?</div>
                  <div className="step-sub">Fine-tune how your agent speaks to callers to match your brand.</div>

                  <label className="field-label">Tone & Style</label>
                  <select className="field" value={form.tone} onChange={e => update('tone', e.target.value)}>
                    <option>Friendly and professional</option>
                    <option>Warm and conversational</option>
                    <option>Formal and corporate</option>
                    <option>Casual and relaxed</option>
                    <option>Empathetic and reassuring</option>
                  </select>

                  <label className="field-label">Always Say or Mention</label>
                  <textarea className="field" value={form.always_say} onChange={e => update('always_say', e.target.value)} placeholder="Anything the agent should always mention e.g. 'We offer same day reports' or 'We have a best price guarantee'" />

                  <label className="field-label">Never Say or Do</label>
                  <textarea className="field" value={form.never_say} onChange={e => update('never_say', e.target.value)} placeholder="Anything the agent should avoid e.g. 'Never quote prices' or 'Never discuss competitors'" />

                  <label className="field-label">Common FAQs</label>
                  <textarea className="field" style={{minHeight:'120px'}} value={form.faqs} onChange={e => update('faqs', e.target.value)} placeholder="List common questions and answers e.g.&#10;Q: How long does an inspection take?&#10;A: Usually 2-3 hours depending on the property size&#10;&#10;Q: Do you cover my area?&#10;A: We cover all Perth metro suburbs within 50km" />

                  <div className="btn-row">
                    <button className="btn-back" onClick={() => setStep(3)}>← Back</button>
                    <button className="btn-primary" onClick={() => setStep(5)}>Continue →</button>
                  </div>
                </>
              )}

              {/* STEP 5 — Plan */}
              {step === 5 && (
                <>
                  <div className="step-label">Step 5 — Choose Your Plan</div>
                  <div className="step-title">Select a plan to get started</div>
                  <div className="step-sub">All plans include AI call handling, live dashboard, summaries and transcripts. No lock-in contracts.</div>

                  <div className="plan-grid">
                    {[
                      { name: 'Basic', price: 149, minutes: 100, response: '24hr' },
                      { name: 'Standard', price: 299, minutes: 300, response: '12hr' },
                      { name: 'Premium', price: 699, minutes: 1000, response: '4hr' },
                    ].map(p => (
                      <div key={p.name} className={`plan-card ${form.plan_name === p.name ? 'selected' : ''}`} onClick={() => update('plan_name', p.name)}>
                        <div className="plan-name">{p.name}</div>
                        <div className="plan-price">${p.price}<span>/mo</span></div>
                        <div className="plan-minutes">{p.minutes} min included</div>
                        <div className="plan-minutes">{p.response} support</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '20px', fontSize: '0.82rem', color: '#475569', lineHeight: '1.7' }}>
                    ✓ Australian AI voice agent<br/>
                    ✓ Live dashboard with call recordings and transcripts<br/>
                    ✓ AI call summaries after every call<br/>
                    ✓ Email notifications for every call<br/>
                    ✓ No setup fees · No lock-in contracts
                  </div>

                  {error && <div className="error-msg">⚠ {error}</div>}

                  <div className="btn-row">
                    <button className="btn-back" onClick={() => setStep(4)}>← Back</button>
                    {isTrial && (
  <div style={{ background: '#EEEDFE', border: '1px solid #CECBF6', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', fontSize: '0.84rem', color: '#534AB7', fontWeight: '600', textAlign: 'center' }}>
    🎯 You have been offered a 7-day free trial — no payment required today
  </div>
)}
<button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
  {submitting ? 'Submitting...' : isTrial ? 'Start Free Trial →' : 'Submit Application →'}
</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px' }}>
          Already have an account? <a href="https://dashboard.karnaconnect.com.au/login" style={{ color: '#2563eb', fontWeight: '600' }}>Sign in here</a>
        </div>
      </div>
    </>
  )
}
