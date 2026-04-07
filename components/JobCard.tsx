'use client';
import React, { useState } from 'react';
import {
  Building2, MapPin, Calendar, Hash, Tag,
  ChevronDown, ChevronUp, Circle
} from 'lucide-react';
import { Job } from '@/lib/types';
import ActionPanel from './ActionPanel';

interface JobCardProps {
  job: Job;
}

function MatchBadge({ score }: { score: number }) {
  const cls =
    score >= 3 ? 'badge-high' :
    score === 2 ? 'badge-medium' :
    'badge-low';
  return <span className={`match-badge ${cls}`}>Match Score: {score}</span>;
}

function formatDate(raw: string): string {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return raw; }
}

function formatUploadDate(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch { return ''; }
}

const PREVIEW_LEN = 300;

export default function JobCard({ job }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const longDesc = job.description.length > PREVIEW_LEN;
  const displayDesc = expanded || !longDesc
    ? job.description
    : job.description.slice(0, PREVIEW_LEN) + '…';

  return (
    <div className="job-card">
      <div className="job-card-accent" />

      <div className="job-card-body">
        {/* Header */}
        <div className="job-card-header">
          <div className="job-title-row">
            <div className="job-icon-wrap">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="job-title">{job.title}</h2>
              {job.company && <p className="job-company">{job.company}</p>}
            </div>
          </div>
          <MatchBadge score={job.matchScore} />
        </div>

        {/* Description */}
        <p className="job-desc">{displayDesc}</p>
        {longDesc && (
          <button className="read-more-btn" onClick={() => setExpanded(p => !p)}>
            {expanded ? <><ChevronUp size={14} /> Read Less</> : <><ChevronDown size={14} /> Read More</>}
          </button>
        )}

        {/* Meta */}
        <div className="job-meta-row">
          {job.company && (
            <span className="meta-item"><Building2 size={13} />{job.company}</span>
          )}
          {job.jobId && (
            <span className="meta-item"><Hash size={13} />Job ID: {job.jobId}</span>
          )}
          {job.location && (
            <span className="meta-item"><MapPin size={13} />{job.location}</span>
          )}
          {job.uploadedAt && (
            <span className="meta-item" style={{ color: '#7c3aed', fontWeight: 600 }}>
              <Calendar size={13} />Posted on {formatUploadDate(job.uploadedAt)}
            </span>
          )}
          {!job.jobUrl && (
            <span className="meta-item meta-no-link" title="No job link">
              <Circle size={10} /> Link unavailable
            </span>
          )}
        </div>

        {/* Tags */}
        {(job.department || job.experience) && (
          <div className="job-tags-row">
            {job.department && (
              <span className="dept-tag"><Tag size={11} />{job.department}</span>
            )}
            {job.experience && (
              <span className="exp-tag">{job.experience}+ yrs exp</span>
            )}
          </div>
        )}

        {/* Posted */}
        {job.postedDate && (
          <p className="job-posted">
            <Calendar size={12} />Posted: {formatDate(job.postedDate)}
          </p>
        )}
      </div>

      {/* Action panel */}
      <div className="job-card-actions">
        <ActionPanel jobId={job.id} jobUrl={job.jobUrl} jobTitle={job.title} company={job.company} department={job.department} />
      </div>
    </div>
  );
}
