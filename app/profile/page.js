'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './profile.css';

export default function ProfilePage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    setUserName(localStorage.getItem('userName') || 'User');
    setUserEmail(localStorage.getItem('userEmail') || '');
  }, []);

  // Mask: janhudes@gmail.com → janH****@gmail.com
  const maskEmail = (email) => {
    if (!email || !email.includes('@')) return email || 'No email set';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local}@${domain}`;
    const visibleLen = Math.min(4, Math.max(1, local.length - 3));
    const visible = local.slice(0, visibleLen);
    const masked = '*'.repeat(local.length - visibleLen);
    return `${visible}${masked}@${domain}`;
  };

  // Logout: only remove session keys, NOT the DB data
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
    } catch (err) {
      console.error(err);
    }
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
    } catch (err) {
      console.error(err);
    }
    setHistoryLoading(false);
  };

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

  return (
    <div className="profile-container">

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
            <button className="menu-item" onClick={() => alert('Account Settings - Coming soon!')}>
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