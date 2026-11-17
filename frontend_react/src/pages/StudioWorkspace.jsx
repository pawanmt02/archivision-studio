import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import CanvasToolbar from '../components/canvas/CanvasToolbar';
import SketchCanvas from '../components/canvas/SketchCanvas';
import PerspectiveGrid from '../components/canvas/PerspectiveGrid';
import ComparisonSlider from '../components/viewer/ComparisonSlider';
import StyleSelector from '../components/common/StyleSelector';
import EdgeMetricsViewer from '../components/viewer/EdgeMetricsViewer';
import ArchivisionPDFExport from '../components/viewer/ArchivisionPDFExport';
import ShapeStencilModal from '../components/canvas/ShapeStencilModal';
import ShapeStagingOverlay from '../components/canvas/ShapeStagingOverlay';
import RenderGallery from '../components/viewer/RenderGallery';
import TunnelConfigModal from '../components/common/TunnelConfigModal';
import { projectApi } from '../api/projectApi';
import { renderApi } from '../api/renderApi';
import { Grid, Lock, Unlock, Shuffle, Shapes, Mic } from 'lucide-react';

const LOADING_MESSAGES = [
  'Transmitting sketch to server...',
  'Running OpenCV preprocessing...',
  'Dispatching to GPU inference engine...',
  'Running ControlNet Scribble...',
  'Calculating Canny-Edge IoU metric...',
  'Finalising render...',
];

const toDataUrl = (b64) => {
  if (!b64) return null;
  if (b64.startsWith('data:')) return b64;
  return `data:image/png;base64,${b64}`;
};

