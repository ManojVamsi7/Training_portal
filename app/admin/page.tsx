'use client';
import './admin.css';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, Upload, FileText, Trash2, Pencil, Plus,
  X, CheckCircle, AlertCircle, ChevronLeft, Loader2,
  Building2, ExternalLink, Save, RotateCcw, FileUp, Users
} from 'lucide-react';
import { useJobs } from '@/lib/JobsContext';
import { useAdminResume } from '@/lib/AdminResumeContext';
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

// ─── Edit Modal ──────────────────────────────
function JobEditModal({
  job,
  onSave,
  onClose,
  isNew,
}: {
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
          <button
            className="btn-primary"
            onClick={() => {
              if (!form.title?.trim()) return alert('Title is required');
              onSave(form);
            }}
          >
            <Save size={15} />
            {isNew ? 'Add Job' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ─────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading, logout, candidates, createCandidate, deleteCandidate } = useAuth();

  const { jobs, setJobs, addJob, addJobsBatch, updateJob, deleteJob, deleteJobsBatch, loading: jobsLoading } = useJobs();
  const { adminResume, setAdminResume } = useAdminResume();

  const [editJob, setEditJob]   = useState<Partial<Job> | null>(null);
  const [isNewJob, setIsNewJob] = useState(false);
  const [toast, setToast]       = useState('');
  const [csvParsing, setCsvParsing] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  // Candidate creating state
  const [newCandUser, setNewCandUser] = useState('');
  const [newCandPass, setNewCandPass] = useState('');

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef    = useRef<HTMLInputElement>(null);

  // Auth Guard
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login');
      } else if (currentUser.role !== 'admin') {
        router.push('/');
      }
    }
  }, [currentUser, authLoading, router]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  // ── Resume Upload ──
  const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  const handleResumeUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) && ext !== '.pdf' && ext !== '.docx') {
      showToast('❌ Only PDF or DOCX files are allowed.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setAdminResume({ name: file.name, data, type: file.type });
      showToast(`✅ Resume "${file.name}" uploaded successfully.`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [setAdminResume]);

  // ── CSV Upload ──
  const handleCSVUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvParsing(true);
    try {
      const text = await file.text();
      const parsed = await parseJobsCSV(text);
      if (!parsed.length) { showToast('❌ No jobs found in CSV.'); return; }
      
      const newUniqueJobs: Job[] = [];
      const existingKeys = new Set(jobs.map(j => (j.jobId || '') + j.title + j.company));
      
      parsed.forEach(job => {
        const key = (job.jobId || '') + job.title + job.company;
        if (!existingKeys.has(key)) {
          newUniqueJobs.push(job);
          existingKeys.add(key); // prevent duplicates within the CSV itself
        }
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
  }, [setJobs]);

  // ── Job CRUD ──
  function openNewJob() {
    setEditJob(blankJob());
    setIsNewJob(true);
  }

  function handleSaveJob(form: Partial<Job>) {
    if (isNewJob) {
      addJob({
        ...form,
        id: `job-manual-${Date.now()}`,
        matchScore: Number(form.matchScore) || 2,
      } as Job);
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



  // ── Create Candidate ──
  function handleCreateCandidate(e: React.FormEvent) {
    e.preventDefault();
    if (!newCandUser || !newCandPass) return alert('Enter username and password');
    const ok = createCandidate(newCandUser, newCandPass);
    if (!ok) return alert('Username already exists!');
    showToast('🧑‍🎓 Candidate created.');
    setNewCandUser('');
    setNewCandPass('');
  }

  function handleDeleteCandidate(id: string, username: string) {
    if (!confirm(`Are you sure you want to revoke access for ${username}?`)) return;
    deleteCandidate(id);
    showToast(`🗑️ Revoked access for ${username}`);
  }

  if (authLoading || !currentUser || currentUser.role !== 'admin') {
    return <div className="center-state"><Loader2 className="spin" /> Loading Admin...</div>;
  }

  // ─── Admin dashboard ───
  const hasResume = Boolean(adminResume);
  const jobCount  = jobs.length;

  return (
    <div className="admin-page">
      {toast && <div className="admin-toast"><span>{toast}</span></div>}

      {editJob && (
        <JobEditModal
          job={editJob}
          onSave={handleSaveJob}
          onClose={() => setEditJob(null)}
          isNew={isNewJob}
        />
      )}

      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <ShieldCheck size={24} className="text-indigo-400" />
          <div>
            <h1 className="admin-title">Admin Portal</h1>
            <p className="admin-subtitle">Manage jobs, candidates, and resume configuration</p>
          </div>
        </div>
        <div className="admin-header-right">
          <button className="btn-secondary admin-back-btn" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="admin-body">
        {/* ── Stats bar ── */}
        <div className="admin-stats-row">
          <div className="stat-card">
            <Building2 size={20} className="stat-icon text-indigo-500" />
            <div>
              <p className="stat-value">{jobCount}</p>
              <p className="stat-label">Total Jobs</p>
            </div>
          </div>
          <div className="stat-card">
            <Users size={20} className="stat-icon text-blue-500" />
            <div>
              <p className="stat-value">{candidates.length}</p>
              <p className="stat-label">Candidates</p>
            </div>
          </div>
          <div className={`stat-card${hasResume ? '' : ' stat-card-warn'}`}>
            <FileText size={20} className={`stat-icon ${hasResume ? 'text-green-500' : 'text-amber-500'}`} />
            <div>
              <p className="stat-value">{hasResume ? 'Configured' : 'Not Set'}</p>
              <p className="stat-label">Base Resume</p>
            </div>
          </div>
        </div>

        {/* ── Section: Candidate Management ── */}
        <section className="admin-section">
          <div className="section-header">
            <Users size={18} />
            <h2>Candidate Accounts</h2>
            <span className="section-badge">Manage access</span>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Create Candidate Form */}
            <div style={{ flex: '1 1 300px', background: '#f8f9fb', padding: '20px', borderRadius: '12px', border: '1.5px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px' }}>Create Candidate</h3>
              <form onSubmit={handleCreateCandidate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input 
                  className="form-input" 
                  placeholder="Username" 
                  value={newCandUser} 
                  onChange={e => setNewCandUser(e.target.value)} 
                />
                <input 
                  className="form-input" 
                  placeholder="Password" 
                  type="password"
                  value={newCandPass} 
                  onChange={e => setNewCandPass(e.target.value)} 
                />
                <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
                  <Plus size={16} /> Add Candidate
                </button>
              </form>
            </div>

            {/* Candidate List */}
            <div style={{ flex: '2 1 400px' }}>
              {candidates.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.9rem', padding: '20px' }}>No candidates created yet.</p>
              ) : (
                <div className="admin-jobs-table-wrap">
                  <table className="admin-jobs-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Password</th>
                        <th>Completed Apps</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>{c.username}</td>
                          <td style={{ color: '#9ca3af', letterSpacing: '2px' }}>••••••••</td>
                          <td>
                            <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '3px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.8rem' }}>
                              {c.completedJobIds?.length || 0}
                            </span>
                          </td>
                          <td>
                            <button className="btn-danger-outline" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleDeleteCandidate(c.id, c.username)}>
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

        {/* ── Section: Resume Management ── */}
        <section className="admin-section">
          <div className="section-header">
            <FileText size={18} />
            <h2>Base Resume</h2>
            <span className="section-badge">Candidates download this after optimization</span>
          </div>

          {hasResume ? (
            <div className="resume-configured-card">
              <div className="resume-configured-left">
                <CheckCircle size={20} className="text-green-500" />
                <div>
                  <p className="resume-configured-name">{adminResume!.name}</p>
                  <p className="resume-configured-sub">
                    This file will be downloaded by candidates as their "optimized" resume
                  </p>
                </div>
              </div>
              <div className="resume-configured-actions">
                <button className="btn-secondary" onClick={() => resumeInputRef.current?.click()}>
                  <Upload size={14} /> Replace Resume
                </button>
                <button className="btn-danger-outline" onClick={() => { setAdminResume(null); showToast('Resume removed.'); }}>
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="resume-upload-zone" onClick={() => resumeInputRef.current?.click()}>
              <FileUp size={32} className="text-indigo-400" />
              <p className="upload-main-text">Upload Base Resume</p>
              <p className="upload-sub-text">PDF or DOCX • Click to browse or drag and drop</p>
            </div>
          )}

          <input ref={resumeInputRef} type="file" accept=".pdf,.docx" onChange={handleResumeUpload} style={{ display: 'none' }} />
        </section>

        {/* ── Section: Jobs Management ── */}
        <section className="admin-section">
          <div className="section-header">
            <Building2 size={18} />
            <h2>Job Listings</h2>
            <span className="section-badge">{jobCount} jobs total</span>
          </div>

          <div className="admin-jobs-toolbar">
            <button className="btn-primary" onClick={openNewJob}>
              <Plus size={15} /> Add Job
            </button>
            <button className="btn-secondary" onClick={() => csvInputRef.current?.click()} disabled={csvParsing}>
              {csvParsing ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} Upload CSV
            </button>
            {selectedJobIds.length > 0 && (
              <button 
                className="btn-danger-outline" 
                onClick={async () => {
                  if (!confirm(`Are you sure you want to delete ${selectedJobIds.length} selected jobs?`)) return;
                  await deleteJobsBatch(selectedJobIds);
                  setSelectedJobIds([]);
                  showToast(`🗑️ ${selectedJobIds.length} jobs deleted.`);
                }}
              >
                <Trash2 size={15} /> Delete Selected ({selectedJobIds.length})
              </button>
            )}
          </div>

          <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />

          {jobsLoading ? (
            <div className="center-state">
              <Loader2 size={28} className="spin text-indigo-500" />
              <p>Loading jobs…</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="empty-state">
              <FileText size={36} />
              <p className="empty-title">No jobs loaded</p>
              <p className="empty-sub">Upload a CSV or add jobs manually</p>
            </div>
          ) : (
            <div className="admin-jobs-table-wrap">
              <table className="admin-jobs-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox"
                        checked={jobs.length > 0 && selectedJobIds.length === jobs.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedJobIds(jobs.map(j => j.id));
                          else setSelectedJobIds([]);
                        }}
                        style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                      />
                    </th>
                    <th>Job Title</th>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Department</th>
                    <th>Score</th>
                    <th>Link</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job.id} style={{ backgroundColor: selectedJobIds.includes(job.id) ? '#f0f9ff' : '' }}>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={selectedJobIds.includes(job.id)}
                          onChange={(e) => {
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
                        {job.jobUrl
                          ? <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="table-link"><ExternalLink size={13} /> View</a>
                          : <span className="table-no-link">—</span>
                        }
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="tbl-btn edit-btn" title="Edit" onClick={() => { setEditJob(job); setIsNewJob(false); }}>
                            <Pencil size={14} />
                          </button>
                          <button className="tbl-btn del-btn" title="Delete" onClick={() => handleDelete(job.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
