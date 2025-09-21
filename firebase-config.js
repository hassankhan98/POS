// firebase-config.js
// IMPORTANT: Replace the firebaseConfig below with your project's config from Firebase Console > Project settings > SDK setup for web

const firebaseConfig = {
  apiKey: "AIzaSyBgG89RoBGc-Gqe2TYnO_iPSdtc8XxQwJw",
  authDomain: "pos-web-app-ed7e9.firebaseapp.com",
  projectId: "pos-web-app-ed7e9",
  storageBucket: "pos-web-app-ed7e9.firebasestorage.app",
  messagingSenderId: "386790885396",
  appId: "1:386790885396:web:83955d99b689cf377ebf01"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
// Firestore reference
const db = firebase.firestore();