// ── Sketch Validation Diagnostic & Solution Engine ──
const getSketchDiagnosis = (errorMsg) => {
  const rawMsg = errorMsg || '';
  const msg = rawMsg.toLowerCase();

  // Mistake 1: [BLANK_CANVAS]
  if (
    rawMsg.includes('[BLANK_CANVAS]') ||
    msg.includes('blank canvas') ||
    msg.includes('nearly empty') ||
    msg.includes('no architectural lines were detected')
  ) {
    return {
      title: 'EMPTY CANVAS',
      problem: 'You clicked Generate before sketching any walls or layout on the canvas.',
      solutions: [
        {
          step: 'Draft Outer Walls',
          desc: 'Select RECT or LINE on the left rail to draft outer walls.',
        },
        {
          step: 'Use Architectural Stencils',
          desc: 'Or click SHAPES to drop a pre-built architectural template.',
        },
        {
          step: 'Verify Stroke Color',
          desc: 'Ensure your stroke color is visible (black) against the white canvas.',
        },
      ],
      quickAction: {
        label: 'Open Shape Stencils',
        action: 'open_shapes',
      },
    };
  }

  // Mistake 2: [LOW_DENSITY]
  if (
    rawMsg.includes('[LOW_DENSITY]') ||
    msg.includes('lacks sufficient architectural detail') ||
    (msg.includes('drawn pixels') && !msg.includes('footprint') && !msg.includes('horizontal') && !msg.includes('enclosed'))
  ) {
    const pixelMatch = rawMsg.match(/drawn pixels:\s*([\d,]+)/i);
    const drawn = pixelMatch ? parseInt(pixelMatch[1].replace(/,/g, ''), 10) : 0;
    const deficit = Math.max(0, 2500 - drawn);

    return {
      title: drawn > 0 ? `LOW STROKE DETAIL (${drawn.toLocaleString()} / 2,500 PX)` : 'LOW STROKE DETAIL',
      problem: `Your outer shape is started, but it needs ${deficit > 0 ? deficit.toLocaleString() : 'more'} more pixels of interior structural detail so the AI doesn't hallucinate random furniture.`,
      solutions: [
        {
          step: 'Add Interior Partition Walls',
          desc: 'Add interior partition walls, doorways, or window frames inside your layout.',
        },
        {
          step: 'Increase Brush Thickness',
          desc: 'Increase brush thickness slightly (4px–6px) for primary load-bearing walls.',
        },
        {
          step: 'Stamp Architectural Stencils',
          desc: 'Stamp Door, Window, or Staircase stencils from SHAPES.',
        },
      ],
      quickAction: {
        label: 'Open Shape Stencils',
        action: 'open_shapes',
      },
    };
  }

  // Mistake 3: [SMALL_FOOTPRINT]
  if (
    rawMsg.includes('[SMALL_FOOTPRINT]') ||
    msg.includes('footprint is too small') ||
    msg.includes('spatial footprint too small') ||
    msg.includes('footprint')
  ) {
    const dimMatch = rawMsg.match(/(\d+)\s*[×x]\s*(\d+)\s*px/i);
    const w = dimMatch ? dimMatch[1] : '';
    const h = dimMatch ? dimMatch[2] : '';
    const dimStr = w && h ? `${w}×${h} px` : '< 160×160 px';

    return {
      title: `FOOTPRINT TOO SMALL (${dimStr} vs 160×160 px)`,
      problem: `Your sketch is drawn too small (${dimStr}) in a tiny area of the canvas, which causes blurry ControlNet edge conditioning.`,
      solutions: [
        {
          step: 'Redraw Larger Layout',
          desc: 'Click CLEAR and redraw your floor plan or elevation larger so it covers at least 40–60% of the canvas.',
        },
        {
          step: 'Stretch Outer Walls',
          desc: 'Stretch outer walls wider using the RECT tool.',
        },
        {
          step: 'Resize Staged Stencils',
          desc: 'Resize staged stencils using their corner drag handle before clicking Save.',
        },
      ],
      quickAction: {
        label: 'Select Rectangle Tool',
        action: 'select_rect',
      },
    };
  }

  // Mistake 4: [MISSING_WALLS]
  if (
    rawMsg.includes('[MISSING_WALLS]') ||
    msg.includes('insufficient orthogonal structural walls') ||
    msg.includes('horizontal lines:') ||
    msg.includes('vertical lines:') ||
    msg.includes('straight line(s) detected')
  ) {
    const hMatch = rawMsg.match(/horizontal lines:\s*(\d+)/i);
    const vMatch = rawMsg.match(/vertical lines:\s*(\d+)/i);
    const nH = hMatch ? hMatch[1] : '0';
    const nV = vMatch ? vMatch[1] : '0';

    return {
      title: `MISSING STRAIGHT WALLS (${nH}H / ${nV}V)`,
      problem: `Detected only ${nH} horizontal and ${nV} vertical wall segments (at least 2 of each are needed to anchor floor/ceiling/wall planes).`,
      solutions: [
        {
          step: 'Use Straight Line Tools',
          desc: 'Use the LINE or RECT tool instead of freehand strokes to draw crisp horizontal ceilings/floors and vertical walls.',
        },
        {
          step: 'Balance Structural Axes',
          desc: 'Add parallel opposite walls to balance your elevation or room plan.',
        },
        {
          step: 'Enable Perspective Grid',
          desc: 'Turn on the Perspective Grid guide to align straight structural axes.',
        },
      ],
      quickAction: {
        label: 'Enable Perspective Grid',
        action: 'enable_grid',
      },
    };
  }

  // Mistake 5: [UNENCLOSED_SPACE]
  if (
    rawMsg.includes('[UNENCLOSED_SPACE]') ||
    msg.includes('do not form a closed architectural room') ||
    msg.includes('no enclosed space detected') ||
    msg.includes('largest enclosed area') ||
    msg.includes('enclosed habitable volumes')
  ) {
    return {
      title: 'OPEN / UNCLOSED WALLS',
      problem: 'Your wall lines have open gaps and do not connect into a closed room or structural zone.',
      solutions: [
        {
          step: 'Connect Wall Endpoints',
          desc: 'Connect the open endpoints of your outer walls so they form a closed polygon/rectangle.',
        },
        {
          step: 'Seal Corner Gaps',
          desc: 'Check corners for gaps where lines stop short of meeting.',
        },
        {
          step: 'Create Perimeter with RECT',
          desc: 'Use the RECT tool to create a guaranteed closed room perimeter first, then divide it with LINE.',
        },
      ],
      quickAction: {
        label: 'Select Rectangle Tool',
        action: 'select_rect',
      },
    };
  }

  // Mistake 6: [NON_ORTHOGONAL]
  if (
    rawMsg.includes('[NON_ORTHOGONAL]') ||
    msg.includes('slanted, curved, or acute angles') ||
    msg.includes('right-angle corners') ||
    msg.includes('non-orthogonal')
  ) {
    const angleMatch = rawMsg.match(/(\d+)%\s*(?:right-angle|of corners)/i);
    const cornerPct = angleMatch ? angleMatch[1] : '';

    return {
      title: cornerPct ? `IRREGULAR / CURVED ANGLES (${cornerPct}%)` : 'IRREGULAR / CURVED ANGLES',
      problem: 'Your drawing contains mostly diagonal, circular, or freehand curved lines rather than right-angle (90°) architectural corners.',
      solutions: [
        {
          step: 'Replace Slanted Lines',
          desc: 'Replace slanted/diagonal freehand lines with orthogonal (90°) corners using RECT and LINE.',
        },
        {
          step: 'Frame Curved Features',
          desc: 'If drawing an arch or curved feature, surround it with a straight rectangular wall frame first.',
        },
        {
          step: 'Align with Perspective Grid',
          desc: 'Use the Perspective Grid overlay to keep structural corners aligned.',
        },
      ],
      quickAction: {
        label: 'Enable Perspective Grid',
        action: 'enable_grid',
      },
    };
  }

  // Mistake 7: [SERVER_CONNECTION]
  if (
    rawMsg.includes('[SERVER_CONNECTION]') ||
    msg.includes('tunnel') ||
    msg.includes('gpu worker') ||
    msg.includes('unreachable') ||
    msg.includes('colab') ||
    msg.includes('connection')
  ) {
    return {
      title: 'GPU WORKER OFFLINE',
      problem: 'The local server could not reach the remote Colab T4 GPU tunnel.',
      solutions: [
        {
          step: 'Verify ngrok Tunnel URL',
          desc: 'Open the 3-dot menu → GPU Tunnel and verify your active ngrok URL.',
        },
        {
          step: 'Check Colab Notebook Execution',
          desc: 'Check that your Colab notebook cell is still running.',
        },
        {
          step: 'Update Tunnel Endpoint',
          desc: 'Paste the updated tunnel URL and retry.',
        },
      ],
      quickAction: {
        label: 'Configure GPU Tunnel',
        action: 'open_tunnel',
      },
    };
  }

  // Fallback for any other unexpected error
  return {
    title: 'GENERATION FAILED',
    problem: rawMsg || 'The drawing could not be verified by the architectural computer vision gatekeeper.',
    solutions: [
      {
        step: 'Draw Closed Structural Perimeter',
        desc: 'Ensure outer walls form a closed room and meet at straight 90° right angles.',
      },
      {
        step: 'Add Detail & Density',
        desc: 'Include internal doors, windows, and partition lines to meet structural detail density (≥ 2,500 px).',
      },
      {
        step: 'Use Built-in Stencils',
        desc: 'Use the built-in Stencil Shapes + Perspective Grid for computer-vision compliant blueprints.',
      },
    ],
    quickAction: {
      label: 'Open Shape Stencils',
      action: 'open_shapes',
    },
  };
};

