import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAlrB6HTB1iMnKb0dp_OUCE32Js8kLPEa8",
  authDomain: "pos-9c673.firebaseapp.com",
  projectId: "pos-9c673",
  storageBucket: "pos-9c673.firebasestorage.app",
  messagingSenderId: "284487774464",
  appId: "1:284487774464:web:e43e4b68c19545bdc1c3e5",
  measurementId: "G-J5PXC9VXLH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
export default app;