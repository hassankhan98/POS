// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBgG89RoBGc-Gqe2TYnO_iPSdtc8XxQwJw",
  authDomain: "pos-web-app-ed7e9.firebaseapp.com",
  projectId: "pos-web-app-ed7e9",
  storageBucket: "pos-web-app-ed7e9.appspot.com",
  messagingSenderId: "386790885396",
  appId: "1:386790885396:web:83955d99b689cf377ebf01"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
