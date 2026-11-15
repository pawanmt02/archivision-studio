import React from 'react';
import { X, Shapes } from 'lucide-react';

const SHAPES = [
  {
    id: 'square',
    label: 'Square',
    icon: <rect x="4" y="4" width="16" height="16" rx="1.5" />,
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    icon: <rect x="2" y="6" width="20" height="12" rx="1.5" />,
  },
  {
    id: 'circle',
    label: 'Circle',
    icon: <circle cx="12" cy="12" r="9" />,
  },
  {
    id: 'triangle',
    label: 'Triangle',
    icon: <polygon points="12,3 21,20 3,20" />,
  },
  {
    id: 'arch',
    label: 'Perfect Arch',
    icon: <path d="M5 21V10a7 7 0 0 1 14 0v11" />,
  },
  {
    id: 'window',
    label: 'Window Frame',
    icon: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="1" />
        <line x1="12" y1="3" x2="12" y2="21" />
        <line x1="4" y1="12" x2="20" y2="12" />
      </>
    ),
  },
  {
    id: 'door',
    label: 'Door Frame',
    icon: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="1" />
        <line x1="2" y1="21" x2="22" y2="21" />
        <circle cx="15" cy="13" r="1" fill="currentColor" />
      </>
    ),
  },
  {
    id: 'staircase',
    label: 'Staircase Step',
    icon: <path d="M3 20h4.5v-4.5H12V11h4.5V6.5H21" />,
  },
  {
    id: 'cross',
    label: 'Cross / Plus',
    icon: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />,
  },
  {
    id: 'hexagon',
    label: 'Hexagon',
    icon: <polygon points="12,2 21,7.2 21,16.8 12,22 3,16.8 3,7.2" />,
  },
];

const ShapeStencilModal = ({ isOpen, onClose, onSelectShape }) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '92%',
          maxWidth: '560px',
          background: 'linear-gradient(135deg, rgba(11, 15, 25, 0.98) 0%, rgba(17, 24, 39, 0.96) 100%)',
          border: '1.5px solid rgba(0, 240, 255, 0.45)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 0 40px rgba(0, 240, 255, 0.25)',
          color: '#ffffff',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(0, 240, 255, 0.12)',
                border: '1px solid #00f0ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00f0ff',
              }}
            >
              <Shapes size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.04em' }}>
                ARCHITECTURAL SHAPE STENCILS
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Select a shape to stamp it directly in the center of your canvas
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            style={{ color: '#94a3b8', padding: '6px', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 10 Shape Buttons Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))',
            gap: '12px',
            marginTop: '18px',
          }}
        >
          {SHAPES.map((shape) => (
            <button
              key={shape.id}
              type="button"
              onClick={() => onSelectShape(shape.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 8px',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(51, 65, 85, 0.8)',
                color: '#e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease-out',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00f0ff';
                e.currentTarget.style.background = 'rgba(0, 240, 255, 0.12)';
                e.currentTarget.style.boxShadow = '0 0 16px rgba(0, 240, 255, 0.35)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.color = '#00f0ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.8)';
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.color = '#e2e8f0';
              }}
              title={`Stamp ${shape.label}`}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginBottom: '8px' }}
              >
                {shape.icon}
              </svg>
              <span style={{ fontSize: '11px', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                {shape.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShapeStencilModal;
