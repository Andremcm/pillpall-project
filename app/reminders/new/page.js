'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const [reminders, setReminders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ medicineName:'', dosage:'', frequency:'daily', time:'', secondTime:'', customDates:[], color:'' });

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
    setFormData({ medicineName:'', dosage:'', frequency:'daily', time:'', secondTime:'', customDates:[], color:'' });
    setEditingReminder(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev, [name]: value,
      ...(name === 'medicineName' && !editingReminder ? { color: generateColor(value) } : {})
    }));
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
          body: JSON.stringify({ medicine: formData.medicineName, dosage: formData.dosage, frequency: formData.frequency, time: formData.time, secondTime: formData.secondTime || null, customDates: formData.customDates })
        });
        res.ok ? (showToast('Reminder updated!'), await fetchReminders()) : showToast('Error updating.');
      } else {
        const userId = localStorage.getItem('userId');
        const res = await fetch('/api/reminders', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: parseInt(userId), medicine: formData.medicineName, dosage: formData.dosage, frequency: formData.frequency, time: formData.time, secondTime: formData.secondTime || null, customDates: formData.customDates, color: formData.color || generateColor(formData.medicineName) })
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
    setFormData({ medicineName: reminder.medicine, dosage: reminder.dosage, frequency: reminder.frequency || 'daily', time: toTimeInput(reminder.time), secondTime: toTimeInput(reminder.secondTime || ''), customDates: reminder.customDates || [], color: reminder.color || generateColor(reminder.medicine) });
    setEditingReminder(reminder);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      res.ok ? (showToast('Reminder deleted.'), setReminders(prev => prev.filter(r => r.id !== id))) : showToast('Error deleting.');
    } catch { showToast('Network error.'); }
    setDeleteConfirmId(null);
  };

  const showToast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };
  const fmt = (t) => { if (!t) return ''; const [h,m] = t.split(':'); const hr = parseInt(h); return `${hr%12||12}:${m} ${hr>=12?'PM':'AM'}`; };
  const getDayName = () => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];

  return (
    <div className="reminder-container">
      {deleteConfirmId !== null && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon">🗑️</div>
            <h3 className="modal-title">Delete Reminder</h3>
            <p className="modal-text">Are you sure you want to delete this reminder? This cannot be undone.</p>
            <div className="modal-buttons">
              <button className="modal-cancel" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button className="modal-confirm modal-danger" onClick={() => handleDelete(deleteConfirmId)}>Delete</button>
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
                          </span>
                        </div>
                      </div>
                      <div className="reminder-card-actions">
                        <button className="action-edit-btn" onClick={() => handleEdit(r)}>✏️</button>
                        <button className="action-delete-btn" onClick={() => setDeleteConfirmId(r.id)}>🗑️</button>
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
                    <div style={{ width:'34px', height:'34px', borderRadius:'50%', flexShrink:0, background: formData.color || generateColor(formData.medicineName), border:'3px solid white', boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }} />
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

              {formData.frequency === 'daily' && <p className="field-hint">📅 Appears every day starting today.</p>}
              {formData.frequency === 'weekly' && <p className="field-hint">📅 Repeats every <strong>{getDayName()}</strong>.</p>}
              {formData.frequency === 'twice-daily' && <p className="field-hint">📅 Two reminders per day — set both times below.</p>}

              {formData.frequency !== 'custom' && (
                <div className="form-group">
                  <label htmlFor="time"><span className="label-icon">🕐</span> {formData.frequency === 'twice-daily' ? 'First Time *' : 'Time *'}</label>
                  <div className="time-picker-wrapper">
                    <input type="time" id="time" name="time" value={formData.time} onChange={handleChange} required className="time-input" />
                    {formData.time && <span className="time-display">{fmt(formData.time)}</span>}
                  </div>
                </div>
              )}

              {formData.frequency === 'twice-daily' && (
                <div className="form-group">
                  <label htmlFor="secondTime"><span className="label-icon">🕐</span> Second Time *</label>
                  <div className="time-picker-wrapper">
                    <input type="time" id="secondTime" name="secondTime" value={formData.secondTime} onChange={handleChange} required className="time-input" />
                    {formData.secondTime && <span className="time-display">{fmt(formData.secondTime)}</span>}
                  </div>
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
                      <div className="time-picker-wrapper">
                        <input type="time" name="time" value={formData.time} onChange={handleChange} required className="time-input" />
                        {formData.time && <span className="time-display">{fmt(formData.time)}</span>}
                      </div>
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