import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Calendar, BarChart3, PlusSquare, History } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, setCurrentPage }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="container flex align-center justify-between">
        <div 
          className="flex align-center gap-2" 
          style={{ cursor: 'pointer', fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-primary)' }}
          onClick={() => setCurrentPage(user.role === 'CUSTOMER' ? 'browse' : user.role === 'ORGANIZER' ? 'organizer-dashboard' : 'admin-dashboard')}
        >
          <span style={{ color: 'var(--color-primary)' }}>🎟️</span> Ticketify
        </div>

        <div className="flex align-center gap-3">
          {user.role === 'CUSTOMER' && (
            <>
              <button 
                className={`btn btn-secondary ${currentPage === 'browse' ? 'active' : ''}`}
                style={{ padding: '0.5rem 1rem', border: currentPage === 'browse' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)' }}
                onClick={() => setCurrentPage('browse')}
              >
                <Calendar size={18} /> Events
              </button>
              <button 
                className={`btn btn-secondary ${currentPage === 'history' ? 'active' : ''}`}
                style={{ padding: '0.5rem 1rem', border: currentPage === 'history' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)' }}
                onClick={() => setCurrentPage('history')}
              >
                <History size={18} /> Bookings
              </button>
            </>
          )}

          {user.role === 'ORGANIZER' && (
            <button 
              className={`btn btn-secondary ${currentPage === 'organizer-dashboard' ? 'active' : ''}`}
              style={{ padding: '0.5rem 1rem', border: currentPage === 'organizer-dashboard' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)' }}
              onClick={() => setCurrentPage('organizer-dashboard')}
            >
              <BarChart3 size={18} /> Dashboard
            </button>
          )}

          {user.role === 'ADMIN' && (
            <button 
              className={`btn btn-secondary ${currentPage === 'admin-dashboard' ? 'active' : ''}`}
              style={{ padding: '0.5rem 1rem', border: currentPage === 'admin-dashboard' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)' }}
              onClick={() => setCurrentPage('admin-dashboard')}
            >
              <PlusSquare size={18} /> Admin Panel
            </button>
          )}

          <div style={{ borderLeft: '1px solid var(--border-color)', height: '24px', margin: '0 0.5rem' }} />

          <div className="flex align-center gap-2">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {user.role}
              </div>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.5rem', color: 'var(--color-danger)' }}
              onClick={() => {
                logout();
                setCurrentPage('login');
              }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
