import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';

const SketchCanvas = forwardRef(({
  width = 512,
  height = 512,
  initialTool = 'draw',
  initialStrokeWidth = 2,
  initialStrokeColor = '#000000',
  onStageShape
}, ref) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState(initialTool);
  const [strokeWidth, setStrokeWidth] = useState(initialStrokeWidth);
  const [eraserWidth, setEraserWidth] = useState(20);
  const [strokeColor, setStrokeColor] = useState(initialStrokeColor);
  const [history, setHistory] = useState([]);
  
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startDomPos, setStartDomPos] = useState({ x: 0, y: 0 });
  const lastDomPosRef = useRef({ x: 0, y: 0 });
  const [previewCanvas, setPreviewCanvas] = useState(null);
  const snapshotRef = useRef(null);

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
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    const clientX = e.clientX !== undefined ? e.clientX : (touch ? touch.clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (touch ? touch.clientY : 0);
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const getDomCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    const clientX = e.clientX !== undefined ? e.clientX : (touch ? touch.clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (touch ? touch.clientY : 0);
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
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
    const domPos = getDomCoordinates(e);
    setIsDrawing(true);
    setStartPos({ x, y });
    setStartDomPos(domPos);
    lastDomPosRef.current = domPos;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Capture canvas snapshot for shapes preview
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = tool === 'eraser' ? eraserWidth : strokeWidth;
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
    const domPos = getDomCoordinates(e);
    lastDomPosRef.current = domPos;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (tool === 'draw' || tool === 'eraser') {
      ctx.lineWidth = tool === 'eraser' ? eraserWidth : strokeWidth;
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : strokeColor;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'line' || tool === 'rect' || tool === 'shapes' || tool === 'shape' || tool === 'circle' || tool === 'triangle') {
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }
      
      ctx.beginPath();
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = strokeColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Calculate dimensions strictly as difference from starting click coordinates
      const width = x - startPos.x;
      const height = y - startPos.y;
      
      if (tool === 'line') {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
      } else if (tool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, width, height);
      } else if (tool === 'circle') {
        const radiusX = Math.abs(width) / 2;
        const radiusY = Math.abs(height) / 2;
        const centerX = startPos.x + width / 2;
        const centerY = startPos.y + height / 2;
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      } else if (tool === 'triangle') {
        const centerX = startPos.x + width / 2;
        ctx.moveTo(centerX, startPos.y);
        ctx.lineTo(startPos.x + width, startPos.y + height);
        ctx.lineTo(startPos.x, startPos.y + height);
        ctx.closePath();
      } else if (tool === 'shapes' || tool === 'shape') {
        // Shapes tool drawing logic (anchored relative to startPos, avoiding any offset)
        const radiusX = Math.abs(width) / 2;
        const radiusY = Math.abs(height) / 2;
        const centerX = startPos.x + width / 2;
        const centerY = startPos.y + height / 2;
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);

    // Staging flow for LINE and RECT: stage instead of baking on mouseup
    if (tool === 'rect' || tool === 'line') {
      // 1. Revert canvas to pre-drag snapshot so temporary drag preview is NOT permanently baked
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }

      // 2. Compute final drag coordinates
      const endDom = getDomCoordinates(e);
      const finalX = endDom.x || lastDomPosRef.current.x;
      const finalY = endDom.y || lastDomPosRef.current.y;

      const x1 = startDomPos.x;
      const y1 = startDomPos.y;
      const x2 = finalX;
      const y2 = finalY;

      const domW = Math.abs(x2 - x1);
      const domH = Math.abs(y2 - y1);
      const domLen = Math.hypot(x2 - x1, y2 - y1);

      // Threshold: width > 4px or height > 4px or length > 4px
      if ((tool === 'rect' && (domW > 4 || domH > 4)) || (tool === 'line' && domLen > 4)) {
        const minBoxDim = tool === 'line' ? 8 : 4;
        const boxW = Math.max(domW, minBoxDim);
        const boxH = Math.max(domH, minBoxDim);

        const boxX = domW < minBoxDim ? Math.min(x1, x2) - (minBoxDim - domW) / 2 : Math.min(x1, x2);
        const boxY = domH < minBoxDim ? Math.min(y1, y2) - (minBoxDim - domH) / 2 : Math.min(y1, y2);

        const shapeType = tool === 'rect' ? 'rectangle' : 'line';

        let lineData = null;
        if (tool === 'line') {
          lineData = {
            startRatio: {
              x: boxW > 0 ? (x1 - boxX) / boxW : 0,
              y: boxH > 0 ? (y1 - boxY) / boxH : 0.5,
            },
            endRatio: {
              x: boxW > 0 ? (x2 - boxX) / boxW : 1,
              y: boxH > 0 ? (y2 - boxY) / boxH : 0.5,
            },
          };
        }

        if (onStageShape) {
          onStageShape({
            shapeType,
            box: { x: boxX, y: boxY, w: boxW, h: boxH },
            lineData,
          });
        }
      }
      return;
    }

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
  const stampShapeBox = (shapeType, box) => {
    const { x, y, w, h, lineData } = box;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // Accurately map DOM CSS bounding box coordinates to canvas internal pixel buffer
    const scaleX = rect.width ? canvas.width / rect.width : 1;
    const scaleY = rect.height ? canvas.height / rect.height : 1;

    const scaledX = x * scaleX;
    const scaledY = y * scaleY;
    const scaledW = w * scaleX;
    const scaledH = h * scaleY;

    ctx.save();
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const cx = scaledX + scaledW / 2;
    const cy = scaledY + scaledH / 2;

    switch (shapeType) {
      case 'line': {
        const sx = lineData?.startRatio ? scaledX + scaledW * lineData.startRatio.x : scaledX;
        const sy = lineData?.startRatio ? scaledY + scaledH * lineData.startRatio.y : scaledY + scaledH / 2;
        const ex = lineData?.endRatio ? scaledX + scaledW * lineData.endRatio.x : scaledX + scaledW;
        const ey = lineData?.endRatio ? scaledY + scaledH * lineData.endRatio.y : scaledY + scaledH / 2;
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        break;
      }
      case 'square':
      case 'rectangle': {
        ctx.rect(scaledX, scaledY, scaledW, scaledH);
        break;
      }
      case 'circle': {
        ctx.ellipse(cx, cy, Math.abs(scaledW) / 2, Math.abs(scaledH) / 2, 0, 0, Math.PI * 2);
        break;
      }
      case 'triangle': {
        ctx.moveTo(cx, scaledY);
        ctx.lineTo(scaledX + scaledW, scaledY + scaledH);
        ctx.lineTo(scaledX, scaledY + scaledH);
        ctx.closePath();
        break;
      }
      case 'arch': {
        const r = scaledW / 2;
        const pillarTop = Math.max(scaledY + r, scaledY + scaledH - r);
        ctx.moveTo(scaledX, scaledY + scaledH);
        ctx.lineTo(scaledX, pillarTop);
        ctx.arc(cx, pillarTop, r, Math.PI, 0, false);
        ctx.lineTo(scaledX + scaledW, scaledY + scaledH);
        ctx.closePath();
        break;
      }
      case 'window': {
        ctx.rect(scaledX, scaledY, scaledW, scaledH);
        ctx.moveTo(cx, scaledY);
        ctx.lineTo(cx, scaledY + scaledH);
        ctx.moveTo(scaledX, cy);
        ctx.lineTo(scaledX + scaledW, cy);
        break;
      }
      case 'door': {
        ctx.rect(scaledX + 8 * scaleX, scaledY, scaledW - 16 * scaleX, scaledH);
        ctx.moveTo(scaledX, scaledY + scaledH);
        ctx.lineTo(scaledX + scaledW, scaledY + scaledH);
        ctx.moveTo(scaledX + scaledW - 22 * scaleX, cy + 8 * scaleY);
        ctx.arc(scaledX + scaledW - 22 * scaleX, cy + 8 * scaleY, 3 * scaleX, 0, Math.PI * 2);
        break;
      }
      case 'staircase': {
        const steps = 4;
        const dx = scaledW / steps;
        const dy = scaledH / steps;
        ctx.moveTo(scaledX, scaledY + scaledH);
        for (let i = 0; i < steps; i++) {
          ctx.lineTo(scaledX + i * dx, scaledY + scaledH - (i + 1) * dy);
          ctx.lineTo(scaledX + (i + 1) * dx, scaledY + scaledH - (i + 1) * dy);
        }
        ctx.lineTo(scaledX + scaledW, scaledY + scaledH);
        ctx.closePath();
        break;
      }
      case 'cross': {
        const armW = scaledW * 0.3;
        const armH = scaledH * 0.3;
        const x1 = scaledX + (scaledW - armW) / 2;
        const x2 = scaledX + (scaledW + armW) / 2;
        const y1 = scaledY + (scaledH - armH) / 2;
        const y2 = scaledY + (scaledH + armH) / 2;
        ctx.moveTo(x1, scaledY);
        ctx.lineTo(x2, scaledY);
        ctx.lineTo(x2, y1);
        ctx.lineTo(scaledX + scaledW, y1);
        ctx.lineTo(scaledX + scaledW, y2);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, scaledY + scaledH);
        ctx.lineTo(x1, scaledY + scaledH);
        ctx.lineTo(x1, y2);
        ctx.lineTo(scaledX, y2);
        ctx.lineTo(scaledX, y1);
        ctx.lineTo(x1, y1);
        ctx.closePath();
        break;
      }
      case 'hexagon': {
        const rx = scaledW / 2;
        const ry = scaledH / 2;
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
        ctx.rect(scaledX, scaledY, scaledW, scaledH);
        break;
    }

    ctx.stroke();
    ctx.restore();
    saveHistoryState(canvas);
  };

  useImperativeHandle(ref, () => ({
    setTool,
    setStrokeWidth,
    setEraserWidth,
    setStrokeColor,
    tool,
    strokeWidth,
    eraserWidth,
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
    loadSketchImage: (imageSrc) => {
      const canvas = canvasRef.current;
      if (!canvas || !imageSrc) return;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // 1. Fill canvas with solid pure white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Offscreen temporary canvas to process and invert pixels
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const offCtx = offscreen.getContext('2d');
        offCtx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imgData = offCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Determine if image has dark background (ControlNet format: white lines on black)
        let darkSamples = 0;
        const step = 20;
        for (let i = 0; i < data.length; i += 4 * step) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (brightness < 128) darkSamples++;
        }
        const totalSampled = data.length / (4 * step);
        const isDarkBackground = (darkSamples / totalSampled) > 0.4;

        if (isDarkBackground) {
          // Invert: black background (#000000) -> pure white (#FFFFFF), white lines -> crisp black (#000000)
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];         // r
            data[i + 1] = 255 - data[i + 1]; // g
            data[i + 2] = 255 - data[i + 2]; // b
            data[i + 3] = 255;               // a
          }
        }

        // 3. Put inverted ImageData onto active canvas & push to undo stack
        ctx.putImageData(imgData, 0, 0);
        saveHistoryState(canvas);
      };
      img.src = imageSrc;
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
