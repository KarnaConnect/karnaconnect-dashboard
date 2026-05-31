import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://enxajqahxnbgxwigvsjz.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { token, userId, clientId } = req.body

  if (!token || !userId) return res.status(400).json({ error: 'Missing token or userId' })

  const { error } = await supabase
    .from('device_tokens')
    .upsert({ user_id: userId, client_id: clientId, token }, { onConflict: 'user_id,token' })

  if (error) {
    console.error('Error saving token:', error)
    return res.status(500).json({ error: error.message })
  }

  res.status(200).json({ success: true })
}
