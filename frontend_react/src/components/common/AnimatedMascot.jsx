import React, { useState, useEffect, useRef } from 'react';

/**
 * AnimatedMascot: Minimalist AI Robot with Global Cursor Tracking & Privacy Mode
 * Designed for Archivision Studio dark theme (Navy/Slate #0f172a, Cyan #00f0ff)
 *
 * Props:
 *   - isPasswordFocused: boolean (triggers privacy eye-cover / turn-away mode)
 */
const AnimatedMascot = ({ isPasswordFocused = false }) => {
  const mascotRef = useRef(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // If password is focused, don't track the mouse
    if (isPasswordFocused) {
      setEyeOffset({ x: 0, y: 0 });
      return;
    }

    const handleMouseMove = (e) => {
      if (!mascotRef.current) return;
      const rect = mascotRef.current.getBoundingClientRect();
      const mascotCenterX = rect.left + rect.width / 2;
      const mascotCenterY = rect.top + rect.height / 2;

      const deltaX = e.clientX - mascotCenterX;
      const deltaY = e.clientY - mascotCenterY;

      const angle = Math.atan2(deltaY, deltaX);
      const distance = Math.min(Math.hypot(deltaX, deltaY), 300);
      const normalizedDist = distance / 300;

      // Max pupil movement radius in pixels
      const maxRadius = 6;
      const offsetX = Math.cos(angle) * (normalizedDist * maxRadius);
      const offsetY = Math.sin(angle) * (normalizedDist * maxRadius);

      setEyeOffset({ x: offsetX, y: offsetY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isPasswordFocused]);

  return (
    <div
      ref={mascotRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '96px',
          height: '90px',
          position: 'relative',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isPasswordFocused ? 'translateY(2px) scale(0.98)' : 'translateY(0) scale(1)',
        }}
      >
        <svg
          viewBox="0 0 100 95"
          width="100%"
          height="100%"
          style={{
            filter: 'drop-shadow(0 6px 20px rgba(0, 240, 255, 0.28))',
            overflow: 'visible',
          }}
        >
          {/* Top Antenna */}
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
            fill={isPasswordFocused ? '#ff0055' : '#00f0ff'}
            style={{
              transition: 'fill 0.3s ease, filter 0.3s ease',
              filter: isPasswordFocused
                ? 'drop-shadow(0 0 8px #ff0055)'
                : 'drop-shadow(0 0 8px #00f0ff)',
            }}
          />

          {/* Side Auditory Sensors */}
          <rect x="18" y="34" width="5" height="14" rx="2" fill="#1e293b" stroke="#00f0ff" strokeWidth="1" />
          <rect x="77" y="34" width="5" height="14" rx="2" fill="#1e293b" stroke="#00f0ff" strokeWidth="1" />

          {/* Robot Head Body */}
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

          {/* Dark Glass Visor Screen */}
          <rect
            x="27"
            y="27"
            width="46"
            height="26"
            rx="8"
            fill="#050b14"
            stroke="rgba(0, 240, 255, 0.35)"
            strokeWidth="1"
          />

          {/* Eyes State: Smooth Cursor Tracking vs Privacy Blink */}
          {!isPasswordFocused ? (
            <g
              style={{
                transition: 'transform 0.08s ease-out',
                transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
              }}
            >
              {/* Left Eye */}
              <circle
                cx="39"
                cy="38"
                r="4.5"
                fill="#00f0ff"
                style={{ filter: 'drop-shadow(0 0 5px #00f0ff)' }}
              />
              <circle cx="40.5" cy="36.5" r="1.5" fill="#ffffff" />

              {/* Right Eye */}
              <circle
                cx="61"
                cy="38"
                r="4.5"
                fill="#00f0ff"
                style={{ filter: 'drop-shadow(0 0 5px #00f0ff)' }}
              />
              <circle cx="62.5" cy="36.5" r="1.5" fill="#ffffff" />

              {/* Cheerful mouth */}
              <path
                d="M 45 46 Q 50 49 55 46"
                stroke="#00f0ff"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </g>
          ) : (
            /* Privacy Mode Eyes (Turned away / Shy curved eyes) */
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
              {/* Privacy Blush */}
              <circle cx="34" cy="44" r="2.5" fill="rgba(255, 64, 129, 0.45)" />
              <circle cx="66" cy="44" r="2.5" fill="rgba(255, 64, 129, 0.45)" />
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

          {/* Privacy Arms: Animate up to cover eyes when isPasswordFocused is true */}
          <g
            style={{
              transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: isPasswordFocused ? 'translate(0, 0)' : 'translate(0, 28px)',
              opacity: isPasswordFocused ? 1 : 0,
            }}
          >
            {/* Left Arm & Glove */}
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

            {/* Right Arm & Glove */}
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

export default AnimatedMascot;
