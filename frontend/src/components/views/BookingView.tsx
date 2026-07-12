import React, { useState } from 'react';
import { Calendar as CalendarIcon, X, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BookingView: React.FC = () => {
  const { assets, bookings, createBooking, cancelBooking, employees } = useApp();

  // Selected Shared Asset to inspect calendar
  const sharedAssets = assets.filter(a => a.is_shared);
  const [selectedAssetId, setSelectedAssetId] = useState(sharedAssets[0]?.id || '');
  const [showBookModal, setShowBookModal] = useState(false);

  // New Booking Form states
  const [formAssetId, setFormAssetId] = useState(selectedAssetId);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [errorMsg, setErrorMsg] = useState('');

  const activeSharedAsset = assets.find(a => a.id === selectedAssetId);

  // Get days of the month (e.g. July 2026 for simulation)
  const daysInMonth = 31;
  const currentMonthYear = 'July 2026';
  const firstDayOffset = 3; // Wednesday (0: Sun, 1: Mon, etc.)

  const getBookingsForDay = (day: number) => {
    return bookings.filter(b => {
      if (b.status === 'Cancelled' || b.asset_id !== selectedAssetId) return false;
      const bDate = new Date(b.start_time);
      return bDate.getDate() === day && bDate.getMonth() === 6 && bDate.getFullYear() === 2026; // July
    });
  };

  const getEmployeeName = (id: string) => {
    return employees.find(e => e.id === id)?.name || 'Employee';
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const startStr = `${startDate}T${startTime}:00Z`;
    const endStr = `${endDate || startDate}T${endTime}:00Z`;

    const res = await createBooking({
      asset_id: formAssetId,
      start_time: startStr,
      end_time: endStr
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Conflict detected');
    } else {
      setShowBookModal(false);
      // Reset form
      setStartDate('');
      setEndDate('');
      setStartTime('09:00');
      setEndTime('10:00');
    }
  };

  return (
    <div className="view-container">
      <div className="calendar-container">
        
        {/* Sidebar - Shared Resource List */}
        <div className="calendar-sidebar">
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shared Resources</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sharedAssets.map(asset => (
              <div 
                key={asset.id} 
                className={`sidebar-item ${selectedAssetId === asset.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedAssetId(asset.id);
                  setFormAssetId(asset.id);
                }}
                style={{ cursor: 'pointer', padding: '0.625rem 0.75rem', fontSize: '0.8125rem' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600 }}>{asset.name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{asset.asset_tag}</span>
                </div>
              </div>
            ))}
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '2rem', justifyContent: 'center' }}
            onClick={() => setShowBookModal(true)}
          >
            <CalendarIcon size={16} />
            <span>Book Resource</span>
          </button>
        </div>

        {/* Main Calendar Space */}
        <div className="calendar-grid-view">
          <div className="table-header-bar" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <span className="table-title">{activeSharedAsset?.name || 'Calendar'} Schedule</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentMonthYear}</p>
            </div>
            <span className="badge badge-available">Shared / Bookable</span>
          </div>

          {/* Days of Week Row */}
          <div className="calendar-days-header">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Month Cell Grid */}
          <div className="calendar-grid">
            {/* Blank cells for offset */}
            {Array.from({ length: firstDayOffset }).map((_, idx) => (
              <div key={`blank-${idx}`} className="calendar-day-cell" style={{ opacity: 0.15, backgroundColor: 'rgba(255,255,255,0.02)' }} />
            ))}

            {/* Calendar Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayBookings = getBookingsForDay(dayNum);
              
              return (
                <div key={`day-${dayNum}`} className="calendar-day-cell">
                  <span className="day-number">{dayNum}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto', flex: 1 }}>
                    {dayBookings.map(b => (
                      <div 
                        key={b.id} 
                        className="calendar-booking-item"
                        title={`${getEmployeeName(b.booked_by)}: ${new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        onClick={() => {
                          if (confirm(`Cancel this booking for ${getEmployeeName(b.booked_by)}?`)) {
                            cancelBooking(b.id);
                          }
                        }}
                      >
                        {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - {getEmployeeName(b.booked_by).split(' ')[0]}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Book Resource Modal */}
      {showBookModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Book Shared Resource</h3>
              <button className="modal-close" onClick={() => setShowBookModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit}>
              <div className="form-body">
                {errorMsg && (
                  <div style={{ padding: '1rem', backgroundColor: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: '8px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <ShieldAlert size={16} style={{ color: 'var(--danger)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{errorMsg}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Resource</label>
                  <select 
                    className="form-input"
                    value={formAssetId}
                    onChange={(e) => setFormAssetId(e.target.value)}
                    required
                  >
                    {sharedAssets.map(a => <option key={a.id} value={a.id}>{a.name} [{a.asset_tag}]</option>)}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input 
                      type="date"
                      className="form-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input 
                      type="time"
                      className="form-input"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input 
                      type="date"
                      className="form-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="Same day"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input 
                      type="time"
                      className="form-input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Tip: Double-bookings are blocked automatically. Time boundaries must not overlap with ongoing reservations.
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBookModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Reserve Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
