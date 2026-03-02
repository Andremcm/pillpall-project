'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function GoogleCalendarSync({ reminder }) {
  const { data: session } = useSession();
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleSync = async () => {
    if (!session) {
      signIn('google');
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch('/api/calendar/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine: reminder.medicine,
          dosage: reminder.dosage,
          time: reminder.rawTime || reminder.time,
          frequency: reminder.frequency,
          endDate: reminder.endDate || null,
        }),
      });
      if (res.ok) {
        setSynced(true);
        showToast('Added to Google Calendar!');
      } else {
        showToast('Failed to sync.');
      }
    } catch {
      showToast('Network error.');
    }
    setSyncing(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      {toast && (
        <div style={{ position:'fixed', top:'24px', left:'50%', transform:'translateX(-50%)',
          background:'#2e7d32', color:'white', padding:'10px 24px', borderRadius:'30px',
          fontSize:'13px', fontWeight:'700', zIndex:999, whiteSpace:'nowrap',
          boxShadow:'0 4px 16px rgba(46,125,50,0.35)', fontFamily:'Nunito,sans-serif' }}>
          {toast}
        </div>
      )}
      <button
        onClick={handleSync}
        disabled={syncing || synced}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '7px 12px',
          background: synced ? '#e8f5e9' : 'white',
          border: `2px solid ${synced ? '#43a047' : '#e0e0e0'}`,
          borderRadius: '10px',
          cursor: syncing || synced ? 'default' : 'pointer',
          fontSize: '12px', fontWeight: '700',
          color: synced ? '#2e7d32' : '#555',
          fontFamily: 'Nunito, sans-serif',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
        }}>
        {/* Google Calendar icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="17" rx="2" stroke="#4285F4" strokeWidth="2"/>
          <path d="M16 2v4M8 2v4M3 10h18" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
          <rect x="8" y="13" width="3" height="3" rx="0.5" fill="#34A853"/>
          <rect x="13" y="13" width="3" height="3" rx="0.5" fill="#FBBC05"/>
          <rect x="8" y="17" width="3" height="3" rx="0.5" fill="#EA4335"/>
        </svg>
        {syncing ? 'Syncing...' : synced ? '✓ Synced' : !session ? 'Connect Google' : 'Add to Google Cal'}
      </button>
    </div>
  );
}