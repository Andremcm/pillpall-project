'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (isLogin) {
      const res = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('userId', data.id);
        localStorage.setItem('userName', data.name);
        localStorage.setItem('userEmail', data.email);
        router.push('/dashboard');
      } else { setError(data.error); }
    } else {
      const res = await fetch('/api/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('userId', data.id);
        localStorage.setItem('userName', data.name);
        localStorage.setItem('userEmail', data.email);
        router.push('/dashboard');
      } else { setError(data.error); }
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="login-container">
      <div className="background-animation">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>
      <div className="login-content">
        <div className="logo-section">
          <div className="logo-icon">💊</div>
          <h1 className="app-title">PillPal</h1>
          <p className="app-subtitle">Your Medication Companion</p>
        </div>
        <div className="auth-card">
          <div className="tab-switcher">
            <button className={`tab ${isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(true); setError(''); }}>Login</button>
            <button className={`tab ${!isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(false); setError(''); }}>Sign Up</button>
          </div>
          {error && <div className="error-box">⚠️ {error}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="fullName"><span className="icon">👤</span> Full Name</label>
                <input type="text" id="fullName" name="fullName" placeholder="Enter your full name"
                  value={formData.fullName} onChange={handleChange} required={!isLogin} />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="email"><span className="icon">✉️</span> Email</label>
              <input type="email" id="email" name="email" placeholder="Enter your email"
                value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="password"><span className="icon">🔒</span> Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password" name="password"
                  placeholder="Enter your password"
                  value={formData.password} onChange={handleChange} required
                />
                <button type="button" className="eye-btn" onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {isLogin && <div className="forgot-password"><a href="#">Forgot password?</a></div>}
            <button type="submit" className="submit-btn">{isLogin ? 'Log In' : 'Create Account'}</button>
          </form>
          <div className="alternative-action">
            {isLogin
              ? <p>Don't have an account? <button onClick={() => { setIsLogin(false); setError(''); }} className="link-btn">Sign up</button></p>
              : <p>Already have an account? <button onClick={() => { setIsLogin(true); setError(''); }} className="link-btn">Log in</button></p>
            }
          </div>
        </div>
        <div className="login-footer"><p>Helping you stay healthy, one reminder at a time 💚</p></div>
      </div>
    </div>
  );
}