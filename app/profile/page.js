'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import './profile.css';

export default function ProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showGoogleSignOutModal, setShowGoogleSignOutModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [toast, setToast] = useState('');
  const [cachedReminders, setCachedReminders] = useState([]);

  // Account settings form
  const [accountForm, setAccountForm] = useState({ name: '', currentPassword: '', newPassword: '' });
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountMsg, setAccountMsg] = useState('');

  const fetchAndCacheReminders = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
      const res = await fetch(`/api/reminders?userId=${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const seen = new Set();
        const unique = data.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
        setCachedReminders(unique);
      }
    } catch {}
  };

  useEffect(() => {
    setUserName(localStorage.getItem('userName') || 'User');
    setUserEmail(localStorage.getItem('userEmail') || '');
    fetchAndCacheReminders();
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAndCacheReminders(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Re-fetch when navigating back to this page
  const pathname = usePathname();
  useEffect(() => { fetchAndCacheReminders(); }, [pathname]);

  const maskEmail = (email) => {
    if (!email || !email.includes('@')) return email || 'No email set';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local}@${domain}`;
    const visibleLen = Math.min(4, Math.max(1, local.length - 3));
    const visible = local.slice(0, visibleLen);
    const masked = '*'.repeat(local.length - visibleLen);
    return `${visible}${masked}@${domain}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    router.push('/login');
  };

  const handleExportData = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
      const res = await fetch(`/api/reminders?userId=${userId}`);
      const data = await res.json();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const a = document.createElement('a');
      a.setAttribute("href", dataStr);
      a.setAttribute("download", "pillpal-reminders.json");
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) { console.error(err); }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    setShowHistory(true);
    const userId = localStorage.getItem('userId');
    if (!userId) { setHistoryLoading(false); return; }
    try {
      const res = await fetch(`/api/history?userId=${userId}`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    setHistoryLoading(false);
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setAccountSaving(true);
    setAccountMsg('');
    const userId = localStorage.getItem('userId');
    try {
      const res = await fetch('/api/settings/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: parseInt(userId), ...accountForm }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.name) {
          localStorage.setItem('userName', data.name);
          setUserName(data.name);
        }
        setAccountMsg('✓ Updated successfully!');
        setAccountForm({ name: '', currentPassword: '', newPassword: '' });
      } else {
        setAccountMsg('✗ ' + (data.error || 'Update failed'));
      }
    } catch { setAccountMsg('✗ Network error'); }
    setAccountSaving(false);
  };

  const toDateStr = (date) => {
    const d = new Date(date);
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().split('T')[0];
  };

  // ✅ FIXED: Sync All — deduplicates by reminder.id, uses correct date per frequency type
  const syncAllToGoogle = async () => {
    if (!session?.accessToken) { signIn('google'); return; }
    setSyncingAll(true);
    showToast('Adding to calendar...');

    const userId = localStorage.getItem('userId');
    if (!userId) { setSyncingAll(false); return; }

    try {
      const res = await fetch(`/api/reminders?userId=${userId}`);
      const reminders = await res.json();
      if (!Array.isArray(reminders)) { setSyncingAll(false); return; }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = toDateStr(today);

      // Deduplicate by reminder.id
      const seen = new Set();
      const unique = reminders.filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id); return true;
      });

      // Local map: uniqueKey -> eventId (updated immediately after each sync so loop never re-creates)
      const localMap = {};
      unique.forEach(r => {
        if (!r.googleEventId) return;
        if (r.frequency === 'custom') {
          try {
            const arr = JSON.parse(r.googleEventId);
            if (Array.isArray(arr)) arr.forEach(e => { localMap[`pillpal_${r.id}_${e.date}`] = e.eventId; });
          } catch {}
        } else {
          localMap[`pillpal_${r.id}`] = r.googleEventId;
        }
      });

      let count = 0;

      for (const reminder of unique) {
        if (reminder.frequency === 'custom' && reminder.customDates?.length > 0) {
          const futureDates = reminder.customDates.filter(d => d >= todayStr);
          if (futureDates.length === 0) continue;

          // Build updatedArr from existing saved data
          let updatedArr = [];
          try { const p = JSON.parse(reminder.googleEventId); if (Array.isArray(p)) updatedArr = [...p]; } catch {}

          for (const dateStr of futureDates) {
            const uniqueKey = `pillpal_${reminder.id}_${dateStr}`;
            const existingEventId = localMap[uniqueKey] || null;
            try {
              const syncRes = await fetch('/api/calendar/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  medicine: reminder.medicine, dosage: reminder.dosage,
                  time: reminder.time, frequency: 'custom',
                  endDate: null, customDates: [], date: dateStr,
                  eventId: existingEventId, uniqueKey,
                  accessToken: session.accessToken, refreshToken: session.refreshToken,
                }),
              });
              if (syncRes.ok) {
                const syncData = await syncRes.json();
                localMap[uniqueKey] = syncData.eventId; // ✅ update immediately
                const idx = updatedArr.findIndex(e => e.date === dateStr);
                if (idx >= 0) updatedArr[idx] = { date: dateStr, eventId: syncData.eventId };
                else updatedArr.push({ date: dateStr, eventId: syncData.eventId });
                count++;
              }
            } catch (e) { console.error('Sync error for date', dateStr, e); }
          }

          // ✅ Save full updated array to DB before moving to next reminder
          await fetch(`/api/reminders/${reminder.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              medicine: reminder.medicine, dosage: reminder.dosage,
              frequency: reminder.frequency, time: reminder.time,
              customDates: reminder.customDates || [], endDate: null,
              googleEventId: JSON.stringify(updatedArr),
            }),
          });

        } else {
          const uniqueKey = `pillpal_${reminder.id}`;
          const existingEventId = localMap[uniqueKey] || null;
          try {
            const syncRes = await fetch('/api/calendar/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                medicine: reminder.medicine, dosage: reminder.dosage,
                time: reminder.time, frequency: reminder.frequency,
                endDate: reminder.endDate || null, customDates: [],
                date: todayStr, eventId: existingEventId, uniqueKey,
                accessToken: session.accessToken, refreshToken: session.refreshToken,
              }),
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              localMap[uniqueKey] = syncData.eventId; // ✅ update immediately
              // ✅ Await DB save before next iteration
              await fetch(`/api/reminders/${reminder.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  medicine: reminder.medicine, dosage: reminder.dosage,
                  frequency: reminder.frequency, time: reminder.time,
                  customDates: reminder.customDates || [],
                  endDate: reminder.endDate || null,
                  googleEventId: syncData.eventId,
                }),
              });
              count++;
            }
          } catch (e) { console.error('Sync error for', reminder.medicine, e); }
        }
      }

      showToast(count > 0 ? `✓ Added ${count} event${count > 1 ? 's' : ''} to Google Calendar!` : 'Nothing to add.');
    } catch (err) {
      console.error(err);
      showToast('Failed to add to calendar.');
    }
    fetchAndCacheReminders(); // refresh so button shows 'Already in Calendar'
    setSyncingAll(false);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name[0].toUpperCase();
  };

  const formatHistoryDate = (ts) =>
    new Date(ts).toLocaleDateString('default', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const formatHistoryTime = (ts) =>
    new Date(ts).toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });

  const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '20px' };
  const inputStyle = { padding: '11px 14px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '14px', fontFamily: 'Nunito,sans-serif', fontWeight: '600', outline: 'none', color: '#222', width: '100%', boxSizing: 'border-box' };
  const labelStyle = { fontSize: '12px', fontWeight: '800', color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Nunito,sans-serif', display: 'block', marginBottom: '5px' };

  return (
    <div className="profile-container">

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', background: '#2e7d32', color: 'white', padding: '12px 28px', borderRadius: '30px', fontSize: '14px', fontWeight: '700', zIndex: 999, boxShadow: '0 4px 16px rgba(46,125,50,0.35)', whiteSpace: 'nowrap', fontFamily: 'Nunito,sans-serif' }}>{toast}</div>
      )}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon">🚪</div>
            <h3 className="modal-title">Log Out</h3>
            <p className="modal-text">Are you sure you want to log out of PillPal?</p>
            <div className="modal-buttons">
              <button className="modal-cancel" onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button className="modal-confirm modal-danger" onClick={handleLogout}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Google Sign Out Modal */}
      {showGoogleSignOutModal && (
        <div style={overlayStyle}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', maxWidth: '340px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📅</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '800', color: '#1b5e20', fontFamily: 'Nunito,sans-serif' }}>Disconnect Google</h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#555', fontFamily: 'Nunito,sans-serif' }}>
              This will disconnect your Google Calendar. Your reminders will stay in PillPal.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowGoogleSignOutModal(false)} style={{ flex: 1, padding: '12px', background: '#f0f0f0', border: '2px solid #e0e0e0', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', color: '#555' }}>Cancel</button>
              <button onClick={() => { signOut({ redirect: false }); setShowGoogleSignOutModal(false); showToast('Disconnected from Google.'); }} style={{ flex: 1, padding: '12px', background: '#ef5350', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '800', color: 'white', cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }}>Disconnect</button>
            </div>
          </div>
        </div>
      )}

      {/* Account Settings Modal */}
      {showAccountSettings && (
        <div style={overlayStyle}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1b5e20', fontFamily: 'Nunito,sans-serif' }}>⚙️ Account Settings</h3>
              <button onClick={() => { setShowAccountSettings(false); setAccountMsg(''); }} style={{ background: '#f0f0f0', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>✕</button>
            </div>

            {/* Google Calendar Section */}
            <div style={{ background: '#f8fdf8', border: '2px solid #e8f5e9', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#2e7d32', marginBottom: '10px', fontFamily: 'Nunito,sans-serif' }}>📅 Google Calendar</div>
              {session ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {session.user?.image && <img src={session.user.image} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#1b5e20', fontFamily: 'Nunito,sans-serif' }}>{session.user?.name}</div>
                      <div style={{ fontSize: '11px', color: '#4285F4', fontWeight: '700', fontFamily: 'Nunito,sans-serif' }}>✓ Connected</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowGoogleSignOutModal(true)}
                    style={{ padding: '8px 14px', background: '#ffebee', border: '2px solid #ef9a9a', borderRadius: '10px', fontSize: '12px', fontWeight: '800', color: '#c62828', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', whiteSpace: 'nowrap' }}>
                    Disconnect
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ fontSize: '13px', color: '#888', fontFamily: 'Nunito,sans-serif' }}>Not connected</div>
                  <button
                    onClick={() => signIn('google')}
                    style={{ padding: '8px 14px', background: '#e8f5e9', border: '2px solid #a5d6a7', borderRadius: '10px', fontSize: '12px', fontWeight: '800', color: '#2e7d32', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', whiteSpace: 'nowrap' }}>
                    Connect Google
                  </button>
                </div>
              )}

              {/* Add All button — shows "Already in Calendar" when all reminders are synced */}
              {session && (() => {
                const today = new Date(); today.setHours(0,0,0,0);
                const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
                const allSynced = cachedReminders.length > 0 && cachedReminders.every(r => {
                  if (!r.googleEventId) return false;
                  if (r.frequency === 'custom') {
                    try {
                      const arr = JSON.parse(r.googleEventId);
                      if (Array.isArray(arr)) return arr.some(e => e.eventId);
                    } catch {}
                    return false;
                  }
                  return true;
                });
                return (
                  <button
                    onClick={allSynced ? undefined : syncAllToGoogle}
                    disabled={syncingAll || allSynced}
                    style={{
                      marginTop: '12px', width: '100%', padding: '10px',
                      background: syncingAll ? '#f0f0f0' : allSynced ? '#f5f5f5' : 'linear-gradient(135deg,#4285F4,#1a73e8)',
                      border: allSynced ? '2px solid #e0e0e0' : 'none',
                      borderRadius: '10px',
                      fontSize: '13px', fontWeight: '800',
                      color: syncingAll ? '#aaa' : allSynced ? '#aaa' : 'white',
                      cursor: (syncingAll || allSynced) ? 'default' : 'pointer',
                      fontFamily: 'Nunito,sans-serif',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {syncingAll ? 'Adding...' : allSynced ? 'Already in Calendar' : 'Add All Reminders to Google Cal'}
                  </button>
                );
              })()}
            </div>

            {/* Update Name / Password */}
            <form onSubmit={handleAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>New Display Name</label>
                <input type="text" placeholder="Leave blank to keep current" value={accountForm.name} onChange={e => setAccountForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Current Password</label>
                <input type="password" placeholder="Required to change password" value={accountForm.currentPassword} onChange={e => setAccountForm(p => ({ ...p, currentPassword: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>New Password</label>
                <input type="password" placeholder="Leave blank to keep current" value={accountForm.newPassword} onChange={e => setAccountForm(p => ({ ...p, newPassword: e.target.value }))} style={inputStyle} />
              </div>
              {accountMsg && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', fontFamily: 'Nunito,sans-serif', background: accountMsg.startsWith('✓') ? '#e8f5e9' : '#ffebee', color: accountMsg.startsWith('✓') ? '#2e7d32' : '#c62828' }}>{accountMsg}</div>
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setShowAccountSettings(false); setAccountMsg(''); }} style={{ flex: 1, padding: '13px', background: '#f0f0f0', border: '2px solid #e0e0e0', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', color: '#555' }}>Cancel</button>
                <button type="submit" disabled={accountSaving} style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg,#43a047,#2e7d32)', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '800', color: 'white', cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }}>{accountSaving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medicine History Modal */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="history-modal" onClick={e => e.stopPropagation()}>
            <div className="history-header">
              <h3 className="history-title">📋 Medicine History</h3>
              <button className="history-close" onClick={() => setShowHistory(false)}>✕</button>
            </div>
            <div className="history-body">
              {historyLoading ? (
                <div className="history-empty"><p>Loading...</p></div>
              ) : history.length === 0 ? (
                <div className="history-empty">
                  <span style={{ fontSize: '36px' }}>📭</span>
                  <p>No medication history yet.</p>
                  <p className="history-sub">Logs appear after you mark medications as taken.</p>
                </div>
              ) : (
                <div className="history-list">
                  {history.map((item) => (
                    <div key={item.logId} className={`history-item ${item.status}`}>
                      <div className="history-item-left">
                        <div className="history-pill-icon">💊</div>
                        <div className="history-info">
                          <div className="history-med-name">{item.medicine}</div>
                          <div className="history-med-details">{item.dosage} · {item.frequency}</div>
                          <div className="history-date">{formatHistoryDate(item.timestamp)}</div>
                          <div className="history-time">⏰ {formatHistoryTime(item.timestamp)}</div>
                        </div>
                      </div>
                      <span className={`history-badge ${item.status}`}>
                        {item.status === 'taken' ? '✓ Taken' : '✗ Skipped'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="profile-header">
        <button className="back-btn" onClick={() => router.push('/dashboard')}>← Back</button>
        <h1 className="page-title">Profile & Settings</h1>
      </header>

      <main className="profile-main">
        <div className="profile-card">
          <div className="avatar-circle">{getInitials(userName)}</div>
          <h2 className="user-name">{userName}</h2>
          <p className="user-email">{maskEmail(userEmail)}</p>
          <button className="change-photo-btn">Tap to change photo</button>
        </div>

        <div className="settings-card">
          <h3 className="section-title">⚙️ Settings</h3>
          <div className="menu-list">
            <button className="menu-item" onClick={() => alert('Notification Settings - Coming soon!')}>
              <div className="menu-left"><span className="menu-icon">🔔</span><span className="menu-text">Notification Settings</span></div>
              <span className="menu-arrow">›</span>
            </button>
            <button className="menu-item" onClick={fetchHistory}>
              <div className="menu-left"><span className="menu-icon">📋</span><span className="menu-text">Medicine History</span></div>
              <span className="menu-arrow">›</span>
            </button>
            <button className="menu-item" onClick={() => setShowAccountSettings(true)}>
              <div className="menu-left"><span className="menu-icon">⚙️</span><span className="menu-text">Account Settings</span></div>
              <span className="menu-arrow">›</span>
            </button>
            <button className="menu-item" onClick={handleExportData}>
              <div className="menu-left"><span className="menu-icon">📤</span><span className="menu-text">Export Data</span></div>
              <span className="menu-arrow">›</span>
            </button>
            <button className="menu-item logout-item" onClick={() => setShowLogoutModal(true)}>
              <div className="menu-left"><span className="menu-icon">🚪</span><span className="menu-text logout-text">Logout</span></div>
              <span className="menu-arrow logout-arrow">›</span>
            </button>
          </div>
        </div>

        <div className="app-info"><p>PillPal v1.0.0 · Your Medication Companion</p></div>
      </main>

      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => router.push('/dashboard')}><span className="nav-icon">🏠</span><span className="nav-label">Home</span></button>
        <button className="nav-item" onClick={() => router.push('/reminders/new')}><span className="nav-icon">➕</span><span className="nav-label">Add</span></button>
        <button className="nav-item" onClick={() => router.push('/calendar')}><span className="nav-icon">📅</span><span className="nav-label">Calendar</span></button>
        <button className="nav-item active"><span className="nav-icon">👤</span><span className="nav-label">Profile</span></button>
      </nav>
    </div>
  );
}