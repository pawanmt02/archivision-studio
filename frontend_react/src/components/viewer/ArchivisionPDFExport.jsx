import React, { useState } from 'react';
import { FileDown, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

/**
 * ArchivisionPDFExport Component
 *
 * A sleek, reusable export button styled with Tailwind CSS (dark mode aesthetics,
 * glowing neon cyan accents suited for Archivision Studio).
 *
 * Accepts the exact dynamic prompt state used for this render and triggers
 * an automatic browser download for "Archivision_Design_Report.pdf".
 */
const ArchivisionPDFExport = ({
  original_sketch,
  originalSketch,
  generated_render,
  generatedRender,
  architectural_prompt,
  architecturalPrompt,
  fidelity_score,
  fidelityScore,
  client_name,
  clientName,
  filename = 'Archivision_Design_Report.pdf',
  className = '',
  disabled = false,
  onSuccess,
  onError,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Resolve dynamic prop values (strictly preferring the passed dynamic prompt)
  const resolvedSketch = original_sketch || originalSketch || '';
  const resolvedRender = generated_render || generatedRender || '';
  const resolvedPrompt = (architectural_prompt !== undefined ? architectural_prompt : architecturalPrompt) || '';
  const resolvedScore = typeof fidelity_score === 'number'
    ? fidelity_score
    : typeof fidelityScore === 'number'
    ? fidelityScore
    : 46.5;
  const resolvedClient = client_name || clientName || 'Archivision Studio Client';

  const handleExportPDF = async () => {
    if (isExporting || disabled) return;

    if (!resolvedSketch || !resolvedRender) {
      setErrorMsg('Both sketch and render are required to compile the report.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    setIsExporting(true);
    setErrorMsg('');

    try {
      const payload = {
        original_sketch: resolvedSketch,
        generated_render: resolvedRender,
        architectural_prompt: resolvedPrompt || 'Architectural Conceptual Synthesis',
        fidelity_score: resolvedScore,
        client_name: resolvedClient,
      };

      // Request PDF as binary arraybuffer / blob
      const response = await axiosClient.post('/api/export-pdf', payload, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/pdf',
        },
      });

      // Create download blob URL
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);

      // Trigger automatic browser download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Success feedback animation
      setIsSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err) {
      console.error('[ArchivisionPDFExport] Export failed:', err);
      const msg = err.response?.data?.detail || err.message || 'PDF compilation failed';
      setErrorMsg(msg);
      if (onError) onError(err);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`archivision-export-container w-full ${className}`} style={{ marginTop: '12px' }}>
      <button
        type="button"
        onClick={handleExportPDF}
        disabled={isExporting || disabled}
        className={`
          relative group overflow-hidden w-full flex items-center justify-center gap-2.5 px-4 py-3
          rounded-xl font-bold text-xs tracking-wider uppercase
          transition-all duration-300 ease-out select-none cursor-pointer
          border border-cyan-400/50 hover:border-cyan-300
          text-cyan-300 hover:text-white
          bg-slate-950/90 hover:bg-slate-900
          shadow-[0_0_15px_rgba(6,182,212,0.2)]
          hover:shadow-[0_0_28px_rgba(6,182,212,0.5),inset_0_0_15px_rgba(6,182,212,0.25)]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
        `}
        style={{
          background: isSuccess
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 78, 59, 0.4) 100%)'
            : 'linear-gradient(135deg, #0b1324 0%, #132038 100%)',
          border: isSuccess ? '1.5px solid #10b981' : '1.5px solid #00f0ff',
          boxShadow: isSuccess
            ? '0 0 22px rgba(16, 185, 129, 0.5), inset 0 0 12px rgba(16, 185, 129, 0.2)'
            : '0 0 18px rgba(0, 240, 255, 0.35), inset 0 0 10px rgba(0, 240, 255, 0.12)',
          color: isSuccess ? '#34d399' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          padding: '12px 16px',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '12px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: isExporting || disabled ? 'not-allowed' : 'pointer',
          textShadow: isSuccess ? '0 0 8px rgba(52, 211, 153, 0.6)' : '0 0 8px rgba(0, 240, 255, 0.6)',
        }}
        title="Download official A4 Archivision Project Design Report (PDF)"
      >
        {/* Ambient hover glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(0, 240, 255, 0.2) 0%, transparent 70%)',
          }}
        />

        {/* Top Edge Neon Accent Line */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
          style={{
            background: isSuccess
              ? 'linear-gradient(90deg, transparent, #34d399, transparent)'
              : 'linear-gradient(90deg, transparent, #00f0ff, #8b5cf6, transparent)',
          }}
        />

        {/* Dynamic button content */}
        {isExporting ? (
          <>
            <Loader2 size={16} color="#00f0ff" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#67e8f9', fontWeight: 700, textShadow: '0 0 8px rgba(0, 240, 255, 0.5)' }}>
              Generating Archivision Report...
            </span>
          </>
        ) : isSuccess ? (
          <>
            <CheckCircle2 size={16} color="#34d399" />
            <span style={{ color: '#34d399', fontWeight: 700, textShadow: '0 0 8px rgba(52, 211, 153, 0.5)' }}>
              Report Generated & Downloaded
            </span>
          </>
        ) : (
          <>
            <Sparkles size={15} color="#00f0ff" />
            <FileDown size={16} color="#00f0ff" />
            <span style={{ color: '#ffffff', fontWeight: 700, textShadow: '0 0 10px rgba(0, 240, 255, 0.6)' }}>
              Export Archivision PDR (PDF)
            </span>
          </>
        )}
      </button>

      {/* Error feedback banner */}
      {errorMsg && (
        <div
          className="mt-2 px-3 py-1.5 rounded-lg text-xs text-rose-300 bg-rose-950/60 border border-rose-500/40 flex items-center justify-between"
          style={{
            marginTop: '6px',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            backgroundColor: 'rgba(136, 19, 55, 0.4)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: '#fca5a5',
          }}
        >
          <span>⚠ {errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            style={{ background: 'none', border: 'none', color: '#fda4af', cursor: 'pointer', marginLeft: '8px' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default ArchivisionPDFExport;
