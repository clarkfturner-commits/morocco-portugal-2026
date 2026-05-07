// ============================================
// FIREBASE CONFIG — REPLACE WITH YOUR OWN KEYS
// ============================================
// Step-by-step instructions in DEPLOY_GUIDE.md
//
// You'll get these values from the Firebase Console
// after creating your project.

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Use a single document to hold all trip data.
// This minimizes Firestore read/write costs.
const TRIP_DOC = doc(db, 'trips', 'morocco-portugal-2026');

// Read all data once
export async function loadAllData() {
  try {
    const snap = await getDoc(TRIP_DOC);
    return snap.exists() ? snap.data() : {};
  } catch (e) {
    console.error('Load failed:', e);
    return {};
  }
}

// Listen to real-time updates from other family members
export function subscribeToData(callback) {
  return onSnapshot(TRIP_DOC, (snap) => {
    callback(snap.exists() ? snap.data() : {});
  }, (err) => {
    console.error('Subscribe failed:', err);
  });
}

// Save a single key with merge (other keys untouched)
export async function saveKey(key, value) {
  try {
    await setDoc(TRIP_DOC, { [key]: value }, { merge: true });
  } catch (e) {
    console.error('Save failed:', e);
  }
}
