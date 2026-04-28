import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function Dashboard() {
  const [calls, setCalls] = useState([])
  const [expanded, setExpanded] = useState(null)

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
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: '#1a1a1a' }}>KarnaConnect Dashboard</h1>
      <h2 style={{ color: '#444', fontWeight: 400 }}>Recent Calls</h2>
      {calls.length === 0 ? (
        <p>No calls yet. Once your AI agent handles calls they will appear here.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '13px', color: '#666' }}>Date</th>
              <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '13px', color: '#666' }}>Caller</th>
              <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '13px', color: '#666' }}>Duration</th>
              <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '13px', color: '#666' }}>Outcome</th>
              <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '13px', color: '#666' }}>Summary</th>
            </tr>
          </thead>
          <tbody>
            {calls.map(call => (
              <>
                <tr
                  key={call.id}
                  style={{ borderBottom: '1px solid #eee', cursor: call.call_summary ? 'pointer' : 'default' }}
                  onClick={() => setExpanded(expanded === call.id ? null : call.id)}
                >
                  <td style={{ padding: '12px 10px', fontSize: '14px' }}>{new Date(call.created_at).toLocaleString()}</td>
                  <td style={{ padding: '12px 10px', fontSize: '14px' }}>{call.caller_number || 'Unknown'}</td>
                  <td style={{ padding: '12px 10px', fontSize: '14px' }}>{call.call_duration ? `${call.call_duration}s` : '-'}</td>
                  <td style={{ padding: '12px 10px', fontSize: '14px' }}>{call.call_outcome || '-'}</td>
                  <td style={{ padding: '12px 10px', fontSize: '14px', color: '#0070f3' }}>{call.call_summary ? 'Click to view' : '-'}</td>
                </tr>
                {expanded === call.id && call.call_summary && (
                  <tr key={call.id + '-summary'}>
                    <td colSpan={5} style={{ padding: '16px', backgroundColor: '#f9f9f9', fontSize: '14px', color: '#444', lineHeight: '1.6' }}>
                      <strong>Call Summary:</strong><br />{call.call_summary}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
