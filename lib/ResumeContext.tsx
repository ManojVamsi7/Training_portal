'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';

interface ResumeFile {
  name: string;
  blob: Blob;
  type: string;
}

interface ResumeContextType {
  resume: ResumeFile | null;
  setResume: (file: ResumeFile | null) => void;
  clearResume: () => void;
}

const ResumeContext = createContext<ResumeContextType>({
  resume: null,
  setResume: () => {},
  clearResume: () => {},
});

export function ResumeProvider({ children }: { children: React.ReactNode }) {
  const [resume, setResumeState] = useState<ResumeFile | null>(null);

  const setResume = useCallback((file: ResumeFile | null) => {
    setResumeState(file);
  }, []);

  const clearResume = useCallback(() => {
    setResumeState(null);
  }, []);

  return (
    <ResumeContext.Provider value={{ resume, setResume, clearResume }}>
      {children}
    </ResumeContext.Provider>
  );
}

export function useResume() {
  return useContext(ResumeContext);
}
