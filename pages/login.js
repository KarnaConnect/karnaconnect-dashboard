import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
)

function MashLogo({ size = 44 }) {
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

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // 'login' or 'forgot'
  const [resetMsg, setResetMsg] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

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

  async function handleForgotPassword() {
    if (!email) {
      setError('Please enter your email address.')
      return
    }
    setResetLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://dashboard.mashai.com.au/reset-password'
    })
    if (error) {
      setError(error.message)
    } else {
      setResetMsg('✅ Password reset email sent! Check your inbox.')
    }
    setResetLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body {
          font-family:'Plus Jakarta Sans', sans-serif;
          background:linear-gradient(135deg,#1a1535 0%,#211a42 100%);
          min-height:100vh; display:flex; align-items:center; justify-content:center;
          -webkit-font-smoothing:antialiased;
        }
        .card {
          background:#fff; border-radius:20px; padding:44px 40px;
          width:100%; max-width:420px;
          box-shadow:0 24px 60px rgba(26,21,53,0.4);
          margin:20px;
        }
        .logo-row { display:flex; align-items:center; gap:12px; margin-bottom:6px; }
        .logo-text { font-size:1.4rem; font-weight:800; color:#1a1535; letter-spacing:-0.3px; }
        .logo-text span { color:#7F77DD; }
        .subtitle { font-size:0.8rem; color:#94a3b8; margin-bottom:32px; padding-left:56px; }
        .page-title { font-size:1.1rem; font-weight:700; color:#1a1535; margin-bottom:6px; }
        .page-sub { font-size:0.82rem; color:#94a3b8; margin-bottom:28px; }
        .field-label {
          font-size:0.75rem; font-weight:700; text-transform:uppercase;
          letter-spacing:1px; color:#64748b; margin-bottom:6px; display:block;
        }
        .field {
          width:100%; padding:12px 14px; border-radius:10px;
          border:1.5px solid #e2e8f0; font-size:0.9rem;
          font-family:'Plus Jakarta Sans', sans-serif;
          color:#1a1535; outline:none; margin-bottom:16px;
          transition:border-color 0.2s;
        }
        .field:focus { border-color:#534AB7; }
        .error {
          background:#fef2f2; border:1px solid #fecaca;
          color:#dc2626; font-size:0.8rem; padding:10px 12px;
          border-radius:8px; margin-bottom:16px;
        }
        .success {
          background:#f0fdf4; border:1px solid #bbf7d0;
          color:#16a34a; font-size:0.8rem; padding:10px 12px;
          border-radius:8px; margin-bottom:16px;
        }
        .btn {
          width:100%; padding:13px;
          background:linear-gradient(135deg,#534AB7,#7F77DD);
          color:#fff; font-size:0.9rem; font-weight:700;
          border:none; border-radius:10px; cursor:pointer;
          font-family:'Plus Jakarta Sans', sans-serif;
          box-shadow:0 4px 14px rgba(83,74,183,0.35);
          transition:opacity 0.2s;
        }
        .btn:hover { opacity:0.9; }
        .btn:disabled { opacity:0.6; cursor:not-allowed; }
        .forgot-link {
          display:block; text-align:right; font-size:0.78rem;
          color:#534AB7; font-weight:600; cursor:pointer;
          margin-top:-8px; margin-bottom:20px;
          text-decoration:none;
        }
        .forgot-link:hover { color:#7F77DD; }
        .back-link {
          display:block; text-align:center; font-size:0.78rem;
          color:#534AB7; font-weight:600; cursor:pointer;
          margin-top:16px;
        }
        .back-link:hover { color:#7F77DD; }
        .footer-text {
          text-align:center; font-size:0.72rem;
          color:#94a3b8; margin-top:20px;
        }
        .footer-text span { color:#AFA9EC; font-weight:600; }
        .divider { height:1px; background:#f1f5f9; margin:20px 0; }
      `}</style>

      <div className="card">
        <div className="logo-row">
          <MashLogo size={44} />
          <div className="logo-text">M<span>ash</span></div>
        </div>
        <div className="subtitle">AI Receptionist · by KarnaConnect</div>

        {mode === 'login' ? (
          <>
            <label className="field-label">Email</label>
            <input
              className="field"
              type="email"
              placeholder="you@yourbusiness.com"
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

            <span className="forgot-link" onClick={() => { setMode('forgot'); setError(''); }}>
              Forgot password?
            </span>

            {error && <div className="error">⚠ {error}</div>}

            <button className="btn" onClick={handleLogin} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </>
        ) : (
          <>
            <div className="page-title">Reset Password</div>
            <div className="page-sub">Enter your email and we'll send you a reset link.</div>

            <label className="field-label">Email</label>
            <input
              className="field"
              type="email"
              placeholder="you@yourbusiness.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
            />

            {error && <div className="error">⚠ {error}</div>}
            {resetMsg && <div className="success">{resetMsg}</div>}

            <button className="btn" onClick={handleForgotPassword} disabled={resetLoading || !!resetMsg}>
              {resetLoading ? 'Sending...' : 'Send Reset Link →'}
            </button>

            <span className="back-link" onClick={() => { setMode('login'); setError(''); setResetMsg(''); }}>
              ← Back to Sign In
            </span>
          </>
        )}

        <div className="footer-text">
          <span>Mash</span> · Powered by KarnaConnect · AU
        </div>
      </div>
    </>
  )
}
