export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { createClient } = await import('@supabase/supabase-js')

  const supabase = createClient(
    'https://enxajqahxnbgxwigvsjz.supabase.co',
    process.env.SUPABASE_SERVICE_KEY
  )

  const {
    business_name, industry, contact_name, contact_email, contact_phone,
    address, website, agent_name, business_description, services,
    service_area, business_hours, after_hours, agent_goal,
    tone, always_say, never_say, faqs, plan_name
  } = req.body

  try {
    // 1. Find plan
    const { data: planData } = await supabase
      .from('plans').select('id').eq('name', plan_name).single()

    // 2. Create client
    const isTrial = req.body.is_trial === true

    let trialPlanId = null
    if (isTrial) {
      const { data: trialPlan } = await supabase
        .from('plans').select('id').eq('name', 'Trial').single()
      trialPlanId = trialPlan?.id || null
    }

    const trialExpiry = new Date()
    trialExpiry.setDate(trialExpiry.getDate() + 7)

    const { data: client, error: clientError } = await supabase
      .from('clients').insert([{
        business_name,
        contact_name,
        contact_email,
        phone_number: contact_phone,
        plan_id: isTrial ? trialPlanId : (planData?.id || null),
        active: true,
        is_trial: isTrial,
        trial_expires_at: isTrial ? trialExpiry.toISOString().split('T')[0] : null,
        billing_start_date: new Date().toISOString().split('T')[0]
      }]).select().single()

    if (clientError) throw new Error(clientError.message)

    // 3. Hand off to Railway backend (fire and forget)
    fetch(`${process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL}/create-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: client.id,
        business_name, industry, contact_name, contact_email,
        contact_phone, agent_name, business_description, services,
        service_area, business_hours, after_hours, agent_goal,
        tone, always_say, never_say, faqs, plan_name
      })
    }).catch(err => console.error('Backend handoff error:', err.message))

    // 4. Return success immediately
    res.status(200).json({ success: true, client_id: client.id })

  } catch (err) {
    console.error('Onboard error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
