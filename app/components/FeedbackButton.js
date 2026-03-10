'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

const TYPES = [
  { value: 'feedback', label: '💬 General Feedback' },
  { value: 'bug',      label: '🐛 Report a Bug' },
  { value: 'feature',  label: '✨ Feature Request' },
];

export default function FeedbackButton() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen]       = useState(false);
  const [type, setType]           = useState('feedback');
  const [message, setMessage]     = useState('');
  const [status, setStatus]       = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg]   = useState('');

  const open  = () => setIsOpen(true);
  const close = () => {
    if (status === 'loading') return;
    setIsOpen(false);
    setTimeout(() => { setStatus('idle'); setMessage(''); setErrorMsg(''); }, 200);
  };

  const submit = async () => {
    if (!message.trim() || message.trim().length < 5) {
      setErrorMsg('Please enter at least 5 characters.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message,
          userId:    session?.user?.id   || null,
          userEmail: session?.user?.email || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  return (
    <>
      {/* Floating pill button — sits above BottomNav */}
      <button
        onClick={open}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '18px',
          zIndex: 200,
          background: '#2e7d32',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          padding: '9px 16px',
          fontSize: '13px',
          fontWeight: '700',
          fontFamily: "'Nunito', sans-serif",
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(46,125,50,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        💬 Feedback
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          {/* Modal */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '440px',
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {/* Header */}
            <div style={{ background: '#2e7d32', color: 'white', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '800' }}>Send Feedback</div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
                  {session?.user?.name ? `Sending as ${session.user.name}` : 'We read every message 💚'}
                </div>
              </div>
              <button
                onClick={close}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              {status === 'success' ? (
                <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                  <div style={{ fontSize: '52px', marginBottom: '12px' }}>✅</div>
                  <div style={{ fontSize: '17px', fontWeight: '800', color: '#2e7d32', marginBottom: '6px' }}>Thanks for the feedback!</div>
                  <div style={{ fontSize: '13px', color: '#888', marginBottom: '24px' }}>Your message has been saved.</div>
                  <button
                    onClick={close}
                    style={{ background: '#2e7d32', color: 'white', border: 'none', borderRadius: '12px', padding: '11px 32px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  {/* Type chips */}
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#444', marginBottom: '8px' }}>Type</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {TYPES.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setType(t.value)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: `2px solid ${type === t.value ? '#43a047' : '#e0e0e0'}`,
                            background: type === t.value ? '#e8f5e9' : 'white',
                            color: type === t.value ? '#2e7d32' : '#666',
                            fontWeight: type === t.value ? '800' : '600',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontFamily: "'Nunito', sans-serif",
                            transition: 'all 0.15s',
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#444', marginBottom: '8px' }}>
                      Message <span style={{ color: '#e53935' }}>*</span>
                    </div>
                    <textarea
                      value={message}
                      onChange={e => { setMessage(e.target.value); if (errorMsg) setErrorMsg(''); }}
                      placeholder="Tell us what's on your mind..."
                      rows={4}
                      style={{
                        width: '100%',
                        border: `1.5px solid ${errorMsg ? '#e53935' : '#e0e0e0'}`,
                        borderRadius: '12px',
                        padding: '11px 13px',
                        fontSize: '14px',
                        fontFamily: "'Nunito', sans-serif",
                        resize: 'vertical',
                        outline: 'none',
                        boxSizing: 'border-box',
                        lineHeight: '1.5',
                      }}
                      onFocus={e  => { e.target.style.borderColor = '#43a047'; }}
                      onBlur={e   => { e.target.style.borderColor = errorMsg ? '#e53935' : '#e0e0e0'; }}
                    />
                  </div>

                  {/* Error */}
                  {(status === 'error' || errorMsg) && (
                    <div style={{
                      background: '#fff3f3',
                      border: '1px solid #ffcdd2',
                      color: '#c62828',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      fontWeight: '600',
                      marginBottom: '16px',
                    }}>
                      ⚠️ {errorMsg || 'Something went wrong. Please try again.'}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    onClick={submit}
                    disabled={status === 'loading'}
                    style={{
                      width: '100%',
                      background: status === 'loading' ? '#81c784' : '#2e7d32',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '13px',
                      fontSize: '15px',
                      fontWeight: '800',
                      fontFamily: "'Nunito', sans-serif",
                      cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    {status === 'loading' ? 'Saving...' : 'Send Feedback'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}