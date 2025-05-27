
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth'; // For Firebase Authentication

// TODO: Replace with your actual Firebase project configuration
/*
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
};
*/
const firebaseConfig = {
  apiKey: "AIzaSyAvTbVbj47blOh3YOoFyLid8krAvG7PDZo",
  authDomain: "rifa-facil-ju86p.firebaseapp.com",
  projectId: "rifa-facil-ju86p",
  storageBucket: "rifa-facil-ju86p.firebasestorage.app",
  messagingSenderId: "345314342682",
  appId: "1:345314342682:web:d5b368e0216e4979929ea3"
};



// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db: Firestore = getFirestore(app);
// If you decide to use Firebase Authentication (recommended):
const auth: Auth = getAuth(app);

export { db, auth, app };
