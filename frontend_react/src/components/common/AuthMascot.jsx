import React, { useRef, useState, useEffect } from 'react';

/**
 * Animated Robot Mascot for Archivision Studio Login & Register pages
 * Reacts to focusedField: 'username' | 'email' | 'password' | 'confirmPassword' | null
 * Global cursor tracking: pupils follow the mouse in real-time
 */
const AuthMascot = ({ focusedField }) => {
  const isLookingDown = focusedField === 'username' || focusedField === 'email';
  const isCoveringEyes = focusedField === 'password' || focusedField === 'confirmPassword';

  // Cursor tracking state
  const mascotRef = useRef(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  // Global mousemove listener for real-time pupil tracking
  useEffect(() => {
    // Only pause cursor tracking when eyes are covered (password mode)
    if (isCoveringEyes) {
      setEyeOffset({ x: 0, y: 0 });
      return;
    }

    const handleMouseMove = (e) => {
      if (!mascotRef.current) return;
      const rect = mascotRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Calculate angle and normalize distance
      const angle = Math.atan2(deltaY, deltaX);
      const distance = Math.min(Math.hypot(deltaX, deltaY), 300);
      const normalizedDist = distance / 300;

      // Cap pupil movement at 6px radius
      const maxRadius = 6;
      setEyeOffset({
        x: Math.cos(angle) * normalizedDist * maxRadius,
        y: Math.sin(angle) * normalizedDist * maxRadius,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isCoveringEyes]);

  // Dynamic speech bubble messages based on active interaction
  const getSpeechBubble = () => {
    switch (focusedField) {
      case 'username':
        return 'What is your architectural username? 📐';
      case 'email':
        return 'Enter your work or design email ✉️';
      case 'password':
      case 'confirmPassword':
        return 'Turning around! Your password is 100% private 🙈';
      default:
        return 'Welcome to Archivision Studio! 🏛️';
    }
  };

  return (
    <div
      ref={mascotRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '16px',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Speech Bubble */}
      <div
        style={{
          background: 'rgba(10, 20, 38, 0.92)',
          border: '1px solid rgba(0, 240, 255, 0.4)',
          boxShadow: '0 4px 16px rgba(0, 240, 255, 0.15)',
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: '500',
          letterSpacing: '0.3px',
          padding: '6px 14px',
          borderRadius: '16px',
          marginBottom: '12px',
          textAlign: 'center',
          maxWidth: '240px',
          minHeight: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: focusedField ? 'translateY(0) scale(1.02)' : 'translateY(0) scale(1)',
          textShadow: '0 0 8px rgba(0, 240, 255, 0.4)',
        }}
      >
        {getSpeechBubble()}
        {/* Triangle pointer */}
        <div
          style={{
            position: 'absolute',
            bottom: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid rgba(0, 240, 255, 0.4)',
          }}
        />
      </div>

      {/* Robot Mascot SVG */}
      <div
        style={{
          width: '90px',
          height: '84px',
          position: 'relative',
          transition: 'transform 0.35s ease',
        }}
      >
        <svg
          viewBox="0 0 100 95"
          width="100%"
          height="100%"
          style={{
            filter: 'drop-shadow(0 6px 18px rgba(0, 240, 255, 0.25))',
            overflow: 'visible',
          }}
        >
          {/* Antenna */}
          <line
            x1="50"
            y1="22"
            x2="50"
            y2="10"
            stroke="#00f0ff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="8"
            r="4.5"
            fill={isCoveringEyes ? '#ff0055' : '#00f0ff'}
            style={{
              filter: isCoveringEyes
                ? 'drop-shadow(0 0 6px #ff0055)'
                : 'drop-shadow(0 0 6px #00f0ff)',
              transition: 'fill 0.3s ease',
            }}
          />

          {/* Ears / Side Sensors */}
          <rect x="18" y="34" width="5" height="14" rx="2" fill="#1e293b" stroke="#00f0ff" strokeWidth="1" />
          <rect x="77" y="34" width="5" height="14" rx="2" fill="#1e293b" stroke="#00f0ff" strokeWidth="1" />

          {/* Head Body */}
          <rect
            x="22"
            y="20"
            width="56"
            height="44"
            rx="12"
            fill="#0f172a"
            stroke="#00f0ff"
            strokeWidth="2"
          />

          {/* Visor Screen */}
          <rect
            x="27"
            y="27"
            width="46"
            height="26"
            rx="8"
            fill="#050b14"
            stroke="rgba(0, 240, 255, 0.3)"
            strokeWidth="1"
          />

          {/* Eyes State: Cursor tracking always active, or Privacy Mode */}
          {!isCoveringEyes ? (
            <g
              style={{
                transition: 'transform 0.08s ease-out',
                transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
              }}
            >
              {/* Left Eye */}
              <circle cx="39" cy="38" r="4.5" fill="#00f0ff" style={{ filter: 'drop-shadow(0 0 4px #00f0ff)' }} />
              <circle cx="40.5" cy="36.5" r="1.5" fill="#ffffff" />

              {/* Right Eye */}
              <circle cx="61" cy="38" r="4.5" fill="#00f0ff" style={{ filter: 'drop-shadow(0 0 4px #00f0ff)' }} />
              <circle cx="62.5" cy="36.5" r="1.5" fill="#ffffff" />

              {/* Subtle smile */}
              <path
                d="M 45 46 Q 50 49 55 46"
                stroke="#00f0ff"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </g>
          ) : (
            /* Covered / Turned Eyes (Sleeping / Privacy Mode) */
            <g>
              <path
                d="M 35 39 Q 39 34 43 39"
                stroke="#ff4081"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 57 39 Q 61 34 65 39"
                stroke="#ff4081"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              {/* Privacy Blushing */}
              <circle cx="34" cy="44" r="2.5" fill="rgba(255, 64, 129, 0.4)" />
              <circle cx="66" cy="44" r="2.5" fill="rgba(255, 64, 129, 0.4)" />
            </g>
          )}

          {/* Neck & Shoulders */}
          <rect x="42" y="64" width="16" height="5" fill="#1e293b" />
          <path
            d="M 28 70 L 72 70 L 80 84 L 20 84 Z"
            fill="#0b1324"
            stroke="#00f0ff"
            strokeWidth="1.5"
          />

          {/* Hands covering eyes when password is focused */}
          <g
            style={{
              transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: isCoveringEyes
                ? 'translate(0, 0)'
                : 'translate(0, 26px)',
              opacity: isCoveringEyes ? 1 : 0,
            }}
          >
            {/* Left Hand Arm & Glove */}
            <path
              d="M 22 75 Q 30 52 38 41"
              stroke="#00f0ff"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <circle
              cx="39"
              cy="39"
              r="7"
              fill="#0f172a"
              stroke="#00f0ff"
              strokeWidth="2"
            />

            {/* Right Hand Arm & Glove */}
            <path
              d="M 78 75 Q 70 52 62 41"
              stroke="#00f0ff"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <circle
              cx="61"
              cy="39"
              r="7"
              fill="#0f172a"
              stroke="#00f0ff"
              strokeWidth="2"
            />
          </g>
        </svg>
      </div>
    </div>
  );
};

export default AuthMascot;
