'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reminders, setReminders] = useState([]);
  const [todaysReminders, setTodaysReminders] = useState([]);

  // Load reminders from localStorage
  useEffect(() => {
    const savedReminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    setReminders(savedReminders);
    setTodaysReminders(savedReminders);
  }, []);

  // Get month name
  const getMonthName = (date) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[date.getMonth()];
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month
  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  // Check if date is today
  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  // Check if date is selected
  const isSelected = (day) => {
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Handle date selection
  const handleDateClick = (day) => {
    if (day) {
      const newDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day
      );
      setSelectedDate(newDate);
    }
  };

  // Previous month
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  // Next month
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Mark reminder as taken
  const markAsTaken = (index) => {
    const updatedReminders = [...reminders];
    updatedReminders[index].taken = !updatedReminders[index].taken;
    setReminders(updatedReminders);
    setTodaysReminders(updatedReminders);
    localStorage.setItem('reminders', JSON.stringify(updatedReminders));
  };

  const calendarDays = generateCalendarDays();

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.push('/dashboard')}>
          ← Back
        </button>
        <h1 style={styles.pageTitle}>Calendar</h1>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Calendar Card */}
        <div style={styles.calendarCard}>
          {/* Month Navigation */}
          <div style={styles.monthNav}>
            <button style={styles.navBtn} onClick={previousMonth}>
              ← Previous
            </button>
            <h2 style={styles.monthTitle}>
              {getMonthName(currentDate)} {currentDate.getFullYear()}
            </h2>
            <button style={styles.navBtn} onClick={nextMonth}>
              Next →
            </button>
          </div>

          {/* Calendar Grid */}
          <div style={styles.calendarGrid}>
            {/* Day Headers */}
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} style={styles.dayHeader}>{day}</div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((day, index) => (
              <div
                key={index}
                style={{
                  ...styles.calendarDay,
                  ...(day ? {} : styles.emptyDay),
                  ...(isToday(day) ? styles.todayDay : {}),
                  ...(isSelected(day) ? styles.selectedDay : {})
                }}
                onClick={() => handleDateClick(day)}
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        <div style={styles.scheduleCard}>
          <h3 style={styles.scheduleTitle}>
            📋 Today's Schedule
          </h3>

          <div style={styles.scheduleList}>
            {todaysReminders.length > 0 ? (
              todaysReminders.map((reminder, index) => (
                <div key={index} style={styles.scheduleItem}>
                  <div style={styles.scheduleInfo}>
                    <div style={styles.scheduleIcon}>💊</div>
                    <div>
                      <h4 style={styles.medicineName}>{reminder.medicine}</h4>
                      <p style={styles.medicineDetails}>
                        {reminder.dosage} • {reminder.time}
                      </p>
                    </div>
                  </div>
                  
                  <input
                    type="checkbox"
                    checked={reminder.taken || false}
                    onChange={() => markAsTaken(index)}
                    style={styles.checkbox}
                  />
                </div>
              ))
            ) : (
              <div style={styles.noSchedule}>
                <div style={styles.noScheduleIcon}>📅</div>
                <p>No medications scheduled</p>
              </div>
            )}
          </div>
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
        <button style={{...styles.navItem, color: '#4CAF50'}} onClick={() => router.push('/calendar')}>
          <span style={styles.navIcon}>📅</span>
          <span style={styles.navLabel}>Calendar</span>
        </button>
        <button style={styles.navItem} onClick={() => router.push('/profile')}>
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
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  calendarCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
  },
  monthNav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  monthTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#333',
    margin: 0
  },
  navBtn: {
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px'
  },
  dayHeader: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#666',
    padding: '12px',
    fontSize: '14px'
  },
  calendarDay: {
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    cursor: 'pointer',
    background: '#f5f5f5',
    border: '2px solid transparent',
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  emptyDay: {
    cursor: 'default',
    background: 'transparent'
  },
  todayDay: {
    background: '#4CAF50',
    color: 'white'
  },
  selectedDay: {
    borderColor: '#4CAF50',
    background: '#e8f5e9'
  },
  scheduleCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
  },
  scheduleTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 20px 0'
  },
  scheduleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  scheduleItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f9f9f9',
    borderRadius: '12px',
    borderLeft: '4px solid #4CAF50'
  },
  scheduleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  scheduleIcon: {
    fontSize: '32px'
  },
  medicineName: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 4px 0'
  },
  medicineDetails: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  checkbox: {
    width: '24px',
    height: '24px',
    cursor: 'pointer'
  },
  noSchedule: {
    textAlign: 'center',
    padding: '40px 20px'
  },
  noScheduleIcon: {
    fontSize: '64px',
    marginBottom: '16px'
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