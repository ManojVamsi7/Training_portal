'use client';
import './admin.css';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, Upload, FileText, Trash2, Pencil, Plus,
  X, CheckCircle, Loader2, Building2, ExternalLink,
  Save, FileUp, Users, BarChart2, Calendar, ChevronDown, ChevronUp,
  Eye, EyeOff, BookOpen,
} from 'lucide-react';
import { useJobs } from '@/lib/JobsContext';
import { useAdminResume, AdminResume } from '@/lib/AdminResumeContext';
import { useAuth } from '@/lib/AuthContext';
import { parseJobsCSV } from '@/lib/csvParser';
import { Job } from '@/lib/types';

// ─── Blank job template ──────────────────────
function blankJob(): Partial<Job> {
  return {
    title: '', company: '', description: '',
    jobUrl: '', location: '', department: '',
    jobId: '', postedDate: '', experience: '',
    matchScore: 2,
  };
}

// ─── Edit Modal ───────────────────────────────
function JobEditModal({ job, onSave, onClose, isNew }: {
  job: Partial<Job>;
  onSave: (j: Partial<Job>) => void;
  onClose: () => void;
  isNew: boolean;
}) {
  const [form, setForm] = useState<Partial<Job>>(job);
  const set = (k: keyof Job) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box admin-modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isNew ? 'Add New Job' : 'Edit Job'}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="admin-form-grid">
          <div className="form-group">
            <label>Job Title *</label>
            <input className="form-input" value={form.title || ''} onChange={set('title')} placeholder="e.g. Senior Data Engineer" />
          </div>
          <div className="form-group">
            <label>Company *</label>
            <input className="form-input" value={form.company || ''} onChange={set('company')} placeholder="e.g. Acme Corp" />
          </div>
          <div className="form-group col-span-2">
            <label>Description</label>
            <textarea className="form-input form-textarea" value={form.description || ''} onChange={set('description')} placeholder="Job description…" rows={4} />
          </div>
          <div className="form-group col-span-2">
            <label>Job / LinkedIn URL</label>
            <input className="form-input" value={form.jobUrl || ''} onChange={set('jobUrl')} placeholder="https://linkedin.com/jobs/…" />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input className="form-input" value={form.location || ''} onChange={set('location')} placeholder="e.g. New York NY" />
          </div>
          <div className="form-group">
            <label>Department / Category</label>
            <input className="form-input" value={form.department || ''} onChange={set('department')} placeholder="e.g. Data Engineer" />
          </div>
          <div className="form-group">
            <label>Job ID</label>
            <input className="form-input" value={form.jobId || ''} onChange={set('jobId')} placeholder="e.g. 58201" />
          </div>
          <div className="form-group">
            <label>Posted Date</label>
            <input className="form-input" type="date" value={form.postedDate || ''} onChange={set('postedDate')} />
          </div>
          <div className="form-group">
            <label>Years Experience</label>
            <input className="form-input" value={form.experience || ''} onChange={set('experience')} placeholder="e.g. 3" />
          </div>
          <div className="form-group">
            <label>Match Score (1–3)</label>
            <select className="form-input" value={form.matchScore ?? 2} onChange={set('matchScore')}>
              <option value={1}>1 — Low</option>
              <option value={2}>2 — Medium</option>
              <option value={3}>3 — High</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => { if (!form.title?.trim()) return alert('Title is required'); onSave(form); }}>
            <Save size={15} /> {isNew ? 'Add Job' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────
type AdminTab = 'jobs' | 'candidates' | 'tracking';

export default function AdminPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading, logout, candidates, createCandidate, deleteCandidate, assignResume } = useAuth();
  const { jobs, addJob, addJobsBatch, updateJob, deleteJob, deleteJobsBatch, loading: jobsLoading } = useJobs();
  const { resumes, loading: resumeLoading, addResume, deleteResume } = useAdminResume();

  const [activeTab, setActiveTab]           = useState<AdminTab>('jobs');
  const [editJob, setEditJob]               = useState<Partial<Job> | null>(null);
  const [isNewJob, setIsNewJob]             = useState(false);
  const [toast, setToast]                   = useState('');
  const [csvParsing, setCsvParsing]         = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [jobDateFilter, setJobDateFilter]   = useState('');

  // ── Resume library state ──
  const [newResumeLabel, setNewResumeLabel] = useState('');
  const [resumeUploading, setResumeUploading] = useState(false);
  const resumeLibInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection for resume library upload
  const handleResumeLibUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.pdf' && ext !== '.docx') {
      showToast('❌ Only PDF or DOCX files are allowed.');
      return;
    }
    const label = newResumeLabel.trim() || file.name.replace(/\.[^.]+$/, '');
    setResumeUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const data = ev.target?.result as string;
      const resume: AdminResume = {
        id: `resume_${Date.now()}`,
        label,
        filename: file.name,
        data,
        type: file.type || 'application/pdf',
        uploadedAt: new Date().toISOString(),
      };
      await addResume(resume);
      setNewResumeLabel('');
      setResumeUploading(false);
      showToast(`✅ Resume "${label}" added to library.`);
    };
    reader.onerror = () => { setResumeUploading(false); showToast('❌ Failed to read file.'); };
    reader.readAsDataURL(file);
  }, [addResume, newResumeLabel]);

  // ── Upload-date helpers ──
  function formatUploadDate(iso: string | undefined) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return '—'; }
  }

  function isSameUploadDay(iso: string | undefined, dateStr: string) {
    if (!dateStr || !iso) return false;
    const d = new Date(iso);
    const f = new Date(dateStr);
    return d.getFullYear() === f.getFullYear() && d.getMonth() === f.getMonth() && d.getDate() === f.getDate();
  }

  // Jobs visible in the table after applying date filter
  const filteredJobs = jobDateFilter
    ? jobs.filter(j => isSameUploadDay(j.uploadedAt, jobDateFilter))
    : jobs;

  // Candidate tab state
  const [newCandUser, setNewCandUser]       = useState('');
  const [newCandPass, setNewCandPass]       = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  // Tracking tab state
  const [expandedCandId, setExpandedCandId] = useState<string | null>(null);
  const [dateFilters, setDateFilters]        = useState<Record<string, string>>({});

  const csvInputRef = useRef<HTMLInputElement>(null);


  // Auth Guard
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) router.push('/login');
      else if (currentUser.role !== 'admin') router.push('/');
    }
  }, [currentUser, authLoading, router]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  function togglePasswordVisibility(id: string) {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Resume Upload ──

  // ── CSV Upload ──
  const handleCSVUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvParsing(true);
    try {
      const text = await file.text();
      const parsed = await parseJobsCSV(text);
      if (!parsed.length) { showToast('❌ No jobs found in CSV.'); return; }
      const existingKeys = new Set(jobs.map(j => (j.jobId || '') + j.title + j.company));
      const newUniqueJobs: Job[] = [];
      parsed.forEach(job => {
        const key = (job.jobId || '') + job.title + job.company;
        if (!existingKeys.has(key)) { newUniqueJobs.push(job); existingKeys.add(key); }
      });
      if (newUniqueJobs.length > 0) {
        await addJobsBatch(newUniqueJobs);
        showToast(`✅ Uploaded ${newUniqueJobs.length} unique jobs (${parsed.length - newUniqueJobs.length} duplicates skipped).`);
      } else {
        showToast('ℹ️ All uploaded jobs were duplicates. None were added.');
      }
    } catch {
      showToast('❌ Failed to parse CSV file.');
    } finally {
      setCsvParsing(false);
      e.target.value = '';
    }
  }, [jobs, addJobsBatch]);

  // ── Job CRUD ──
  function handleSaveJob(form: Partial<Job>) {
    if (isNewJob) {
      addJob({ ...form, id: `job-manual-${Date.now()}`, matchScore: Number(form.matchScore) || 2, uploadedAt: new Date().toISOString() } as Job);
      showToast('✅ Job added.');
    } else {
      updateJob({ ...form, matchScore: Number(form.matchScore) || 2 } as Job);
      showToast('✅ Job updated.');
    }
    setEditJob(null);
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this job?')) return;
    deleteJob(id);
    showToast('🗑️ Job deleted.');
  }

  // ── Candidate management ──
  async function handleCreateCandidate(e: React.FormEvent) {
    e.preventDefault();
    if (!newCandUser || !newCandPass) return alert('Enter username and password');
    const ok = await createCandidate(newCandUser, newCandPass);
    if (!ok) return alert('Username already exists!');
    showToast('🧑‍🎓 Candidate created.');
    setNewCandUser(''); setNewCandPass('');
  }

  function handleDeleteCandidate(id: string, username: string) {
    if (!confirm(`Revoke access for "${username}"? This cannot be undone.`)) return;
    deleteCandidate(id);
    showToast(`🗑️ Revoked access for ${username}`);
  }

  // ── Tracking helpers ──
  function formatDateTime(iso: string) {
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  }

  function isSameDay(iso: string, dateStr: string) {
    if (!dateStr) return true;
    const d = new Date(iso);
    const filter = new Date(dateStr);
    return (
      d.getFullYear() === filter.getFullYear() &&
      d.getMonth() === filter.getMonth() &&
      d.getDate() === filter.getDate()
    );
  }

  if (authLoading || !currentUser || currentUser.role !== 'admin') {
    return <div className="center-state"><Loader2 className="spin" /> Loading Admin...</div>;
  }

  const totalSubmissions = candidates.reduce((acc, c) => acc + (c.submissions?.length || 0), 0);

  return (
    <div className="admin-page">
      {toast && <div className="admin-toast"><span>{toast}</span></div>}

      {editJob && (
        <JobEditModal job={editJob} onSave={handleSaveJob} onClose={() => setEditJob(null)} isNew={isNewJob} />
      )}

      {/* ── Header ── */}
      <header className="admin-header">
        <div className="admin-header-left">
          <ShieldCheck size={24} className="text-indigo-400" />
          <div>
            <h1 className="admin-title">Admin Portal</h1>
            <p className="admin-subtitle">Manage jobs, candidates, and resume configuration</p>
          </div>
        </div>
        <div className="admin-header-right">
          <button className="btn-secondary" onClick={logout}>Sign Out</button>
        </div>
      </header>

      <div className="admin-body">

        {/* ── Stats bar ── */}
        <div className="admin-stats-row">
          <div className="stat-card">
            <Building2 size={20} className="stat-icon text-indigo-500" />
            <div><p className="stat-value">{jobs.length}</p><p className="stat-label">Total Jobs</p></div>
          </div>
          <div className="stat-card">
            <Users size={20} className="stat-icon text-blue-500" />
            <div><p className="stat-value">{candidates.length}</p><p className="stat-label">Candidates</p></div>
          </div>
          <div className="stat-card">
            <BarChart2 size={20} className="stat-icon text-violet-500" />
            <div><p className="stat-value">{totalSubmissions}</p><p className="stat-label">Total Submissions</p></div>
          </div>
          <div className={`stat-card${resumes.length === 0 ? ' stat-card-warn' : ''}`}>
            <BookOpen size={20} className={`stat-icon ${resumes.length > 0 ? 'text-green-500' : 'text-amber-500'}`} />
            <div><p className="stat-value">{resumes.length > 0 ? resumes.length : 'None'}</p><p className="stat-label">Resumes in Library</p></div>
          </div>
        </div>

        {/* ── Tab Nav ── */}
        <div className="admin-tab-nav">
          <button className={`admin-tab-btn${activeTab === 'jobs' ? ' admin-tab-active' : ''}`} onClick={() => setActiveTab('jobs')}>
            <Building2 size={16} /> Jobs &amp; Resume
          </button>
          <button className={`admin-tab-btn${activeTab === 'candidates' ? ' admin-tab-active' : ''}`} onClick={() => setActiveTab('candidates')}>
            <Users size={16} /> Candidates
          </button>
          <button className={`admin-tab-btn${activeTab === 'tracking' ? ' admin-tab-active' : ''}`} onClick={() => setActiveTab('tracking')}>
            <BarChart2 size={16} /> Application Tracking
          </button>
        </div>

        {/* ════════════════════════════
            TAB 1 — JOBS & RESUME
        ════════════════════════════ */}
        {activeTab === 'jobs' && (
          <>
            {/* ── Resume Library ── */}
            <section className="admin-section">
              <div className="section-header">
                <BookOpen size={18} /><h2>Resume Library</h2>
                <span className="section-badge">{resumes.length} resume{resumes.length !== 1 ? 's' : ''} uploaded</span>
              </div>

              {/* Upload form */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '16px', flexWrap: 'wrap', padding: '16px', background: '#f8f9fb', borderRadius: '12px', border: '1.5px solid #e5e7eb' }}>
                <div className="form-group" style={{ flex: '1 1 200px', margin: 0 }}>
                  <label>Resume Label</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Resume A, Data Engineer Resume"
                    value={newResumeLabel}
                    onChange={e => setNewResumeLabel(e.target.value)}
                  />
                </div>
                <button
                  className="btn-primary"
                  onClick={() => resumeLibInputRef.current?.click()}
                  disabled={resumeUploading}
                  style={{ height: '40px' }}
                >
                  {resumeUploading ? <Loader2 size={15} className="spin" /> : <FileUp size={15} />}
                  Upload Resume
                </button>
                <input ref={resumeLibInputRef} type="file" accept=".pdf,.docx" onChange={handleResumeLibUpload} style={{ display: 'none' }} />
              </div>

              {/* Resume list */}
              {resumeLoading ? (
                <div className="center-state" style={{ padding: '40px 0' }}><Loader2 size={24} className="spin text-indigo-500" /></div>
              ) : resumes.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <FileText size={36} />
                  <p className="empty-title">No resumes uploaded yet</p>
                  <p className="empty-sub">Add a label above and click Upload Resume to get started</p>
                </div>
              ) : (
                <div className="admin-jobs-table-wrap" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  <table className="admin-jobs-table">
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr>
                        <th>Label</th>
                        <th>Filename</th>
                        <th>Uploaded</th>
                        <th>Assigned To</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumes.map(r => {
                        const assignedCount = candidates.filter(c => c.assignedResumeId === r.id).length;
                        return (
                          <tr key={r.id}>
                            <td>
                              <span style={{ fontWeight: 700, color: '#4f46e5' }}>{r.label}</span>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>{r.filename}</td>
                            <td>
                              <span style={{ fontSize: '0.78rem', color: '#0369a1', background: '#f0f9ff', padding: '2px 7px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                {formatUploadDate(r.uploadedAt)}
                              </span>
                            </td>
                            <td>
                              <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '3px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.8rem' }}>
                                {assignedCount} candidate{assignedCount !== 1 ? 's' : ''}
                              </span>
                            </td>
                            <td>
                              <button
                                className="tbl-btn del-btn"
                                title="Delete this resume"
                                onClick={() => {
                                  if (!confirm(`Delete resume "${r.label}"? Candidates assigned to it will lose their resume.`)) return;
                                  deleteResume(r.id);
                                  showToast(`🗑️ Resume "${r.label}" deleted.`);
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Jobs */}
            <section className="admin-section">
              <div className="section-header">
                <Building2 size={18} /><h2>Job Listings</h2>
                <span className="section-badge">
                  {jobDateFilter
                    ? `${filteredJobs.length} jobs on ${new Date(jobDateFilter).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : `${jobs.length} jobs total`
                  }
                </span>
              </div>

              {/* ─ Date filter bar ─ */}
              <div className="tracker-filter-row" style={{ marginBottom: '14px', padding: '12px 16px', background: '#f8f9fb', borderRadius: '10px', border: '1.5px solid #e5e7eb' }}>
                <Calendar size={15} className="text-indigo-400" />
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Filter by upload date:</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: 'auto', padding: '6px 10px', fontSize: '0.85rem' }}
                  value={jobDateFilter}
                  onChange={e => { setJobDateFilter(e.target.value); setSelectedJobIds([]); }}
                />
                {jobDateFilter && (
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => { setJobDateFilter(''); setSelectedJobIds([]); }}>
                    Clear
                  </button>
                )}
                {jobDateFilter && filteredJobs.length === 0 && (
                  <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>No jobs uploaded on this date</span>
                )}
              </div>
              <div className="admin-jobs-toolbar">
                <button className="btn-primary" onClick={() => { setEditJob(blankJob()); setIsNewJob(true); }}><Plus size={15} /> Add Job</button>
                <button className="btn-secondary" onClick={() => csvInputRef.current?.click()} disabled={csvParsing}>
                  {csvParsing ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} Upload CSV
                </button>
                {selectedJobIds.length > 0 && (
                  <button className="btn-danger-outline" onClick={async () => {
                    if (!confirm(`Delete ${selectedJobIds.length} selected jobs?`)) return;
                    await deleteJobsBatch(selectedJobIds);
                    setSelectedJobIds([]);
                    showToast(`🗑️ ${selectedJobIds.length} jobs deleted.`);
                  }}>
                    <Trash2 size={15} /> Delete Selected ({selectedJobIds.length})
                  </button>
                )}
              </div>
              <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />

              {jobsLoading ? (
                <div className="center-state"><Loader2 size={28} className="spin text-indigo-500" /><p>Loading jobs…</p></div>
              ) : jobs.length === 0 ? (
                <div className="empty-state"><FileText size={36} /><p className="empty-title">No jobs loaded</p><p className="empty-sub">Upload a CSV or add jobs manually</p></div>
              ) : (
                <div className="admin-jobs-table-wrap" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                  <table className="admin-jobs-table">
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input type="checkbox"
                            checked={filteredJobs.length > 0 && filteredJobs.every(j => selectedJobIds.includes(j.id))}
                            onChange={e => {
                              if (e.target.checked) setSelectedJobIds(filteredJobs.map(j => j.id));
                              else setSelectedJobIds(prev => prev.filter(id => !filteredJobs.some(j => j.id === id)));
                            }}
                            style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                          />
                        </th>
                        <th>Job Title</th><th>Company</th><th>Location</th>
                        <th>Department</th><th>Score</th><th>Uploaded</th><th>Link</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.map(job => (
                        <tr key={job.id} style={{ backgroundColor: selectedJobIds.includes(job.id) ? '#f0f9ff' : '' }}>
                          <td style={{ textAlign: 'center' }}>
                            <input type="checkbox"
                              checked={selectedJobIds.includes(job.id)}
                              onChange={e => {
                                if (e.target.checked) setSelectedJobIds(prev => [...prev, job.id]);
                                else setSelectedJobIds(prev => prev.filter(id => id !== job.id));
                              }}
                              style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                            />
                          </td>
                          <td>
                            <div className="table-job-title">{job.title}</div>
                            {job.jobId && <div className="table-job-id">#{job.jobId}</div>}
                          </td>
                          <td>{job.company || '—'}</td>
                          <td>{job.location || '—'}</td>
                          <td>{job.department ? <span className="dept-tag-sm">{job.department}</span> : '—'}</td>
                          <td><span className={`score-badge score-${job.matchScore}`}>{job.matchScore}</span></td>
                          <td>
                            <span style={{ fontSize: '0.78rem', color: job.uploadedAt ? '#0369a1' : '#9ca3af', background: job.uploadedAt ? '#f0f9ff' : 'transparent', padding: job.uploadedAt ? '2px 7px' : '0', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                              {formatUploadDate(job.uploadedAt)}
                            </span>
                          </td>
                          <td>
                            {job.jobUrl
                              ? <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="table-link"><ExternalLink size={13} /> View</a>
                              : <span className="table-no-link">—</span>}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button className="tbl-btn edit-btn" title="Edit" onClick={() => { setEditJob(job); setIsNewJob(false); }}><Pencil size={14} /></button>
                              <button className="tbl-btn del-btn" title="Delete" onClick={() => handleDelete(job.id)}><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {/* ════════════════════════════
            TAB 2 — CANDIDATES
        ════════════════════════════ */}
        {activeTab === 'candidates' && (
          <>
            <section className="admin-section">
              <div className="section-header">
                <Users size={18} /><h2>Candidate Accounts</h2>
                <span className="section-badge">Manage access</span>
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Create form */}
                <div style={{ flex: '1 1 280px', background: '#f8f9fb', padding: '20px', borderRadius: '12px', border: '1.5px solid #e5e7eb' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px' }}>Create Candidate</h3>
                  <form onSubmit={handleCreateCandidate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input className="form-input" placeholder="Username" value={newCandUser} onChange={e => setNewCandUser(e.target.value)} />
                    <input className="form-input" placeholder="Password" type="password" value={newCandPass} onChange={e => setNewCandPass(e.target.value)} />
                    <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}><Plus size={16} /> Add Candidate</button>
                  </form>
                </div>

                {/* Scrollable candidate list */}
                <div style={{ flex: '2 1 380px', maxHeight: '400px', overflowY: 'auto', borderRadius: '10px', border: '1.5px solid #e5e7eb' }}>
                  {candidates.length === 0 ? (
                    <p style={{ color: '#6b7280', fontSize: '0.9rem', padding: '20px' }}>No candidates created yet.</p>
                  ) : (
                    <div>
                      <table className="admin-jobs-table">
                        <thead>
                          <tr>
                            <th>Username</th>
                            <th>Password</th>
                            <th>Assigned Resume</th>
                            <th>Submissions</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidates.map(c => (
                            <tr key={c.id}>
                              <td style={{ fontWeight: 600 }}>{c.username}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{
                                    color: visiblePasswords.has(c.id) ? '#111827' : '#9ca3af',
                                    letterSpacing: visiblePasswords.has(c.id) ? '0' : '2px',
                                    fontFamily: visiblePasswords.has(c.id) ? 'inherit' : 'monospace',
                                    fontSize: '0.875rem',
                                    minWidth: '80px',
                                  }}>
                                    {visiblePasswords.has(c.id) ? (c.password || '—') : '••••••••'}
                                  </span>
                                  <button
                                    onClick={() => togglePasswordVisibility(c.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '2px', display: 'flex', alignItems: 'center' }}
                                    title={visiblePasswords.has(c.id) ? 'Hide password' : 'Show password'}
                                  >
                                    {visiblePasswords.has(c.id) ? <EyeOff size={15} /> : <Eye size={15} />}
                                  </button>
                                </div>
                              </td>
                              <td>
                                <select
                                  className="form-input"
                                  style={{ padding: '5px 8px', fontSize: '0.78rem', width: '100%', maxWidth: '160px' }}
                                  value={c.assignedResumeId || ''}
                                  onChange={e => assignResume(c.id, e.target.value)}
                                >
                                  <option value="">— Not Assigned —</option>
                                  {resumes.map(r => (
                                    <option key={r.id} value={r.id}>{r.label}</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '3px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.8rem' }}>
                                  {c.submissions?.length || 0}
                                </span>
                              </td>
                              <td>
                                <button className="btn-danger-outline" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => handleDeleteCandidate(c.id, c.username)}>
                                  <Trash2 size={13} /> Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ════════════════════════════
            TAB 3 — APPLICATION TRACKING
        ════════════════════════════ */}
        {activeTab === 'tracking' && (
          <>
            <section className="admin-section">
              <div className="section-header">
                <BarChart2 size={18} /><h2>Application Tracker</h2>
                <span className="section-badge">{totalSubmissions} total submissions</span>
              </div>

              {candidates.length === 0 ? (
                <div className="empty-state">
                  <Users size={36} />
                  <p className="empty-title">No candidates yet</p>
                  <p className="empty-sub">Create candidate accounts in the Candidates tab to start tracking</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {candidates.map(cand => {
                    const subs = cand.submissions || [];
                    const isExpanded = expandedCandId === cand.id;
                    const dateFilter = dateFilters[cand.id] || '';
                    const filteredSubs = subs.filter(s => isSameDay(s.submittedAt, dateFilter));

                    return (
                      <div key={cand.id} className="tracker-card">
                        {/* Candidate summary row */}
                        <button className="tracker-card-header" onClick={() => setExpandedCandId(isExpanded ? null : cand.id)}>
                          <div className="tracker-cand-info">
                            <div className="tracker-avatar">{cand.username.charAt(0).toUpperCase()}</div>
                            <div>
                              <p className="tracker-cand-name">{cand.username}</p>
                              <p className="tracker-cand-sub">{subs.length} application{subs.length !== 1 ? 's' : ''} submitted</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className="tracker-count-badge">{subs.length}</span>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </button>

                        {/* Expanded detail with date filter */}
                        {isExpanded && (
                          <div className="tracker-detail">
                            <div className="tracker-filter-row">
                              <Calendar size={15} className="text-indigo-400" />
                              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Filter by date:</label>
                              <input
                                type="date"
                                className="form-input"
                                style={{ width: 'auto', padding: '6px 10px', fontSize: '0.85rem' }}
                                value={dateFilter}
                                onChange={e => setDateFilters(prev => ({ ...prev, [cand.id]: e.target.value }))}
                              />
                              {dateFilter && (
                                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                  onClick={() => setDateFilters(prev => ({ ...prev, [cand.id]: '' }))}>
                                  Clear
                                </button>
                              )}
                            </div>

                            {subs.length === 0 ? (
                              <p style={{ color: '#9ca3af', fontSize: '0.875rem', padding: '20px 0', textAlign: 'center' }}>No applications submitted yet.</p>
                            ) : filteredSubs.length === 0 ? (
                              <p style={{ color: '#9ca3af', fontSize: '0.875rem', padding: '20px 0', textAlign: 'center' }}>No applications submitted on this date.</p>
                            ) : (
                              <div className="admin-jobs-table-wrap" style={{ marginTop: '0', maxHeight: '400px', overflowY: 'auto' }}>
                                <table className="admin-jobs-table">
                                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                    <tr>
                                      <th>#</th>
                                      <th>Date &amp; Time Submitted</th>
                                      <th>Job Title</th>
                                      <th>Company</th>
                                      <th>Department</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredSubs
                                      .slice()
                                      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                                      .map((sub, idx) => (
                                        <tr key={`${sub.jobId}-${idx}`}>
                                          <td style={{ color: '#9ca3af', fontWeight: 600 }}>{filteredSubs.length - idx}</td>
                                          <td>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0f9ff', color: '#0369a1', padding: '3px 8px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600 }}>
                                              <Calendar size={11} />
                                              {formatDateTime(sub.submittedAt)}
                                            </span>
                                          </td>
                                          <td className="table-job-title">{sub.jobTitle || '—'}</td>
                                          <td>{sub.company || '—'}</td>
                                          <td>{sub.department ? <span className="dept-tag-sm">{sub.department}</span> : '—'}</td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

      </div>
    </div>
  );
}
