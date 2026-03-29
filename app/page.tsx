'use client';
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useJobs } from '@/lib/JobsContext';
import { useAdminResume } from '@/lib/AdminResumeContext';
import { useAuth } from '@/lib/AuthContext';
import { parseJobsCSV } from '@/lib/csvParser';
import { useRouter } from 'next/navigation';
import JobCard from '@/components/JobCard';
import Sidebar from '@/components/Sidebar';
import Filters from '@/components/Filters';
import {
  Loader2, FileText, AlertCircle,
  ChevronLeft, ChevronRight, ShieldAlert, CheckCircle,
} from 'lucide-react';

const PAGE_SIZE = 8;

export default function HomePage() {
  const { jobs, loading } = useJobs();
  const { adminResume } = useAdminResume();
  const { currentUser, candidates, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [search, setSearch]           = useState('');
  const [companyFilter, setCompany]   = useState('');
  const [locationFilter, setLocation] = useState('');
  const [deptFilter, setDept]         = useState('');
  const [page, setPage]               = useState(1);
  const [csvError, setCsvError]       = useState('');

  // Auth Guard
  React.useEffect(() => {
    if (!authLoading) {
      if (!currentUser) router.push('/login');
      else if (currentUser.role === 'admin') router.push('/admin');
    }
  }, [currentUser, authLoading, router]);

  const { setJobs } = useJobs();
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleCSVUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = await parseJobsCSV(text);
      if (!parsed.length) { setCsvError('No jobs found in CSV.'); return; }
      setJobs(parsed);
      setCsvError('');
      setPage(1);
    } catch {
      setCsvError('Failed to parse CSV.');
    }
    e.target.value = '';
  }, [setJobs]);

  const filtered = useMemo(() => {
    const myCand = candidates.find(c => c.id === currentUser?.id);
    const completedIds = myCand?.completedJobIds || [];
    
    // First remove completed jobs
    let r = jobs.filter(j => !completedIds.includes(j.id));
    
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
      );
    }
    if (companyFilter)  r = r.filter(j => j.company  === companyFilter);
    if (locationFilter) r = r.filter(j => j.location === locationFilter);
    if (deptFilter)     r = r.filter(j => j.department === deptFilter);
    return r;
  }, [jobs, search, companyFilter, locationFilter, deptFilter, candidates, currentUser?.id]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const companies   = useMemo(() => [...new Set(jobs.map(j => j.company).filter(Boolean))].sort(),   [jobs]);
  const locations   = useMemo(() => [...new Set(jobs.map(j => j.location).filter(Boolean))].sort(),  [jobs]);
  const departments = useMemo(() => [...new Set(jobs.map(j => j.department).filter(Boolean))].sort(), [jobs]);

  const onSearch   = useCallback((q: string) => { setSearch(q);         setPage(1); }, []);
  const onCompany  = useCallback((c: string) => { setCompany(c);        setPage(1); }, []);
  const onLocation = useCallback((l: string) => { setLocation(l);       setPage(1); }, []);
  const onDept     = useCallback((d: string) => { setDept(d);           setPage(1); }, []);

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="app-main">
        <div className="main-content">
          {/* Page header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Matching Jobs ({filtered.length})</h1>
              <p className="page-subtitle">Jobs that match the student&apos;s profile and experience</p>
            </div>
            <div className="header-actions">
              {adminResume ? (
                <span className="resume-indicator hidden sm:flex">
                  <CheckCircle size={14} />
                  Resume ready: {adminResume.name}
                </span>
              ) : (
                <span className="resume-missing-indicator hidden sm:flex">
                  <ShieldAlert size={14} />
                  No resume set — contact Admin
                </span>
              )}
              <button 
                onClick={logout} 
                className="btn-secondary text-sm px-3 py-1.5 flex"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Admin resume notice */}
          {!adminResume && (
            <div className="admin-notice">
              <ShieldAlert size={16} />
              <span>
                The admin hasn&apos;t uploaded a base resume yet. Your training flows may be disabled.
              </span>
            </div>
          )}

          {authLoading && (
            <div className="center-state">
              <Loader2 size={32} className="spin text-indigo-500" />
              <p>Authenticating…</p>
            </div>
          )}

          {csvError && (
            <div className="error-state">
              <AlertCircle size={18} />
              <span>{csvError}</span>
            </div>
          )}

          {/* Filters */}
          <Filters
            onSearch={onSearch}
            onCompanyFilter={onCompany}
            onLocationFilter={onLocation}
            onDeptFilter={onDept}
            companies={companies}
            locations={locations}
            departments={departments}
          />

          {/* Loading */}
          {loading && (
            <div className="center-state">
              <Loader2 size={32} className="spin text-indigo-500" />
              <p>Loading jobs…</p>
            </div>
          )}

          {/* Empty */}
          {!loading && !authLoading && filtered.length === 0 && (
            <div className="empty-state">
              <FileText size={40} />
              <p className="empty-title">No matching jobs found</p>
              <p className="empty-sub">Try adjusting your search or filters</p>
            </div>
          )}

          {/* Job cards */}
          {!loading && !authLoading && paginated.length > 0 && (
            <div className="job-list">
              {paginated.map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  className={`page-btn${n === page ? ' page-active' : ''}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                className="page-btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Hidden CSV input for future use */}
          <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />
        </div>
      </main>
    </div>
  );
}
