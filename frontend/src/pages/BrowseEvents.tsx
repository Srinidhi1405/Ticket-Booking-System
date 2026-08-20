import React, { useEffect, useState } from 'react';
import { apiRequest } from '../context/AuthContext';
import { Calendar, MapPin, Search } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  date: string;
  time: string;
  venue: {
    name: string;
    address: string;
  };
  pricings: {
    category: string;
    price: number;
  }[];
}

interface BrowseEventsProps {
  onSelectEvent: (eventId: string) => void;
}

export const BrowseEvents: React.FC<BrowseEventsProps> = ({ onSelectEvent }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await apiRequest('/api/events');
        setEvents(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load events.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div className="flex justify-between align-center" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Explore Events</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Find and book tickets for the latest concerts and shows</p>
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search events, movies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ color: 'var(--text-secondary)' }}>Loading events...</div>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {!loading && filteredEvents.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          No events found matching your search.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
        {filteredEvents.map((event) => {
          const standardPrice = event.pricings.find((p) => p.category === 'Standard')?.price || 0;
          const premiumPrice = event.pricings.find((p) => p.category === 'Premium')?.price || 0;
          const dateObj = new Date(event.date);

          return (
            <div key={event.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0', overflow: 'hidden' }}>
              <div style={{ position: 'relative', height: '180px', overflow: 'hidden', backgroundColor: 'var(--bg-tertiary)' }}>
                <img
                  src={event.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&fit=crop&q=60'}
                  alt={event.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: 'rgba(10, 14, 23, 0.85)',
                  backdropFilter: 'blur(4px)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: 'var(--color-accent)'
                }}>
                  From ${standardPrice}
                </div>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: '1.3' }}>
                  {event.title}
                </h2>
                
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  marginBottom: '1.25rem',
                  flexGrow: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {event.description}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <div className="flex align-center gap-2">
                    <Calendar size={15} style={{ color: 'var(--color-primary)' }} />
                    <span>{dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {event.time}</span>
                  </div>
                  <div className="flex align-center gap-2">
                    <MapPin size={15} style={{ color: 'var(--color-primary)' }} />
                    <span>{event.venue.name}</span>
                  </div>
                </div>

                <div className="flex justify-between align-center" style={{ marginTop: 'auto' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div>Premium: <strong style={{ color: 'var(--text-primary)' }}>${premiumPrice}</strong></div>
                    <div>Standard: <strong style={{ color: 'var(--text-primary)' }}>${standardPrice}</strong></div>
                  </div>
                  <button 
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
                    onClick={() => onSelectEvent(event.id)}
                  >
                    Book Tickets
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
