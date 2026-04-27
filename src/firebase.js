import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// ⚠️ REPLACE THIS WITH YOUR ACTUAL FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAc_mJKT0uBNNennaXJJcxovzzQcFGRz7M",
  authDomain: "nexus-gaming-d1983.firebaseapp.com",
  databaseURL: "https://nexus-gaming-d1983-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nexus-gaming-d1983",
  storageBucket: "nexus-gaming-d1983.firebasestorage.app",
  messagingSenderId: "896834885167",
  appId: "1:896834885167:web:a601f423c6b3744e6b18da",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
