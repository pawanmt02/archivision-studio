import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Minus, Square, Eraser, RotateCcw, Trash2, Shapes } from 'lucide-react';

const CanvasToolbar = ({
  tool,
  setTool,
  strokeWidth,
  setStrokeWidth,
  eraserWidth,
  setEraserWidth,
  strokeColor,
  setStrokeColor,
  onUndo,
  onClear,
  onOpenShapes
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showThickness, setShowThickness] = useState(false);
  const toolbarRef = useRef(null);

  // Click outside listener to cleanly dismiss open flyout popovers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        setShowThickness(false);
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={toolbarRef}
      className="flex flex-col items-center studio-sidebar select-none"
      style={{
        backgroundColor: '#0B0E14',
        borderRight: '1px solid #1E2532',
        overflow: 'visible', // Essential: allows flyouts to float outside without clipping
        position: 'relative',
        zIndex: 40,
        height: '100%',
        width: '64px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        gap: '12px',
        flexShrink: 0,
      }}
    >
      {/* ── Fixed Vertical Tool Rail: Drawing & Stencils ── */}
      <div
        className="flex flex-col items-center gap-2"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}
      >
        {/* Draw Tool */}
        <button
          type="button"
          className={`sidebar-tool-btn ${tool === 'draw' ? 'active' : ''}`}
          onClick={() => {
            setTool('draw');
            setShowThickness(false);
            setShowColorPicker(false);
          }}
          title="Draw (Freehand)"
        >
          <Pencil size={18} />
          <span className="tool-label">Draw</span>
        </button>

        {/* Line Tool */}
        <button
          type="button"
          className={`sidebar-tool-btn ${tool === 'line' ? 'active' : ''}`}
          onClick={() => {
            setTool('line');
            setShowThickness(false);
            setShowColorPicker(false);
          }}
          title="Straight Line Tool"
        >
          <Minus size={18} />
          <span className="tool-label">Line</span>
        </button>

        {/* Rect Tool */}
        <button
          type="button"
          className={`sidebar-tool-btn ${tool === 'rect' ? 'active' : ''}`}
          onClick={() => {
            setTool('rect');
            setShowThickness(false);
            setShowColorPicker(false);
          }}
          title="Rectangle Tool"
        >
          <Square size={18} />
          <span className="tool-label">Rect</span>
        </button>

        {/* Eraser Tool with Floating Flyout Popover */}
        <div className="relative" style={{ position: 'relative' }}>
          <button
            type="button"
            className={`sidebar-tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => {
              if (tool !== 'eraser') {
                setTool('eraser');
                setShowThickness(true);
              } else {
                setShowThickness(!showThickness);
              }
              setShowColorPicker(false);
            }}
            title={tool === 'eraser' ? `Eraser Size: ${eraserWidth}px` : 'Eraser'}
          >
            <Eraser size={18} />
            <span className="tool-label">Erase</span>
          </button>

          {/* Floating Flyout Popover positioned directly beside the toolbar */}
          {showThickness && (
            <div
              className="absolute left-full top-0 ml-3 z-50 bg-[#131720] border border-[#1E2532] rounded-xl p-3 shadow-2xl flex flex-col items-center gap-2"
              style={{
                position: 'absolute',
                left: '100%',
                top: 0,
                marginLeft: '12px',
                zIndex: 50,
                backgroundColor: '#131720',
                border: '1px solid #1E2532',
                borderRadius: '12px',
                padding: '12px 10px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                minWidth: '64px',
              }}
            >
              <input
                type="range"
                min="5"
                max="100"
                value={eraserWidth}
                onChange={(e) => setEraserWidth(parseInt(e.target.value))}
                style={{
                  writingMode: 'vertical-rl',
                  direction: 'rtl',
                  height: '80px',
                  width: '16px',
                  cursor: 'pointer',
                  accentColor: '#5CE1E6',
                }}
              />
              <span style={{ fontSize: '11px', color: '#5CE1E6', fontWeight: 'bold' }}>{eraserWidth}px</span>
              <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Eraser
              </span>
            </div>
          )}
        </div>

        {/* Architectural Shape Stencils Tool */}
        {onOpenShapes && (
          <div className="relative" style={{ position: 'relative' }}>
            <button
              type="button"
              className="sidebar-tool-btn"
              onClick={() => {
                onOpenShapes();
                setShowThickness(false);
                setShowColorPicker(false);
              }}
              title="Architectural Shape Stencils"
            >
              <Shapes size={18} />
              <span className="tool-label">Shapes</span>
            </button>
          </div>
        )}
      </div>

      <div style={{ width: '32px', height: '1px', backgroundColor: '#1E2532', margin: '4px 0', flexShrink: 0 }} />

      {/* ── Fixed Vertical Tool Rail: Color Picker & Brush Size ── */}
      <div
        className="flex flex-col items-center gap-2"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}
      >
        <div className="relative" style={{ position: 'relative' }}>
          <button
            type="button"
            className={`sidebar-tool-btn ${showColorPicker ? 'active' : ''}`}
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowThickness(false);
            }}
            title="Stroke Color & Brush Size"
            style={{ padding: '6px', flexDirection: 'column', gap: 4, width: '48px', height: '48px' }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '4px',
                backgroundColor: strokeColor,
                border: '1.5px solid #ffffff',
                boxShadow: '0 0 4px rgba(0,0,0,0.5)',
              }}
            />
            <span className="tool-label">Color</span>
          </button>

          {/* Floating Flyout Popover for Color Palette & Brush Slider */}
          {showColorPicker && (
            <div
              className="absolute left-full top-0 ml-3 z-50 bg-[#131720] border border-[#1E2532] rounded-xl p-3 shadow-2xl flex flex-col items-center gap-2.5"
              style={{
                position: 'absolute',
                left: '100%',
                top: 0,
                marginLeft: '12px',
                zIndex: 50,
                backgroundColor: '#131720',
                border: '1px solid #1E2532',
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                minWidth: '76px',
              }}
            >
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                style={{
                  width: '36px',
                  height: '36px',
                  border: '1px solid #1E2532',
                  borderRadius: '6px',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
              <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>Palette</span>

              {/* Quick Color Swatches */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {['#000000', '#ffffff', '#64748b', '#ef4444', '#3b82f6', '#10b981'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setStrokeColor(c)}
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      backgroundColor: c,
                      border: strokeColor === c ? '1.5px solid #5CE1E6' : '1px solid #334155',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    title={c}
                  />
                ))}
              </div>

              {/* Vertical Brush Width Range Slider */}
              <div style={{ width: '100%', height: '1px', backgroundColor: '#1E2532', margin: '2px 0' }} />
              <input
                type="range"
                min="1"
                max="25"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                style={{
                  writingMode: 'vertical-rl',
                  direction: 'rtl',
                  height: '80px',
                  width: '16px',
                  cursor: 'pointer',
                  accentColor: '#5CE1E6',
                }}
              />
              <span style={{ fontSize: '11px', color: '#5CE1E6', fontWeight: 'bold' }}>{strokeWidth}px</span>
              <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Brush
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ width: '32px', height: '1px', backgroundColor: '#1E2532', margin: '4px 0', flexShrink: 0 }} />

      {/* ── Fixed Vertical Tool Rail: Undo & Clear ── */}
      <div
        className="flex flex-col items-center gap-2"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}
      >
        <button type="button" className="sidebar-tool-btn" onClick={onUndo} title="Undo (Ctrl+Z)">
          <RotateCcw size={18} />
          <span className="tool-label">Undo</span>
        </button>
        <button type="button" className="sidebar-tool-btn danger" onClick={onClear} title="Clear Canvas">
          <Trash2 size={18} />
          <span className="tool-label">Clear</span>
        </button>
      </div>
    </div>
  );
};

export default CanvasToolbar;
