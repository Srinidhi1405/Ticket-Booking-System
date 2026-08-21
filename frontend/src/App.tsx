import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { BrowseEvents } from './pages/BrowseEvents';
import { EventDetail } from './pages/EventDetail';
import { Checkout } from './pages/Checkout';
import { DashboardOrganizer } from './pages/DashboardOrganizer';
import { DashboardAdmin } from './pages/DashboardAdmin';
import { BookingHistory } from './pages/BookingHistory';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('login');
  
  // Navigation states
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [currentWaitlistId, setCurrentWaitlistId] = useState<string | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Parse waitlist checkout parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eId = params.get('eventId');
    const wId = params.get('waitlistId');
    if (eId && wId) {
      setCurrentEventId(eId);
      setCurrentWaitlistId(wId);
      setSelectedSeatIds([]);
      setBookingSuccess(false);
      setCurrentPage('checkout');
    }
  }, []);

  // Sync current page with auth status
  useEffect(() => {
    // Only auto-route if we are not currently trying to access the direct checkout page from a waitlist link
    const params = new URLSearchParams(window.location.search);
    const hasWaitlistCheckout = params.get('eventId') && params.get('waitlistId');
    
    if (!loading && !hasWaitlistCheckout) {
      if (!user) {
        setCurrentPage('login');
      } else {
        if (user.role === 'ADMIN') {
          setCurrentPage('admin-dashboard');
        } else if (user.role === 'ORGANIZER') {
          setCurrentPage('organizer-dashboard');
        } else {
          setCurrentPage('browse');
        }
      }
    } else if (!loading && hasWaitlistCheckout && !user) {
      // Force login if not authenticated on waitlist checkout access
      setCurrentPage('login');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--color-primary)' }} />
        <div>Loading Ticketify System...</div>
      </div>
    );
  }

  const handleLoginSuccess = (role: string) => {
    if (role === 'ADMIN') {
      setCurrentPage('admin-dashboard');
    } else if (role === 'ORGANIZER') {
      setCurrentPage('organizer-dashboard');
    } else {
      setCurrentPage('browse');
    }
  };

  const handleSelectEvent = (eventId: string) => {
    setCurrentEventId(eventId);
    setCurrentPage('event-details');
  };

  const handleHoldSuccess = (seatIds: string[], eventId: string) => {
    setSelectedSeatIds(seatIds);
    setCurrentEventId(eventId);
    setBookingSuccess(false);
    setCurrentPage('checkout');
  };

  const handleBookingSuccess = () => {
    setBookingSuccess(true);
    setCurrentPage('history');
  };

  return (
    <div>
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <main style={{ minHeight: '85vh', paddingBottom: '3rem' }}>
        {currentPage === 'login' && <Login onLoginSuccess={handleLoginSuccess} />}
        
        {/* Customer Routing */}
        {currentPage === 'browse' && user?.role === 'CUSTOMER' && (
          <BrowseEvents onSelectEvent={handleSelectEvent} />
        )}
        
        {currentPage === 'event-details' && user?.role === 'CUSTOMER' && currentEventId && (
          <EventDetail 
            eventId={currentEventId} 
            onBack={() => setCurrentPage('browse')} 
            onHoldSuccess={handleHoldSuccess}
          />
        )}
        
        {currentPage === 'checkout' && user?.role === 'CUSTOMER' && currentEventId && (
          <Checkout 
            eventId={currentEventId} 
            selectedSeatIds={selectedSeatIds} 
            waitlistId={currentWaitlistId}
            onBack={() => {
              setCurrentWaitlistId(null);
              setCurrentPage('event-details');
            }} 
            onBookingSuccess={handleBookingSuccess}
          />
        )}
        
        {currentPage === 'history' && user?.role === 'CUSTOMER' && (
          <div>
            {bookingSuccess && (
              <div className="container" style={{ marginTop: '2rem', maxWidth: '850px' }}>
                <div className="alert alert-success" style={{ marginBottom: '1.5rem', display: 'block' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>🎉 Booking Confirmed!</div>
                  <div>Your tickets have been issued and a confirmation email containing your entry QR code has been sent.</div>
                </div>
              </div>
            )}
            <BookingHistory />
          </div>
        )}

        {/* Organizer Routing */}
        {currentPage === 'organizer-dashboard' && user?.role === 'ORGANIZER' && (
          <DashboardOrganizer />
        )}

        {/* Admin Routing */}
        {currentPage === 'admin-dashboard' && user?.role === 'ADMIN' && (
          <DashboardAdmin />
        )}
      </main>
    </div>
  );
};
