'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface AdminResume {
  name: string;
  data: string; // base64 data URL
  type: string;
}

interface AdminResumeContextType {
  adminResume: AdminResume | null;
  setAdminResume: (resume: AdminResume | null) => Promise<void>;
  downloadAdminResume: () => boolean; // returns true if downloaded
}

const AdminResumeContext = createContext<AdminResumeContextType>({
  adminResume: null,
  setAdminResume: async () => {},
  downloadAdminResume: () => false,
});

export function AdminResumeProvider({ children }: { children: React.ReactNode }) {
  const [adminResume, setAdminResumeState] = useState<AdminResume | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'base_resume'), (snap) => {
      if (snap.exists()) {
        setAdminResumeState(snap.data() as AdminResume);
      } else {
        setAdminResumeState(null);
      }
    }, (err) => {
      console.error('Firestore Admin Resume error:', err);
    });

    return () => unsub();
  }, []);

  const setAdminResume = useCallback(async (resume: AdminResume | null) => {
    try {
      if (resume) {
        await setDoc(doc(db, 'config', 'base_resume'), resume);
      } else {
        await deleteDoc(doc(db, 'config', 'base_resume'));
      }
    } catch (err) {
      console.error('Error saving admin resume', err);
    }
  }, []);

  const downloadAdminResume = useCallback((): boolean => {
    if (!adminResume) return false;
    try {
      const byteString = atob(adminResume.data.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: adminResume.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = adminResume.name;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  }, [adminResume]);

  return (
    <AdminResumeContext.Provider value={{ adminResume, setAdminResume, downloadAdminResume }}>
      {children}
    </AdminResumeContext.Provider>
  );
}

export const useAdminResume = () => useContext(AdminResumeContext);
