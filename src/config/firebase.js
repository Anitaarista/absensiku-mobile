import { initializeApp } from 'firebase/app';

// Firebase configuration - from google-services.json / Firebase Console
// Note: Firestore access is now handled by the Backend API using Firebase Admin SDK
// This config is kept for potential future Firebase Auth / FCM usage
const firebaseConfig = {
  apiKey: 'AIzaSyC4Lfbd9Z4WPlZvO0kAU6HrZpDQ6zlPiDU',
  authDomain: 'gen-lang-client-0173847591.firebaseapp.com',
  projectId: 'gen-lang-client-0173847591',
  storageBucket: 'gen-lang-client-0173847591.firebasestorage.app',
  messagingSenderId: '1087219440433',
  appId: '1:1087219440433:android:0b092c1a6b58b828db2e10',
};

// Initialize Firebase App (for potential future Firebase Auth usage)
const app = initializeApp(firebaseConfig);

export { app };
export default app;