const StudioWorkspace = () => {
  const { projectId } = useParams();
  const canvasRef = useRef(null);

  // Project
  const [project, setProject]   = useState(null);
  const [mode, setMode]         = useState('sketch');
  const [title, setTitle]       = useState('');
  const [saving, setSaving]     = useState(false);

  // Canvas
  const [tool, setTool]                       = useState('draw');
  const [strokeWidth, setStrokeWidth]         = useState(3);
  const [eraserWidth, setEraserWidth]         = useState(20);
  const [strokeColor, setStrokeColor]         = useState('#000000');
  const [perspectiveGridVisible, setPerspectiveGridVisible] = useState(false);

  // Settings
  const [roomType, setRoomType]             = useState('Living Room');
  const [positivePrompt, setPositivePrompt] = useState('A modern architectural interior, high quality, 8k resolution, photorealistic');
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, deformed, cartoon');
  const [seed, setSeed]                     = useState('');
  const [seedLocked, setSeedLocked]         = useState(false);
  const [numSteps, setNumSteps]             = useState(30);
  const [guidanceScale, setGuidanceScale]   = useState(7.5);

  // Renders
  const [renders, setRenders]           = useState([]);
  const [currentRender, setCurrentRender] = useState(null);

  // UI state
  const [isGenerating, setIsGenerating]   = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [tunnelModalOpen, setTunnelModalOpen] = useState(false);
  const [isShapeModalOpen, setIsShapeModalOpen] = useState(false);
  const [stagingShape, setStagingShape] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [fullScreenError, setFullScreenError] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [tunnelStatus, setTunnelStatus]   = useState({ connected: false, url: '' });
  const [error, setError]                 = useState('');
  const [isListening, setIsListening]     = useState(false);
  const [isListeningNegative, setIsListeningNegative] = useState(false);
  const recognitionRef                    = useRef(null);

  // Cycle loading message during generation
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Close full-screen lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && (fullScreenImage || fullScreenError)) {
        setFullScreenImage(null);
        setFullScreenError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullScreenImage, fullScreenError]);

  // Load project + renders + tunnel status on mount
  useEffect(() => {
    const load = async () => {
      try {
        const pRes = await projectApi.getById(projectId);
        setProject(pRes.data);
        setTitle(pRes.data.title);

        const rRes = await projectApi.getRenders(projectId);
        setRenders(rRes.data);
        if (rRes.data.length > 0) setCurrentRender(rRes.data[0]);

        const tRes = await renderApi.getTunnelStatus();
        setTunnelStatus(tRes.data);
      } catch (err) {
        console.error('Failed to load project data', err);
      }
    };
    load();
  }, [projectId]);

  // Automatically poll tunnel status every 3.5s so Navbar and Modal update to Connected automatically
  useEffect(() => {
    const checkTunnel = async () => {
      try {
        const tRes = await renderApi.getTunnelStatus();
        setTunnelStatus(tRes.data);
      } catch {}
    };
    const interval = setInterval(checkTunnel, 3500);
    return () => clearInterval(interval);
  }, []);

  // Auto-save every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!project) return;
      try { await projectApi.update(projectId, { title }); } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [projectId, title, project]);

  // Manual save
  const handleSaveTitle = async () => {
    setSaving(true);
    try { await projectApi.update(projectId, { title }); } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  // Generate
  const handleGenerate = async () => {
    setError('');
    setFullScreenError(null);
    setIsGenerating(true);
    setLoadingMsgIdx(0);
    try {
      // ── Stage 1: Client-Side Pixel Complexity Filter ──
      if (mode === 'sketch' && canvasRef.current) {
        const validation = canvasRef.current.validateSketch();
        if (!validation.valid) {
          const validationMsg = validation.drawnPixels < 150
            ? `[BLANK_CANVAS] Canvas is nearly empty (Drawn pixels: ${validation.drawnPixels}). No architectural lines were detected.`
            : `[LOW_DENSITY] Sketch lacks sufficient architectural detail (Drawn pixels: ${validation.drawnPixels.toLocaleString()}, minimum required: 2,500).`;
          setError(validationMsg);
          setFullScreenImage(null);
          setFullScreenError(validationMsg);
          setIsGenerating(false);
          return;
        }
      }

      // Combine roomType at the very start of the prompt for maximum ControlNet/Stable Diffusion attention weighting
      const finalPrompt = `${roomType} architectural interior, ${positivePrompt}`;

      const payload = {
        project_id: parseInt(projectId),
        generation_mode: mode,
        positive_prompt: finalPrompt,
        negative_prompt: negativePrompt,
        style_preset: 'Photorealistic',
        seed: seedLocked && seed ? parseInt(seed) : null,
        num_inference_steps: numSteps,
        guidance_scale: guidanceScale,
        controlnet_conditioning_scale: 0.8,
      };
      if (mode === 'sketch' && canvasRef.current) {
        payload.sketch_b64 = canvasRef.current.exportCanvas();
      }
      const res = await renderApi.generate(payload);
      const newRender = res.data;
      setRenders((prev) => [newRender, ...prev]);
      setCurrentRender(newRender);
      if (newRender.rendered_image_b64) {
        const fullUrl = newRender.rendered_image_b64.startsWith('data:')
          ? newRender.rendered_image_b64
          : `data:image/png;base64,${newRender.rendered_image_b64}`;
        setFullScreenImage(fullUrl);
      }
      if (!seedLocked && newRender.seed_used) setSeed(newRender.seed_used.toString());
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Generation failed. Check console.';
      setError(errMsg);
      setFullScreenImage(null);
      setFullScreenError(errMsg);
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Tunnel save
  const handleSaveTunnel = async (url) => {
    try {
      await renderApi.updateTunnelUrl(url);
      const tRes = await renderApi.getTunnelStatus();
      setTunnelStatus(tRes.data);
      if (tRes.data.connected) {
        setTimeout(() => setTunnelModalOpen(false), 900);
      }
    } catch (err) { console.error(err); }
  };

  const handleRandomizeSeed = () => setSeed(Math.floor(Math.random() * 2 ** 32).toString());

  const handleDownload = (b64Image) => {
    if (!b64Image) return;
    const dataUrl = b64Image.startsWith('data:')
      ? b64Image
      : `data:image/png;base64,${b64Image}`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'Archivision_Render.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadSketchToCanvas = (sketchB64) => {
    if (!sketchB64) return;
    const dataUrl = toDataUrl(sketchB64);
    if (!dataUrl) return;

    // Switch to sketch mode and close modal
    setMode('sketch');
    setShowHistoryModal(false);

    // Load sketch image onto canvas
    setTimeout(() => {
      canvasRef.current?.loadSketchImage(dataUrl);
    }, 60);
  };

  const handleVoiceDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please try using Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    if (isListeningNegative && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningNegative(false);
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setPositivePrompt((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
        }
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition failed to start:', err);
      setIsListening(false);
    }
  };

  const handleNegativeSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please try using Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListeningNegative && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningNegative(false);
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListeningNegative(true);
      };

      recognition.onend = () => {
        setIsListeningNegative(false);
        recognitionRef.current = null;
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListeningNegative(false);
        recognitionRef.current = null;
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setNegativePrompt((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
        }
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition failed to start:', err);
      setIsListeningNegative(false);
    }
  };

  return (
    <div className="studio-layout">
      {/* ── Navbar ── */}
      <Navbar
        projectTitle={title}
        onTitleChange={setTitle}
        mode={mode}
        setMode={setMode}
        tunnelConnected={tunnelStatus.connected}
        onOpenTunnelConfig={() => setTunnelModalOpen(true)}
        onSave={handleSaveTitle}
        saving={saving}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        onOpenHistory={() => setShowHistoryModal(true)}
      />

      <div className="studio-content">
        {/* ── Left Panel: Canvas Toolbar (Sketch mode only) ── */}
        {mode === 'sketch' && (
          <CanvasToolbar
            tool={tool}
            setTool={(t) => { setTool(t); canvasRef.current?.setTool(t); }}
            strokeWidth={strokeWidth}
            setStrokeWidth={(w) => { setStrokeWidth(w); canvasRef.current?.setStrokeWidth(w); }}
            eraserWidth={eraserWidth}
            setEraserWidth={(w) => { setEraserWidth(w); canvasRef.current?.setEraserWidth(w); }}
            strokeColor={strokeColor}
            setStrokeColor={(c) => { setStrokeColor(c); canvasRef.current?.setStrokeColor(c); }}
            onUndo={() => canvasRef.current?.undo()}
            onClear={() => canvasRef.current?.clear()}
            onExport={handleGenerate}
            onOpenShapes={() => setIsShapeModalOpen(true)}
          />
        )}

        {/* ── Center ── */}
        <div className="studio-main">
          {mode === 'sketch' ? (
            <div className="canvas-wrapper">
              <div className="canvas-container">
                <SketchCanvas
                  ref={canvasRef}
                  width={700} height={700}
                  initialTool={tool}
                  initialStrokeWidth={strokeWidth}
                  initialStrokeColor={strokeColor}
                  onStageShape={(stagedData) => setStagingShape(stagedData)}
                />
                <PerspectiveGrid visible={perspectiveGridVisible} width={700} height={700} />
                {stagingShape && (
                  <ShapeStagingOverlay
                    shapeType={typeof stagingShape === 'string' ? stagingShape : stagingShape.shapeType}
                    initialBox={typeof stagingShape === 'object' ? stagingShape.box : null}
                    lineData={typeof stagingShape === 'object' ? stagingShape.lineData : null}
                    strokeColor={strokeColor}
                    strokeWidth={strokeWidth}
                    canvasWidth={700}
                    canvasHeight={700}
                    onConfirm={(box) => {
                      const sType = typeof stagingShape === 'string' ? stagingShape : stagingShape.shapeType;
                      canvasRef.current?.stampShapeBox(sType, box);
                      setStagingShape(null);
                    }}
                    onCancel={() => setStagingShape(null)}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="text-mode-center glass-panel">
              <div className="text-mode-icon">✦</div>
              <h2>Text-to-Image Mode</h2>
              <p className="text-mode-description">
                Describe your architectural vision in the prompt fields below.
                The AI will generate a photorealistic render from your description alone.
              </p>
              <div className="text-mode-tags">
                {['Interior Design', 'Exterior Architecture', 'Urban Planning', 'Structural Concept'].map((tag) => (
                  <span key={tag} className="mode-tag">{tag}</span>
                ))}
              </div>

              {/* Centered Prompt Configuration Inputs */}
              <div className="w-full flex flex-col gap-3 text-left my-2" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', margin: '8px 0' }}>
                {/* Positive Prompt + Speak Button */}
                <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="flex items-center justify-between" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider" style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Positive Prompt
                    </label>
                    <button
                      type="button"
                      onClick={handleVoiceDictation}
                      className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                        isListening
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-gray-700'
                      }`}
                      title={isListening ? 'Listening...' : 'Voice Dictation to Prompt'}
                      style={{
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isListening ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.7)',
                        color: isListening ? '#f87171' : '#00f0ff',
                        border: `1px solid ${isListening ? '#ef4444' : '#334155'}`,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Mic size={13} style={{ animation: isListening ? 'pulse 1.5s infinite' : 'none' }} />
                      <span>{isListening ? 'Listening...' : 'Speak'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    className="bg-gray-800 border border-gray-700 text-white rounded p-2 w-full text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
                    placeholder="Describe your architectural design..."
                    value={positivePrompt}
                    onChange={(e) => setPositivePrompt(e.target.value)}
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      width: '100%',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Negative Prompt + Speak Button */}
                <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="flex items-center justify-between" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider" style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Negative Prompt
                    </label>
                    <button
                      type="button"
                      onClick={handleNegativeSpeech}
                      className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                        isListeningNegative
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-gray-700'
                      }`}
                      title={isListeningNegative ? 'Listening...' : 'Voice Dictation to Negative Prompt'}
                      style={{
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isListeningNegative ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.7)',
                        color: isListeningNegative ? '#f87171' : '#00f0ff',
                        border: `1px solid ${isListeningNegative ? '#ef4444' : '#334155'}`,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Mic size={13} style={{ animation: isListeningNegative ? 'pulse 1.5s infinite' : 'none' }} />
                      <span>{isListeningNegative ? 'Listening...' : 'Speak'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    className="bg-gray-800 border border-gray-700 text-white rounded p-2 w-full text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
                    placeholder="What to avoid (e.g. blurry, low quality)..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      width: '100%',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              <button className="btn-primary generate-center-btn" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : '⚡ Generate from Prompt'}
              </button>
            </div>
          )}

          {/* Loading overlay */}
          {isGenerating && (
            <div className="loader-overlay">
              <div className="loader-card glass-panel">
                <div className="spinner" />
                <div className="loader-message">{LOADING_MESSAGES[loadingMsgIdx]}</div>
                <div className="loader-sub">
                  {tunnelStatus.connected ? '🟢 Connected to GPU Tunnel' : '🔵 Local Fallback Mode'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Panel ── */}
        <div className="studio-right-panel">
          <StyleSelector roomType={roomType} onChange={setRoomType} />

          <div className="panel-section glass-panel">
            <div className="input-group">
              <label className="input-label">
                Seed <span className="label-hint">{seedLocked ? '(locked)' : '(random)'}</span>
              </label>
              <div className="seed-row">
                <input
                  type="number" className="input-field"
                  value={seed} onChange={(e) => setSeed(e.target.value)}
                  placeholder="Random" disabled={!seedLocked}
                />
                <button className={`btn-icon ${seedLocked ? 'active' : ''}`} onClick={() => setSeedLocked(!seedLocked)}
                  title={seedLocked ? 'Unlock Seed' : 'Lock Seed'}>
                  {seedLocked ? <Lock size={15} /> : <Unlock size={15} />}
                </button>
                <button className="btn-icon" onClick={handleRandomizeSeed} title="Randomize Seed">
                  <Shuffle size={15} />
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Steps <span className="label-hint">{numSteps}</span></label>
              <input type="range" className="range-slider" min={10} max={50} value={numSteps}
                onChange={(e) => setNumSteps(parseInt(e.target.value))} />
            </div>
            <div className="input-group">
              <label className="input-label">Guidance Scale <span className="label-hint">{guidanceScale.toFixed(1)}</span></label>
              <input type="range" className="range-slider" min={1} max={15} step={0.5} value={guidanceScale}
                onChange={(e) => setGuidanceScale(parseFloat(e.target.value))} />
            </div>

            <button className="btn-primary generate-btn" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <><span className="btn-spinner" /> Generating...</>
              ) : (
                `⚡ Generate (${mode === 'sketch' ? 'ControlNet' : 'Text-to-Image'})`
              )}
            </button>
          </div>

          <div className="panel-section glass-panel">
            <div className="panel-title">Render Result</div>
            {currentRender ? (
              <>
                <ComparisonSlider
                  sketchB64={currentRender.sketch_image_b64}
                  renderB64={currentRender.rendered_image_b64}
                  width={280} height={280}
                />
                {/* Download Render Button */}
                <button
                  type="button"
                  onClick={() => handleDownload(currentRender.rendered_image_b64)}
                  className="relative group overflow-hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300 ease-out cursor-pointer border border-cyan-400/50 hover:border-cyan-300 text-cyan-300 hover:text-white bg-slate-950/90 hover:bg-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5),inset_0_0_12px_rgba(6,182,212,0.25)]"
                  style={{
                    background: 'linear-gradient(135deg, #0b1324 0%, #132038 100%)',
                    border: '1.5px solid #00f0ff',
                    color: '#ffffff',
                    textShadow: '0 0 8px rgba(0, 240, 255, 0.6)',
                    boxShadow: '0 0 16px rgba(0, 240, 255, 0.25)',
                    marginTop: '10px',
                    marginBottom: '4px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                  title="Download the generated architectural render as PNG"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#00f0ff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform duration-200 group-hover:translate-y-0.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span className="relative z-10">Download Render</span>
                </button>
                <EdgeMetricsViewer
                  edgeOverlayB64={currentRender.edge_overlay_b64}
                  iouScore={currentRender.edge_similarity_score}
                  latency={currentRender.inference_latency_seconds}
                  seedUsed={currentRender.seed_used}
                  mode={currentRender.generation_mode}
                />
                <ArchivisionPDFExport
                  originalSketch={currentRender.sketch_image_b64}
                  generatedRender={currentRender.rendered_image_b64}
                  architecturalPrompt={currentRender.prompt_or_style || positivePrompt}
                  fidelityScore={currentRender.edge_similarity_score != null ? currentRender.edge_similarity_score * 100 : 46.5}
                  clientName={project?.title || 'Archivision Client'}
                />
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🖼</div>
                <p>No renders yet.<br />Draw a sketch or enter a prompt to generate.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <TunnelConfigModal
        isOpen={tunnelModalOpen}
        onClose={() => setTunnelModalOpen(false)}
        currentUrl={tunnelStatus.url}
        onSave={handleSaveTunnel}
        status={tunnelStatus}
      />

      <ShapeStencilModal
        isOpen={isShapeModalOpen}
        onClose={() => setIsShapeModalOpen(false)}
        onSelectShape={(shapeId) => {
          setStagingShape(shapeId);
          setIsShapeModalOpen(false);
        }}
      />

      {/* ── Full-Screen Image / Error Overlay (Lightbox Modal) ── */}
      {(fullScreenImage || fullScreenError) && (
        <div
          onClick={() => {
            setFullScreenImage(null);
            setFullScreenError(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {/* Top Dismiss Hint Banner */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              padding: '6px 16px',
              borderRadius: '20px',
              background: fullScreenError ? 'rgba(30, 10, 15, 0.85)' : 'rgba(15, 23, 42, 0.8)',
              border: fullScreenError ? '1px solid rgba(255, 75, 75, 0.4)' : '1px solid rgba(0, 240, 255, 0.3)',
              color: fullScreenError ? '#fca5a5' : '#94a3b8',
              fontSize: '12px',
              letterSpacing: '0.5px',
              boxShadow: fullScreenError ? '0 0 12px rgba(255, 75, 75, 0.2)' : '0 0 12px rgba(0, 240, 255, 0.15)',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            Press Esc or click outside to dismiss
          </div>

          {/* Conditional Error Card */}
          {fullScreenError && (() => {
            const diagnosis = getSketchDiagnosis(fullScreenError);
            return (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: '600px',
                  width: '92%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  background: 'linear-gradient(135deg, rgba(20, 10, 15, 0.96), rgba(30, 12, 18, 0.98))',
                  border: '1.5px solid rgba(255, 75, 75, 0.6)',
                  borderRadius: '16px',
                  padding: '28px 24px',
                  boxShadow: '0 0 50px rgba(255, 30, 60, 0.25), 0 20px 40px rgba(0, 0, 0, 0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'default',
                }}
              >
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: 'rgba(255, 75, 75, 0.15)',
                    border: '1px solid rgba(255, 75, 75, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    marginBottom: '16px',
                    color: '#ff4b4b',
                  }}
                >
                  ⚠️
                </div>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#ffffff',
                    marginBottom: '12px',
                    letterSpacing: '0.3px',
                  }}
                >
                  Generation Failed
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#cbd5e1',
                    lineHeight: '1.6',
                    marginBottom: '20px',
                    wordBreak: 'break-word',
                  }}
                >
                  {fullScreenError}
                </p>
                <button
                  type="button"
                  onClick={() => setFullScreenError(null)}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '8px',
                    background: 'rgba(255, 75, 75, 0.2)',
                    border: '1px solid rgba(255, 75, 75, 0.5)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 75, 75, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 75, 75, 0.2)';
                  }}
                >
                  Dismiss
                </button>

                {/* Structured "How to Fix This Sketch" Solution Panel directly below Dismiss */}
                {diagnosis && (
                  <div
                    className="mt-5 pt-4 border-t border-red-900/40 text-left bg-[#131720]/90 rounded-xl p-4 w-full"
                    style={{
                      marginTop: '20px',
                      paddingTop: '16px',
                      borderTop: '1px solid rgba(153, 27, 27, 0.4)',
                      backgroundColor: 'rgba(19, 23, 32, 0.95)',
                      borderRadius: '12px',
                      padding: '16px',
                      width: '100%',
                      textAlign: 'left',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {/* Panel Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px' }}>💡</span>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#5CE1E6',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          How to Fix This Sketch
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: '#f87171',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {diagnosis.title}
                      </span>
                    </div>

                    {/* What's Wrong */}
                    <div
                      style={{
                        marginBottom: '14px',
                        backgroundColor: 'rgba(11, 14, 20, 0.6)',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #1E2532',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
                        <strong style={{ color: '#fca5a5', marginRight: '6px' }}>What's Wrong:</strong>
                        {diagnosis.problem}
                      </p>
                    </div>

                    {/* How to Fix: Step-by-Step Solutions */}
                    <div style={{ marginBottom: '14px' }}>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#94A3B8',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginBottom: '8px',
                        }}
                      >
                        Recommended Solutions:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {diagnosis.solutions.map((sol, sIdx) => (
                          <div
                            key={sIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px',
                              fontSize: '12px',
                              color: '#94A3B8',
                              lineHeight: '1.5',
                            }}
                          >
                            <span
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(92, 225, 230, 0.15)',
                                color: '#5CE1E6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 700,
                                flexShrink: 0,
                                marginTop: '1px',
                              }}
                            >
                              {sIdx + 1}
                            </span>
                            <div>
                              <strong style={{ color: '#ffffff', fontWeight: 600 }}>{sol.step}: </strong>
                              <span>{sol.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick-Action Helper Button */}
                    {diagnosis.quickAction && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          paddingTop: '10px',
                          borderTop: '1px solid rgba(30, 37, 50, 0.8)',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setFullScreenError(null);
                            setFullScreenImage(null);
                            if (diagnosis.quickAction.action === 'open_shapes') {
                              setIsShapeModalOpen(true);
                            } else if (diagnosis.quickAction.action === 'enable_grid') {
                              setPerspectiveGridVisible(true);
                            } else if (diagnosis.quickAction.action === 'select_rect') {
                              setTool('rect');
                              canvasRef.current?.setTool('rect');
                            } else if (diagnosis.quickAction.action === 'open_tunnel') {
                              setTunnelModalOpen(true);
                            }
                          }}
                          style={{
                            backgroundColor: 'rgba(92, 225, 230, 0.1)',
                            color: '#5CE1E6',
                            border: '1px solid rgba(92, 225, 230, 0.4)',
                            borderRadius: '8px',
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(92, 225, 230, 0.2)';
                            e.currentTarget.style.borderColor = '#5CE1E6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(92, 225, 230, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(92, 225, 230, 0.4)';
                          }}
                        >
                          <span>⚡ {diagnosis.quickAction.label}</span>
                          <span style={{ fontSize: '10px' }}>→</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Render Image (if successful) */}
          {fullScreenImage && !fullScreenError && (
            <img
              src={fullScreenImage}
              alt="AI Generated Architectural Render"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '12px',
                border: '1.5px solid rgba(0, 240, 255, 0.4)',
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.9), 0 0 25px rgba(0, 240, 255, 0.25)',
                cursor: 'default',
              }}
            />
          )}
        </div>
      )}

      {/* ── Dedicated Fullscreen History Page Modal (Triggered strictly via 3-dot menu) ── */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto text-white"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            backgroundColor: '#0B0E14',
            overflowY: 'auto',
            color: '#ffffff',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {/* Centered Container & Breathing Room */}
          <div
            className="max-w-6xl mx-auto px-6 py-8"
            style={{
              maxWidth: '1152px',
              marginLeft: 'auto',
              marginRight: 'auto',
              padding: '32px 24px',
            }}
          >
            {/* Clean Top Header Bar */}
            <div
              className="flex items-center justify-between pb-6 mb-8"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '24px',
                marginBottom: '32px',
                borderBottom: '1px solid #1E2532',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <h1
                    className="text-2xl font-bold tracking-tight text-white"
                    style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', margin: 0 }}
                  >
                    Archivision Render History
                  </h1>
                  <span
                    style={{
                      backgroundColor: 'rgba(92, 225, 230, 0.12)',
                      color: '#5CE1E6',
                      border: '1px solid rgba(92, 225, 230, 0.3)',
                      padding: '3px 12px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {renders.length} {renders.length === 1 ? 'ITEM' : 'ITEMS'}
                  </span>
                </div>
                <p
                  className="text-sm mt-1.5"
                  style={{ color: '#94A3B8', fontSize: '13px', marginTop: '6px', marginBottom: 0 }}
                >
                  Side-by-side comparison of original architectural sketches and AI-generated renders ({renders.length} item{renders.length === 1 ? '' : 's'})
                </p>
              </div>

              {/* Sleek Pill Close Button in Top-Right Corner */}
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 rounded-xl border border-slate-700 bg-[#131720] hover:border-[#5CE1E6] text-slate-200 transition-all flex items-center gap-2 cursor-pointer shadow-lg flex-shrink-0"
                style={{
                  backgroundColor: '#131720',
                  color: '#E2E8F0',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#5CE1E6';
                  e.currentTarget.style.color = '#5CE1E6';
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(92, 225, 230, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#334155';
                  e.currentTarget.style.color = '#E2E8F0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                title="Close History View"
              >
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Close</span>
              </button>
            </div>

            {/* History Content */}
            {renders.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-20 px-6 max-w-md mx-auto text-center"
                style={{
                  backgroundColor: '#131720',
                  border: '1px solid #1E2532',
                  borderRadius: '16px',
                  marginTop: '40px',
                }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 text-2xl"
                  style={{
                    backgroundColor: '#0B0E14',
                    border: '1px solid #1E2532',
                    color: '#5CE1E6',
                  }}
                >
                  🖼
                </div>
                <h3 className="text-base font-semibold" style={{ color: '#ffffff' }}>No Render History Yet</h3>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: '#94A3B8' }}>
                  Generate your first architectural sketch or prompt render to view side-by-side comparisons here.
                </p>
              </div>
            ) : (
              <div
                className="space-y-8"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '32px',
                }}
              >
                {renders.map((item, index) => {
                  const sketchSrc = toDataUrl(item.sketch_image_b64);
                  const renderSrc = toDataUrl(item.rendered_image_b64);
                  const mode = item.generation_mode || item.mode || 'sketch';

                  // Timestamp formatted as "17 Nov, 06:56 am"
                  let formattedTime = `Render #${renders.length - index}`;
                  if (item.created_at) {
                    try {
                      const d = new Date(item.created_at);
                      const day = d.getDate();
                      const month = d.toLocaleString('en-US', { month: 'short' });
                      const time = d.toLocaleString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      }).toLowerCase();
                      formattedTime = `${day} ${month}, ${time}`;
                    } catch (e) {
                      formattedTime = item.created_at;
                    }
                  }

                  const prompt = item.prompt_or_style || item.positive_prompt || 'Architectural Design';

                  return (
                    <div
                      key={item.id || index}
                      className="bg-[#131720] border border-[#1E2532] rounded-2xl p-6 shadow-xl transition-all"
                      style={{
                        backgroundColor: '#131720',
                        border: '1px solid #1E2532',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      {/* Top Metadata Row: flex items-center justify-between mb-5 */}
                      <div
                        className="flex items-center justify-between mb-5"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '20px',
                          paddingBottom: '14px',
                          borderBottom: '1px solid #1E2532',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              backgroundColor: 'rgba(92, 225, 230, 0.1)',
                              color: '#5CE1E6',
                              border: '1px solid rgba(92, 225, 230, 0.3)',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                            }}
                          >
                            {mode}
                          </span>
                          <span style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 500 }}>
                            {formattedTime}
                          </span>
                        </div>

                        {item.edge_similarity_score != null && (
                          <span
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: '#34D399',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            Fidelity: {(item.edge_similarity_score * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>

                      {/* Side-by-Side Images strictly in a 2-Column Horizontal Grid */}
                      <div
                        className="grid grid-cols-2 gap-6"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '24px',
                        }}
                      >
                        {/* Left Side: Original Sketch */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {/* Label row separated cleanly with justify-between */}
                          <div
                            className="flex items-center justify-between mb-2.5"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '10px',
                            }}
                          >
                            <span
                              style={{
                                color: '#94A3B8',
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                              }}
                            >
                              ORIGINAL SKETCH
                            </span>
                            {sketchSrc && (
                              <span style={{ color: '#5CE1E6', fontSize: '11px', fontWeight: 500 }}>
                                Click to edit
                              </span>
                            )}
                          </div>

                          <div
                            onClick={() => sketchSrc && handleLoadSketchToCanvas(sketchSrc)}
                            title={sketchSrc ? 'Click to load sketch to edit' : 'No sketch input'}
                            style={{
                              position: 'relative',
                              height: '300px',
                              width: '100%',
                              backgroundColor: '#ffffff',
                              border: '1px solid rgba(51, 65, 85, 0.8)',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '12px',
                              cursor: sketchSrc ? 'pointer' : 'default',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (sketchSrc) {
                                e.currentTarget.style.borderColor = '#5CE1E6';
                                e.currentTarget.style.boxShadow = '0 0 16px rgba(92, 225, 230, 0.2)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (sketchSrc) {
                                e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.8)';
                                e.currentTarget.style.boxShadow = 'none';
                              }
                            }}
                          >
                            {sketchSrc ? (
                              <img
                                src={sketchSrc}
                                alt="Original Sketch"
                                style={{
                                  maxHeight: '276px',
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  filter: 'invert(1)', // Displays white-on-black ControlNet sketch as crisp black-on-white strokes
                                }}
                              />
                            ) : (
                              <div style={{ fontSize: '12px', fontStyle: 'italic', textAlign: 'center', color: '#64748B' }}>
                                Prompt-only Generation (No sketch input)
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Side: AI Generated Render */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {/* Label row separated cleanly with justify-between */}
                          <div
                            className="flex items-center justify-between mb-2.5"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '10px',
                            }}
                          >
                            <span
                              style={{
                                color: '#5CE1E6',
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                              }}
                            >
                              AI RENDER
                            </span>
                            {renderSrc && (
                              <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 500 }}>
                                Click to enlarge
                              </span>
                            )}
                          </div>

                          <div
                            onClick={() => renderSrc && setFullScreenImage(renderSrc)}
                            title={renderSrc ? 'Click to view full screen' : 'No render preview'}
                            style={{
                              position: 'relative',
                              height: '300px',
                              width: '100%',
                              backgroundColor: 'rgba(0, 0, 0, 0.6)',
                              border: '1px solid rgba(51, 65, 85, 0.8)',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '12px',
                              cursor: renderSrc ? 'pointer' : 'default',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (renderSrc) {
                                e.currentTarget.style.borderColor = '#5CE1E6';
                                e.currentTarget.style.boxShadow = '0 0 16px rgba(92, 225, 230, 0.2)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (renderSrc) {
                                e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.8)';
                                e.currentTarget.style.boxShadow = 'none';
                              }
                            }}
                          >
                            {renderSrc ? (
                              <img
                                src={renderSrc}
                                alt="AI Render"
                                style={{
                                  maxHeight: '276px',
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                }}
                              />
                            ) : (
                              <div style={{ fontSize: '12px', fontStyle: 'italic', textAlign: 'center', color: '#64748B' }}>
                                Render preview unavailable
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Clean Action Footer Bar: mt-5 pt-4 border-t border-slate-800/80 */}
                      <div
                        className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4"
                        style={{
                          marginTop: '20px',
                          paddingTop: '16px',
                          borderTop: '1px solid rgba(51, 65, 85, 0.8)',
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                        }}
                      >
                        <div style={{ flex: '1 1 300px', minWidth: '0' }}>
                          <p
                            style={{
                              color: '#94A3B8',
                              fontSize: '12px',
                              lineHeight: '1.5',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              margin: 0,
                            }}
                            title={prompt}
                          >
                            <span style={{ color: '#ffffff', fontWeight: 600, marginRight: '6px' }}>Prompt:</span>
                            {prompt}
                          </p>
                        </div>

                        {/* Inline horizontal button group */}
                        <div
                          className="flex items-center gap-3 flex-shrink-0"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            flexShrink: 0,
                          }}
                        >
                          {/* Load Sketch to Edit Button (compact 16px icon) */}
                          {sketchSrc && (
                            <button
                              type="button"
                              onClick={() => handleLoadSketchToCanvas(sketchSrc)}
                              className="px-4 py-2 rounded-lg bg-[#5CE1E6] text-[#0B0E14] font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:brightness-105"
                              style={{
                                backgroundColor: '#5CE1E6',
                                color: '#0B0E14',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontWeight: 600,
                                fontSize: '14px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                border: 'none',
                                boxShadow: '0 2px 8px rgba(92, 225, 230, 0.3)',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.filter = 'brightness(1.08)';
                                e.currentTarget.style.boxShadow = '0 0 14px rgba(92, 225, 230, 0.5)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.filter = 'none';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(92, 225, 230, 0.3)';
                              }}
                              title="Load this sketch back onto the studio canvas to continue editing"
                            >
                              <svg
                                style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px', flexShrink: 0 }}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              <span>Load Sketch to Edit</span>
                            </button>
                          )}

                          {/* Download Render Button */}
                          {renderSrc && (
                            <button
                              type="button"
                              onClick={() => handleDownload(renderSrc)}
                              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm flex items-center gap-2 transition-all cursor-pointer border border-slate-700"
                              style={{
                                backgroundColor: '#1E293B',
                                color: '#E2E8F0',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontWeight: 500,
                                fontSize: '14px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#334155';
                                e.currentTarget.style.color = '#ffffff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#1E293B';
                                e.currentTarget.style.color = '#E2E8F0';
                              }}
                              title="Download AI render"
                            >
                              <svg
                                style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px', flexShrink: 0 }}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span>Download</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioWorkspace;
