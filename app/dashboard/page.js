'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './dashboard.css';

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// ✅ Updated: respects endDate for daily/twice-daily
function reminderAppearsToday(reminder) {
  const today = new Date(); today.setHours(0,0,0,0);

  const start = reminder.startDate ? new Date(reminder.startDate) : new Date(0);
  start.setHours(0,0,0,0);
  if (today < start) return false;

  // ✅ Stop showing after endDate
  if (reminder.endDate) {
    const end = new Date(reminder.endDate + 'T00:00:00');
    end.setHours(0,0,0,0);
    if (today > end) return false;
  }

  switch (reminder.frequency) {
    case 'daily':
    case 'twice-daily':
      return true;
    case 'weekly':
      return today.getDay() === reminder.dayOfWeek;
    case 'custom':
      return (reminder.customDates || []).includes(toDateStr(today));
    default:
      return true;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUserName(localStorage.getItem('userName') || 'User');
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/reminders?userId=${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setReminders(data.filter(r => reminderAppearsToday(r)));
      }
    } catch (err) { console.error('Dashboard fetch error:', err); }
    setLoading(false);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getGreetingEmoji = () => {
    const h = new Date().getHours();
    if (h < 12) return '🌤️';
    if (h < 18) return '☀️';
    return '🌙';
  };

  const takenCount = reminders.filter(r => r.taken).length;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="logo-box"><div className="logo">💊</div></div>
        <h1 className="app-title">Medicine Reminder</h1>
      </header>
      <main className="dashboard-main">
        <div className="greeting-section">
          <span className="greeting-emoji">{getGreetingEmoji()}</span>
          <div>
            <h2 className="greeting-text">{getGreeting()}, {userName}!</h2>
            <p className="greeting-sub">Stay on track with your medication today.</p>
          </div>
        </div>
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon green">💊</div>
            <div className="stat-info">
              <span className="stat-number">{loading ? '—' : reminders.length}</span>
              <span className="stat-label">Today's Meds</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">✅</div>
            <div className="stat-info">
              <span className="stat-number">{loading ? '—' : takenCount}</span>
              <span className="stat-label">Taken Today</span>
            </div>
          </div>
        </div>
        <div className="todays-reminders-box">
          <div className="box-header">
            <h3 className="box-title">📋 Today's Reminders</h3>
            <span className="box-badge">{reminders.length} total</span>
          </div>
          <div className="reminders-content">
            {loading ? (
              <p className="no-reminders-text">Loading...</p>
            ) : reminders.length > 0 ? (
              reminders.map((reminder, idx) => (
                <div key={`${reminder.id}_${idx}`} className="reminder-item">
                  <div className="reminder-dot" style={{ background: reminder.color || '#43a047' }} />
                  <p className="reminder-text">
                    <strong>{reminder.medicine}</strong> — {reminder.time}
                    {reminder.frequency === 'twice-daily' && (
                      <span style={{ fontSize:'11px', color:'#aaa', marginLeft:'6px' }}>
                        ({reminder.isSecond ? '2nd' : '1st'} dose)
                      </span>
                    )}
                    {reminder.taken && <span style={{ marginLeft:'8px', fontSize:'12px', color:'#66bb6a', fontWeight:'800' }}>✓ Taken</span>}
                  </p>
                </div>
              ))
            ) : (
              <p className="no-reminders-text">No reminders scheduled for today</p>
            )}
          </div>
        </div>
        <div className="action-buttons">
          <button className="action-btn set-reminder-btn" onClick={() => router.push('/reminders/new')}>
            <div className="btn-icon">➕</div>
            <div className="btn-text"><span className="btn-label">Set Reminder</span><span className="btn-sub">Add a new medication</span></div>
            <span className="btn-arrow">→</span>
          </button>
          <button className="action-btn calendar-btn" onClick={() => router.push('/calendar')}>
            <div className="btn-icon">📅</div>
            <div className="btn-text"><span className="btn-label">Calendar</span><span className="btn-sub">View your schedule</span></div>
            <span className="btn-arrow">→</span>
          </button>
          <button className="action-btn profile-btn" onClick={() => router.push('/profile')}>
            <div className="btn-icon">👤</div>
            <div className="btn-text"><span className="btn-label">Profile</span><span className="btn-sub">Manage your account</span></div>
            <span className="btn-arrow">→</span>
          </button>
        </div>
      </main>
    </div>
  );
}