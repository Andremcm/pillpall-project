'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });

 const handleSubmit = async (e) => {
  e.preventDefault();
 console.log('handleSubmit called, isLogin:', isLogin); // add this
  if (isLogin) {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email, password: formData.password })
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('userName', data.name);
      router.push('/dashboard');
    } else {
      alert(data.error);
    }

  } else {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('userName', formData.fullName);
      router.push('/dashboard');
    } else {
      alert(data.error);
    }
  }
};

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="login-container">
      {/* Animated Background */}
      <div className="background-animation">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>

      {/* Main Content */}
      <div className="login-content">
        {/* Logo Section */}
        <div className="logo-section">
          <div className="logo-icon">💊</div>
          <h1 className="app-title">PillPal</h1>
          <p className="app-subtitle">Your Medication Companion</p>
        </div>

        {/* Login/Signup Card */}
        <div className="auth-card">
          {/* Tab Switcher */}
          <div className="tab-switcher">
            <button
              className={`tab ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              className={`tab ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Full Name - Only for Signup */}
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="fullName">
                  <span className="icon">👤</span>
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                  required={!isLogin}
                />
              </div>
            )}

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">
                <span className="icon">✉️</span>
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password">
                <span className="icon">🔒</span>
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {/* Forgot Password - Only for Login */}
            {isLogin && (
              <div className="forgot-password">
                <a href="#">Forgot password?</a>
              </div>
            )}

            {/* Submit Button */}
            <button type="submit" className="submit-btn">
              {isLogin ? 'Log In' : 'Create Account'}
            </button>
          </form>

          {/* Alternative Action */}
          <div className="alternative-action">
            {isLogin ? (
              <p>
                Don't have an account?{' '}
                <button onClick={() => setIsLogin(false)} className="link-btn">
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button onClick={() => setIsLogin(true)} className="link-btn">
                  Log in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>Helping you stay healthy, one reminder at a time 💚</p>
        </div>
      </div>
    </div>
  );
}