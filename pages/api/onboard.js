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
    console.log('Step 1: Finding plan...')
    const { data: planData } = await supabase
      .from('plans').select('id').eq('name', plan_name).single()
    console.log('Plan found:', planData)

    console.log('Step 2: Creating client...')
    const { data: client, error: clientError } = await supabase
      .from('clients').insert([{
        business_name,
        contact_name,
        contact_email,
        phone_number: contact_phone,
        plan_id: planData?.id || null,
        active: true,
        billing_start_date: new Date().toISOString().split('T')[0]
      }]).select().single()

    if (clientError) {
      console.error('Client error:', clientError)
      throw new Error(clientError.message)
    }
    console.log('Client created:', client.id)

    console.log('Step 3: Creating VAPI agent...')
    const systemPrompt = `CRITICAL RULE: You must ask only ONE question at a time. Never combine multiple questions in a single response.

You are ${agent_name}, a friendly and professional AI assistant for ${business_name}${industry ? ` — a ${industry} business` : ''}.${business_description ? ` ${business_description}` : ''}

${services ? `Services offered:\n${services}` : ''}
${service_area ? `Service area: ${service_area}` : ''}
${business_hours ? `Business hours: ${business_hours}` : ''}

Your main goal is to: ${agent_goal || 'answer enquiries and capture caller details for the team to follow up'}

When someone calls:
- Warmly greet the caller and introduce yourself as ${agent_name} from ${business_name}
- Understand what they need and help them accordingly
- Collect their details one at a time: full name, best contact number, email, and the nature of their enquiry
- Let them know the team will be in touch as soon as possible

${after_hours ? `After hours: ${after_hours}` : 'If after hours, let callers know the team will contact them next business day.'}
${tone ? `Tone: ${tone}` : 'Be warm, professional and conversational.'}
${always_say ? `Always mention: ${always_say}` : ''}
${never_say ? `Never say: ${never_say}` : ''}
${faqs ? `FAQs:\n${faqs}` : ''}

Always use Australian English.`

    let vapiAgentId = null

    try {
      const vapiResponse = await fetch('https://api.vapi.ai/assistant', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `${business_name} — ${agent_name} (DRAFT)`,
          model: {
            provider: 'openai',
            model: 'gpt-4.1',
            messages: [{ role: 'system', content: systemPrompt }]
          },
          voice: {
            provider: '11labs',
            voiceId: 'ZkDZ5VCyH0GGbxO7o4aO',
            model: 'eleven_turbo_v2_5',
            stability: 0.5,
            similarityBoost: 0.75,
            speed: 1.1
          },
          firstMessage: `Thanks for calling ${business_name}. I'm ${agent_name}, your AI assistant. How can I help you today?`,
          transcriber: {
            provider: 'deepgram',
            model: 'flux-general-en',
            language: 'en'
          },
          serverMessages: ['end-of-call-report'],
          clientMessages: ['transcript']
        })
      })

      const vapiAgent = await vapiResponse.json()
      console.log('VAPI agent created:', vapiAgent.id)
      vapiAgentId = vapiAgent.id

      await supabase.from('clients').update({
        vapi_agent_id: vapiAgentId
      }).eq('id', client.id)

    } catch (vapiErr) {
      console.error('VAPI error (non-fatal):', vapiErr.message)
    }

    console.log('Step 4: Sending notification...')
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/notify-onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          business_name,
          contact_name,
          contact_email,
          contact_phone,
          plan_name,
          agent_name,
          vapi_agent_id: vapiAgentId
        })
      })
    } catch (notifyErr) {
      console.error('Notify error (non-fatal):', notifyErr.message)
    }

    console.log('Done!')
    res.status(200).json({ success: true, client_id: client.id })

  } catch (err) {
    console.error('Onboard error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
