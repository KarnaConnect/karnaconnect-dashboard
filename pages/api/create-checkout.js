import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const priceIds = {
  'Basic': process.env.STRIPE_BASIC_PRICE_ID,
  'Standard': process.env.STRIPE_STANDARD_PRICE_ID,
  'Premium': process.env.STRIPE_PREMIUM_PRICE_ID
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { plan_name, client_id, business_name, contact_email, is_trial } = req.body

  try {
    const sessionConfig = {
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: contact_email,
      line_items: [{
        price: priceIds[plan_name],
        quantity: 1
      }],
      metadata: {
        client_id,
        business_name,
        plan_name,
        is_trial: is_trial ? 'true' : 'false'
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?success=true&client_id=${client_id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?cancelled=true`,
    }

    // Add 7 day trial if trial mode
    if (is_trial) {
      sessionConfig.subscription_data = {
        trial_period_days: 7,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel'
          }
        },
        metadata: {
          client_id,
          business_name,
          plan_name
        }
      }
      sessionConfig.payment_method_collection = 'always'
    }
