'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './dashboard.css';

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    if (storedName) setUserName(storedName);
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/reminders?userId=${userId}`);
      const data = await res.json();
      setReminders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
    setLoading(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌤️';
    if (hour < 18) return '☀️';
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
            <h2 className="greeting-text">{getGreeting()}, {userName || 'User'}!</h2>
            <p className="greeting-sub">Stay on track with your medication today.</p>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon green">💊</div>
            <div className="stat-info">
              <span className="stat-number">{reminders.length}</span>
              <span className="stat-label">Today's Meds</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">✅</div>
            <div className="stat-info">
              <span className="stat-number">{takenCount}</span>
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
              reminders.map((reminder) => (
                <div key={reminder.id} className="reminder-item">
                  <div className="reminder-dot" />
                  <p className="reminder-text">
                    {reminder.medicine} — {reminder.time}
                    {reminder.taken && (
                      <span style={{ marginLeft: '8px', fontSize: '12px', color: '#a5d6a7' }}>✓ Taken</span>
                    )}
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
            <div className="btn-text">
              <span className="btn-label">Set Reminder</span>
              <span className="btn-sub">Add a new medication</span>
            </div>
          </button>
          <button className="action-btn calendar-btn" onClick={() => router.push('/calendar')}>
            <div className="btn-icon">📅</div>
            <div className="btn-text">
              <span className="btn-label">Calendar</span>
              <span className="btn-sub">View your schedule</span>
            </div>
          </button>
          <button className="action-btn profile-btn" onClick={() => router.push('/profile')}>
            <div className="btn-icon">👤</div>
            <div className="btn-text">
              <span className="btn-label">Profile</span>
              <span className="btn-sub">Manage your account</span>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}