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
  initialBox = null,
  lineData = null,
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
      case 'line': return { w: 200, h: 60 };
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

  const initial = initialBox ? { w: initialBox.w, h: initialBox.h } : getDefaultSize();
  const overlayRef = useRef(null);
  const [box, setBox] = useState({
    x: initialBox ? initialBox.x : (canvasWidth - initial.w) / 2,
    y: initialBox ? initialBox.y : (canvasHeight - initial.h) / 2,
    w: initial.w,
    h: initial.h,
  });

  // Center bounding box accurately relative to the actual canvas container DOM element
  useEffect(() => {
    if (initialBox) {
      setBox({
        x: initialBox.x,
        y: initialBox.y,
        w: initialBox.w,
        h: initialBox.h,
      });
    } else if (overlayRef.current?.parentElement) {
      const parentRect = overlayRef.current.parentElement.getBoundingClientRect();
      if (parentRect.width && parentRect.height) {
        setBox({
          x: Math.max(0, (parentRect.width - initial.w) / 2),
          y: Math.max(0, (parentRect.height - initial.h) / 2),
          w: initial.w,
          h: initial.h,
        });
      }
    }
  }, [initialBox]);

  const interactionRef = useRef(null); // { mode: 'drag'|'resize', startX, startY, startBox }

  // Dragging and resizing interaction handlers locked to initial mousedown coordinates
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

      const parentRect = overlayRef.current?.parentElement?.getBoundingClientRect();
      const boundW = parentRect?.width || canvasWidth;
      const boundH = parentRect?.height || canvasHeight;

      if (mode === 'drag') {
        const nextX = Math.max(0, Math.min(boundW - startBox.w, startBox.x + dx));
        const nextY = Math.max(0, Math.min(boundH - startBox.h, startBox.y + dy));
        setBox((prev) => ({ ...prev, x: nextX, y: nextY }));
      } else if (mode === 'resize') {
        const minDim = shapeType === 'line' ? 4 : 20;
        const nextW = Math.max(minDim, Math.min(boundW - startBox.x, startBox.w + dx));
        const nextH = Math.max(minDim, Math.min(boundH - startBox.y, startBox.h + dy));
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
  }, [canvasWidth, canvasHeight, shapeType]);

  // Render vector shape preview scaled to bounding box (w x h)
  const renderShapeVector = () => {
    const { w, h } = box;
    const cx = w / 2;
    const cy = h / 2;

    switch (shapeType) {
      case 'line': {
        const sx = lineData?.startRatio ? box.w * lineData.startRatio.x : 0;
        const sy = lineData?.startRatio ? box.h * lineData.startRatio.y : box.h / 2;
        const ex = lineData?.endRatio ? box.w * lineData.endRatio.x : box.w;
        const ey = lineData?.endRatio ? box.h * lineData.endRatio.y : box.h / 2;
        return (
          <line
            x1={sx}
            y1={sy}
            x2={ex}
            y2={ey}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        );
      }
      case 'square':
      case 'rectangle':
        return <rect x={strokeWidth} y={strokeWidth} width={Math.max(1, w - strokeWidth * 2)} height={Math.max(1, h - strokeWidth * 2)} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />;
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
      ref={overlayRef}
      onDoubleClick={() => onConfirm({ ...box, lineData })}
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
      title="Drag to position. Drag bottom-right corner to resize. Double-click or click Save to stamp."
    >
      {/* Floating Action Menu Anchored Directly Above Shape Top-Left */}
      <div
        className="absolute flex items-center gap-2 select-none"
        style={{
          position: 'absolute',
          top: box.y < 38 ? `${box.h + 8}px` : '-34px',
          left: '0px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 60,
          whiteSpace: 'nowrap',
          pointerEvents: 'auto',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Blue Action Button: "Save" */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onConfirm({ ...box, lineData });
          }}
          title="Save Shape to Canvas"
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md hover:shadow-blue-500/30 transition-all cursor-pointer border border-blue-400/40"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '6px',
            backgroundColor: '#2563eb',
            border: '1px solid rgba(96, 165, 250, 0.5)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.3px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
          }}
        >
          <Check size={12} strokeWidth={2.5} />
          <span>Save</span>
        </button>

        {/* Black/Dark Action Button: "Delete" */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          title="Delete Shape"
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold text-white bg-gray-900 hover:bg-black shadow-md hover:shadow-black/50 transition-all cursor-pointer border border-gray-700"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '6px',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.3px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
          }}
        >
          <X size={12} strokeWidth={2.5} />
          <span>Delete</span>
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
