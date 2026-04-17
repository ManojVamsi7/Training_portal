// lib/types.ts

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  jobUrl: string;
  location: string;
  department: string;
  jobId: string;
  postedDate: string;
  experience: string;
  matchScore: number;
  uploadedAt?: string; // ISO timestamp — set when admin uploads the job. Optional for backward compat.
}

export type OptimizeStatus = 'idle' | 'processing' | 'complete';

export interface SubmittedApplication {
  jobId: string;
  jobTitle: string;
  company: string;
  department: string;
  submittedAt: string; // ISO timestamp e.g. "2026-04-04T10:30:00.000Z"
}

export interface Candidate {
  id: string;
  username: string;
  password?: string;
  completedJobIds: string[];          // kept for fast dashboard filtering
  submissions: SubmittedApplication[]; // rich submission records
  optimizedJobIds?: string[];         // jobs the candidate has optimized (bypasses timer)
  hiddenJobIds?: string[];            // jobs the candidate has manually hidden (expired/closed)
  assignedResumeId?: string;          // ID of the resume from the library assigned by admin
}

export interface AuthUser {
  id: string;
  role: 'admin' | 'candidate';
  username: string;
}

export interface JobCardState {
  optimizeStatus: OptimizeStatus;
  optimizeProgress: number;
  optimizeMessage: string;
  downloadEnabled: boolean;
}
