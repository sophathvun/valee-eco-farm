const firebaseConfig = {
  apiKey: "AIzaSyBwBK74uWvtm_CPlxX88Pz-5A9avMtELXs",
  authDomain: "valee-eco-farm.firebaseapp.com",
  projectId: "valee-eco-farm",
  storageBucket: "valee-eco-farm.firebasestorage.app",
  messagingSenderId: "204722767845",
  appId: "1:204722767845:web:b132ee57cd0e5c7123110c",
  measurementId: "G-QFQK6VSKTP"
};
firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();


firebase.firestore().enablePersistence()
  .catch(function(err) {
      if (err.code == 'failed-precondition') {
          console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
      } else if (err.code == 'unimplemented') {
          console.warn('The current browser does not support all of the features required to enable persistence');
      }
  });
