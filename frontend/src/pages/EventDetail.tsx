import React, { useEffect, useState, useRef } from 'react';
import { apiRequest, useAuth } from '../context/AuthContext';
import { Calendar, MapPin, Armchair, ArrowLeft, Loader2, Users } from 'lucide-react';

interface Seat {
  id: string;
  row: number;
  number: number;
  category: string;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  heldByUserId?: string | null;
  expiresAt?: string | null;
}

interface EventDetailProps {
  eventId: string;
  onBack: () => void;
  onHoldSuccess: (selectedSeats: string[], eventId: string) => void;
}

export const EventDetail: React.FC<EventDetailProps> = ({ eventId, onBack, onHoldSuccess }) => {
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [seatMap, setSeatMap] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Waitlist states
  const [waitlistStatus, setWaitlistStatus] = useState<any>(null);
  const [joiningWaitlist, setJoiningWaitlist] = useState<string | null>(null); // "Standard" or "Premium"
  const [waitlistMsg, setWaitlistMsg] = useState('');

  const wsRef = useRef<WebSocket | null>(null);

  // Fetch event details and seat statuses
  const fetchDetails = async () => {
    try {
      const data = await apiRequest(`/api/events/${eventId}`);
      setEvent(data.event);
      setSeatMap(data.seatMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWaitlistStatus = async () => {
    if (!user || user.role !== 'CUSTOMER') return;
    try {
      const data = await apiRequest(`/api/waitlist/status/${eventId}`);
      setWaitlistStatus(data);
    } catch (err) {
      console.error('Error fetching waitlist status:', err);
    }
  };

  useEffect(() => {
    fetchDetails();
    fetchWaitlistStatus();

    // Setup WebSockets
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultWsUrl = `${wsProtocol}//${window.location.host}/ws`;
    const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;
    
    const connectWS = () => {
      console.log('Connecting to WebSocket...');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection opened.');
        // Subscribe to event updates
        ws.send(JSON.stringify({ type: 'subscribe', eventId }));
      };

      ws.onmessage = (eventMsg) => {
        try {
          const data = JSON.parse(eventMsg.data);
          
          if (data.type === 'seat_update') {
            console.log('Received seat update:', data);
            setSeatMap((prevMap) =>
              prevMap.map((seat) =>
                seat.id === data.seatId
                  ? {
                      ...seat,
                      status: data.status as any,
                      heldByUserId: data.heldByUserId,
                      expiresAt: data.expiresAt,
                    }
                  : seat
              )
            );
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket closed. Attempting reconnect in 5s...');
        setTimeout(connectWS, 5000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
    };

    connectWS();

    return () => {
      if (wsRef.current) {
        // Clear onclose handler before closing to prevent reconnection loops
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [eventId]);

  const handleSeatClick = (seat: Seat) => {
    if (seat.status !== 'AVAILABLE') return;
    
    setSelectedSeats((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      } else {
        return [...prev, seat.id];
      }
    });
  };

  const handleHoldSeats = async () => {
    if (selectedSeats.length === 0) return;
    setError('');
    
    try {
      await apiRequest('/api/bookings/hold', {
        method: 'POST',
        body: JSON.stringify({ eventId, seatIds: selectedSeats }),
      });
      // Call success trigger with held seats
      onHoldSuccess(selectedSeats, eventId);
    } catch (err: any) {
      setError(err.message || 'Failed to place hold on seats. Some might have been selected.');
      // Refresh details to sync map
      fetchDetails();
    }
  };

  const handleJoinWaitlist = async (category: string) => {
    setJoiningWaitlist(category);
    setWaitlistMsg('');
    try {
      const data = await apiRequest('/api/waitlist/join', {
        method: 'POST',
        body: JSON.stringify({ eventId, category }),
      });
      setWaitlistMsg(`Success! Joined the ${category} waitlist. Queue Position: ${data.entry.position}`);
      fetchWaitlistStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to join waitlist.');
    } finally {
      setJoiningWaitlist(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--color-primary)' }} />
        <div>Loading Event Seating Map...</div>
      </div>
    );
  }

  // Calculate pricing & seat availability
  const pricings = event.pricings || [];
  const standardPrice = pricings.find((p: any) => p.category === 'Standard')?.price || 0;
  const premiumPrice = pricings.find((p: any) => p.category === 'Premium')?.price || 0;

  const premiumSeats = seatMap.filter((s) => s.category === 'Premium');
  const standardSeats = seatMap.filter((s) => s.category === 'Standard');

  const premiumAvailable = premiumSeats.filter((s) => s.status === 'AVAILABLE').length;
  const standardAvailable = standardSeats.filter((s) => s.status === 'AVAILABLE').length;

  const totalSelectedPrice = selectedSeats.reduce((sum, id) => {
    const seat = seatMap.find((s) => s.id === id);
    if (!seat) return sum;
    const price = seat.category === 'Premium' ? premiumPrice : standardPrice;
    return sum + price;
  }, 0);

  // Group seats by row for grid rendering
  const rowsMap: Record<number, Seat[]> = {};
  seatMap.forEach((seat) => {
    if (!rowsMap[seat.row]) {
      rowsMap[seat.row] = [];
    }
    rowsMap[seat.row].push(seat);
  });

  const rowNumbers = Object.keys(rowsMap).map(Number).sort((a, b) => a - b);

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <button 
        className="btn btn-secondary" 
        style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem' }}
        onClick={onBack}
      >
        <ArrowLeft size={16} /> Back to Events
      </button>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {waitlistMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          {waitlistMsg}
        </div>
      )}

      {waitlistStatus?.onWaitlist && (
        <div className="alert alert-warning" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ fontWeight: 'bold' }}>You are on the waitlist!</div>
          {waitlistStatus.status === 'WAITING' ? (
            <div>Category: <strong>{waitlistStatus.category}</strong> | Queue Position: <strong>#{waitlistStatus.position}</strong></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
              <div>🎉 A seat in <strong>{waitlistStatus.category}</strong> (Row {waitlistStatus.offeredSeat.row}, Col {waitlistStatus.offeredSeat.number}) is reserved for you!</div>
              <button 
                className="btn btn-accent" 
                style={{ padding: '0.5rem 1rem', alignSelf: 'flex-start' }}
                onClick={() => onHoldSuccess([waitlistStatus.offeredSeat.id], eventId)}
              >
                Proceed to Checkout
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }} className="event-detail-grid">
        {/* Left Side: Seat Map */}
        <div>
          <div className="seat-grid-container">
            <div className="stage-bar">STAGE / SCREEN</div>
            
            {rowNumbers.map((row) => (
              <div key={row} className="seat-row">
                <span className="row-label">{String.fromCharCode(64 + row)}</span>
                {rowsMap[row].map((seat) => {
                  const isSelected = selectedSeats.includes(seat.id);
                  const isHeldByMe = seat.status === 'HELD' && seat.heldByUserId === user?.id;
                  
                  let seatClass = 'seat-item';
                  if (isSelected || isHeldByMe) {
                    seatClass += ' held-by-me';
                  } else if (seat.status === 'AVAILABLE') {
                    seatClass += ` available ${seat.category}`;
                  } else {
                    seatClass += ' unavailable';
                  }

                  return (
                    <div 
                      key={seat.id} 
                      className={seatClass}
                      onClick={() => handleSeatClick(seat)}
                      title={`Row ${String.fromCharCode(64 + seat.row)}, Seat ${seat.number} (${seat.category})`}
                    >
                      {seat.number}
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="seat-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid var(--color-success)' }} />
                <span>Standard Available (${standardPrice})</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)', border: '1px solid var(--color-primary)' }} />
                <span>Premium Available (${premiumPrice})</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: 'var(--color-accent)' }} />
                <span>Selected / Held</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', opacity: 0.4 }} />
                <span>Booked / Unavailable</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Event Details & Actions */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>{event.title}</h2>
          
          <div className="flex align-center gap-2" style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
            <Calendar size={16} />
            <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
          </div>

          <div className="flex align-center gap-2" style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <MapPin size={16} />
            <span>{event.venue.name}</span>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
            {event.description}
          </p>

          <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '1.5rem 0', marginBottom: '2rem' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.75rem' }}>Seat Availability:</div>
            <div className="flex justify-between" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              <span>Premium Section:</span>
              <span style={{ fontWeight: 'bold', color: premiumAvailable > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {premiumAvailable} Left
              </span>
            </div>
            <div className="flex justify-between" style={{ fontSize: '0.9rem' }}>
              <span>Standard Section:</span>
              <span style={{ fontWeight: 'bold', color: standardAvailable > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {standardAvailable} Left
              </span>
            </div>
          </div>

          {/* If there are selected seats, show Checkout button */}
          {selectedSeats.length > 0 ? (
            <div>
              <div className="flex justify-between align-center" style={{ marginBottom: '1.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Selected {selectedSeats.length} Seats:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-accent)' }}>${totalSelectedPrice.toFixed(2)}</span>
              </div>
              <button 
                className="btn btn-accent" 
                style={{ width: '100%', height: '48px' }}
                onClick={handleHoldSeats}
              >
                Hold Seats & Checkout
              </button>
            </div>
          ) : (
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                Select seats from the visual grid to book tickets
              </div>
              
              {/* Waitlist Section */}
              {user?.role === 'CUSTOMER' && !waitlistStatus?.onWaitlist && (
                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <div className="flex align-center gap-2" style={{ fontWeight: 'bold', marginBottom: '1rem', color: 'var(--color-accent)' }}>
                    <Users size={18} /> Waitlist (Reallocation)
                  </div>
                  
                  {premiumAvailable === 0 && (
                    <button
                      className="btn btn-secondary"
                      style={{ width: '100%', marginBottom: '0.75rem', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
                      disabled={joiningWaitlist === 'Premium'}
                      onClick={() => handleJoinWaitlist('Premium')}
                    >
                      {joiningWaitlist === 'Premium' ? 'Joining...' : 'Premium Sold Out - Join Waitlist'}
                    </button>
                  )}

                  {standardAvailable === 0 && (
                    <button
                      className="btn btn-secondary"
                      style={{ width: '100%', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
                      disabled={joiningWaitlist === 'Standard'}
                      onClick={() => handleJoinWaitlist('Standard')}
                    >
                      {joiningWaitlist === 'Standard' ? 'Joining...' : 'Standard Sold Out - Join Waitlist'}
                    </button>
                  )}

                  {premiumAvailable > 0 && standardAvailable > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      Waitlists open automatically when categories sell out.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
