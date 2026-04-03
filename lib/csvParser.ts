// lib/csvParser.ts
import Papa from 'papaparse';
import { Job } from './types';

// Flexible column name aliases for robust mapping
const COLUMN_MAP: Record<string, string[]> = {
  title: ['title', 'job_title', 'jobtitle', 'position', 'role', 'job title'],
  company: ['company', 'company_name', 'employer', 'organization', 'org'],
  description: ['description', 'job_description', 'summary', 'details', 'desc'],
  jobUrl: [
    'link', 'url', 'job_link', 'job_url', 'linkedin_url', 'apply_link',
    'apply_url', 'application_url', 'job url', 'link (url)',
  ],
  location: ['location', 'city', 'city_state', 'place', 'city/state'],
  department: [
    'job_category', 'department', 'category', 'function', 'area',
    'job category', 'dept',
  ],
  jobId: ['job_id', 'jobid', 'id', 'requisition_id', 'req_id', 'job id'],
  postedDate: [
    'posted_date', 'date_posted', 'posting_date', 'publish_date',
    'date', 'posted', 'posted date',
  ],
  experience: [
    'years_of_experience', 'experience', 'years_experience',
    'min_experience', 'exp_required', 'years',
  ],
};

function findColumn(headers: string[], aliases: string[]): string | null {
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = lower.indexOf(alias.toLowerCase());
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function buildColumnMapping(headers: string[]): Record<string, string | null> {
  const mapping: Record<string, string | null> = {};
  for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
    mapping[field] = findColumn(headers, aliases);
  }
  return mapping;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function generateMatchScore(): number {
  // Simulate a realistic match score between 1 and 3 (like the screenshot)
  return Math.floor(Math.random() * 3) + 1;
}

export async function parseJobsCSV(csvText: string): Promise<Job[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const mapping = buildColumnMapping(headers);
        // All jobs in one upload share the same timestamp so they group cleanly by day
        const batchTime = new Date().toISOString();

        const jobs: Job[] = (results.data as Record<string, string>[])
          .map((row, index) => {
            const get = (field: string) =>
              mapping[field] ? (row[mapping[field]!] || '').trim() : '';

            const rawUrl = get('jobUrl');
            const jobUrl = isValidUrl(rawUrl) ? rawUrl : '';

            return {
              id: `job-${index}-${Date.now()}`,
              title: get('title') || `Job ${index + 1}`,
              company: get('company') || 'Company',
              description: get('description') || 'No description available.',
              jobUrl,
              location: get('location') || '',
              department: get('department') || '',
              jobId: get('jobId') || `${58200 + index}`,
              postedDate: get('postedDate') || '',
              experience: get('experience') || '',
              matchScore: generateMatchScore(),
              uploadedAt: batchTime,
            };
          })
          .filter((job) => job.title);

        resolve(jobs);
      },
      error: (err: Error) => reject(err),
    });
  });
}

export async function fetchDefaultJobs(): Promise<Job[]> {
  const res = await fetch('/jobs.csv');
  const text = await res.text();
  return parseJobsCSV(text);
}
