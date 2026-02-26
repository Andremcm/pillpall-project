'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './calendar.css';

const MED_COLORS = ['#e53935','#d81b60','#8e24aa','#3949ab','#1e88e5','#00897b','#43a047','#f4511e','#fb8c00','#f6bf26','#33b679','#0b8043'];
function generateColor(name) {
  if (!name) return '#43a047';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return MED_COLORS[Math.abs(hash) % MED_COLORS.length];
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// Check if a reminder should appear on a given date based on frequency
function reminderAppearsOn(reminder, date) {
  const d = new Date(date); d.setHours(0,0,0,0);
  const start = new Date(reminder.startDate); start.setHours(0,0,0,0);
  if (d < start) return false;

  switch (reminder.frequency) {
    case 'daily':
    case 'twice-daily':
      return true;
    case 'weekly':
      return d.getDay() === reminder.dayOfWeek;
    case 'custom':
      return (reminder.customDates || []).includes(toDateStr(d));
    default:
      return true;
  }
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allReminders, setAllReminders] = useState([]);
  const [logs, setLogs] = useState({}); // { "reminderId_dateStr": "taken"|"skipped" }
  const [loading, setLoading] = useState(true);
  const [editingReminder, setEditingReminder] = useState(null);
  const [editForm, setEditForm] = useState({ medicineName:'', dosage:'', frequency:'daily', time:'' });
  const [editSaving, setEditSaving] = useState(false);
  const [toast, setToast] = useState('');

  const today = new Date(); today.setHours(0,0,0,0);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const userId = localStorage.getItem('userId');
    if (!userId) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/reminders?userId=${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Deduplicate by medicationId (keep first time, second time separately)
        setAllReminders(data);
        // Build logs map from taken status on today
        const logsMap = {};
        data.forEach(r => {
          const key = r.isSecond ? `${r.id}_2` : `${r.id}`;
          if (r.taken) logsMap[key + '_' + toDateStr(today)] = 'taken';
        });
        setLogs(logsMap);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

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

  // Check if any reminder appears on this day
  const hasMedsOnDay = (day) => {
    if (!day) return false;
    const dt = toMidnight(currentDate.getFullYear(), currentDate.getMonth(), day);
    return allReminders.some(r => reminderAppearsOn(r, dt));
  };

  const handleDateClick = (day) => {
    if (!day) return;
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  // Get reminders for selected date, filtering by frequency
  const getRemindersForDate = (date) => {
    const d = new Date(date); d.setHours(0,0,0,0);
    // Deduplicate by medicationId+isSecond
    const seen = new Set();
    return allReminders.filter(r => {
      const key = `${r.medicationId}_${r.isSecond}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return reminderAppearsOn(r, d);
    });
  };

  // Get taken status for a reminder on a specific date
  const isTakenOnDate = (reminder, date) => {
    const dateStr = toDateStr(new Date(date));
    const key = reminder.isSecond ? `${reminder.id}_2` : `${reminder.id}`;
    return logs[key + '_' + dateStr] === 'taken';
  };

  const isSelectedToday = () => {
    const s = new Date(selectedDate); s.setHours(0,0,0,0);
    return s.getTime() === today.getTime();
  };

  const isSelectedPast = () => {
    const s = new Date(selectedDate); s.setHours(0,0,0,0);
    return s < today;
  };

  const markAsTaken = async (reminder, currentTaken) => {
    const newTaken = !currentTaken;
    const dateStr = toDateStr(today);
    const key = reminder.isSecond ? `${reminder.id}_2` : `${reminder.id}`;
    const logKey = key + '_' + dateStr;

    // Optimistic update
    setLogs(prev => {
      const next = { ...prev };
      if (newTaken) next[logKey] = 'taken';
      else delete next[logKey];
      return next;
    });

    try {
      const res = await fetch(`/api/reminders/${reminder.id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taken: newTaken, isSecond: reminder.isSecond })
      });
      if (!res.ok) {
        setLogs(prev => {
          const next = { ...prev };
          if (currentTaken) next[logKey] = 'taken';
          else delete next[logKey];
          return next;
        });
        showToast('Failed to save.');
      }
    } catch {
      showToast('Network error.');
    }
  };

  const openEdit = (reminder) => {
    const toTimeInput = (t) => {
      if (!t) return '';
      const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return '';
      let h = parseInt(match[1]); const m = match[2]; const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2,'0')}:${m}`;
    };
    setEditForm({ medicineName: reminder.medicine, dosage: reminder.dosage, frequency: reminder.frequency || 'daily', time: toTimeInput(reminder.time) });
    setEditingReminder(reminder);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const res = await fetch(`/api/reminders/${editingReminder.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicine: editForm.medicineName, dosage: editForm.dosage, frequency: editForm.frequency, time: editForm.time })
      });
      if (res.ok) { showToast('Updated!'); setEditingReminder(null); await fetchData(); }
      else showToast('Update failed.');
    } catch { showToast('Network error.'); }
    setEditSaving(false);
  };

  const fmt = (t) => { if (!t) return ''; const [h,m] = t.split(':'); const hr=parseInt(h); return `${hr%12||12}:${m} ${hr>=12?'PM':'AM'}`; };

  const selectedReminders = getRemindersForDate(selectedDate);
  const todayReminders = getRemindersForDate(today);
  const takenTodayCount = todayReminders.filter(r => isTakenOnDate(r, today)).length;
  const formatSelectedDate = () => selectedDate.toLocaleDateString('default', { weekday:'long', month:'long', day:'numeric' });

  return (
    <div className="cal-container">

      {/* Edit Modal */}
      {editingReminder && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth:'380px', textAlign:'left' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <h3 className="modal-title" style={{ margin:0 }}>✏️ Edit Reminder</h3>
              <button onClick={() => setEditingReminder(null)} style={{ background:'#f0f0f0', border:'none', borderRadius:'50%', width:'32px', height:'32px', cursor:'pointer', fontSize:'14px', fontWeight:'700' }}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              {[['Medicine Name','medicineName','text'],['Dosage','dosage','text']].map(([lbl,key,type]) => (
                <div key={key} style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                  <label style={{ fontSize:'12px', fontWeight:'800', color:'#2e7d32', textTransform:'uppercase', letterSpacing:'0.5px' }}>{lbl} *</label>
                  <input type={type} value={editForm[key]} required
                    onChange={e => setEditForm(p => ({...p, [key]: e.target.value}))}
                    style={{ padding:'12px', border:'2px solid #e0e0e0', borderRadius:'10px', fontSize:'15px', fontFamily:'Nunito,sans-serif', fontWeight:'600', outline:'none' }} />
                </div>
              ))}
              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                <label style={{ fontSize:'12px', fontWeight:'800', color:'#2e7d32', textTransform:'uppercase', letterSpacing:'0.5px' }}>Frequency</label>
                <select value={editForm.frequency} onChange={e => setEditForm(p => ({...p, frequency: e.target.value}))}
                  style={{ padding:'12px', border:'2px solid #e0e0e0', borderRadius:'10px', fontSize:'15px', fontFamily:'Nunito,sans-serif', fontWeight:'600', outline:'none', background:'white' }}>
                  <option value="daily">Daily</option>
                  <option value="twice-daily">Twice Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                <label style={{ fontSize:'12px', fontWeight:'800', color:'#2e7d32', textTransform:'uppercase', letterSpacing:'0.5px' }}>Time *</label>
                <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                  <input type="time" value={editForm.time} required
                    onChange={e => setEditForm(p => ({...p, time: e.target.value}))}
                    style={{ flex:1, padding:'12px', border:'2px solid #e0e0e0', borderRadius:'10px', fontSize:'15px', fontFamily:'Nunito,sans-serif', fontWeight:'600', outline:'none' }} />
                  {editForm.time && <span style={{ background:'#e8f5e9', color:'#2e7d32', padding:'8px 12px', borderRadius:'10px', fontSize:'13px', fontWeight:'800', whiteSpace:'nowrap' }}>{fmt(editForm.time)}</span>}
                </div>
              </div>
              <div style={{ display:'flex', gap:'10px', marginTop:'4px' }}>
                <button type="button" onClick={() => setEditingReminder(null)}
                  style={{ flex:1, padding:'13px', background:'#f0f0f0', border:'2px solid #e0e0e0', borderRadius:'12px', fontSize:'14px', fontWeight:'800', cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>Cancel</button>
                <button type="submit" disabled={editSaving}
                  style={{ flex:1, padding:'13px', background:'linear-gradient(135deg,#43a047,#2e7d32)', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:'800', color:'white', cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>{editSaving ? 'Saving...' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:'fixed', top:'24px', left:'50%', transform:'translateX(-50%)', background:'#2e7d32', color:'white', padding:'12px 28px', borderRadius:'30px', fontSize:'14px', fontWeight:'700', zIndex:999, boxShadow:'0 4px 16px rgba(46,125,50,0.35)', whiteSpace:'nowrap' }}>{toast}</div>
      )}

      <header className="cal-header">
        <button className="cal-back-btn" onClick={() => router.push('/dashboard')}>← Back</button>
        <h1 className="cal-title">Calendar</h1>
      </header>

      <main className="cal-main">
        <div className="month-nav">
          <button className="month-nav-btn" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()-1))}>‹</button>
          <h2 className="month-title">{getMonthName(currentDate)} {currentDate.getFullYear()}</h2>
          <button className="month-nav-btn" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()+1))}>›</button>
        </div>

        <div className="calendar-card">
          <div className="day-headers">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i) => <div key={i} className="day-header">{d}</div>)}
          </div>
          <div className="days-grid">
            {generateCalendarDays().map((day, index) => {
              if (!day) return <div key={index} className="day-cell empty" />;
              const classes = ['day-cell', isPast(day)?'past':'future', isToday(day)?'today':'', isSelected(day)?'selected':''].filter(Boolean).join(' ');
              return (
                <div key={index} className={classes} onClick={() => handleDateClick(day)}>
                  <span className="day-num">{day}</span>
                  {hasMedsOnDay(day) && <span className="reminder-dot" />}
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

        {todayReminders.length > 0 && (
          <div className="progress-card">
            <div className="progress-header">
              <span className="progress-label">Today's Progress</span>
              <span className="progress-count">{takenTodayCount} / {todayReminders.length} taken</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${todayReminders.length ? (takenTodayCount/todayReminders.length)*100 : 0}%` }} />
            </div>
          </div>
        )}

        <div className="schedule-section">
          <h3 className="schedule-heading">📋 {formatSelectedDate()}</h3>
          {loading ? (
            <div className="no-schedule"><span className="no-schedule-icon">⏳</span><p>Loading...</p></div>
          ) : selectedReminders.length > 0 ? (
            <div className="schedule-list">
              {selectedReminders.map((reminder, idx) => {
                const color = reminder.color || generateColor(reminder.medicine);
                const taken = isTakenOnDate(reminder, selectedDate);
                const isPastDate = isSelectedPast();
                const isTodayDate = isSelectedToday();

                return (
                  <div key={`${reminder.id}_${idx}`} className={`schedule-item ${taken ? 'taken' : ''} ${isPastDate && !taken ? 'missed' : ''}`}
                    style={{ borderLeftColor: color }}>
                    <div className="schedule-left">
                      <div className="pill-icon-wrap" style={{ background: color + '22' }}>💊</div>
                      <div className="med-info">
                        <div className="med-name">{reminder.medicine}</div>
                        <div className="med-details">{reminder.dosage} · {reminder.time}</div>
                        <span className="freq-badge-small" style={{ color, background: color + '18' }}>
                          {reminder.frequency === 'twice-daily' ? (reminder.isSecond ? '2nd dose' : '1st dose') : (reminder.frequency || 'daily')}
                        </span>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
                      <button onClick={() => openEdit(reminder)}
                        style={{ background:'#e8f5e9', border:'none', borderRadius:'8px', padding:'6px 10px', cursor:'pointer', fontSize:'15px' }}>✏️</button>
                      {isTodayDate ? (
                        <label className="check-wrap" onClick={() => markAsTaken(reminder, taken)}>
                          <input type="checkbox" checked={taken} onChange={() => {}} className="check-input" />
                          <span className="check-label">{taken ? '✓ Done' : 'Take'}</span>
                        </label>
                      ) : isPastDate ? (
                        <span className={`status-badge ${taken ? 'taken-badge' : 'missed-badge'}`}>
                          {taken ? '✓ Taken' : '✗ Missed'}
                        </span>
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
              <span className="no-schedule-icon">🗓️</span>
              <p>No medications scheduled for this day</p>
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