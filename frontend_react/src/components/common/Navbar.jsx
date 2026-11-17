import React, { useState } from 'react';
import { Hexagon, Cpu, MoreVertical, Save, Wand2, Clock, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({
  projectTitle,
  onTitleChange,
  mode,
  setMode,
  tunnelConnected,
  onOpenTunnelConfig,
  onSave,
  saving,
  onGenerate,
  isGenerating,
  onOpenHistory,
}) => {
  const { user, logout } = useAuth();
  const [showTopMenu, setShowTopMenu] = useState(false);

  return (
    <div className="studio-navbar relative z-50" style={{ position: 'relative', zIndex: 50 }}>
      {/* Left — 3-Dot Dropdown Menu + Logo */}
      <div className="relative flex items-center gap-2" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* 3-Dot Menu Button placed before ARCHIVISION */}
        <div className="relative" style={{ position: 'relative' }}>
          <button
            className={`p-2 text-red-500 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors flex items-center justify-center cursor-pointer ${
              showTopMenu ? 'bg-gray-800 text-red-400' : 'bg-transparent'
            }`}
            onClick={() => setShowTopMenu(!showTopMenu)}
            title="Project & System Menu"
            style={{
              border: 'none',
              cursor: 'pointer',
              color: showTopMenu ? '#f87171' : '#ef4444',
              background: showTopMenu ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
            }}
          >
            <MoreVertical size={18} />
          </button>

          {showTopMenu && (
            <div
              className="absolute left-0 top-full mt-4 bg-gray-900 border border-gray-700 p-4 rounded-lg shadow-2xl flex flex-col gap-4 z-[9999] w-48"
              style={{
                position: 'absolute',
                left: '0px',
                top: 'calc(100% + 8px)',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                padding: '16px',
                borderRadius: '10px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.9)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                zIndex: 9999,
                width: '200px',
              }}
            >
              {/* User Profile Header Section */}
              <div
                className="flex items-center justify-between pb-3 border-b border-gray-700/80"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #334155',
                  width: '100%',
                }}
              >
                <div className="flex items-center gap-2.5" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    className="user-avatar"
                    title={user?.username || 'pk6'}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #00f0ff, #0088cc)',
                      color: '#050b14',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)',
                    }}
                  >
                    {user?.username?.[0]?.toUpperCase() || 'P'}
                  </div>
                  <div className="flex items-center" style={{ display: 'flex', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#ffffff',
                        maxWidth: '90px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user?.username || 'pk6'}
                    </span>
                    <span
                      className="ml-2"
                      style={{
                        marginLeft: '8px',
                        fontSize: '10px',
                        color: 'var(--text-muted, #94a3b8)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Architect
                    </span>
                  </div>
                </div>

                <button
                  className="btn-icon hover:text-red-400 transition-colors"
                  onClick={() => {
                    setShowTopMenu(false);
                    logout();
                  }}
                  title="Logout"
                  style={{
                    padding: '6px',
                    color: '#94a3b8',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                  }}
                >
                  <LogOut size={16} />
                </button>
              </div>

              {/* Project Name (PK) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project</span>
                <div className="uppercase px-3 py-1.5 border border-gray-600 rounded-md bg-gray-800 text-white font-bold text-xs tracking-wider shadow-sm flex items-center justify-between">
                  <span>{projectTitle ? projectTitle.toUpperCase() : 'UNTITLED'}</span>
                </div>
              </div>

              {/* History Button */}
              <button
                onClick={() => {
                  if (onOpenHistory) onOpenHistory();
                  setShowTopMenu(false);
                }}
                className="text-left hover:text-cyan-400 flex items-center gap-2 text-xs text-gray-300 font-medium py-2 px-3 rounded-md hover:bg-gray-800 transition-colors w-full cursor-pointer"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  width: '100%',
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  padding: '8px 12px',
                }}
                title="View Render History"
              >
                <Clock size={15} className="text-cyan-400" />
                <span>History</span>
              </button>

              {/* Save Button */}
              {onSave && (
                <button
                  className="navbar-save-btn"
                  onClick={() => {
                    onSave();
                    setShowTopMenu(false);
                  }}
                  disabled={saving}
                  title="Save project"
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    borderRadius: '6px',
                  }}
                >
                  <Save size={14} />
                  {saving ? 'Saving...' : 'Save Project'}
                </button>
              )}

              {/* GPU Tunnel Component */}
              <button
                className={`tunnel-btn ${tunnelConnected ? 'tunnel-on' : 'tunnel-off'}`}
                onClick={() => {
                  onOpenTunnelConfig();
                  setShowTopMenu(false);
                }}
                title="Configure GPU Tunnel"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '8px 12px',
                  fontSize: '12px',
                }}
              >
                <Cpu size={15} />
                <span className={`tunnel-dot ${tunnelConnected ? 'dot-on' : 'dot-off'}`} />
                {tunnelConnected ? 'GPU Connected' : 'GPU Tunnel'}
              </button>
            </div>
          )}
        </div>

        {/* Brand Logo & Name */}
        <div className="navbar-brand flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Hexagon size={22} strokeWidth={1.5} />
          <span>ARCHIVISION</span>
        </div>
      </div>

      {/* Center — Perfectly Centered SKETCH / TEXT Toggle */}
      <div
        className="mode-toggle absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2"
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <button
          className={mode === 'sketch' ? 'active' : ''}
          onClick={() => setMode('sketch')}
        >
          ✏️ SKETCH
        </button>
        <button
          className={mode === 'text' ? 'active' : ''}
          onClick={() => setMode('text')}
        >
          💬 TEXT
        </button>
      </div>

      {/* Right — Only Cyan GENERATE Button */}
      <div className="navbar-right flex items-center gap-4" style={{ display: 'flex', alignItems: 'center' }}>
        {onGenerate && (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            title="Generate AI Render"
            style={{
              background: 'linear-gradient(135deg, #00f0ff, #0099cc)',
              color: '#050b14',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 16px',
              fontWeight: '700',
              fontSize: '12px',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              boxShadow: '0 0 14px rgba(0, 240, 255, 0.45)',
              transition: 'all 0.2s ease',
            }}
          >
            <Wand2 size={15} />
            <span>{isGenerating ? 'GENERATING...' : 'GENERATE'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
