const nodemailer = require('nodemailer')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    client_id, business_name, contact_name,
    contact_email, contact_phone, plan_name,
    agent_name, vapi_agent_id
  } = req.body

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: { rejectUnauthorized: false }
  })

  const emailHtml = `
    <div style="font-family:'Segoe UI',sans-serif; max-width:600px; margin:0 auto; background:#f8fafc; padding:20px;">
      <div style="background:linear-gradient(135deg,#2563eb,#06b6d4); border-radius:12px 12px 0 0; padding:24px; text-align:center;">
        <h1 style="color:white; margin:0; font-size:1.3rem;">⚛ New Client Onboarded</h1>
        <p style="color:rgba(255,255,255,0.8); margin:6px 0 0; font-size:0.85rem;">KarnaConnect AI Command Centre</p>
      </div>
      <div style="background:white; border-radius:0 0 12px 12px; padding:28px; border:1px solid #e2e8f0; border-top:none;">
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
          <tr>
            <td style="padding:10px 0; border-bottom:1px solid #f1f5f9; color:#94a3b8; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px; width:40%;">Business</td>
            <td style="padding:10px 0; border-bottom:1px solid #f1f5f9; color:#0f172a; font-weight:600;">${business_name}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; border-bottom:1px solid #f1f5f9; color:#94a3b8; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Contact</td>
            <td style="padding:10px 0; border-bottom:1px solid #f1f5f9; color:#0f172a; font-weight:600;">${contact_name}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; border-bottom:1px solid #f1f5f9; color:#94a3b8; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Email</td>
            <td style="padding:10px 0; border-bottom:1px solid #f1f5f9; color:#0f172a; font-weight:600;">${contact_email}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; border-bottom:1px solid #f1f5f9; color:#94a3b8; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Phone</td>
            <td style="padding:10px 0; border-bottom:1px solid #f1f5f9; color:#0f172a; font-weight:600;">${contact_phone}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; border-bottom:1px solid #f1f5f9; color:#94a3b8; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Plan</td>
            <td style="padding:10px 0; border-bottom:1px solid #f1f5f9; color:#0f172a; font-weight:600;">${plan_name}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; border-bottom:1px solid #f1f5f9; color:#94a3b8; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Agent Name</td>
            <td style="padding:10px 0; border-bottom:1px solid #f1f5f9; color:#0f172a; font-weight:600;">${agent_name}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#94a3b8; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">VAPI Agent ID</td>
            <td style="padding:10px 0; color:#0f172a; font-weight:600; font-family:monospace; font-size:0.8rem;">${vapi_agent_id}</td>
          </tr>
        </table>

        <div style="background:#f8fafc; border-left:3px solid #2563eb; border-radius:0 8px 8px 0; padding:16px; margin-bottom:24px;">
          <p style="color:#2563eb; font-size:0.7rem; text-transform:uppercase; letter-spacing:1px; font-weight:700; margin:0 0 8px;">Next Steps</p>
          <p style="color:#475569; font-size:0.875rem; line-height:1.7; margin:0;">
            1. Review the draft VAPI agent in your VAPI dashboard<br/>
            2. Assign a Twilio phone number to the agent<br/>
            3. Test the agent with a call<br/>
            4. Create login credentials for the client in Supabase<br/>
            5. Send the client their welcome email
          </p>
        </div>

        <a href="https://dashboard.vapi.ai" style="display:block; text-align:center; background:linear-gradient(135deg,#2563eb,#06b6d4); color:white; padding:13px 20px; border-radius:8px; text-decoration:none; font-weight:700; font-size:0.9rem;">
          Review Agent in VAPI →
        </a>

        <p style="text-align:center; color:#94a3b8; font-size:0.75rem; margin-top:20px;">
          Powered by KarnaConnect · AI Command Centre
        </p>
      </div>
    </div>
  `

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: 'info@karnaconnect.com.au',
      subject: `⚛ New Client — ${business_name} (${plan_name} Plan)`,
      html: emailHtml
    })
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Email error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
