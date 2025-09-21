// Firebase Modular v9 SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBgG89RoBGc-Gqe2TYnO_iPSdtc8XxQwJw",
  authDomain: "pos-web-app-ed7e9.firebaseapp.com",
  projectId: "pos-web-app-ed7e9",
  storageBucket: "pos-web-app-ed7e9.appspot.com",
  messagingSenderId: "386790885396",
  appId: "1:386790885396:web:83955d99b689cf377ebf01"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
