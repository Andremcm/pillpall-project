'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  // Hide on login/signup pages
  const hidden = ['/', '/login', '/signup', '/register'].some(p => pathname === p);
  if (hidden) return null;

  const isActive = (path) => pathname === path;

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'white',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '10px 0 14px',
      boxShadow: '0 -2px 16px rgba(0,0,0,0.08)',
      zIndex: 100,
      fontFamily: "'Nunito', sans-serif",
    }}>
      <button onClick={() => router.push('/dashboard')} style={navItemStyle(isActive('/dashboard'))}>
        <span style={{ fontSize: '22px' }}>🏠</span>
        <span style={navLabelStyle(isActive('/dashboard'))}>Home</span>
      </button>
      <button onClick={() => router.push('/reminders/new')} style={navItemStyle(false)}>
        <span style={{ fontSize: '22px' }}>➕</span>
        <span style={navLabelStyle(false)}>Add</span>
      </button>
      <button onClick={() => router.push('/calendar')} style={navItemStyle(isActive('/calendar'))}>
        <span style={{ fontSize: '22px' }}>📅</span>
        <span style={navLabelStyle(isActive('/calendar'))}>Calendar</span>
      </button>
      <button onClick={() => router.push('/profile')} style={navItemStyle(isActive('/profile'))}>
        <span style={{ fontSize: '22px' }}>👤</span>
        <span style={navLabelStyle(isActive('/profile'))}>Profile</span>
      </button>
    </nav>
  );
}

const navItemStyle = (active) => ({
  background: 'none',
  border: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '3px',
  cursor: 'pointer',
  padding: '6px 16px',
  color: active ? '#43a047' : '#aaa',
  fontFamily: "'Nunito', sans-serif",
  transition: 'color 0.2s',
});

const navLabelStyle = (active) => ({
  fontSize: '11px',
  fontWeight: '700',
  color: active ? '#43a047' : '#aaa',
});