'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download, Zap, ExternalLink,
  CheckCircle, AlertCircle, Loader2, Lock, ShieldAlert, EyeOff,
} from 'lucide-react';
import { OptimizeStatus } from '@/lib/types';
import { useAdminResume } from '@/lib/AdminResumeContext';
import { useAuth } from '@/lib/AuthContext';

const OPTIMIZE_MESSAGES = [
  'Analyzing job description…',
  'Matching resume keywords…',
  'Improving summary section…',
  'Aligning experience points…',
  'Tailoring skills section…',
  'Refining accomplishments…',
  'Finalizing optimized resume…',
];

function randomDuration() {
  return 10_000 + Math.floor(Math.random() * 5_000);
}

const TICK_MS = 200;

interface ActionPanelProps {
  jobId: string;
  jobUrl: string;
  jobTitle: string;
  company: string;
  department: string;
}

export default function ActionPanel({ jobId, jobUrl, jobTitle, company, department }: ActionPanelProps) {
  const { adminResume, downloadAdminResume } = useAdminResume();
  const { currentUser, candidates, markJobSubmitted, markJobOptimized, hideJob } = useAuth();

  const [status, setStatus] = useState<OptimizeStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [downloaded, setDownloaded] = useState(false);
  const [showNoResume, setShowNoResume] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [hasClickedApply, setHasClickedApply] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsed = useRef(0);
  const duration = useRef(randomDuration());

  const hasValidUrl = Boolean(jobUrl && jobUrl.startsWith('http'));
  const downloadEnabled = status === 'complete';
  const applyEnabled = hasValidUrl && downloaded;

  const startOptimize = useCallback(() => {
    if (!adminResume) {
      setShowNoResume(true);
      setTimeout(() => setShowNoResume(false), 3500);
      return;
    }
    if (status === 'processing' || status === 'complete') return;
    if (isSubmittedState.current) return;

    duration.current = randomDuration();
    setStatus('processing');
    setProgress(0);
    setMsgIndex(0);
    elapsed.current = 0;

    timerRef.current = setInterval(() => {
      elapsed.current += TICK_MS;
      const pct = Math.min((elapsed.current / duration.current) * 100, 100);
      setProgress(pct);

      const msgStep = Math.floor(
        (elapsed.current / duration.current) * OPTIMIZE_MESSAGES.length,
      );
      setMsgIndex(Math.min(msgStep, OPTIMIZE_MESSAGES.length - 1));

      if (elapsed.current >= duration.current) {
        clearInterval(timerRef.current!);
        setProgress(100);
        setMsgIndex(OPTIMIZE_MESSAGES.length - 1);
        setStatus('complete');
        if (currentUser) {
          markJobOptimized(currentUser.id, jobId);
        }
      }
    }, TICK_MS);
  }, [adminResume, status, currentUser, jobId, markJobOptimized]);

  const isSubmittedState = useRef(false);

  // Derive permanent state on mount
  useEffect(() => {
    if (!currentUser) return;
    const candData = candidates.find(c => c.id === currentUser.id);
    if (!candData) return;

    const isSubmitted = candData.completedJobIds?.includes(jobId);
    const isOptimized = isSubmitted || candData.optimizedJobIds?.includes(jobId);

    if (isSubmitted) {
      isSubmittedState.current = true;
      setStatus('complete');
      setDownloaded(true);
      setHasClickedApply(true);
    } else if (isOptimized && status === 'idle') {
      setStatus('complete');
    }
  }, [currentUser, candidates, jobId]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleDownload = () => {
    if (!downloadEnabled) return;
    const ok = downloadAdminResume();
    if (ok) {
      setDownloaded(true);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };

  const handleApply = () => {
    if (applyEnabled) {
      window.open(jobUrl, '_blank', 'noopener,noreferrer');
      setHasClickedApply(true);
    }
  };

  const handleSubmitCompletion = () => {
    if (currentUser) {
      markJobSubmitted(currentUser.id, jobId, jobTitle, company, department);
    }
  };

  const handleHide = () => {
    if (currentUser && confirm('Are you sure you want to hide this job? It will be permanently removed from your dashboard.')) {
      hideJob(currentUser.id, jobId);
    }
  };

  return (
    <div className="action-panel">

      {/* ── Step 1: Optimize ── */}
      {status === 'idle' && (
        <button
          id={`btn-optimize-${jobId}`}
          className={`btn-optimize${!adminResume ? ' btn-optimize-warn' : ''}`}
          onClick={startOptimize}
          title={!adminResume ? 'Admin has not uploaded a resume yet' : 'Optimize for this job'}
        >
          <Zap size={16} />
          <span>Optimize Resume{!adminResume ? ' First' : ''}</span>
        </button>
      )}

      {status === 'processing' && (
        <div className="optimize-progress-block">
          <div className="optimize-progress-header">
            <Loader2 size={14} className="spin" />
            <span>Optimizing…</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="optimize-message">{OPTIMIZE_MESSAGES[msgIndex]}</p>
        </div>
      )}

      {status === 'complete' && (
        <div className="optimize-complete-block">
          <CheckCircle size={15} />
          <span>{isSubmittedState.current ? 'Application Submitted' : 'Optimization Complete'}</span>
        </div>
      )}

      {showNoResume && (
        <div className="no-resume-warning">
          <ShieldAlert size={14} />
          <span>Admin resume not configured yet.</span>
        </div>
      )}

      {/* ── Step 2 & 3: Icon row ── */}
      <div className="action-icon-row">

        {/* Resume download — enabled after optimize */}
        <button
          id={`btn-resume-${jobId}`}
          className={`action-icon-btn${downloadEnabled ? ' active-download' : ' disabled-btn'}`}
          onClick={handleDownload}
          disabled={!downloadEnabled}
          title={!downloadEnabled ? 'Complete optimization first' : 'Download your optimized resume'}
        >
          {downloadEnabled ? (
            downloaded
              ? <CheckCircle size={18} className="text-green-400" />
              : <Download size={18} className={downloadSuccess ? 'text-green-400' : ''} />
          ) : (
            <Lock size={16} />
          )}
          <span className="action-icon-label">Resume</span>
        </button>

        {/* Optimize icon */}
        <button
          id={`btn-opt-icon-${jobId}`}
          className={`action-icon-btn optimize-icon-btn${status === 'complete' ? ' done' : ''}`}
          onClick={startOptimize}
          disabled={status === 'processing' || status === 'complete'}
          title="Optimize resume"
        >
          {status === 'processing' ? (
            <Loader2 size={18} className="spin" />
          ) : status === 'complete' ? (
            <CheckCircle size={18} className="text-green-400" />
          ) : (
            <Zap size={18} />
          )}
          <span className="action-icon-label">Optimize</span>
        </button>

        {/* Apply icon state */}
        <div
          className={`action-icon-btn${applyEnabled ? ' apply-icon-active' : ' disabled-btn'}`}
          title={applyEnabled ? 'Ready to apply' : 'Download resume to unlock'}
        >
          <ExternalLink size={16} className={applyEnabled ? 'text-blue-500' : ''} />
          <span className="action-icon-label">Apply</span>
        </div>
      </div>

      {/* ── Step 3: Apply button + Hide Job row ── */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          id={`btn-apply-${jobId}`}
          className={`btn-apply${applyEnabled ? '' : ' btn-apply-disabled'}`}
          style={{ flex: 1 }}
          onClick={handleApply}
          disabled={!applyEnabled}
          title={
            !downloaded
              ? 'Download your optimized resume first to unlock Apply'
              : !hasValidUrl
              ? 'No job link available'
              : 'Open job application on LinkedIn'
          }
        >
          <ExternalLink size={16} />
          <span>Apply for this Position</span>
        </button>

        <button
          onClick={handleHide}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 12px', borderRadius: '8px', border: '1px solid #fee2e2',
            background: '#fff', color: '#ef4444', cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          title="Job expired on LinkedIn? Hide it permanently."
          onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
          onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
        >
          <EyeOff size={18} />
        </button>
      </div>

      {/* ── Step 4: Submit Completion ── */}
      {hasClickedApply && !isSubmittedState.current && (
        <button
          className="btn-apply mt-3 !bg-green-600 hover:!bg-green-700 !text-white !border-none"
          onClick={handleSubmitCompletion}
          title="Mark this application as completed to remove it from your dashboard"
        >
          <CheckCircle size={16} />
          <span>Submit Application</span>
        </button>
      )}

      {/* Contextual hints */}
      {downloadEnabled && !downloaded && (
        <p className="hint-text">⬆ Download resume to unlock Apply</p>
      )}
      {downloaded && !hasValidUrl && (
        <p className="no-link-note">Job link unavailable</p>
      )}
      {downloadSuccess && (
        <p className="download-success-note">
          <CheckCircle size={12} /> Your training resume is ready!
        </p>
      )}
    </div>
  );
}
