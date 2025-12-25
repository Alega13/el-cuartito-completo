import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBj0bgdOtb5snSrn3tteblFdVUtA0BpFss",
    authDomain: "el-cuartito-app.firebaseapp.com",
    projectId: "el-cuartito-app",
    storageBucket: "el-cuartito-app.firebasestorage.app",
    messagingSenderId: "116723400888",
    appId: "1:116723400888:web:47ec6d99818d391d6ab44d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
