import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBmPIy-0RL6Mh1xTn6tKi5rFDiBgJhJdvE",
  authDomain: "training-platform-cb484.firebaseapp.com",
  projectId: "training-platform-cb484",
  storageBucket: "training-platform-cb484.firebasestorage.app",
  messagingSenderId: "166515489241",
  appId: "1:166515489241:web:d8b260fc45f560537781c8",
  measurementId: "G-X8C4BPGP0W"
};

// Initialize Firebase (only if not already initialized to prevent Next.js hot reload errors)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get Firestore instance
export const db = getFirestore(app);
