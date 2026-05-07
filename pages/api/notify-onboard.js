export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    client_id, business_name, contact_name,
    contact_email, contact_phone, plan_name,
    agent_name, vapi_agent_id
  } = req.body

  try {
    // Send notification via your Railway backend
    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/notify-onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id, business_name, contact_name,
        contact_email, contact_phone, plan_name,
        agent_name, vapi_agent_id
      })
    })

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Notify error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
