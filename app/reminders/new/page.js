'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './reminder.css';

export default function SetReminderPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    medicineName: '',
    dosage: '',
    frequency: 'daily',
    time: '',
    durationWeeks: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.medicineName || !formData.dosage || !formData.time) {
      alert('Please fill in all required fields');
      return;
    }

    // Save reminder (this will be saved to database later)
    console.log('Saving reminder:', formData);
    
    // Get existing reminders from localStorage
    const existingReminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    
    // Add new reminder
    const newReminder = {
      id: Date.now(),
      medicine: formData.medicineName,
      dosage: formData.dosage,
      frequency: formData.frequency,
      time: formData.time,
      duration: formData.durationWeeks,
      createdAt: new Date().toISOString()
    };
    
    existingReminders.push(newReminder);
    localStorage.setItem('reminders', JSON.stringify(existingReminders));
    
    // Show success message
    alert('Reminder saved successfully!');
    
    // Redirect back to dashboard
    router.push('/dashboard');
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  return (
    <div className="reminder-container">
      {/* Header */}
      <header className="reminder-header">
        <button className="back-btn" onClick={handleCancel}>
          ← Back
        </button>
        <h1 className="page-title">Add Medicine Reminder</h1>
      </header>

      {/* Form Container */}
      <main className="reminder-main">
        <div className="form-card">
          <div className="form-icon">💊</div>
          <h2 className="form-title">Set Reminder</h2>
          
          <form onSubmit={handleSubmit} className="reminder-form">
            {/* Medicine Name */}
            <div className="form-group">
              <label htmlFor="medicineName">
                <span className="label-icon">💊</span>
                Medicine Name *
              </label>
              <input
                type="text"
                id="medicineName"
                name="medicineName"
                placeholder="Enter medicine name"
                value={formData.medicineName}
                onChange={handleChange}
                required
              />
            </div>

            {/* Dosage */}
            <div className="form-group">
              <label htmlFor="dosage">
                <span className="label-icon">📏</span>
                Dosage *
              </label>
              <input
                type="text"
                id="dosage"
                name="dosage"
                placeholder="e.g., 1 tablet, 500mg, 5ml"
                value={formData.dosage}
                onChange={handleChange}
                required
              />
            </div>

            {/* Frequency */}
            <div className="form-group">
              <label htmlFor="frequency">
                <span className="label-icon">🔄</span>
                Frequency
              </label>
              <select
                id="frequency"
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
              >
                <option value="daily">Daily</option>
                <option value="twice-daily">Twice Daily</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Time */}
            <div className="form-group">
              <label htmlFor="time">
                <span className="label-icon">🕐</span>
                Time *
              </label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                required
              />
            </div>

            {/* Duration (optional) */}
            <div className="form-group">
              <label htmlFor="durationWeeks">
                <span className="label-icon">📅</span>
                Duration (weeks) - Optional
              </label>
              <input
                type="number"
                id="durationWeeks"
                name="durationWeeks"
                placeholder="e.g., 4"
                min="1"
                value={formData.durationWeeks}
                onChange={handleChange}
              />
            </div>

            {/* Buttons */}
            <div className="form-buttons">
              <button 
                type="button" 
                className="cancel-btn"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="save-btn"
              >
                Save Reminder
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}