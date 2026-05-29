import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - from google-services.json / Firebase Console
const firebaseConfig = {
  apiKey: 'AIzaSyC4Lfbd9Z4WPlZvO0kAU6HrZpDQ6zlPiDU',
  authDomain: 'gen-lang-client-0173847591.firebaseapp.com',
  projectId: 'gen-lang-client-0173847591',
  storageBucket: 'gen-lang-client-0173847591.firebasestorage.app',
  messagingSenderId: '1087219440433',
  appId: '1:1087219440433:android:0b092c1a6b58b828db2e10',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

export { app, db };
export default app;
