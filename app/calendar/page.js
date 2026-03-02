'use client';

import { useState, useEffect, useRef } from 'react';
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
  const d = new Date(date);
  const offset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offset);
  const [datePart] = local.toISOString().split('T');
  return datePart;
}

function reminderAppearsOn(reminder, date) {
  const d = new Date(date); d.setHours(0,0,0,0);
  const start = reminder.startDate ? new Date(reminder.startDate) : new Date(0);
  start.setHours(0,0,0,0);
  if (d < start) return false;
  if (reminder.endDate) {
    const end = new Date(reminder.endDate + 'T00:00:00');
    end.setHours(0,0,0,0);
    if (d > end) return false;
  }
  switch (reminder.frequency) {
    case 'daily':
    case 'twice-daily': return true;
    case 'weekly': return d.getDay() === reminder.dayOfWeek;
    case 'custom': return (reminder.customDates || []).includes(toDateStr(d));
    default: return true;
  }
}

// ── Custom End Date Picker ───────────────────────────────────────────
function EndDatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => value ? new Date(value + 'T00:00:00') : new Date());
  const wrapRef = useRef(null);

  const today = new Date(); today.setHours(0,0,0,0);
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectDay = (day) => {
    const dt = new Date(year, month, day); dt.setHours(0,0,0,0);
    if (dt < today) return;
    const str = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    onChange(str);
    setOpen(false);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('default', { month:'long', day:'numeric', year:'numeric' })
    : 'Select end date';

  return (
    <div className="edp-wrap" ref={wrapRef}>
      <button type="button" className={`edp-trigger${value ? ' has-value' : ''}${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}>
        <span className="edp-icon">📅</span>
        <span className="edp-display">{displayValue}</span>
        <span className="edp-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="edp-panel">
          <div className="edp-nav">
            <button type="button" className="edp-nav-btn" onClick={() => setViewDate(new Date(year, month - 1))}>‹</button>
            <span className="edp-nav-title">{MONTH_NAMES[month]} {year}</span>
            <button type="button" className="edp-nav-btn" onClick={() => setViewDate(new Date(year, month + 1))}>›</button>
          </div>
          <div className="edp-grid">
            {['S','M','T','W','T','F','S'].map((d,i) => (
              <div key={i} className="edp-day-header">{d}</div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dt = new Date(year, month, day); dt.setHours(0,0,0,0);
              const isPast = dt < today;
              const str = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const isSelected = value === str;
              const isToday = dt.getTime() === today.getTime();
              return (
                <button key={i} type="button"
                  className={`edp-day${isPast ? ' past' : ''}${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`}
                  onClick={() => selectDay(day)} disabled={isPast}>
                  {day}
                </button>
              );
            })}
          </div>
          {value && (
            <button type="button" className="edp-clear" onClick={() => { onChange(''); setOpen(false); }}>
              Clear end date
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MiniCalendarEdit({ selectedDates, onChange }) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const toggleDate = (day) => {
    const str = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    onChange(selectedDates.includes(str) ? selectedDates.filter(d => d !== str) : [...selectedDates, str].sort());
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ background:'#f8fdf8', border:'2px solid #e8f5e9', borderRadius:'12px', padding:'12px', marginTop:'8px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
        <button type="button" onClick={() => setViewDate(new Date(year, month-1))}
          style={{ background:'white', border:'2px solid #e0e0e0', borderRadius:'8px', width:'28px', height:'28px', cursor:'pointer', fontWeight:'800', color:'#2e7d32', fontFamily:'Nunito,sans-serif' }}>‹</button>
        <span style={{ fontSize:'13px', fontWeight:'800', color:'#1b5e20', fontFamily:'Nunito,sans-serif' }}>
          {viewDate.toLocaleString('default',{month:'long'})} {year}
        </span>
        <button type="button" onClick={() => setViewDate(new Date(year, month+1))}
          style={{ background:'white', border:'2px solid #e0e0e0', borderRadius:'8px', width:'28px', height:'28px', cursor:'pointer', fontWeight:'800', color:'#2e7d32', fontFamily:'Nunito,sans-serif' }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'3px' }}>
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <div key={i} style={{ textAlign:'center', fontSize:'10px', fontWeight:'800', color:'#aaa', padding:'3px 0' }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const str = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isSelected = selectedDates.includes(str);
          return (
            <div key={i} onClick={() => toggleDate(day)}
              style={{ textAlign:'center', padding:'6px 2px', fontSize:'12px', fontWeight:'700', borderRadius:'7px', cursor:'pointer',
                background: isSelected ? '#43a047' : 'transparent', color: isSelected ? 'white' : '#333' }}>
              {day}
            </div>
          );
        })}
      </div>
      {selectedDates.length > 0 && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'10px', paddingTop:'8px', borderTop:'1px solid #e8f5e9' }}>
          <span style={{ fontSize:'12px', fontWeight:'800', color:'#2e7d32', fontFamily:'Nunito,sans-serif' }}>{selectedDates.length} date{selectedDates.length>1?'s':''} selected</span>
          <button type="button" onClick={() => onChange([])}
            style={{ fontSize:'11px', fontWeight:'700', color:'#ef5350', background:'#ffebee', border:'none', padding:'4px 10px', borderRadius:'20px', cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>Clear</button>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allReminders, setAllReminders] = useState([]);
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingReminder, setEditingReminder] = useState(null);
  const [editForm, setEditForm] = useState({ medicineName:'', dosage:'', frequency:'daily', time:'', customDates:[], endDate:'' });
  const [editSaving, setEditSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [showEditUntil, setShowEditUntil] = useState(false);

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
        setAllReminders(data);
        const logsMap = {};
        const todayStr = toDateStr(today);
        data.forEach(r => {
          const key = r.isSecond ? `${r.id}_2` : `${r.id}`;
          if (r.taken) logsMap[key + '_' + todayStr] = 'taken';
        });
        setLogs(logsMap);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const getMonthName = (date) => date.toLocaleString('default', { month:'long' });

  const generateCalendarDays = () => {
    const days = [];
    for (let i = 0; i < getFirstDayOfMonth(currentDate); i++) days.push(null);
    for (let d = 1; d <= getDaysInMonth(currentDate); d++) days.push(d);
    return days;
  };

  const toMidnight = (y, m, d) => { const dt = new Date(y, m, d); dt.setHours(0,0,0,0); return dt; };
  const isToday    = (day) => day && toMidnight(currentDate.getFullYear(), currentDate.getMonth(), day).getTime() === today.getTime();
  const isSelected = (day) => {
    if (!day) return false;
    const s = new Date(selectedDate); s.setHours(0,0,0,0);
    return toMidnight(currentDate.getFullYear(), currentDate.getMonth(), day).getTime() === s.getTime();
  };
  const isPastDay = (day) => day && toMidnight(currentDate.getFullYear(), currentDate.getMonth(), day) < today;

  const hasMedsOnDay = (day) => {
    if (!day || allReminders.length === 0) return false;
    const dt = toMidnight(currentDate.getFullYear(), currentDate.getMonth(), day);
    const seen = new Set();
    return allReminders.some(r => {
      if (seen.has(r.medicationId)) return false;
      seen.add(r.medicationId);
      return reminderAppearsOn(r, dt);
    });
  };

  const getRemindersForDate = (date) => {
    const d = new Date(date); d.setHours(0,0,0,0);
    const seen = new Set();
    return allReminders.filter(r => {
      const key = `${r.medicationId}_${r.isSecond ? '2' : '1'}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return reminderAppearsOn(r, d);
    });
  };

  const isTakenOnDate = (reminder, date) => {
    const dateStr = toDateStr(new Date(date));
    const key = reminder.isSecond ? `${reminder.id}_2` : `${reminder.id}`;
    return logs[key + '_' + dateStr] === 'taken';
  };

  const isSelectedToday = () => { const s = new Date(selectedDate); s.setHours(0,0,0,0); return s.getTime() === today.getTime(); };
  const isSelectedPast  = () => { const s = new Date(selectedDate); s.setHours(0,0,0,0); return s < today; };

  const markAsTaken = async (reminder, currentTaken) => {
    const newTaken = !currentTaken;
    const dateStr = toDateStr(today);
    const key = reminder.isSecond ? `${reminder.id}_2` : `${reminder.id}`;
    const logKey = key + '_' + dateStr;
    setLogs(prev => { const n={...prev}; if(newTaken) n[logKey]='taken'; else delete n[logKey]; return n; });
    try {
      const res = await fetch(`/api/reminders/${reminder.id}/log`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ taken: newTaken, isSecond: reminder.isSecond })
      });
      if (!res.ok) {
        setLogs(prev => { const n={...prev}; if(currentTaken) n[logKey]='taken'; else delete n[logKey]; return n; });
        showToast('Failed to save.');
      }
    } catch { showToast('Network error.'); }
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
    setShowEditUntil(!!reminder.endDate);
    setEditForm({
      medicineName: reminder.medicine,
      dosage: reminder.dosage,
      frequency: reminder.frequency || 'daily',
      time: toTimeInput(reminder.time),
      customDates: reminder.customDates || [],
      endDate: reminder.endDate || ''
    });
    setEditingReminder(reminder);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (editForm.frequency === 'custom' && editForm.customDates.length === 0) {
      showToast('Please select at least one date.'); return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/reminders/${editingReminder.id}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          medicine: editForm.medicineName,
          dosage: editForm.dosage,
          frequency: editForm.frequency,
          time: editForm.time,
          customDates: editForm.customDates,
          endDate: editForm.endDate || null,
          secondTime: null
        })
      });
      if (res.ok) { showToast('Reminder updated!'); setEditingReminder(null); await fetchData(); }
      else { const d = await res.json(); showToast('Error: ' + (d.error || 'Update failed')); }
    } catch { showToast('Network error.'); }
    setEditSaving(false);
  };

  const fmt = (t) => { if (!t) return ''; const [h,m] = t.split(':'); const hr=parseInt(h); return `${hr%12||12}:${m} ${hr>=12?'PM':'AM'}`; };
  const showsUntil = ['daily','twice-daily'].includes(editForm.frequency);
  const selectedReminders = getRemindersForDate(selectedDate);
  const todayReminders    = getRemindersForDate(today);
  const takenTodayCount   = todayReminders.filter(r => isTakenOnDate(r, today)).length;
  const formatSelectedDate = () => selectedDate.toLocaleDateString('default', { weekday:'long', month:'long', day:'numeric' });

  const inputStyle = { padding:'12px', border:'2px solid #e0e0e0', borderRadius:'10px', fontSize:'15px', fontFamily:'Nunito,sans-serif', fontWeight:'600', outline:'none', color:'#222', width:'100%', boxSizing:'border-box' };
  const labelStyle = { fontSize:'12px', fontWeight:'800', color:'#2e7d32', textTransform:'uppercase', letterSpacing:'0.5px', fontFamily:'Nunito,sans-serif' };

  return (
    <div className="cal-container">

      {editingReminder && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth:'400px', textAlign:'left', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <h3 className="modal-title" style={{ margin:0 }}>✏️ Edit Reminder</h3>
              <button onClick={() => setEditingReminder(null)}
                style={{ background:'#f0f0f0', border:'none', borderRadius:'50%', width:'32px', height:'32px', cursor:'pointer', fontSize:'14px', fontWeight:'700', fontFamily:'Nunito,sans-serif' }}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                <label style={labelStyle}>Medicine Name *</label>
                <input type="text" value={editForm.medicineName} required style={inputStyle}
                  onChange={e => setEditForm(p => ({...p, medicineName:e.target.value}))} />
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                <label style={labelStyle}>Dosage *</label>
                <input type="text" value={editForm.dosage} required style={inputStyle}
                  onChange={e => setEditForm(p => ({...p, dosage:e.target.value}))} />
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                <label style={labelStyle}>Frequency</label>
                <select value={editForm.frequency}
                  onChange={e => setEditForm(p => ({
                    ...p,
                    frequency: e.target.value,
                    customDates: e.target.value !== 'custom' ? [] : p.customDates,
                    endDate: !['daily','twice-daily'].includes(e.target.value) ? '' : p.endDate
                  }))}
                  style={{ ...inputStyle, background:'white' }}>
                  <option value="daily">Daily</option>
                  <option value="twice-daily">Twice Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom Dates</option>
                </select>
              </div>

              {/* ── Until / End date ── */}
              {showsUntil && (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  <button type="button"
                    onClick={() => { setShowEditUntil(v => !v); if (showEditUntil) setEditForm(p => ({...p, endDate:''})); }}
                    style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 16px',
                      background: showEditUntil ? '#ffebee' : '#f1f8e9',
                      border: `2px dashed ${showEditUntil ? '#ef9a9a' : '#a5d6a7'}`,
                      borderRadius:'12px', color: showEditUntil ? '#c62828' : '#2e7d32',
                      fontSize:'13px', fontWeight:'700', fontFamily:'Nunito,sans-serif', cursor:'pointer' }}>
                    <span>📅</span>
                    {showEditUntil ? 'Remove end date' : 'Set end date (optional)'}
                  </button>
                  {showEditUntil && (
                    <div style={{ background:'#f8fdf8', border:'2px solid #e8f5e9', borderRadius:'12px', padding:'14px', display:'flex', flexDirection:'column', gap:'8px' }}>
                      <label style={labelStyle}>Remind me until</label>
                      <EndDatePicker
                        value={editForm.endDate}
                        onChange={(val) => setEditForm(p => ({...p, endDate: val}))}
                      />
                      {editForm.endDate && (
                        <span style={{ fontSize:'13px', fontWeight:'700', color:'#43a047', fontFamily:'Nunito,sans-serif' }}>
                          Until {new Date(editForm.endDate + 'T00:00:00').toLocaleDateString('default', { weekday:'short', month:'long', day:'numeric' })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {editForm.frequency === 'custom' && (
                <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                  <label style={labelStyle}>Select Dates *</label>
                  <MiniCalendarEdit
                    selectedDates={editForm.customDates}
                    onChange={(dates) => setEditForm(p => ({...p, customDates: dates}))}
                  />
                </div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                <label style={labelStyle}>Time *</label>
                <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                  <input type="time" value={editForm.time} required style={{ ...inputStyle, flex:1, width:'auto' }}
                    onChange={e => setEditForm(p => ({...p, time:e.target.value}))} />
                  {editForm.time && (
                    <span style={{ background:'#e8f5e9', color:'#2e7d32', padding:'8px 12px', borderRadius:'10px', fontSize:'13px', fontWeight:'800', whiteSpace:'nowrap' }}>
                      {fmt(editForm.time)}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display:'flex', gap:'10px', marginTop:'4px' }}>
                <button type="button" onClick={() => setEditingReminder(null)}
                  style={{ flex:1, padding:'13px', background:'#f0f0f0', border:'2px solid #e0e0e0', borderRadius:'12px', fontSize:'14px', fontWeight:'800', cursor:'pointer', fontFamily:'Nunito,sans-serif', color:'#555' }}>
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  style={{ flex:1, padding:'13px', background:'linear-gradient(135deg,#43a047,#2e7d32)', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:'800', color:'white', cursor:'pointer', fontFamily:'Nunito,sans-serif' }}>
                  {editSaving ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:'fixed', top:'24px', left:'50%', transform:'translateX(-50%)', background:'#2e7d32', color:'white', padding:'12px 28px', borderRadius:'30px', fontSize:'14px', fontWeight:'700', zIndex:999, boxShadow:'0 4px 16px rgba(46,125,50,0.35)', whiteSpace:'nowrap', fontFamily:'Nunito,sans-serif' }}>{toast}</div>
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
              const classes = ['day-cell', isPastDay(day)?'past':'future', isToday(day)?'today':'', isSelected(day)?'selected':''].filter(Boolean).join(' ');
              return (
                <div key={index} className={classes} onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}>
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
              <div className="progress-bar-fill" style={{ width:`${todayReminders.length?(takenTodayCount/todayReminders.length)*100:0}%` }} />
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
                  <div key={`${reminder.id}_${idx}`}
                    className={`schedule-item ${taken?'taken':''} ${isPastDate&&!taken?'missed':''}`}
                    style={{ borderLeftColor: color }}>
                    <div className="schedule-left">
                      <div className="pill-icon-wrap" style={{ background: color+'22' }}>💊</div>
                      <div className="med-info">
                        <div className="med-name">{reminder.medicine}</div>
                        <div className="med-details">{reminder.dosage} · {reminder.time}</div>
                        <span className="freq-badge-small" style={{ color, background: color+'18' }}>
                          {reminder.frequency === 'twice-daily'
                            ? (reminder.isSecond ? '2nd dose' : '1st dose')
                            : (reminder.frequency || 'daily')}
                          {reminder.endDate ? ` · until ${new Date(reminder.endDate + 'T00:00:00').toLocaleDateString('default',{month:'short',day:'numeric'})}` : ''}
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
                        <span className={`status-badge ${taken?'taken-badge':'missed-badge'}`}>
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