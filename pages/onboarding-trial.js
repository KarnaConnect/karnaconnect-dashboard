import { useEffect } from 'react'

export default function OnboardingTrial() {
  useEffect(() => {
    window.location.href = '/onboarding?trial=true'
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1a1535,#211a42)', fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#AFA9EC', fontSize: '0.9rem' }}>
      Setting up your free trial...
    </div>
  )
}
