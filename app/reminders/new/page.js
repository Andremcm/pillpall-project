'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import './reminder.css';

const FREQ_LABELS = {
  daily: 'Daily',
  'twice-daily': 'Twice Daily',
  weekly: 'Weekly',
  custom: 'Custom'
};

const MED_COLORS = [
  '#e53935','#d81b60','#8e24aa','#3949ab',
  '#1e88e5','#00897b','#43a047','#f4511e',
  '#fb8c00','#f6bf26','#33b679','#0b8043'
];

function generateColor(name) {
  if (!name) return '#43a047';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return MED_COLORS[Math.abs(hash) % MED_COLORS.length];
}

// ── Tap List Time Picker ─────────────────────────────────────────────
function TapTimePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [hour, setHour]     = useState('08');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm]     = useState('AM');
  const wrapRef = useRef(null);

  const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55'];
  const AMPMS   = ['AM', 'PM'];

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      const ap = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      setHour(String(h12).padStart(2, '0'));
      setMinute(String(m).padStart(2, '0'));
      setAmpm(ap);
    }
  }, [value]);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const commit = (h, m, ap) => {
    let h24 = parseInt(h);
    if (ap === 'AM' && h24 === 12) h24 = 0;
    if (ap === 'PM' && h24 !== 12) h24 += 12;
    const closest = MINUTES.reduce((a, b) => Math.abs(parseInt(b) - parseInt(m)) < Math.abs(parseInt(a) - parseInt(m)) ? b : a);
    onChange(`${String(h24).padStart(2, '0')}:${closest}`);
  };

  const pick = (type, val) => {
    if (type === 'h') { setHour(val);   commit(val, minute, ampm); }
    if (type === 'm') { setMinute(val); commit(hour, val, ampm); }
    if (type === 'a') { setAmpm(val);   commit(hour, minute, val); }
  };

  const displayTime = value
    ? (() => {
        const [h, m] = value.split(':').map(Number);
        const ap = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
      })()
    : 'Select time';

  return (
    <div className="ttp-wrap" ref={wrapRef}>
      <button type="button" className={`ttp-trigger${value ? ' has-value' : ''}${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}>
        <span className="ttp-icon">🕐</span>
        <span className="ttp-display">{displayTime}</span>
        <span className="ttp-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="ttp-panel">
          <div className="ttp-panel-header">PICK A TIME</div>
          <div className="ttp-columns">
            <div className="ttp-col">
              <div className="ttp-col-label">HR</div>
              <div className="ttp-list">
                {HOURS.map(h => (
                  <button key={h} type="button" className={`ttp-item${h === hour ? ' active' : ''}`}
                    onClick={() => pick('h', h)}>{h}</button>
                ))}
              </div>
            </div>
            <div className="ttp-divider">:</div>
            <div className="ttp-col">
              <div className="ttp-col-label">MIN</div>
              <div className="ttp-list">
                {MINUTES.map(m => (
                  <button key={m} type="button" className={`ttp-item${m === minute ? ' active' : ''}`}
                    onClick={() => pick('m', m)}>{m}</button>
                ))}
              </div>
            </div>
            <div className="ttp-col ttp-col-ampm">
              <div className="ttp-col-label"></div>
              <div className="ttp-ampm-group">
                {AMPMS.map(a => (
                  <button key={a} type="button" className={`ttp-ampm-btn${a === ampm ? ' active' : ''}`}
                    onClick={() => pick('a', a)}>{a}</button>
                ))}
              </div>
            </div>
          </div>
          <button type="button" className="ttp-done" onClick={() => setOpen(false)}>Done</button>
        </div>
      )}
    </div>
  );
}

// ── Custom End Date Picker ───────────────────────────────────────────
function EndDatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value + 'T00:00:00');
    return new Date();
  });
  const wrapRef = useRef(null);

  const today = new Date(); today.setHours(0,0,0,0);
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();

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

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

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
            <button type="button" className="edp-nav-btn"
              onClick={() => setViewDate(new Date(year, month - 1))}>‹</button>
            <span className="edp-nav-title">{MONTH_NAMES[month]} {year}</span>
            <button type="button" className="edp-nav-btn"
              onClick={() => setViewDate(new Date(year, month + 1))}>›</button>
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
                  onClick={() => selectDay(day)}
                  disabled={isPast}>
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

function MiniCalendar({ selectedDates, onChange }) {
  const [viewDate, setViewDate] = useState(new Date());
  const today = new Date(); today.setHours(0,0,0,0);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const toDateStr = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const toggleDate = (day) => {
    const str = toDateStr(year, month, day);
    const dt = new Date(year, month, day); dt.setHours(0,0,0,0);
    if (dt < today) return;
    onChange(selectedDates.includes(str) ? selectedDates.filter(d => d !== str) : [...selectedDates, str].sort());
  };
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return (
    <div className="mini-cal">
      <div className="mini-cal-nav">
        <button type="button" className="mini-cal-arrow" onClick={() => setViewDate(new Date(year, month-1))}>‹</button>
        <span className="mini-cal-title">{viewDate.toLocaleString('default',{month:'long'})} {year}</span>
        <button type="button" className="mini-cal-arrow" onClick={() => setViewDate(new Date(year, month+1))}>›</button>
      </div>
      <div className="mini-cal-grid">
        {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} className="mini-cal-header">{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="mini-cal-cell empty" />;
          const str = toDateStr(year, month, day);
          const dt = new Date(year, month, day); dt.setHours(0,0,0,0);
          const isPast = dt < today;
          const isSelected = selectedDates.includes(str);
          return (
            <div key={i} className={`mini-cal-cell${isPast?' past':''}${isSelected?' selected':''}`}
              onClick={() => toggleDate(day)}>{day}</div>
          );
        })}
      </div>
      {selectedDates.length > 0 && (
        <div className="mini-cal-selected">
          <span className="mini-cal-count">{selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} selected</span>
          <button type="button" className="mini-cal-clear" onClick={() => onChange([])}>Clear all</button>
        </div>
      )}
    </div>
  );
}

export default function SetReminderPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [reminders, setReminders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmReminder, setDeleteConfirmReminder] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    medicineName:'', dosage:'', frequency:'daily',
    time:'', secondTime:'', customDates:[], color:'', endDate:''
  });
  const [showUntil, setShowUntil] = useState(false);

  useEffect(() => { fetchReminders(); }, []);

  const fetchReminders = async () => {
    setLoading(true);
    const userId = localStorage.getItem('userId');
    if (!userId) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/reminders?userId=${userId}`);
      const data = await res.json();
      const seen = new Set();
      const unique = (Array.isArray(data) ? data : []).filter(r => {
        if (seen.has(r.medicationId)) return false;
        seen.add(r.medicationId); return true;
      });
      setReminders(unique);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ medicineName:'', dosage:'', frequency:'daily', time:'', secondTime:'', customDates:[], color:'', endDate:'' });
    setEditingReminder(null);
    setShowUntil(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev, [name]: value,
      ...(name === 'medicineName' && !editingReminder ? { color: generateColor(value) } : {}),
      ...(name === 'frequency' && !['daily','twice-daily'].includes(value) ? { endDate: '' } : {})
    }));
    if (name === 'frequency' && !['daily','twice-daily'].includes(value)) setShowUntil(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.frequency === 'twice-daily' && !formData.secondTime) { showToast('Please set both times for Twice Daily.'); return; }
    if (formData.frequency === 'custom' && formData.customDates.length === 0) { showToast('Please select at least one date.'); return; }
    setSaving(true);
    try {
      if (editingReminder) {
        const res = await fetch(`/api/reminders/${editingReminder.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ medicine: formData.medicineName, dosage: formData.dosage, frequency: formData.frequency, time: formData.time, secondTime: formData.secondTime || null, customDates: formData.customDates, endDate: formData.endDate || null })
        });
        res.ok ? (showToast('Reminder updated!'), await fetchReminders()) : showToast('Error updating.');
      } else {
        const userId = localStorage.getItem('userId');
        const res = await fetch('/api/reminders', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: parseInt(userId), medicine: formData.medicineName, dosage: formData.dosage, frequency: formData.frequency, time: formData.time, secondTime: formData.secondTime || null, customDates: formData.customDates, color: formData.color || generateColor(formData.medicineName), endDate: formData.endDate || null })
        });
        res.ok ? (showToast('Reminder saved!'), await fetchReminders()) : showToast('Error saving.');
      }
    } catch { showToast('Network error.'); }
    setSaving(false); resetForm(); setShowForm(false);
  };

  const handleEdit = (reminder) => {
    const toTimeInput = (t) => {
      if (!t) return '';
      const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return '';
      let h = parseInt(match[1]); const m = match[2]; const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2,'0')}:${m}`;
    };
    const hasEnd = !!reminder.endDate;
    setFormData({ medicineName: reminder.medicine, dosage: reminder.dosage, frequency: reminder.frequency || 'daily', time: toTimeInput(reminder.time), secondTime: toTimeInput(reminder.secondTime || ''), customDates: reminder.customDates || [], color: reminder.color || generateColor(reminder.medicine), endDate: reminder.endDate || '' });
    setShowUntil(hasEnd);
    setEditingReminder(reminder);
    setShowForm(true);
  };

  // ✅ FIXED: Now deletes from Google Calendar before deleting from DB
  const handleDelete = async (reminder) => {
    try {
      // 1. Delete from Google Calendar first if synced
      if (reminder.googleEventId && session?.accessToken) {
        await fetch(
          `/api/calendar/google?eventId=${reminder.googleEventId}&accessToken=${session.accessToken}&refreshToken=${session.refreshToken || ''}`,
          { method: 'DELETE' }
        );
      }

      // 2. Then delete from DB
      const res = await fetch(`/api/reminders/${reminder.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Reminder deleted.');
        setReminders(prev => prev.filter(r => r.id !== reminder.id));
      } else {
        showToast('Error deleting.');
      }
    } catch { showToast('Network error.'); }
    setDeleteConfirmReminder(null);
  };

  const showToast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };
  const getDayName = () => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
  const showsUntil = ['daily','twice-daily'].includes(formData.frequency);

  return (
    <div className="reminder-container">
      {deleteConfirmReminder !== null && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon">🗑️</div>
            <h3 className="modal-title">Delete Reminder</h3>
            <p className="modal-text">
              Are you sure you want to delete <strong>{deleteConfirmReminder.medicine}</strong>? This cannot be undone.
            </p>
            {deleteConfirmReminder.googleEventId && (
              <p style={{fontSize:'12px',color:'#4285F4',background:'#e8f0fe',padding:'8px 12px',borderRadius:'8px',margin:'0 0 8px'}}>
                📅 This will also be removed from Google Calendar.
              </p>
            )}
            <div className="modal-buttons">
              <button className="modal-cancel" onClick={() => setDeleteConfirmReminder(null)}>Cancel</button>
              <button className="modal-confirm modal-danger" onClick={() => handleDelete(deleteConfirmReminder)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <header className="reminder-header">
        <button className="back-btn" onClick={() => router.push('/dashboard')}>← Back</button>
        <h1 className="page-title">Medicine Reminders</h1>
      </header>

      {successMsg && <div className="success-toast">{successMsg}</div>}

      <main className="reminder-main">
        {!showForm ? (
          <>
            <div className="reminders-list-header">
              <h2 className="list-title">Your Reminders</h2>
              <button className="add-new-btn" onClick={() => { resetForm(); setShowForm(true); }}>+ Add New</button>
            </div>
            {loading ? (
              <div className="empty-state"><div className="empty-icon">⏳</div><p className="empty-title">Loading...</p></div>
            ) : reminders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💊</div>
                <p className="empty-title">No reminders yet</p>
                <p className="empty-sub">Tap "Add New" to set your first medication reminder.</p>
              </div>
            ) : (
              <div className="reminders-list">
                {reminders.map((r) => {
                  const color = r.color || generateColor(r.medicine);
                  return (
                    <div key={r.id} className="reminder-card">
                      <div className="reminder-color-bar" style={{ background: color }} />
                      <div className="reminder-card-left">
                        <div className="reminder-pill-icon" style={{ background: color + '22' }}>💊</div>
                        <div className="reminder-card-info">
                          <div className="reminder-card-name">{r.medicine}</div>
                          <div className="reminder-card-details">{r.dosage} · {r.time}</div>
                          <span className="freq-badge" style={{ background: color + '22', color }}>
                            {FREQ_LABELS[r.frequency] || r.frequency}
                            {r.frequency === 'weekly' && ` · ${getDayName()}s`}
                            {r.frequency === 'custom' && r.customDates?.length > 0 && ` · ${r.customDates.length} dates`}
                            {r.endDate && ` · until ${new Date(r.endDate + 'T00:00:00').toLocaleDateString('default',{month:'short',day:'numeric'})}`}
                          </span>
                          {r.googleEventId && (
                            <span style={{fontSize:'10px',fontWeight:'800',color:'#4285F4',background:'#e8f0fe',padding:'2px 7px',borderRadius:'20px',display:'inline-block',marginTop:'4px'}}>✓ In Google Cal</span>
                          )}
                        </div>
                      </div>
                      <div className="reminder-card-actions">
                        <button className="action-edit-btn" onClick={() => handleEdit(r)}>✏️</button>
                        <button className="action-delete-btn" onClick={() => setDeleteConfirmReminder(r)}>🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="form-card">
            <div className="form-icon">💊</div>
            <h2 className="form-title">{editingReminder ? 'Edit Reminder' : 'Set Reminder'}</h2>
            <form onSubmit={handleSubmit} className="reminder-form">

              <div className="form-group">
                <label htmlFor="medicineName"><span className="label-icon">💊</span> Medicine Name *</label>
                <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                  <input type="text" id="medicineName" name="medicineName" placeholder="Enter medicine name"
                    value={formData.medicineName} onChange={handleChange} required style={{ flex:1 }} />
                  {formData.medicineName && (
                    <div style={{ width:'34px', height:'34px', borderRadius:'50%', flexShrink:0,
                      background: formData.color || generateColor(formData.medicineName),
                      border:'3px solid white', boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }} />
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="dosage"><span className="label-icon">📏</span> Dosage *</label>
                <input type="text" id="dosage" name="dosage" placeholder="e.g., 1 tablet, 500mg, 5ml"
                  value={formData.dosage} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label htmlFor="frequency"><span className="label-icon">🔄</span> Frequency</label>
                <select id="frequency" name="frequency" value={formData.frequency} onChange={handleChange}>
                  <option value="daily">Daily</option>
                  <option value="twice-daily">Twice Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom Dates</option>
                </select>
              </div>

              {formData.frequency === 'daily'       && <p className="field-hint">📅 Appears every day starting today.</p>}
              {formData.frequency === 'weekly'      && <p className="field-hint">📅 Repeats every <strong>{getDayName()}</strong>.</p>}
              {formData.frequency === 'twice-daily' && <p className="field-hint">📅 Two reminders per day — set both times below.</p>}

              {showsUntil && (
                <div className="until-row">
                  <button type="button"
                    className={`until-toggle-btn${showUntil ? ' active' : ''}`}
                    onClick={() => { setShowUntil(v => !v); if (showUntil) setFormData(p => ({ ...p, endDate: '' })); }}>
                    <span className="until-icon">📅</span>
                    {showUntil ? 'Remove end date' : 'Set end date (optional)'}
                  </button>
                  {showUntil && (
                    <div className="until-date-wrap">
                      <label className="until-label">Remind me until</label>
                      <EndDatePicker
                        value={formData.endDate}
                        onChange={(val) => setFormData(p => ({ ...p, endDate: val }))}
                      />
                      {formData.endDate && (
                        <span className="until-display">
                          Until {new Date(formData.endDate + 'T00:00:00').toLocaleDateString('default', { weekday:'short', month:'long', day:'numeric' })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {formData.frequency !== 'custom' && (
                <div className="form-group">
                  <label><span className="label-icon">🕐</span> {formData.frequency === 'twice-daily' ? 'First Time *' : 'Time *'}</label>
                  <TapTimePicker value={formData.time} onChange={(val) => setFormData(p => ({ ...p, time: val }))} />
                </div>
              )}

              {formData.frequency === 'twice-daily' && (
                <div className="form-group">
                  <label><span className="label-icon">🕐</span> Second Time *</label>
                  <TapTimePicker value={formData.secondTime} onChange={(val) => setFormData(p => ({ ...p, secondTime: val }))} />
                </div>
              )}

              {formData.frequency === 'custom' && (
                <div className="form-group">
                  <label><span className="label-icon">📅</span> Select Dates *</label>
                  <p className="field-hint">Tap the days you want this reminder to appear.</p>
                  <MiniCalendar selectedDates={formData.customDates}
                    onChange={(dates) => setFormData(prev => ({ ...prev, customDates: dates }))} />
                  {formData.customDates.length > 0 && (
                    <div className="form-group" style={{ marginTop:'14px' }}>
                      <label><span className="label-icon">🕐</span> Time *</label>
                      <TapTimePicker value={formData.time} onChange={(val) => setFormData(p => ({ ...p, time: val }))} />
                    </div>
                  )}
                </div>
              )}

              <div className="form-buttons">
                <button type="button" className="cancel-btn" onClick={() => { resetForm(); setShowForm(false); }}>Cancel</button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? 'Saving...' : editingReminder ? 'Update' : 'Save Reminder'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}