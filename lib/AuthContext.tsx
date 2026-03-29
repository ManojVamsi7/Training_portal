'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
import { Candidate, AuthUser } from './types';

interface AuthContextType {
  currentUser: AuthUser | null;
  candidates: Candidate[];
  loading: boolean;
  login: (username: string, pass: string) => AuthUser | null;
  logout: () => void;
  createCandidate: (username: string, pass: string) => Promise<boolean>;
  deleteCandidate: (id: string) => Promise<void>;
  markJobSubmitted: (candidateId: string, jobId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_USER: AuthUser = { id: 'admin-id', role: 'admin', username: 'admin' };
const ADMIN_PASS = 'adminnextgen';

const STORAGE_KEY_AUTH = 'tjp_auth_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Load candidates from Firestore and check session
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'candidates'), (snapshot) => {
      const loaded = snapshot.docs.map(d => d.data() as Candidate);
      setCandidates(loaded);

      // Check strictly client-side session storage for active user
      const session = sessionStorage.getItem(STORAGE_KEY_AUTH);
      if (session) {
        const parsedSession = JSON.parse(session);
        if (parsedSession.role === 'candidate') {
          const exists = loaded.find(c => c.id === parsedSession.id);
          if (exists) setCurrentUser(parsedSession);
          else sessionStorage.removeItem(STORAGE_KEY_AUTH);
        } else {
          setCurrentUser(parsedSession);
        }
      }
      setLoading(false);
    }, (err) => {
      console.error('Firestore Auth error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const login = useCallback((uname: string, pass: string) => {
    if (uname === 'admin' && pass === ADMIN_PASS) {
      const user = ADMIN_USER;
      sessionStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
      setCurrentUser(user);
      return user;
    }

    const cand = candidates.find(c => c.username === uname && c.password === pass);
    if (cand) {
      const user: AuthUser = { id: cand.id, role: 'candidate', username: cand.username };
      sessionStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
      setCurrentUser(user);
      return user;
    }

    return null;
  }, [candidates]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY_AUTH);
    setCurrentUser(null);
  }, []);

  const createCandidate = useCallback(async (uname: string, pass: string) => {
    const exists = candidates.some(c => c.username === uname);
    if (exists) return false;

    const id = `cand_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newCand: Candidate = {
      id,
      username: uname,
      password: pass,
      completedJobIds: [],
    };
    
    try {
      await setDoc(doc(db, 'candidates', id), newCand);
      return true;
    } catch (e) {
      console.error('Error creating candidate', e);
      return false;
    }
  }, [candidates]);

  const deleteCandidate = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'candidates', id));
    } catch (e) { console.error('Error deleting candidate', e); }
  }, []);

  const markJobSubmitted = useCallback(async (candidateId: string, jobId: string) => {
    try {
      await updateDoc(doc(db, 'candidates', candidateId), {
        completedJobIds: arrayUnion(jobId)
      });
    } catch (e) { console.error('Error marking submitted', e); }
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser,
      candidates,
      loading,
      login,
      logout,
      createCandidate,
      deleteCandidate,
      markJobSubmitted
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
