import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCuYYHkuFTX2PB4RmHkWWFXNSwzpj15wBg",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "attendance-system-demo-d6c09.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "attendance-system-demo-d6c09",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "attendance-system-demo-d6c09.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "348700373991",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:348700373991:android:c3aa41943b402264a24342"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;