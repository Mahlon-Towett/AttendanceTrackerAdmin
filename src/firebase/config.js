import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - matches your google-services.json exactly
const firebaseConfig = {
  apiKey: "AIzaSyCuYYHkuFTX2PB4RmHkWWFXNSwzpj15wBg",
  authDomain: "attendance-system-demo-d6c09.firebaseapp.com",
  projectId: "attendance-system-demo-d6c09",
  storageBucket: "attendance-system-demo-d6c09.firebasestorage.app",
  messagingSenderId: "348700373991",
  appId: "1:348700373991:android:c3aa41943b402264a24342"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;