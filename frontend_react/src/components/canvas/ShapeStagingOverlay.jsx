import React, { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';

/**
 * ShapeStagingOverlay: A draggable, resizable HTML/SVG staging box positioned over the canvas.
 * Allows visual edge-dragging and repositioning of any architectural shape stencil
 * before permanently stamping it onto the HTML5 Canvas context.
 *
 * Props:
 *   - shapeType: 'square' | 'rectangle' | 'circle' | 'triangle' | 'arch' | 'window' | 'door' | 'staircase' | 'cross' | 'hexagon'
 *   - strokeColor: current drawing stroke color
 *   - strokeWidth: current stroke width
 *   - canvasWidth: default 512
 *   - canvasHeight: default 512
 *   - onConfirm: ({ x, y, width, height, shapeType }) => void
 *   - onCancel: () => void
 */
const ShapeStagingOverlay = ({
  shapeType,
  strokeColor = '#000000',
  strokeWidth = 2,
  canvasWidth = 512,
  canvasHeight = 512,
  onConfirm,
  onCancel,
}) => {
  // Initial dimensions based on shape defaults
  const getDefaultSize = () => {
    switch (shapeType) {
      case 'square': return { w: 150, h: 150 };
      case 'rectangle': return { w: 220, h: 130 };
      case 'circle': return { w: 160, h: 160 };
      case 'triangle': return { w: 180, h: 150 };
      case 'arch': return { w: 140, h: 190 };
      case 'window': return { w: 150, h: 190 };
      case 'door': return { w: 120, h: 200 };
      case 'staircase': return { w: 180, h: 160 };
      case 'cross': return { w: 170, h: 170 };
      case 'hexagon': return { w: 170, h: 170 };
      default: return { w: 160, h: 160 };
    }
  };

  const initial = getDefaultSize();
  const [box, setBox] = useState({
    x: (canvasWidth - initial.w) / 2,
    y: (canvasHeight - initial.h) / 2,
    w: initial.w,
    h: initial.h,
  });

  const interactionRef = useRef(null); // { mode: 'drag'|'resize', startX, startY, startBox }

  // Dragging and resizing interaction handlers
  const handleMouseDown = (e, mode) => {
    e.stopPropagation();
    e.preventDefault();
    interactionRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startBox: { ...box },
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!interactionRef.current) return;
      const { mode, startX, startY, startBox } = interactionRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (mode === 'drag') {
        const nextX = Math.max(0, Math.min(canvasWidth - startBox.w, startBox.x + dx));
        const nextY = Math.max(0, Math.min(canvasHeight - startBox.h, startBox.y + dy));
        setBox((prev) => ({ ...prev, x: nextX, y: nextY }));
      } else if (mode === 'resize') {
        const nextW = Math.max(30, Math.min(canvasWidth - startBox.x, startBox.w + dx));
        const nextH = Math.max(30, Math.min(canvasHeight - startBox.y, startBox.h + dy));
        setBox((prev) => ({ ...prev, w: nextW, h: nextH }));
      }
    };

    const handleMouseUp = () => {
      interactionRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasWidth, canvasHeight]);

  // Render vector shape preview scaled to bounding box (w x h)
  const renderShapeVector = () => {
    const { w, h } = box;
    const cx = w / 2;
    const cy = h / 2;

    switch (shapeType) {
      case 'square':
      case 'rectangle':
        return <rect x={strokeWidth} y={strokeWidth} width={w - strokeWidth * 2} height={h - strokeWidth * 2} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />;
      case 'circle':
        return <ellipse cx={cx} cy={cy} rx={(w - strokeWidth * 2) / 2} ry={(h - strokeWidth * 2) / 2} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />;
      case 'triangle':
        return (
          <polygon
            points={`${cx},${strokeWidth} ${w - strokeWidth},${h - strokeWidth} ${strokeWidth},${h - strokeWidth}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      case 'arch': {
        const r = (w - strokeWidth * 2) / 2;
        const pillarTop = Math.max(strokeWidth + r, h - r);
        const d = `M ${strokeWidth} ${h - strokeWidth} L ${strokeWidth} ${pillarTop} A ${r} ${r} 0 0 1 ${w - strokeWidth} ${pillarTop} L ${w - strokeWidth} ${h - strokeWidth} Z`;
        return <path d={d} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />;
      }
      case 'window':
        return (
          <g>
            <rect x={strokeWidth} y={strokeWidth} width={w - strokeWidth * 2} height={h - strokeWidth * 2} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
            <line x1={cx} y1={strokeWidth} x2={cx} y2={h - strokeWidth} stroke={strokeColor} strokeWidth={strokeWidth} />
            <line x1={strokeWidth} y1={cy} x2={w - strokeWidth} y2={cy} stroke={strokeColor} strokeWidth={strokeWidth} />
          </g>
        );
      case 'door': {
        return (
          <g>
            <rect x={strokeWidth + 8} y={strokeWidth} width={w - strokeWidth * 2 - 16} height={h - strokeWidth * 2} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
            <line x1={strokeWidth} y1={h - strokeWidth} x2={w - strokeWidth} y2={h - strokeWidth} stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx={w - strokeWidth - 22} cy={cy + 8} r={3} fill={strokeColor} />
          </g>
        );
      }
      case 'staircase': {
        const steps = 4;
        const dx = (w - strokeWidth * 2) / steps;
        const dy = (h - strokeWidth * 2) / steps;
        let d = `M ${strokeWidth} ${h - strokeWidth}`;
        for (let i = 0; i < steps; i++) {
          d += ` L ${strokeWidth + i * dx} ${h - strokeWidth - (i + 1) * dy}`;
          d += ` L ${strokeWidth + (i + 1) * dx} ${h - strokeWidth - (i + 1) * dy}`;
        }
        d += ` L ${w - strokeWidth} ${h - strokeWidth} Z`;
        return <path d={d} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />;
      }
      case 'cross': {
        const armW = w * 0.3;
        const armH = h * 0.3;
        const x1 = (w - armW) / 2;
        const x2 = (w + armW) / 2;
        const y1 = (h - armH) / 2;
        const y2 = (h + armH) / 2;
        const points = `${x1},${strokeWidth} ${x2},${strokeWidth} ${x2},${y1} ${w - strokeWidth},${y1} ${w - strokeWidth},${y2} ${x2},${y2} ${x2},${h - strokeWidth} ${x1},${h - strokeWidth} ${x1},${y2} ${strokeWidth},${y2} ${strokeWidth},${y1} ${x1},${y1}`;
        return <polygon points={points} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />;
      }
      case 'hexagon': {
        const rx = (w - strokeWidth * 2) / 2;
        const ry = (h - strokeWidth * 2) / 2;
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 - Math.PI / 6;
          pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`);
        }
        return <polygon points={pts.join(' ')} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />;
      }
      default:
        return <rect x={0} y={0} width={w} height={h} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />;
    }
  };

  return (
    <div
      onDoubleClick={() => onConfirm(box)}
      style={{
        position: 'absolute',
        left: `${box.x}px`,
        top: `${box.y}px`,
        width: `${box.w}px`,
        height: `${box.h}px`,
        zIndex: 50,
        boxSizing: 'border-box',
        border: '1.5px dashed rgba(0, 240, 255, 0.85)',
        backgroundColor: 'rgba(0, 240, 255, 0.05)',
        boxShadow: '0 0 16px rgba(0, 240, 255, 0.25)',
        cursor: 'move',
        userSelect: 'none',
      }}
      onMouseDown={(e) => handleMouseDown(e, 'drag')}
      title="Drag to position. Drag bottom-right corner to resize. Double-click or click Check to stamp."
    >
      {/* Top Floating Controls */}
      <div
        style={{
          position: 'absolute',
          top: '-32px',
          right: '0px',
          display: 'flex',
          gap: '4px',
          zIndex: 60,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onConfirm(box)}
          title="Confirm / Stamp Shape"
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #00f0ff, #00a8ff)',
            border: 'none',
            color: '#050b14',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 8px rgba(0, 240, 255, 0.6)',
          }}
        >
          <Check size={14} strokeWidth={3} />
        </button>
        <button
          type="button"
          onClick={onCancel}
          title="Cancel Shape Placement"
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* SVG Shape Preview */}
      <svg
        width="100%"
        height="100%"
        style={{ pointerEvents: 'none', display: 'block', overflow: 'visible' }}
      >
        {renderShapeVector()}
      </svg>

      {/* Edge Resize Handle (Bottom-Right) */}
      <div
        onMouseDown={(e) => handleMouseDown(e, 'resize')}
        title="Drag to resize shape"
        style={{
          position: 'absolute',
          bottom: '-6px',
          right: '-6px',
          width: '14px',
          height: '14px',
          borderRadius: '3px',
          backgroundColor: '#00f0ff',
          border: '2px solid #050b14',
          boxShadow: '0 0 6px rgba(0, 240, 255, 0.8)',
          cursor: 'nwse-resize',
          zIndex: 60,
        }}
      />
    </div>
  );
};

export default ShapeStagingOverlay;
