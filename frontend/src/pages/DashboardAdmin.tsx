import React, { useEffect, useState } from 'react';
import { apiRequest } from '../context/AuthContext';
import { Plus, MapPin, Grid, Layers } from 'lucide-react';

export const DashboardAdmin: React.FC = () => {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [rows, setRows] = useState('6');
  const [cols, setCols] = useState('8');
  const [premiumRows, setPremiumRows] = useState('2');
  const [submitting, setSubmitting] = useState(false);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/venues');
      setVenues(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch venues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await apiRequest('/api/venues', {
        method: 'POST',
        body: JSON.stringify({
          name,
          address,
          rows: parseInt(rows),
          cols: parseInt(cols),
          premiumRows: parseInt(premiumRows),
        }),
      });

      setSuccess('Venue created successfully! Physical seats generated.');
      setName('');
      setAddress('');
      setRows('6');
      setCols('8');
      setPremiumRows('2');
      setShowForm(false);
      fetchVenues();
    } catch (err: any) {
      setError(err.message || 'Failed to create venue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '900px' }}>
      <div className="flex justify-between align-center" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Admin Panel</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage concert and cinema venues including physical seat configurations</p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => {
            setShowForm(!showForm);
            setError('');
            setSuccess('');
          }}
        >
          {showForm ? 'View Venues' : <><Plus size={18} /> Create Venue</>}
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>{success}</div>}

      {showForm ? (
        /* Create Venue Form */
        <div className="card" style={{ maxWidth: '550px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Add New Venue</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Venue Name</label>
              <input type="text" className="form-input" placeholder="Grand City Cinema" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Street Address</label>
              <input type="text" className="form-input" placeholder="123 Cinema Plaza, Downtown" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Total Rows</label>
                <input type="number" min="1" max="26" className="form-input" value={rows} onChange={(e) => setRows(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Seats per Row</label>
                <input type="number" min="1" max="30" className="form-input" value={cols} onChange={(e) => setCols(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Premium Rows</label>
                <input type="number" min="0" max={rows} className="form-input" value={premiumRows} onChange={(e) => setPremiumRows(e.target.value)} required />
              </div>
            </div>
            
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              * Rows 1 to {premiumRows || 0} will automatically be labeled as <strong>Premium</strong> category, and the remaining will be set to <strong>Standard</strong> category.
            </p>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px' }} disabled={submitting}>
              {submitting ? 'Creating venue...' : 'Generate Venue Layout'}
            </button>
          </form>
        </div>
      ) : (
        /* Venue Listings Grid */
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading venues...</div>
          ) : venues.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No venues created yet. Add one to list events!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="venues-grid">
              {venues.map((venue) => (
                <div key={venue.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>{venue.name}</h3>
                    <div className="flex align-center gap-1" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} style={{ color: 'var(--color-primary)' }} />
                      <span>{venue.address}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: 'auto', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    <div className="flex align-center gap-1">
                      <Grid size={15} />
                      <span>Grid: <strong>{venue.rows} × {venue.cols}</strong></span>
                    </div>
                    <div className="flex align-center gap-1">
                      <Layers size={15} />
                      <span>Seats: <strong>{venue._count.seats} total</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
