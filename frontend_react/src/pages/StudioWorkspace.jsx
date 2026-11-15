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
import { Grid, Lock, Unlock, Shuffle, Shapes } from 'lucide-react';

const LOADING_MESSAGES = [
  'Transmitting sketch to server...',
  'Running OpenCV preprocessing...',
  'Dispatching to GPU inference engine...',
  'Running ControlNet Scribble...',
  'Calculating Canny-Edge IoU metric...',
  'Finalising render...',
];

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
  const [strokeColor, setStrokeColor]         = useState('#000000');
  const [perspectiveGridVisible, setPerspectiveGridVisible] = useState(false);

  // Settings
  const [selectedStyle, setSelectedStyle]   = useState('Photorealistic');
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
  const [tunnelStatus, setTunnelStatus]   = useState({ connected: false, url: '' });
  const [error, setError]                 = useState('');

  // Cycle loading message during generation
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isGenerating]);

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
    setIsGenerating(true);
    setLoadingMsgIdx(0);
    try {
      // ── Stage 1: Client-Side Pixel Complexity Filter ──
      if (mode === 'sketch' && canvasRef.current) {
        const validation = canvasRef.current.validateSketch();
        if (!validation.valid) {
          setError(
            `Please draw a more detailed architectural sketch. Simple scribbles are not enough for the AI to generate a perfect structure. (Drawn pixels: ${validation.drawnPixels}, minimum required: 2,500)`
          );
          setIsGenerating(false);
          return;
        }
      }

      const payload = {
        project_id: parseInt(projectId),
        generation_mode: mode,
        positive_prompt: positivePrompt,
        negative_prompt: negativePrompt,
        style_preset: selectedStyle,
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
      if (!seedLocked && newRender.seed_used) setSeed(newRender.seed_used.toString());
    } catch (err) {
      setError(err.response?.data?.detail || 'Generation failed. Check console.');
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
      />

      <div className="studio-content">
        {/* ── Left Panel: Canvas Toolbar (Sketch mode only) ── */}
        {mode === 'sketch' && (
          <CanvasToolbar
            tool={tool}
            setTool={(t) => { setTool(t); canvasRef.current?.setTool(t); }}
            strokeWidth={strokeWidth}
            setStrokeWidth={(w) => { setStrokeWidth(w); canvasRef.current?.setStrokeWidth(w); }}
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
                  width={512} height={512}
                  initialTool={tool}
                  initialStrokeWidth={strokeWidth}
                  initialStrokeColor={strokeColor}
                />
                <PerspectiveGrid visible={perspectiveGridVisible} width={512} height={512} />
                {stagingShape && (
                  <ShapeStagingOverlay
                    shapeType={stagingShape}
                    strokeColor={strokeColor}
                    strokeWidth={strokeWidth}
                    canvasWidth={512}
                    canvasHeight={512}
                    onConfirm={(box) => {
                      canvasRef.current?.stampShapeBox(stagingShape, box);
                      setStagingShape(null);
                    }}
                    onCancel={() => setStagingShape(null)}
                  />
                )}
              </div>
              <button
                className={`btn-icon grid-toggle-btn ${perspectiveGridVisible ? 'active' : ''}`}
                onClick={() => setPerspectiveGridVisible(!perspectiveGridVisible)}
                title="Toggle 1-Point Perspective Grid"
              >
                <Grid size={18} />
                <span className="btn-icon-label">Grid</span>
              </button>
              <button
                className="btn-icon"
                onClick={() => setIsShapeModalOpen(true)}
                title="Insert Shape Stencil"
                style={{
                  position: 'absolute',
                  top: '56px',
                  right: '-52px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <Shapes size={18} />
                <span className="btn-icon-label">Shapes</span>
              </button>
            </div>
          ) : (
            <div className="text-mode-center glass-panel">
              <div className="text-mode-icon">✦</div>
              <h2>Text-to-Image Mode</h2>
              <p className="text-mode-description">
                Describe your architectural vision in the prompt fields on the right.
                The AI will generate a photorealistic render from your description alone.
              </p>
              <div className="text-mode-tags">
                {['Interior Design', 'Exterior Architecture', 'Urban Planning', 'Structural Concept'].map((tag) => (
                  <span key={tag} className="mode-tag">{tag}</span>
                ))}
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

          {/* Error banner */}
          {error && (
            <div className="error-banner">
              ⚠ {error}
              <button className="error-close" onClick={() => setError('')}>✕</button>
            </div>
          )}
        </div>

        {/* ── Right Panel ── */}
        <div className="studio-right-panel">
          <StyleSelector selectedStyle={selectedStyle} onChange={setSelectedStyle} />

          <div className="panel-section glass-panel">
            <div className="panel-title">Prompt Configuration</div>
            <div className="input-group">
              <label className="input-label">Positive Prompt</label>
              <textarea
                className="input-field prompt-textarea"
                value={positivePrompt}
                onChange={(e) => setPositivePrompt(e.target.value)}
                placeholder="Describe your architectural design..."
                rows={4}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Negative Prompt</label>
              <textarea
                className="input-field prompt-textarea"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="What to avoid..."
                rows={2}
              />
            </div>

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

          <RenderGallery renders={renders} onSelect={setCurrentRender} selectedId={currentRender?.id} />
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
    </div>
  );
};

export default StudioWorkspace;
