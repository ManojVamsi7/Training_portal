'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { Job } from './types';
import { fetchDefaultJobs } from './csvParser';

interface JobsContextType {
  jobs: Job[];
  setJobs: (jobs: Job[]) => void;
  addJob: (job: Job) => void;
  addJobsBatch: (jobs: Job[]) => Promise<void>;
  updateJob: (job: Job) => void;
  deleteJob: (id: string) => void;
  deleteJobsBatch: (ids: string[]) => Promise<void>;
  loading: boolean;
}

const JobsContext = createContext<JobsContextType>({
  jobs: [],
  setJobs: () => {},
  addJob: () => {},
  addJobsBatch: async () => {},
  updateJob: () => {},
  deleteJob: () => {},
  deleteJobsBatch: async () => {},
  loading: true,
});

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobsState] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for jobs
    const jobsRef = collection(db, 'jobs');
    const unsubscribe = onSnapshot(jobsRef, (snapshot) => {
      const loadedJobs = snapshot.docs.map(d => d.data() as Job);
      
      setJobsState(loadedJobs);
      setLoading(false);
    }, (error) => {
      console.error('Firestore jobs error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const saveJobs = useCallback(async (newJobs: Job[]) => {
    // Overwrites existing basically or adds new
    try {
      const batch = writeBatch(db);
      newJobs.forEach(j => {
        batch.set(doc(db, 'jobs', j.id), j);
      });
      await batch.commit();
    } catch (e) { console.error('Error saving jobs batch', e); }
  }, []);

  const addJobsBatch = useCallback(async (newJobs: Job[]) => {
    // Only adds/updates provided jobs dynamically using batch chunks
    try {
      // Create batches of max 500 writes
      const BATCH_LIMIT = 450;
      for (let i = 0; i < newJobs.length; i += BATCH_LIMIT) {
        const chunk = newJobs.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        chunk.forEach(j => {
          batch.set(doc(db, 'jobs', j.id), j);
        });
        await batch.commit();
      }
    } catch (e) { console.error('Error in addJobsBatch', e); }
  }, []);

  const addJob = useCallback(async (job: Job) => {
    try {
      await setDoc(doc(db, 'jobs', job.id), job);
    } catch (e) { console.error('Error adding job', e); }
  }, []);

  const updateJob = useCallback(async (job: Job) => {
    try {
      await setDoc(doc(db, 'jobs', job.id), job);
    } catch (e) { console.error('Error updating job', e); }
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'jobs', id));
    } catch (e) { console.error('Error deleting job', e); }
  }, []);

  const deleteJobsBatch = useCallback(async (ids: string[]) => {
    try {
      const BATCH_LIMIT = 450;
      for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
        const chunk = ids.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.delete(doc(db, 'jobs', id));
        });
        await batch.commit();
      }
    } catch (e) { console.error('Error in deleteJobsBatch', e); }
  }, []);

  return (
    <JobsContext.Provider
      value={{ jobs, setJobs: saveJobs, addJob, addJobsBatch, updateJob, deleteJob, deleteJobsBatch, loading }}
    >
      {children}
    </JobsContext.Provider>
  );
}

export const useJobs = () => useContext(JobsContext);
