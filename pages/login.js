import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body {
          font-family:'Plus Jakarta Sans', sans-serif;
          background:linear-gradient(135deg,#08112b 0%,#0d1a3a 100%);
          min-height:100vh; display:flex; align-items:center; justify-content:center;
          -webkit-font-smoothing:antialiased;
        }
        .card {
          background:#fff; border-radius:20px; padding:44px 40px;
          width:100%; max-width:420px;
          box-shadow:0 24px 60px rgba(0,0,0,0.3);
        }
        .logo-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
        .logo-atom {
          width:38px; height:38px; border-radius:10px;
          background:linear-gradient(135deg,#2563eb,#06b6d4);
          display:flex; align-items:center; justify-content:center;
          font-size:1.1rem; box-shadow:0 4px 12px rgba(37,99,235,0.35);
        }
        .logo-text { font-size:1.25rem; font-weight:800; color:#08112b; letter-spacing:-0.3px; }
        .logo-text span { color:#06b6d4; }
        .subtitle { font-size:0.8rem; color:#94a3b8; margin-bottom:32px; padding-left:48px; }
        .field-label {
          font-size:0.75rem; font-weight:700; text-transform:uppercase;
          letter-spacing:1px; color:#64748b; margin-bottom:6px; display:block;
        }
        .field {
          width:100%; padding:12px 14px; border-radius:10px;
          border:1.5px solid #e2e8f0; font-size:0.9rem;
          font-family:'Plus Jakarta Sans', sans-serif;
          color:#08112b; outline:none; margin-bottom:16px;
          transition:border-color 0.2s;
        }
        .field:focus { border-color:#2563eb; }
        .error {
          background:#fef2f2; border:1px solid #fecaca;
          color:#dc2626; font-size:0.8rem; padding:10px 12px;
          border-radius:8px; margin-bottom:16px;
        }
        .btn {
          width:100%; padding:13px;
          background:linear-gradient(135deg,#2563eb,#06b6d4);
          color:#fff; font-size:0.9rem; font-weight:700;
          border:none; border-radius:10px; cursor:pointer;
          font-family:'Plus Jakarta Sans', sans-serif;
          box-shadow:0 4px 14px rgba(37,99,235,0.3);
          transition:opacity 0.2s;
        }
        .btn:hover { opacity:0.9; }
        .btn:disabled { opacity:0.6; cursor:not-allowed; }
        .footer-text {
          text-align:center; font-size:0.72rem;
          color:#94a3b8; margin-top:20px;
        }
      `}</style>

      <div className="card">
        <div className="logo-row">
          <div className="logo-atom">⚛</div>
          <div className="logo-text">Karna<span>Connect</span></div>
        </div>
        <div className="subtitle">AI Command Centre</div>

        <label className="field-label">Email</label>
        <input
          className="field"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />

        <label className="field-label">Password</label>
        <input
          className="field"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />

        {error && <div className="error">⚠ {error}</div>}

        <button className="btn" onClick={handleLogin} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>

        <div className="footer-text">
          KarnaConnect · South Lake WA 6164
        </div>
      </div>
    </>
  )
}
