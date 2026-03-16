import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBj0bgdOtb5snSrn3tteblFdVUtA0BpFss",
    authDomain: "el-cuartito-app.firebaseapp.com",
    databaseURL: "https://el-cuartito-app-default-rtdb.firebaseio.com",
    projectId: "el-cuartito-app",
    storageBucket: "el-cuartito-app.firebasestorage.app",
    messagingSenderId: "116723400888",
    appId: "1:116723400888:web:47ec6d99818d391d6ab44d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function testQuery() {
    try {
        console.log("Authenticating with Email...");
        await signInWithEmailAndPassword(auth, 'el.cuartito.cph@gmail.com', 'Rosario123');
        console.log("Connecting to Firestore...");
        const snapshot = await getDocs(collection(db, 'products'));
        console.log("Success! Docs fetched:", snapshot.docs.length);
    } catch (error) {
        console.error("Firestore Error:", error);
    }
}

testQuery();
