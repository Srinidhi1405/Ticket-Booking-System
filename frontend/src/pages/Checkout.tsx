import React, { useEffect, useState } from 'react';
import { apiRequest } from '../context/AuthContext';
import { Timer } from '../components/Timer';
import { CreditCard, Calendar, MapPin, AlertCircle, ArrowLeft } from 'lucide-react';

interface CheckoutProps {
  eventId: string;
  selectedSeatIds: string[];
  waitlistId?: string | null;
  onBack: () => void;
  onBookingSuccess: () => void;
}

export const Checkout: React.FC<CheckoutProps> = ({
  eventId,
  selectedSeatIds,
  waitlistId,
  onBack,
  onBookingSuccess,
}) => {
  const [event, setEvent] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [resolvedSeatIds, setResolvedSeatIds] = useState<string[]>(selectedSeatIds);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCheckoutDetails = async () => {
      try {
        const data = await apiRequest(`/api/events/${eventId}`);
        setEvent(data.event);
        
        let activeSeatIds = [...selectedSeatIds];

        if (activeSeatIds.length === 0 && waitlistId) {
          const waitlistData = await apiRequest(`/api/waitlist/status/${eventId}`);
          if (waitlistData?.onWaitlist && waitlistData.offeredSeat) {
            activeSeatIds = [waitlistData.offeredSeat.id];
            setResolvedSeatIds(activeSeatIds);
          } else {
            throw new Error('No active seat offer found for your waitlist spot.');
          }
        } else {
          setResolvedSeatIds(activeSeatIds);
        }

        // Find details of our selected seats
        const selectedDetails = data.seatMap.filter((s: any) => activeSeatIds.includes(s.id));
        setSeats(selectedDetails);

        // Find the earliest expiration date among our holds
        const holds = selectedDetails.filter((s: any) => s.expiresAt);
        if (holds.length > 0) {
          const times = holds.map((s: any) => new Date(s.expiresAt).getTime());
          const minTime = Math.min(...times);
          setExpiresAt(new Date(minTime).toISOString());
        } else {
          setExpiresAt(new Date(Date.now() + 10 * 60 * 1000).toISOString());
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load checkout details.');
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutDetails();
  }, [eventId, selectedSeatIds, waitlistId]);

  const handleConfirmBooking = async () => {
    setError('');
    setSubmitting(true);
    try {
      await apiRequest('/api/bookings/confirm', {
        method: 'POST',
        body: JSON.stringify({ eventId, seatIds: resolvedSeatIds }),
      });
      onBookingSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm booking.');
      setSubmitting(false);
    }
  };

  const handleTimeout = () => {
    setError('Your seat hold has expired. Redirecting you to select seats again...');
    setTimeout(() => {
      onBack();
    }, 4000);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Preparing checkout...</div>
      </div>
    );
  }

  // Calculate pricing
  const pricings = event.pricings || [];
  const standardPrice = pricings.find((p: any) => p.category === 'Standard')?.price || 0;
  const premiumPrice = pricings.find((p: any) => p.category === 'Premium')?.price || 0;

  const totalAmount = seats.reduce((sum, s) => {
    const price = s.category === 'Premium' ? premiumPrice : standardPrice;
    return sum + price;
  }, 0);

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '800px' }}>
      <button
        className="btn btn-secondary"
        style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem' }}
        onClick={onBack}
        disabled={submitting}
      >
        <ArrowLeft size={16} /> Cancel & Re-select Seats
      </button>

      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1.5rem' }}>Secure Checkout</h1>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {expiresAt && !submitting && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Timer expiresAt={expiresAt} onTimeout={handleTimeout} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }} className="checkout-grid">
        {/* Left Column: Order Summary */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            Order Summary
          </h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{event.title}</h3>
            <div className="flex align-center gap-2" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              <Calendar size={14} />
              <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
            </div>
            <div className="flex align-center gap-2" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <MapPin size={14} />
              <span>{event.venue.name}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
            {seats.map((seat) => {
              const price = seat.category === 'Premium' ? premiumPrice : standardPrice;
              return (
                <div key={seat.id} className="flex justify-between" style={{ fontSize: '0.9rem' }}>
                  <span>
                    Row {String.fromCharCode(64 + seat.row)} - Col {seat.number} ({seat.category})
                  </span>
                  <span style={{ fontWeight: 'bold' }}>₹{price.toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between align-center" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontWeight: 800, fontSize: '1.2rem' }}>
            <span>Total:</span>
            <span style={{ color: 'var(--color-accent)' }}>₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Right Column: Payment Form */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            Mock Payment
          </h2>

          <div className="alert alert-success" style={{ fontSize: '0.8rem', padding: '0.75rem', marginBottom: '1.5rem' }}>
            This is a demonstration system. No real funds will be charged.
          </div>

          <div className="form-group">
            <label className="form-label">Cardholder Name</label>
            <input type="text" className="form-input" placeholder="Alice Smith" defaultValue="Alice Smith" disabled={submitting} />
          </div>

          <div className="form-group">
            <label className="form-label">Card Number</label>
            <div style={{ position: 'relative' }}>
              <CreditCard size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="4111 2222 3333 4444"
                defaultValue="4111 2222 3333 4444"
                disabled={submitting}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input type="text" className="form-input" placeholder="MM/YY" defaultValue="12/28" disabled={submitting} />
            </div>
            <div className="form-group">
              <label className="form-label">CVC</label>
              <input type="text" className="form-input" placeholder="123" defaultValue="123" disabled={submitting} />
            </div>
          </div>

          <button
            className="btn btn-accent"
            style={{ width: '100%', height: '48px', marginTop: '1.5rem' }}
            onClick={handleConfirmBooking}
            disabled={submitting || seats.length === 0}
          >
            {submitting ? 'Confirming booking...' : `Pay & Book ₹${totalAmount.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};
