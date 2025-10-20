import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAZLXYqe3TaVzkHZh3i4h78VBwI0KckMpE",
  authDomain: "log-in-cad70.firebaseapp.com",
  projectId: "log-in-cad70",
  storageBucket: "log-in-cad70.firebasestorage.app",
  messagingSenderId: "538387168387",
  appId: "1:538387168387:web:ef65e3ce36c5a405572fb6",
  measurementId: "G-Q6KF6ST8XF"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

window.__FB = { app, auth, db };
