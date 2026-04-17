'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

// Each uploaded resume in the library
export interface AdminResume {
  id: string;       // unique ID e.g. resume_1712345678000
  label: string;    // display name set by admin e.g. "Resume A", "Data Engineer Resume"
  filename: string; // original filename e.g. "john_doe_resume.pdf"
  data: string;     // base64 data URL
  type: string;     // MIME type e.g. "application/pdf"
  uploadedAt: string; // ISO timestamp
}

interface AdminResumeContextType {
  resumes: AdminResume[];
  loading: boolean;
  addResume: (resume: AdminResume) => Promise<void>;
  deleteResume: (id: string) => Promise<void>;
  getResumeById: (id: string | undefined) => AdminResume | null;
  downloadResumeById: (id: string | undefined) => boolean;
}

const AdminResumeContext = createContext<AdminResumeContextType>({
  resumes: [],
  loading: true,
  addResume: async () => {},
  deleteResume: async () => {},
  getResumeById: () => null,
  downloadResumeById: () => false,
});

export function AdminResumeProvider({ children }: { children: React.ReactNode }) {
  const [resumes, setResumes] = useState<AdminResume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to the top-level 'resumes' collection
    const unsub = onSnapshot(collection(db, 'resumes'), (snapshot) => {
      const loaded = snapshot.docs.map(d => d.data() as AdminResume);
      // Sort by uploadedAt descending so newest appears first in admin UI
      loaded.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      setResumes(loaded);
      setLoading(false);
    }, (err) => {
      console.error('Firestore Resumes error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const addResume = useCallback(async (resume: AdminResume) => {
    try {
      await setDoc(doc(db, 'resumes', resume.id), resume);
    } catch (e) { console.error('Error adding resume', e); }
  }, []);

  const deleteResume = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'resumes', id));
    } catch (e) { console.error('Error deleting resume', e); }
  }, []);

  const getResumeById = useCallback((id: string | undefined): AdminResume | null => {
    if (!id) return null;
    return resumes.find(r => r.id === id) || null;
  }, [resumes]);

  const downloadResumeById = useCallback((id: string | undefined): boolean => {
    const resume = resumes.find(r => r.id === id);
    if (!resume) return false;
    try {
      const byteString = atob(resume.data.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: resume.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resume.filename;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  }, [resumes]);

  return (
    <AdminResumeContext.Provider value={{ resumes, loading, addResume, deleteResume, getResumeById, downloadResumeById }}>
      {children}
    </AdminResumeContext.Provider>
  );
}

export const useAdminResume = () => useContext(AdminResumeContext);
