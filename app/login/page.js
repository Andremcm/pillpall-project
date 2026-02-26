'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('userId', data.id);
        localStorage.setItem('userName', data.name);
        localStorage.setItem('userEmail', data.email); // ← save actual email
        router.push('/dashboard');
      } else {
        setError(data.error);
      }
    } else {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('userId', data.id);
        localStorage.setItem('userName', data.name);
        localStorage.setItem('userEmail', data.email); // ← save actual email
        router.push('/dashboard');
      } else {
        setError(data.error);
      }
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
          {error && (
            <div style={{ background: '#ffebee', color: '#c62828', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', marginBottom: '12px', textAlign: 'center' }}>
              ⚠️ {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="fullName"><span className="icon">👤</span> Full Name</label>
                <input type="text" id="fullName" name="fullName" placeholder="Enter your full name" value={formData.fullName} onChange={handleChange} required={!isLogin} />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="email"><span className="icon">✉️</span> Email</label>
              <input type="email" id="email" name="email" placeholder="Enter your email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="password"><span className="icon">🔒</span> Password</label>
              <input type="password" id="password" name="password" placeholder="Enter your password" value={formData.password} onChange={handleChange} required />
            </div>
            {isLogin && <div className="forgot-password"><a href="#">Forgot password?</a></div>}
            <button type="submit" className="submit-btn">{isLogin ? 'Log In' : 'Create Account'}</button>
          </form>
          <div className="alternative-action">
            {isLogin
              ? <p>Don't have an account?{' '}<button onClick={() => { setIsLogin(false); setError(''); }} className="link-btn">Sign up</button></p>
              : <p>Already have an account?{' '}<button onClick={() => { setIsLogin(true); setError(''); }} className="link-btn">Log in</button></p>
            }
          </div>
        </div>
        <div className="login-footer"><p>Helping you stay healthy, one reminder at a time 💚</p></div>
      </div>
    </div>
  );
}