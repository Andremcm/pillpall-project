'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './settings.css';

export default function SettingsPage() {
  const router = useRouter();
  const [toast, setToast] = useState('');
  const [activeSection, setActiveSection] = useState(null);

  // Font size
  const [fontSize, setFontSize] = useState(16);

  // Account
  const [accountForm, setAccountForm] = useState({ name: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [accountSaving, setAccountSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Notifications
  const [notifSettings, setNotifSettings] = useState({
    reminderAlerts: true,
    missedDoseAlerts: true,
    dailySummary: false,
    soundEnabled: true,
  });

  // Display
  const [displaySettings, setDisplaySettings] = useState({
    compactView: false,
    showDosageOnDashboard: true,
    showFrequencyBadge: true,
  });

  useEffect(() => {
    // Load saved settings
    const savedFontSize = localStorage.getItem('pillpal_fontSize');
    if (savedFontSize) {
      const size = parseInt(savedFontSize);
      setFontSize(size);
      document.documentElement.style.fontSize = size + 'px';
    }
    const savedNotif = localStorage.getItem('pillpal_notifications');
    if (savedNotif) setNotifSettings(JSON.parse(savedNotif));
    const savedDisplay = localStorage.getItem('pillpal_display');
    if (savedDisplay) setDisplaySettings(JSON.parse(savedDisplay));

    const name = localStorage.getItem('userName') || '';
    setAccountForm(p => ({ ...p, name }));
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleFontSize = (size) => {
    setFontSize(size);
    document.documentElement.style.fontSize = size + 'px';
    localStorage.setItem('pillpal_fontSize', size);
    showToast('Font size updated!');
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (accountForm.newPassword && accountForm.newPassword !== accountForm.confirmPassword) {
      showToast('New passwords do not match!');
      return;
    }
    setAccountSaving(true);
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch('/api/settings/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: accountForm.name,
          currentPassword: accountForm.currentPassword,
          newPassword: accountForm.newPassword || null,
        })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('userName', accountForm.name);
        showToast('Account updated successfully!');
        setAccountForm(p => ({ ...p, currentPassword: '', newPassword: '', confirmPassword: '' }));
      } else {
        showToast('Error: ' + (data.error || 'Update failed'));
      }
    } catch {
      showToast('Network error.');
    }
    setAccountSaving(false);
  };

  const handleSaveNotifications = () => {
    localStorage.setItem('pillpal_notifications', JSON.stringify(notifSettings));
    showToast('Notification preferences saved!');
  };

  const handleSaveDisplay = () => {
    localStorage.setItem('pillpal_display', JSON.stringify(displaySettings));
    showToast('Display preferences saved!');
  };

  const fontOptions = [
    { label: 'Small', size: 13, desc: 'Compact view' },
    { label: 'Default', size: 16, desc: 'Standard size' },
    { label: 'Large', size: 19, desc: 'Easier to read' },
    { label: 'Extra Large', size: 22, desc: 'Maximum size' },
  ];

  const sections = [
    { id: 'account', icon: '👤', title: 'Account Settings', desc: 'Update name & password' },
    { id: 'font', icon: '🔤', title: 'Font Size', desc: 'Adjust text size' },
    { id: 'notifications', icon: '🔔', title: 'Notifications', desc: 'Alert preferences' },
    { id: 'display', icon: '🎨', title: 'Display', desc: 'Customize your view' },
  ];

  const EyeIcon = ({ show }) => show ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  return (
    <div className="settings-container">
      {toast && (
        <div className="settings-toast">{toast}</div>
      )}

      <header className="settings-header">
        <button className="settings-back-btn" onClick={() => router.push('/profile')}>← Back</button>
        <h1 className="settings-title">Settings</h1>
      </header>

      <main className="settings-main">
        {/* Section list */}
        {!activeSection && (
          <div className="settings-list">
            {sections.map(s => (
              <button key={s.id} className="settings-item" onClick={() => setActiveSection(s.id)}>
                <div className="settings-item-icon">{s.icon}</div>
                <div className="settings-item-info">
                  <span className="settings-item-title">{s.title}</span>
                  <span className="settings-item-desc">{s.desc}</span>
                </div>
                <span className="settings-item-arrow">›</span>
              </button>
            ))}
          </div>
        )}

        {/* Account Settings */}
        {activeSection === 'account' && (
          <div className="settings-section-content">
            <button className="section-back" onClick={() => setActiveSection(null)}>← Back</button>
            <h2 className="section-title">👤 Account Settings</h2>
            <form onSubmit={handleSaveAccount} className="settings-form">
              <div className="settings-form-group">
                <label>Display Name</label>
                <input type="text" value={accountForm.name} placeholder="Your name"
                  onChange={e => setAccountForm(p => ({...p, name: e.target.value}))} />
              </div>
              <div className="settings-divider"><span>Change Password</span></div>
              <div className="settings-form-group">
                <label>Current Password</label>
                <div className="settings-pw-wrap">
                  <input type={showCurrent ? 'text' : 'password'} value={accountForm.currentPassword}
                    placeholder="Enter current password"
                    onChange={e => setAccountForm(p => ({...p, currentPassword: e.target.value}))} />
                  <button type="button" className="settings-eye" onClick={() => setShowCurrent(p => !p)}>
                    <EyeIcon show={showCurrent} />
                  </button>
                </div>
              </div>
              <div className="settings-form-group">
                <label>New Password</label>
                <div className="settings-pw-wrap">
                  <input type={showNew ? 'text' : 'password'} value={accountForm.newPassword}
                    placeholder="Enter new password"
                    onChange={e => setAccountForm(p => ({...p, newPassword: e.target.value}))} />
                  <button type="button" className="settings-eye" onClick={() => setShowNew(p => !p)}>
                    <EyeIcon show={showNew} />
                  </button>
                </div>
              </div>
              <div className="settings-form-group">
                <label>Confirm New Password</label>
                <input type="password" value={accountForm.confirmPassword}
                  placeholder="Confirm new password"
                  onChange={e => setAccountForm(p => ({...p, confirmPassword: e.target.value}))} />
              </div>
              <button type="submit" className="settings-save-btn" disabled={accountSaving}>
                {accountSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* Font Size */}
        {activeSection === 'font' && (
          <div className="settings-section-content">
            <button className="section-back" onClick={() => setActiveSection(null)}>← Back</button>
            <h2 className="section-title">🔤 Font Size</h2>
            <p className="section-hint">Choose the text size that's most comfortable for you.</p>
            <div className="font-options">
              {fontOptions.map(opt => (
                <button key={opt.size}
                  className={`font-option ${fontSize === opt.size ? 'active' : ''}`}
                  onClick={() => handleFontSize(opt.size)}>
                  <span className="font-option-preview" style={{ fontSize: opt.size + 'px' }}>Aa</span>
                  <span className="font-option-label">{opt.label}</span>
                  <span className="font-option-desc">{opt.desc}</span>
                  {fontSize === opt.size && <span className="font-option-check">✓</span>}
                </button>
              ))}
            </div>
            <div className="font-preview-box">
              <p style={{ fontSize: fontSize + 'px', fontFamily:'Nunito,sans-serif', margin:0, fontWeight:600, color:'#1b5e20' }}>
                Preview: Take Paracetamol 500mg at 8:00 AM
              </p>
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeSection === 'notifications' && (
          <div className="settings-section-content">
            <button className="section-back" onClick={() => setActiveSection(null)}>← Back</button>
            <h2 className="section-title">🔔 Notifications</h2>
            <div className="toggle-list">
              {[
                { key:'reminderAlerts', label:'Reminder Alerts', desc:'Get notified when it\'s time to take your medicine' },
                { key:'missedDoseAlerts', label:'Missed Dose Alerts', desc:'Alert if you haven\'t marked a dose as taken' },
                { key:'dailySummary', label:'Daily Summary', desc:'Morning overview of today\'s medications' },
                { key:'soundEnabled', label:'Sound', desc:'Play a sound with notifications' },
              ].map(item => (
                <div key={item.key} className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">{item.label}</span>
                    <span className="toggle-desc">{item.desc}</span>
                  </div>
                  <button
                    className={`toggle-switch ${notifSettings[item.key] ? 'on' : 'off'}`}
                    onClick={() => setNotifSettings(p => ({...p, [item.key]: !p[item.key]}))}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>
              ))}
            </div>
            <button className="settings-save-btn" onClick={handleSaveNotifications}>Save Preferences</button>
          </div>
        )}

        {/* Display */}
        {activeSection === 'display' && (
          <div className="settings-section-content">
            <button className="section-back" onClick={() => setActiveSection(null)}>← Back</button>
            <h2 className="section-title">🎨 Display</h2>
            <div className="toggle-list">
              {[
                { key:'compactView', label:'Compact View', desc:'Show more items with less spacing' },
                { key:'showDosageOnDashboard', label:'Show Dosage on Dashboard', desc:'Display dosage info on the home screen' },
                { key:'showFrequencyBadge', label:'Show Frequency Badge', desc:'Show Daily/Weekly badges on medicine cards' },
              ].map(item => (
                <div key={item.key} className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">{item.label}</span>
                    <span className="toggle-desc">{item.desc}</span>
                  </div>
                  <button
                    className={`toggle-switch ${displaySettings[item.key] ? 'on' : 'off'}`}
                    onClick={() => setDisplaySettings(p => ({...p, [item.key]: !p[item.key]}))}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>
              ))}
            </div>
            <button className="settings-save-btn" onClick={handleSaveDisplay}>Save Preferences</button>
          </div>
        )}
      </main>
    </div>
  );
}