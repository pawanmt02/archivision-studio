import React from 'react';

const roomOptions = [
  { id: 'Living Room',  label: 'Living Room',  icon: '🛋️', color: '#0ea5e9', desc: 'Spacious main living and lounge area' },
  { id: 'Kitchen',      label: 'Kitchen',      icon: '🍳', color: '#f97316', desc: 'Modern culinary and cooking space' },
  { id: 'Bedroom',      label: 'Bedroom',      icon: '🛏️', color: '#a855f7', desc: 'Comfortable private sleeping retreat' },
  { id: 'Bathroom',     label: 'Bathroom',     icon: '🛁', color: '#06b6d4', desc: 'Luxury bath and vanity interior' },
  { id: 'Dining Room',  label: 'Dining Room',  icon: '🍷', color: '#eab308', desc: 'Elegant architectural dining space' },
  { id: 'Home Office',  label: 'Home Office',  icon: '💼', color: '#3b82f6', desc: 'Dedicated focus and study workstation' },
  { id: 'Balcony',      label: 'Balcony',      icon: '🌆', color: '#10b981', desc: 'Overhanging scenic balcony terrace' },
  { id: 'Patio',        label: 'Patio',        icon: '🌿', color: '#22c55e', desc: 'Enclosed indoor/outdoor garden patio' },
  { id: 'Lounge',       label: 'Lounge',       icon: '☕', color: '#ec4899', desc: 'Relaxing ambient lounge nook' },
  { id: 'Home Theater', label: 'Home Theater', icon: '🎬', color: '#6366f1', desc: 'Acoustic cinema room with luxury seating' },
];

const StyleSelector = ({ roomType, onChange }) => {
  return (
    <div className="panel-section">
      <div className="panel-title">ROOM TYPE</div>
      <div className="style-grid">
        {roomOptions.map((room) => (
          <div
            key={room.id}
            className={`style-card ${roomType === room.id ? 'active' : ''}`}
            onClick={() => onChange(room.id)}
            title={room.desc}
            style={{ '--style-color': room.color }}
          >
            <span className="style-icon">{room.icon}</span>
            <span className="style-label">{room.label}</span>
            {roomType === room.id && (
              <span className="style-check">✓</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StyleSelector;
