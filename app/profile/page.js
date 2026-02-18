'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Load user data
  useEffect(() => {
    const storedName = localStorage.getItem('userName') || 'User';
    const storedEmail = localStorage.getItem('userEmail') || 'user@example.com';
    setUserName(storedName);
    setUserEmail(storedEmail);
  }, []);

  // Handle logout
  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.clear();
      router.push('/login');
    }
  };

  // Handle export data
  const handleExportData = () => {
    const reminders = localStorage.getItem('reminders') || '[]';
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(reminders);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "pillpal-reminders.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    alert('Data exported successfully!');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.push('/dashboard')}>
          ← Back
        </button>
        <h1 style={styles.pageTitle}>Profile & Settings</h1>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Profile Card */}
        <div style={styles.profileCard}>
          {/* Profile Picture */}
          <div style={styles.profilePicture}>
            <div style={styles.pictureCircle}>👤</div>
            <button style={styles.changePictureBtn}>
              Tap to change photo
            </button>
          </div>

          {/* User Info */}
          <div style={styles.userInfo}>
            <h2 style={styles.userName}>{userName}</h2>
            <p style={styles.userEmail}>{userEmail}</p>
          </div>
        </div>

        {/* Settings Menu */}
        <div style={styles.settingsCard}>
          <h3 style={styles.sectionTitle}>⚙️ Settings</h3>

          <div style={styles.menuList}>
            {/* Notification Settings */}
            <button 
              style={styles.menuItem}
              onClick={() => alert('Notification Settings - Coming soon!')}
            >
              <div style={styles.menuLeft}>
                <span style={styles.menuIcon}>🔔</span>
                <span style={styles.menuText}>Notification Settings</span>
              </div>
              <span style={styles.menuArrow}>→</span>
            </button>

            {/* Medicine History */}
            <button 
              style={styles.menuItem}
              onClick={() => alert('Medicine History - Coming soon!')}
            >
              <div style={styles.menuLeft}>
                <span style={styles.menuIcon}>📋</span>
                <span style={styles.menuText}>Medicine History</span>
              </div>
              <span style={styles.menuArrow}>→</span>
            </button>

            {/* Account Settings */}
            <button 
              style={styles.menuItem}
              onClick={() => alert('Account Settings - Coming soon!')}
            >
              <div style={styles.menuLeft}>
                <span style={styles.menuIcon}>⚙️</span>
                <span style={styles.menuText}>Account Settings</span>
              </div>
              <span style={styles.menuArrow}>→</span>
            </button>

            {/* Export Data */}
            <button 
              style={styles.menuItem}
              onClick={handleExportData}
            >
              <div style={styles.menuLeft}>
                <span style={styles.menuIcon}>📤</span>
                <span style={styles.menuText}>Export Data</span>
              </div>
              <span style={styles.menuArrow}>→</span>
            </button>

            {/* Logout */}
            <button 
              style={{...styles.menuItem, ...styles.logoutItem}}
              onClick={handleLogout}
            >
              <div style={styles.menuLeft}>
                <span style={styles.menuIcon}>🚪</span>
                <span style={styles.menuText}>Logout</span>
              </div>
              <span style={styles.menuArrow}>→</span>
            </button>
          </div>
        </div>

        {/* App Info */}
        <div style={styles.appInfo}>
          <p style={styles.appInfoText}>PillPal v1.0.0</p>
          <p style={styles.appInfoText}>Your Medication Companion</p>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav style={styles.bottomNav}>
        <button style={styles.navItem} onClick={() => router.push('/dashboard')}>
          <span style={styles.navIcon}>🏠</span>
          <span style={styles.navLabel}>Home</span>
        </button>
        <button style={styles.navItem} onClick={() => router.push('/reminders/new')}>
          <span style={styles.navIcon}>➕</span>
          <span style={styles.navLabel}>Add</span>
        </button>
        <button style={styles.navItem} onClick={() => router.push('/calendar')}>
          <span style={styles.navIcon}>📅</span>
          <span style={styles.navLabel}>Calendar</span>
        </button>
        <button style={{...styles.navItem, color: '#4CAF50'}} onClick={() => router.push('/profile')}>
          <span style={styles.navIcon}>👤</span>
          <span style={styles.navLabel}>Profile</span>
        </button>
      </nav>
    </div>
  );
}

// Inline Styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #f8f9ff 0%, #e8eaf6 100%)',
    paddingBottom: '80px'
  },
  header: {
    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
  },
  backBtn: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  pageTitle: {
    color: 'white',
    fontSize: '24px',
    fontWeight: '700',
    margin: 0
  },
  main: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  profileCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    textAlign: 'center'
  },
  profilePicture: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  pictureCircle: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '64px',
    color: 'white',
    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
  },
  changePictureBtn: {
    background: 'none',
    border: 'none',
    color: '#4CAF50',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline'
  },
  userInfo: {
    marginTop: '16px'
  },
  userName: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 8px 0'
  },
  userEmail: {
    fontSize: '16px',
    color: '#666',
    margin: 0
  },
  settingsCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 20px 0'
  },
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  menuItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f9f9f9',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    width: '100%',
    textAlign: 'left'
  },
  menuLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  menuIcon: {
    fontSize: '24px'
  },
  menuText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  menuArrow: {
    fontSize: '20px',
    color: '#999'
  },
  logoutItem: {
    background: '#ffebee',
    marginTop: '8px'
  },
  appInfo: {
    textAlign: 'center',
    padding: '20px'
  },
  appInfoText: {
    fontSize: '14px',
    color: '#999',
    margin: '4px 0'
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'white',
    display: 'flex',
    justifyContent: 'space-around',
    padding: '12px 0',
    boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
    zIndex: 100
  },
  navItem: {
    background: 'none',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    padding: '8px 16px',
    color: '#666'
  },
  navIcon: {
    fontSize: '24px'
  },
  navLabel: {
    fontSize: '12px',
    fontWeight: '600'
  }
};