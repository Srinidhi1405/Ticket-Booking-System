import React, { useEffect, useState } from 'react';
import { apiRequest } from '../context/AuthContext';
import { Calendar, MapPin, Ticket, AlertCircle, XCircle } from 'lucide-react';

export const BookingHistory: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const data = await apiRequest('/api/bookings/history');
      setBookings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load booking history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking? The seat will be released and offered to the waitlist immediately.')) {
      return;
    }

    setCancellingId(bookingId);
    setError('');

    try {
      await apiRequest(`/api/bookings/cancel/${bookingId}`, {
        method: 'POST',
      });
      // Refresh
      fetchHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel booking.');
      setCancellingId(null);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '850px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Your Bookings</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>View your ticket codes, booking receipts, or cancel upcoming reservations</p>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading history...</div>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          You have no bookings recorded. Go to events to book tickets!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {bookings.map((booking) => {
            const isConfirmed = booking.status === 'CONFIRMED';
            const isCancelled = booking.status === 'CANCELLED';
            const dateObj = new Date(booking.event.date);
            const seatNames = booking.bookingItems.map((item: any) => `Row ${String.fromCharCode(64 + item.seat.row)}-Seat ${item.seat.number}`).join(', ');

            return (
              <div 
                key={booking.id} 
                className="card" 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 220px', 
                  gap: '1.5rem', 
                  opacity: isCancelled ? 0.6 : 1,
                  borderColor: isCancelled ? 'transparent' : 'var(--border-color)'
                }}
                className="booking-history-card"
              >
                {/* Left Side: Booking details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignCenter: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{booking.event.title}</h3>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      backgroundColor: isConfirmed ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                      color: isConfirmed ? 'var(--color-success)' : 'var(--color-danger)',
                      border: `1px solid ${isConfirmed ? 'var(--color-success)' : 'var(--color-danger)'}`,
                      height: 'fit-content',
                      alignSelf: 'center'
                    }}>
                      {booking.status}
                    </span>
                  </div>

                  <div className="flex align-center gap-2" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={14} />
                    <span>{dateObj.toLocaleDateString()} at {booking.event.time}</span>
                  </div>

                  <div className="flex align-center gap-2" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <MapPin size={14} />
                    <span>{booking.event.venue.name} - {booking.event.venue.address}</span>
                  </div>

                  <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    🎟️ Seats: <strong style={{ color: 'var(--color-accent)' }}>{seatNames}</strong>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Booking reference: <strong>{booking.bookingReference}</strong>
                  </div>
                </div>

                {/* Right Side: Price, QR (simulated) and Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }} className="history-right-col">
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Amount Paid</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)' }}>${booking.totalPrice.toFixed(2)}</div>
                  </div>

                  {isConfirmed && (
                    <button
                      className="btn btn-secondary"
                      style={{ 
                        width: '100%', 
                        fontSize: '0.8rem', 
                        padding: '0.5rem 1rem', 
                        color: 'var(--color-danger)', 
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        backgroundColor: 'rgba(239, 68, 68, 0.05)'
                      }}
                      onClick={() => handleCancelBooking(booking.id)}
                      disabled={cancellingId === booking.id}
                    >
                      <XCircle size={14} /> {cancellingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  )}

                  {isCancelled && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Cancelled on {new Date(booking.updatedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
