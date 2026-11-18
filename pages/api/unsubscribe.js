// Email unsubscribe links point here (on mashai.com.au) and are passed through to the backend,
// so the link domain matches the sender's domain.
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://expressjs-production-48b3.up.railway.app').replace(/\/$/, '')

export default async function handler(req, res) {
  const e = typeof req.query.e === 'string' ? req.query.e : ''
  const t = typeof req.query.t === 'string' ? req.query.t : ''
  const qs = `e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}`
  try {
    if (req.method === 'POST') {
      const r = await fetch(`${BACKEND}/unsubscribe?${qs}`, { method: 'POST' })
      return res.status(r.status).json(await r.json().catch(() => ({ ok: r.ok })))
    }
    const r = await fetch(`${BACKEND}/unsubscribe?${qs}`)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(r.status).send(await r.text())
  } catch {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(502).send('<p style="font-family:Arial,sans-serif;text-align:center;margin-top:80px">Something went wrong. Please email hello@mashai.com.au and we will remove you straight away.</p>')
  }
}
