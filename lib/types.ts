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
}

export type OptimizeStatus = 'idle' | 'processing' | 'complete';

export interface Candidate {
  id: string;
  username: string;
  password?: string; // Optional so we don't accidentally leak it in bad places, though we'll keep it simple for local storage
  completedJobIds: string[];
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
