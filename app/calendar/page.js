'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './calendar.css';

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editingReminder, setEditingReminder] = useState(null);
  const [editForm, setEditForm] = useState({ medicineName: '', dosage: '', frequency: 'daily', time: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [toast, setToast] = useState('');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => { fetchReminders(); }, []);

  const fetchReminders = async () => {
    setLoading(true);
    const userId = localStorage.getItem('userId');
    if (!userId) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/reminders?userId=${userId}`);
      const data = await res.json();
      setReminders(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  // Calendar helpers
  const getMonthName = (date) => date.toLocaleString('default', { month: 'long' });
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const generateCalendarDays = () => {
    const days = [];
    for (let i = 0; i < getFirstDayOfMonth(currentDate); i++) days.push(null);
    for (let d = 1; d <= getDaysInMonth(currentDate); d++) days.push(d);
    return days;
  };

  const toMidnight = (y, m, d) => { const dt = new Date(y, m, d); dt.setHours(0,0,0,0); return dt; };

  const isToday = (day) => day && toMidnight(currentDate.getFullYear(), currentDate.getMonth(), day).getTime() === today.getTime();
  const isSelected = (day) => {
    if (!day) return false;
    const s = new Date(selectedDate); s.setHours(0,0,0,0);
    return toMidnight(currentDate.getFullYear(), currentDate.getMonth(), day).getTime() === s.getTime();
  };
  const isPast = (day) => day && toMidnight(currentDate.getFullYear(), currentDate.getMonth(), day) < today;
  const hasReminders = (day) => day && reminders.length > 0 && toMidnight(currentDate.getFullYear(), currentDate.getMonth(), day) >= today;

  const handleDateClick = (day) => {
    if (!day) return;
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  // Mark taken — saves to DB log, persists across refreshes
  const markAsTaken = async (reminderId, currentTaken) => {
    const newTaken = !currentTaken;
    // Optimistic update
    setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, taken: newTaken } : r));
    try {
      const res = await fetch(`/api/reminders/${reminderId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taken: newTaken })
      });
      if (!res.ok) {
        // Revert on failure
        setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, taken: currentTaken } : r));
        showToast('Failed to save. Try again.');
      }
    } catch (err) {
      setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, taken: currentTaken } : r));
      showToast('Network error.');
    }
  };

  // Edit reminder from calendar
  const openEdit = (reminder) => {
    const raw = reminder.time || '';
    let timeVal = '';
    const match = raw.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let h = parseInt(match[1]);
      const m = match[2];
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      timeVal = `${String(h).padStart(2,'0')}:${m}`;
    }
    setEditForm({ medicineName: reminder.medicine, dosage: reminder.dosage, frequency: reminder.frequency || 'daily', time: timeVal });
    setEditingReminder(reminder);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const res = await fetch(`/api/reminders/${editingReminder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine: editForm.medicineName,
          dosage: editForm.dosage,
          frequency: editForm.frequency,
          time: editForm.time
        })
      });
      if (res.ok) {
        showToast('Reminder updated!');
        setEditingReminder(null);
        await fetchReminders(); // re-fetch to get fresh data
      } else {
        const d = await res.json();
        showToast('Error: ' + (d.error || 'Update failed'));
      }
    } catch (err) {
      showToast('Network error.');
    }
    setEditSaving(false);
  };

  const isSelectedToday = () => {
    const s = new Date(selectedDate); s.setHours(0,0,0,0);
    return s.getTime() === today.getTime();
  };

  const getRemindersForSelected = () => {
    const sel = new Date(selectedDate); sel.setHours(0,0,0,0);
    return sel >= today ? reminders : [];
  };

  const formatTimeDisplay = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const selectedReminders = getRemindersForSelected();
  const takenCount = reminders.filter(r => r.taken).length;
  const formatSelectedDate = () => selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="cal-container">

      {/* Edit Modal */}
      {editingReminder && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '380px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="modal-title" style={{ margin: 0 }}>✏️ Edit Reminder</h3>
              <button onClick={() => setEditingReminder(null)} style={{ background: '#f0f0f0', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Medicine Name *</label>
                <input
                  type="text" value={editForm.medicineName} required
                  onChange={e => setEditForm({ ...editForm, medicineName: e.target.value })}
                  style={{ padding: '12px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '15px', fontFamily: 'Nunito, sans-serif', fontWeight: '600', outline: 'none' }}
                />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dosage *</label>
                <input
                  type="text" value={editForm.dosage} required
                  onChange={e => setEditForm({ ...editForm, dosage: e.target.value })}
                  style={{ padding: '12px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '15px', fontFamily: 'Nunito, sans-serif', fontWeight: '600', outline: 'none' }}
                />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Frequency</label>
                <select
                  value={editForm.frequency}
                  onChange={e => setEditForm({ ...editForm, frequency: e.target.value })}
                  style={{ padding: '12px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '15px', fontFamily: 'Nunito, sans-serif', fontWeight: '600', outline: 'none', background: 'white' }}
                >
                  <option value="daily">Daily</option>
                  <option value="twice-daily">Twice Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time *</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="time" value={editForm.time} required
                    onChange={e => setEditForm({ ...editForm, time: e.target.value })}
                    style={{ flex: 1, padding: '12px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '15px', fontFamily: 'Nunito, sans-serif', fontWeight: '600', outline: 'none' }}
                  />
                  {editForm.time && (
                    <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', whiteSpace: 'nowrap' }}>
                      {formatTimeDisplay(editForm.time)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={() => setEditingReminder(null)}
                  style={{ flex: 1, padding: '13px', background: '#f0f0f0', border: '2px solid #e0e0e0', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg, #43a047, #2e7d32)', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '800', color: 'white', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>
                  {editSaving ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="success-toast" style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', background: '#2e7d32', color: 'white', padding: '12px 28px', borderRadius: '30px', fontSize: '14px', fontWeight: '700', zIndex: 999, boxShadow: '0 4px 16px rgba(46,125,50,0.35)' }}>{toast}</div>}

      <header className="cal-header">
        <button className="cal-back-btn" onClick={() => router.push('/dashboard')}>← Back</button>
        <h1 className="cal-title">Calendar</h1>
      </header>

      <main className="cal-main">
        <div className="month-nav">
          <button className="month-nav-btn" onClick={previousMonth}>‹</button>
          <h2 className="month-title">{getMonthName(currentDate)} {currentDate.getFullYear()}</h2>
          <button className="month-nav-btn" onClick={nextMonth}>›</button>
        </div>

        <div className="calendar-card">
          <div className="day-headers">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
              <div key={i} className="day-header">{d}</div>
            ))}
          </div>
          <div className="days-grid">
            {generateCalendarDays().map((day, index) => {
              if (!day) return <div key={index} className="day-cell empty" />;
              const classes = ['day-cell', isPast(day) ? 'past' : 'future', isToday(day) ? 'today' : '', isSelected(day) ? 'selected' : ''].filter(Boolean).join(' ');
              return (
                <div key={index} className={classes} onClick={() => handleDateClick(day)}>
                  <span className="day-num">{day}</span>
                  {hasReminders(day) && <span className="reminder-dot" />}
                </div>
              );
            })}
          </div>
          <div className="calendar-legend">
            <span className="legend-item"><span className="legend-dot today-dot" /> Today</span>
            <span className="legend-item"><span className="legend-dot selected-dot" /> Selected</span>
            <span className="legend-item"><span className="legend-dot med-dot" /> Has meds</span>
          </div>
        </div>

        {reminders.length > 0 && (
          <div className="progress-card">
            <div className="progress-header">
              <span className="progress-label">Today's Progress</span>
              <span className="progress-count">{takenCount} / {reminders.length} taken</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${reminders.length ? (takenCount / reminders.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        <div className="schedule-section">
          <h3 className="schedule-heading">📋 {formatSelectedDate()}</h3>
          {loading ? (
            <div className="no-schedule"><span className="no-schedule-icon">⏳</span><p>Loading...</p></div>
          ) : selectedReminders.length > 0 ? (
            <div className="schedule-list">
              {selectedReminders.map((reminder) => {
                const showTaken = isSelectedToday() && reminder.taken;
                return (
                  <div key={reminder.id} className={`schedule-item ${showTaken ? 'taken' : ''}`}>
                    <div className="schedule-left">
                      <div className="pill-icon-wrap">💊</div>
                      <div className="med-info">
                        <div className="med-name">{reminder.medicine}</div>
                        <div className="med-details">{reminder.dosage} · {reminder.time}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      {/* Edit button — always visible */}
                      <button
                        onClick={() => openEdit(reminder)}
                        style={{ background: '#e8f5e9', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '16px' }}
                        title="Edit"
                      >✏️</button>
                      {/* Take/Done — only for today */}
                      {isSelectedToday() ? (
                        <label className="check-wrap" onClick={() => markAsTaken(reminder.id, reminder.taken)}>
                          <input type="checkbox" checked={reminder.taken || false} onChange={() => {}} className="check-input" />
                          <span className="check-label">{reminder.taken ? '✓ Done' : 'Take'}</span>
                        </label>
                      ) : (
                        <span className="future-badge">Scheduled</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-schedule">
              <span className="no-schedule-icon">{new Date(selectedDate).setHours(0,0,0,0) < today.getTime() ? '📆' : '🗓️'}</span>
              <p>{new Date(selectedDate).setHours(0,0,0,0) < today.getTime() ? 'No records for past dates' : 'No medications scheduled'}</p>
            </div>
          )}
        </div>
      </main>

      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => router.push('/dashboard')}><span className="nav-icon">🏠</span><span className="nav-label">Home</span></button>
        <button className="nav-item" onClick={() => router.push('/reminders/new')}><span className="nav-icon">➕</span><span className="nav-label">Add</span></button>
        <button className="nav-item active"><span className="nav-icon">📅</span><span className="nav-label">Calendar</span></button>
        <button className="nav-item" onClick={() => router.push('/profile')}><span className="nav-icon">👤</span><span className="nav-label">Profile</span></button>
      </nav>
    </div>
  );
}