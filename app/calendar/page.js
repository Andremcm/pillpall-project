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

  // Check if date has reminders
  const hasReminders = (day) => {
    return reminders.length > 0 && day <= new Date().getDate();
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
      {/* Header - GREEN like wireframe */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.push('/dashboard')}>
          ← Calendar
        </button>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
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
                ...(day ? styles.hasDay : styles.emptyDay),
                ...(isToday(day) ? styles.todayDay : {}),
                ...(isSelected(day) ? styles.selectedDay : {})
              }}
              onClick={() => handleDateClick(day)}
            >
              {day && (
                <>
                  <span style={styles.dayNumber}>{day}</span>
                  {hasReminders(day) && <span style={styles.reminderDot}>•</span>}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Today's Schedule */}
        <div style={styles.scheduleSection}>
          <h3 style={styles.scheduleTitle}>Today's Schedule:</h3>

          <div style={styles.scheduleList}>
            {todaysReminders.length > 0 ? (
              todaysReminders.map((reminder, index) => (
                <div key={index} style={styles.scheduleItem}>
                  <div style={styles.scheduleLeft}>
                    <span style={styles.pillIcon}>💊</span>
                    <div style={styles.medicineInfo}>
                      <div style={styles.medicineName}>{reminder.medicine}</div>
                      <div style={styles.medicineDetails}>
                        {reminder.dosage} • {reminder.time}
                      </div>
                    </div>
                  </div>
                  
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={reminder.taken || false}
                      onChange={() => markAsTaken(index)}
                      style={styles.checkbox}
                    />
                  </label>
                </div>
              ))
            ) : (
              <div style={styles.noSchedule}>
                No medications scheduled
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

// Inline Styles - MATCHING WIREFRAME
const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
    paddingBottom: '80px'
  },
  header: {
    background: '#4CAF50',
    padding: '16px 24px'
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0
  },
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
    background: '#e8e8e8'
  },
  monthNav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  monthTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#000',
    margin: 0
  },
  navBtn: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    color: '#000'
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
    marginBottom: '32px'
  },
  dayHeader: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#000',
    padding: '8px',
    fontSize: '14px'
  },
  calendarDay: {
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    position: 'relative',
    border: '2px solid transparent'
  },
  emptyDay: {
    cursor: 'default',
    background: 'transparent'
  },
  hasDay: {
    background: '#4CAF50',
    color: '#000'
  },
  todayDay: {
    background: '#4CAF50',
    color: '#000',
    fontWeight: '700'
  },
  selectedDay: {
    background: '#C8E6C9',
    border: '2px solid #4CAF50'
  },
  dayNumber: {
    color: '#000'
  },
  reminderDot: {
    position: 'absolute',
    bottom: '4px',
    fontSize: '20px',
    color: '#000'
  },
  scheduleSection: {
    marginTop: '24px'
  },
  scheduleTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#000',
    marginBottom: '16px'
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
    background: '#4CAF50',
    borderRadius: '8px',
    borderLeft: '4px solid #388E3C'
  },
  scheduleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1
  },
  pillIcon: {
    fontSize: '32px'
  },
  medicineInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  medicineName: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#000'
  },
  medicineDetails: {
    fontSize: '14px',
    color: '#000',
    opacity: 0.8
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer'
  },
  checkbox: {
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    accentColor: '#000'
  },
  noSchedule: {
    textAlign: 'center',
    padding: '32px',
    fontSize: '16px',
    color: '#666'
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