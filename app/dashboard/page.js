'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './dashboard.css';

export default function DashboardPage() {
  const router = useRouter();
  
  // This will get the actual user's name from login
  const [userName, setUserName] = useState('');

  // Load reminders from localStorage
  const [todaysReminders, setTodaysReminders] = useState([]);

  // Get user name from localStorage (after login)
  useEffect(() => {
    // Get the logged-in user's name
    const storedName = localStorage.getItem('userName');
    if (storedName) {
      setUserName(storedName);
    }

    // Get reminders from localStorage
    const savedReminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    setTodaysReminders(savedReminders);
  }, []);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard-container">
      {/* Header with Logo and App Name */}
      <header className="dashboard-header">
        <div className="logo-box">
          <div className="logo">💊</div>
        </div>
        <h1 className="app-title">Medicine Reminder</h1>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Greeting */}
        <div className="greeting-section">
          <h2 className="greeting-text">
            {getGreeting()}, {userName || 'User'}
          </h2>
        </div>

        {/* Today's Reminders Box */}
        <div className="todays-reminders-box">
          <h3 className="box-title">Today's Reminders</h3>
          <div className="reminders-content">
            {todaysReminders.length > 0 ? (
              todaysReminders.map((reminder, index) => (
                <div key={index} className="reminder-item">
                  <p className="reminder-text">
                    {reminder.medicine} - {reminder.time}
                  </p>
                </div>
              ))
            ) : (
              <p className="no-reminders-text">No reminders scheduled for today</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="action-btn set-reminder-btn"
            onClick={() => router.push('/reminders/new')}
          >
            Set Reminder
          </button>

          <button 
            className="action-btn calendar-btn"
            onClick={() => router.push('/calendar')}
          >
            Calendar
          </button>

          <button 
            className="action-btn profile-btn"
            onClick={() => router.push('/profile')}
          >
            Profile
          </button>
        </div>
      </main>
    </div>
  );
}