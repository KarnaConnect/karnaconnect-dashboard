export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { crm, sync, notes } = req.body

  const body = `
CRM Integration Request
=======================
CRM System: ${crm}
Sync Requirements: ${sync?.join(', ') || 'Not specified'}
Notes: ${notes || 'None'}
  `

  console.log('CRM Request received:', body)
  res.status(200).json({ success: true })
}
