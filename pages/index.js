import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function Dashboard() {
  const [calls, setCalls] = useState([])

  useEffect(() => {
    const supabase = createClient(
      'https://enxajqahxnbgxwigvsjz.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueGFqcWFoeG5iZ3h3aWd2c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTA0OTQsImV4cCI6MjA5MjgyNjQ5NH0.VRzz5We66I620lBKz2WXQgmD02BJbCyqs0eW4YN8IGw'
    )

    async function fetchCalls() {
      const { data } = await supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
      setCalls(data || [])
    }
    fetchCalls()
  }, [])

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>KarnaConnect Dashboard</h1>
      <h2>Recent Calls</h2>
      {calls.length === 0 ? (
        <p>No calls yet. Once your AI agent handles calls they will appear here.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Caller</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Duration</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {calls.map(call => (
              <tr key={call.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{new Date(call.created_at).toLocaleString()}</td>
                <td style={{ padding: '10px' }}>{call.caller_number || 'Unknown'}</td>
                <td style={{ padding: '10px' }}>{call.call_duration ? `${call.call_duration}s` : '-'}</td>
                <td style={{ padding: '10px' }}>{call.call_outcome || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
