import React, { useEffect, useState } from 'react';
import { apiRequest } from '../context/AuthContext';
import { Plus, BarChart3, Users, DollarSign, Armchair, PlusCircle } from 'lucide-react';

export const DashboardOrganizer: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venueId, setVenueId] = useState('');
  const [premiumPrice, setPremiumPrice] = useState('120.00');
  const [standardPrice, setStandardPrice] = useState('60.00');
  const [submitting, setSubmitting] = useState(false);

  const fetchEventsAndVenues = async () => {
    try {
      setLoadingEvents(true);
      const eventsData = await apiRequest('/api/events');
      setEvents(eventsData);
      
      const venuesData = await apiRequest('/api/venues');
      setVenues(venuesData);
      if (venuesData.length > 0) {
        setVenueId(venuesData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data.');
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchEventsAndVenues();
  }, []);

  const handleSelectEvent = async (eventId: string) => {
    setSelectedEventId(eventId);
    setLoadingStats(true);
    setError('');
    try {
      const data = await apiRequest(`/api/bookings/stats/${eventId}`);
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load event statistics.');
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      await apiRequest('/api/events', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          imageUrl: imageUrl || undefined,
          date,
          time,
          venueId,
          pricings: {
            Premium: parseFloat(premiumPrice),
            Standard: parseFloat(standardPrice),
          },
        }),
      });

      setSuccessMsg('Event created successfully! Seating statuses generated.');
      setTitle('');
      setDescription('');
      setImageUrl('');
      setDate('');
      setTime('');
      setShowCreateForm(false);
      
      // Refresh list
      fetchEventsAndVenues();
    } catch (err: any) {
      setError(err.message || 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div className="flex justify-between align-center" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Organizer Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your event listings and view live booking statistics</p>
        </div>
        
        <button 
          className="btn btn-primary"
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setSelectedEventId(null);
            setStats(null);
            setError('');
          }}
        >
          {showCreateForm ? 'View Listings' : <><Plus size={18} /> Create Event</>}
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
      {successMsg && <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>{successMsg}</div>}

      {showCreateForm ? (
        /* Create Event Form */
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Create New Event</h2>
          <form onSubmit={handleCreateEvent}>
            <div className="form-group">
              <label className="form-label">Event Title</label>
              <input type="text" className="form-input" placeholder="Rock Concert Live" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea 
                className="form-input" 
                style={{ minHeight: '100px', resize: 'vertical' }} 
                placeholder="Give details about your event..." 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Image URL (Optional)</label>
              <input type="url" className="form-input" placeholder="https://images.unsplash.com/..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Time</label>
                <input type="time" className="form-input" value={time} onChange={(e) => setTime(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Venue</label>
              <select className="form-input" value={venueId} onChange={(e) => setVenueId(e.target.value)} required>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.rows * v.cols} seats)</option>
                ))}
              </select>
              {venues.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '0.25rem' }}>
                  No venues found. Please log in as Admin to create a venue first.
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Premium Ticket Price ($)</label>
                <input type="number" step="0.01" className="form-input" value={premiumPrice} onChange={(e) => setPremiumPrice(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Standard Ticket Price ($)</label>
                <input type="number" step="0.01" className="form-input" value={standardPrice} onChange={(e) => setStandardPrice(e.target.value)} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', height: '48px' }} disabled={submitting || venues.length === 0}>
              {submitting ? 'Creating listing...' : 'Create Event Listing'}
            </button>
          </form>
        </div>
      ) : (
        /* Event stats / listings list */
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }} className="organizer-dashboard-grid">
          {/* Left Column: Event List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Your Events</h2>
            {loadingEvents ? (
              <div style={{ color: 'var(--text-secondary)' }}>Loading event list...</div>
            ) : events.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No events listed yet. Create one!</div>
            ) : (
              events.map((e) => (
                <div 
                  key={e.id}
                  className="card"
                  style={{ 
                    cursor: 'pointer', 
                    padding: '1rem',
                    borderColor: selectedEventId === e.id ? 'var(--color-primary)' : 'var(--border-color)',
                    backgroundColor: selectedEventId === e.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                  }}
                  onClick={() => handleSelectEvent(e.id)}
                >
                  <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{e.title}</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    📅 {new Date(e.date).toLocaleDateString()} | 🏛️ {e.venue.name}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column: Live Stats */}
          <div>
            {!selectedEventId ? (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
                <BarChart3 size={48} style={{ marginBottom: '1rem' }} />
                Select an event from the sidebar to inspect booking metrics and waitlist performance.
              </div>
            ) : loadingStats ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>Loading statistics...</div>
            ) : !stats ? (
              <div className="alert alert-error">Failed to load statistics for selected event.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Highlight Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }} className="stats-row">
                  <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span style={{ fontSize: '0.85rem' }}>Revenue Generated</span>
                      <DollarSign size={16} style={{ color: 'var(--color-success)' }} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--color-success)' }}>
                      ${stats.summary.revenue.toFixed(2)}
                    </div>
                  </div>

                  <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span style={{ fontSize: '0.85rem' }}>Seats Booked</span>
                      <Armchair size={16} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem' }}>
                      {stats.summary.booked} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {stats.summary.totalSeats}</span>
                    </div>
                  </div>

                  <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span style={{ fontSize: '0.85rem' }}>Seats Active Hold</span>
                      <PlusCircle size={16} style={{ color: 'var(--color-accent)' }} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--color-accent)' }}>
                      {stats.summary.held}
                    </div>
                  </div>

                  <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span style={{ fontSize: '0.85rem' }}>Waitlist Queue</span>
                      <Users size={16} style={{ color: 'var(--color-accent)' }} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem' }}>
                      {stats.waitlist.waiting} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>waiting</span>
                    </div>
                  </div>
                </div>

                {/* Section breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="card">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Category Sales</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div className="flex justify-between" style={{ fontSize: '0.9rem' }}>
                        <span>Premium Category:</span>
                        <strong>{stats.categoryStats.Premium?.booked || 0} Sold (${(stats.categoryStats.Premium?.revenue || 0).toFixed(2)})</strong>
                      </div>
                      <div className="flex justify-between" style={{ fontSize: '0.9rem' }}>
                        <span>Standard Category:</span>
                        <strong>{stats.categoryStats.Standard?.booked || 0} Sold (${(stats.categoryStats.Standard?.revenue || 0).toFixed(2)})</strong>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Waitlist Offer Details</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div className="flex justify-between" style={{ fontSize: '0.9rem' }}>
                        <span>Offered Spot Hold:</span>
                        <strong style={{ color: 'var(--color-accent)' }}>{stats.waitlist.offered} Seat(s)</strong>
                      </div>
                      <div className="flex justify-between" style={{ fontSize: '0.9rem' }}>
                        <span>Active Waitlist Size:</span>
                        <strong>{stats.waitlist.waiting} User(s)</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sales Ledger */}
                <div className="card" style={{ overflowX: 'auto', padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Booking Ledger</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '0.75rem' }}>Ref</th>
                        <th style={{ padding: '0.75rem' }}>Customer</th>
                        <th style={{ padding: '0.75rem' }}>Seats</th>
                        <th style={{ padding: '0.75rem' }}>Paid</th>
                        <th style={{ padding: '0.75rem' }}>Booked Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.bookings.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No bookings confirmed yet for this event.
                          </td>
                        </tr>
                      ) : (
                        stats.bookings.map((b: any) => (
                          <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <td style={{ padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{b.reference}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <div>{b.customerName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.customerEmail}</div>
                            </td>
                            <td style={{ padding: '0.75rem' }}>{b.seats}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-success)' }}>${b.price.toFixed(2)}</td>
                            <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                              {new Date(b.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
