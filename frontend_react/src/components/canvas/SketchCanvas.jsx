import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';

const SketchCanvas = forwardRef(({ width = 512, height = 512 }, ref) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('draw');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [history, setHistory] = useState([]);
  
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [previewCanvas, setPreviewCanvas] = useState(null);

  // Shape placement mode state
  const [activeShape, setActiveShape] = useState(null);
  const [canvasSnapshot, setCanvasSnapshot] = useState(null);
  const [shapeScale, setShapeScale] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      saveHistoryState(canvas);
      
      const pCanvas = document.createElement('canvas');
      pCanvas.width = width;
      pCanvas.height = height;
      setPreviewCanvas(pCanvas);
    }
  }, [width, height]);

  // ESC key cancels shape placement mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeShape) {
        const canvas = canvasRef.current;
        if (canvas && canvasSnapshot) {
          const ctx = canvas.getContext('2d');
          ctx.putImageData(canvasSnapshot, 0, 0);
        }
        setActiveShape(null);
        setCanvasSnapshot(null);
        setShapeScale(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeShape, canvasSnapshot]);

  // Change cursor style during placement mode
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.cursor = activeShape ? 'crosshair' : 'default';
  }, [activeShape]);

  const saveHistoryState = (canvas) => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    setHistory((prev) => [...prev, imageData]);
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();

    // Shape placement mode: stamp shape permanently on click
    if (activeShape) {
      const { x, y } = getCoordinates(e);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (canvasSnapshot) {
        ctx.putImageData(canvasSnapshot, 0, 0);
      }
      drawShapeAt(ctx, activeShape, x, y, shapeScale);
      saveHistoryState(canvas);
      setActiveShape(null);
      setCanvasSnapshot(null);
      setShapeScale(1);
      return;
    }

    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    setStartPos({ x, y });

    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : strokeColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (tool === 'draw' || tool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const draw = (e) => {
    e.preventDefault();

    // Shape placement mode: preview shape at cursor position
    if (activeShape && canvasSnapshot) {
      const { x, y } = getCoordinates(e);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(canvasSnapshot, 0, 0);
      drawShapeAt(ctx, activeShape, x, y, shapeScale);
      return;
    }

    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (tool === 'draw' || tool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'line' || tool === 'rect') {
      const pCtx = previewCanvas.getContext('2d');
      pCtx.clearRect(0, 0, width, height);
      pCtx.drawImage(canvas, 0, 0);
      
      pCtx.beginPath();
      pCtx.lineWidth = strokeWidth;
      pCtx.strokeStyle = strokeColor;
      pCtx.lineCap = 'round';
      
      if (tool === 'line') {
        pCtx.moveTo(startPos.x, startPos.y);
        pCtx.lineTo(x, y);
      } else if (tool === 'rect') {
        pCtx.rect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      }
      pCtx.stroke();
      
      const realCtx = canvas.getContext('2d');
      realCtx.clearRect(0, 0, width, height);
      realCtx.drawImage(previewCanvas, 0, 0);
    }
  };

  const stopDrawing = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);
    saveHistoryState(canvasRef.current);
  };

  // Mouse wheel resizing during shape placement mode
  const handleWheel = (e) => {
    if (!activeShape) return;
    e.preventDefault();
    setShapeScale((prev) => {
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      return Math.max(0.2, Math.min(3, +(prev + delta).toFixed(1)));
    });
  };

  // Reusable helper: draw a shape centered at (cx, cy) with scale multiplier
  const drawShapeAt = (ctx, shapeType, cx, cy, scale = 1) => {
    ctx.save();
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    switch (shapeType) {
      case 'square': {
        const s = 150 * scale;
        ctx.rect(cx - s / 2, cy - s / 2, s, s);
        break;
      }
      case 'rectangle': {
        const w = 220 * scale;
        const h = 130 * scale;
        ctx.rect(cx - w / 2, cy - h / 2, w, h);
        break;
      }
      case 'circle': {
        const r = 80 * scale;
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        break;
      }
      case 'triangle': {
        const b = 180 * scale;
        const h = 150 * scale;
        ctx.moveTo(cx, cy - h / 2);
        ctx.lineTo(cx + b / 2, cy + h / 2);
        ctx.lineTo(cx - b / 2, cy + h / 2);
        ctx.closePath();
        break;
      }
      case 'arch': {
        const w = 140 * scale;
        const h = 190 * scale;
        const r = w / 2;
        const pillarTop = cy + h / 2 - (h - r);
        ctx.moveTo(cx - r, cy + h / 2);
        ctx.lineTo(cx - r, pillarTop);
        ctx.arc(cx, pillarTop, r, Math.PI, 0, false);
        ctx.lineTo(cx + r, cy + h / 2);
        ctx.closePath();
        break;
      }
      case 'window': {
        const w = 150 * scale;
        const h = 190 * scale;
        ctx.rect(cx - w / 2, cy - h / 2, w, h);
        ctx.moveTo(cx, cy - h / 2);
        ctx.lineTo(cx, cy + h / 2);
        ctx.moveTo(cx - w / 2, cy);
        ctx.lineTo(cx + w / 2, cy);
        break;
      }
      case 'door': {
        const w = 120 * scale;
        const h = 200 * scale;
        ctx.rect(cx - w / 2, cy - h / 2, w, h);
        ctx.moveTo(cx - w / 2 - 12 * scale, cy + h / 2);
        ctx.lineTo(cx + w / 2 + 12 * scale, cy + h / 2);
        ctx.moveTo(cx + w / 2 - 14 * scale, cy + 12 * scale);
        ctx.arc(cx + w / 2 - 14 * scale, cy + 12 * scale, 3 * scale, 0, Math.PI * 2);
        break;
      }
      case 'staircase': {
        const steps = 4;
        const w = 180 * scale;
        const h = 160 * scale;
        const x0 = cx - w / 2;
        const y0 = cy + h / 2;
        const dx = w / steps;
        const dy = h / steps;
        ctx.moveTo(x0, y0);
        for (let i = 0; i < steps; i++) {
          ctx.lineTo(x0 + i * dx, y0 - (i + 1) * dy);
          ctx.lineTo(x0 + (i + 1) * dx, y0 - (i + 1) * dy);
        }
        ctx.lineTo(x0 + w, y0);
        ctx.closePath();
        break;
      }
      case 'cross': {
        const arm = 25 * scale;
        const len = 85 * scale;
        ctx.moveTo(cx - arm, cy - len);
        ctx.lineTo(cx + arm, cy - len);
        ctx.lineTo(cx + arm, cy - arm);
        ctx.lineTo(cx + len, cy - arm);
        ctx.lineTo(cx + len, cy + arm);
        ctx.lineTo(cx + arm, cy + arm);
        ctx.lineTo(cx + arm, cy + len);
        ctx.lineTo(cx - arm, cy + len);
        ctx.lineTo(cx - arm, cy + arm);
        ctx.lineTo(cx - len, cy + arm);
        ctx.lineTo(cx - len, cy - arm);
        ctx.lineTo(cx - arm, cy - arm);
        ctx.closePath();
        break;
      }
      case 'hexagon': {
        const r = 85 * scale;
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 - Math.PI / 6;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
      }
      default:
        break;
    }

    ctx.stroke();
    ctx.restore();
  };

  // Enter placement mode: capture snapshot and wait for mouse click
  const insertShape = (shapeType) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const snapshot = ctx.getImageData(0, 0, width, height);
    setCanvasSnapshot(snapshot);
    setActiveShape(shapeType);
    setShapeScale(1);
  };

  // Stamp a shape directly using absolute bounding box dimensions (x, y, w, h)
  const stampShapeBox = (shapeType, { x, y, w, h }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const cx = x + w / 2;
    const cy = y + h / 2;

    switch (shapeType) {
      case 'square':
      case 'rectangle': {
        ctx.rect(x, y, w, h);
        break;
      }
      case 'circle': {
        ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
        break;
      }
      case 'triangle': {
        ctx.moveTo(cx, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        break;
      }
      case 'arch': {
        const r = w / 2;
        const pillarTop = Math.max(y + r, y + h - r);
        ctx.moveTo(x, y + h);
        ctx.lineTo(x, pillarTop);
        ctx.arc(cx, pillarTop, r, Math.PI, 0, false);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        break;
      }
      case 'window': {
        ctx.rect(x, y, w, h);
        ctx.moveTo(cx, y);
        ctx.lineTo(cx, y + h);
        ctx.moveTo(x, cy);
        ctx.lineTo(x + w, cy);
        break;
      }
      case 'door': {
        ctx.rect(x + 8, y, w - 16, h);
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.moveTo(x + w - 22, cy + 8);
        ctx.arc(x + w - 22, cy + 8, 3, 0, Math.PI * 2);
        break;
      }
      case 'staircase': {
        const steps = 4;
        const dx = w / steps;
        const dy = h / steps;
        ctx.moveTo(x, y + h);
        for (let i = 0; i < steps; i++) {
          ctx.lineTo(x + i * dx, y + h - (i + 1) * dy);
          ctx.lineTo(x + (i + 1) * dx, y + h - (i + 1) * dy);
        }
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        break;
      }
      case 'cross': {
        const armW = w * 0.3;
        const armH = h * 0.3;
        const x1 = x + (w - armW) / 2;
        const x2 = x + (w + armW) / 2;
        const y1 = y + (h - armH) / 2;
        const y2 = y + (h + armH) / 2;
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.lineTo(x2, y1);
        ctx.lineTo(x + w, y1);
        ctx.lineTo(x + w, y2);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, y + h);
        ctx.lineTo(x1, y + h);
        ctx.lineTo(x1, y2);
        ctx.lineTo(x, y2);
        ctx.lineTo(x, y1);
        ctx.lineTo(x1, y1);
        ctx.closePath();
        break;
      }
      case 'hexagon': {
        const rx = w / 2;
        const ry = h / 2;
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 - Math.PI / 6;
          const px = cx + rx * Math.cos(angle);
          const py = cy + ry * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      }
      default:
        ctx.rect(x, y, w, h);
        break;
    }

    ctx.stroke();
    ctx.restore();
    saveHistoryState(canvas);
  };

  useImperativeHandle(ref, () => ({
    setTool,
    setStrokeWidth,
    setStrokeColor,
    tool,
    strokeWidth,
    strokeColor,
    insertShape,
    stampShapeBox,
    undo: () => {
      if (history.length > 1) {
        const newHistory = [...history];
        newHistory.pop(); // remove current state
        const prevState = newHistory[newHistory.length - 1];
        const ctx = canvasRef.current.getContext('2d');
        ctx.putImageData(prevState, 0, 0);
        setHistory(newHistory);
      }
    },
    clear: () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      saveHistoryState(canvasRef.current);
    },
    exportCanvas: () => {
      return canvasRef.current.toDataURL('image/png');
    },
    validateSketch: () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const MIN_DRAWN_PIXELS = 2500;

      let drawnPixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) {
          drawnPixels++;
        }
      }

      return {
        valid: drawnPixels >= MIN_DRAWN_PIXELS,
        drawnPixels,
      };
    }
  }));

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="canvas-layer interactive"
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseOut={stopDrawing}
      onWheel={handleWheel}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      style={{ touchAction: 'none' }}
    />
  );
});

export default SketchCanvas;
