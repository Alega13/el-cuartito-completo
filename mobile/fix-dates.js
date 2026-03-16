import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBj0bgdOtb5snSrn3tteblFdVUtA0BpFss",
    authDomain: "el-cuartito-app.firebaseapp.com",
    databaseURL: "https://el-cuartito-app-default-rtdb.firebaseio.com",
    projectId: "el-cuartito-app",
    storageBucket: "el-cuartito-app.appspot.com",
    messagingSenderId: "116723400888",
    appId: "1:116723400888:web:47ec6d99818d391d6ab44d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function fixDates() {
    try {
        console.log("Authenticating with Email...");
        await signInWithEmailAndPassword(auth, 'el.cuartito.cph@gmail.com', 'Rosario123');
        console.log("Fetching sales...");

        const salesSnapshot = await getDocs(collection(db, "sales"));
        let fixedCount = 0;

        for (const saleDoc of salesSnapshot.docs) {
            const data = saleDoc.data();
            // If date is a Timestamp object (has seconds/nanoseconds instead of string methods)
            if (data.date && typeof data.date !== 'string' && data.date.toDate) {
                console.log(`Fixing sale ${saleDoc.id}...`);
                const correctDateString = data.date.toDate().toISOString().split('T')[0];
                await updateDoc(doc(db, "sales", saleDoc.id), {
                    date: correctDateString
                });
                fixedCount++;
            }
        }

        console.log(`Successfully fixed ${fixedCount} sales documents.`);
    } catch (error) {
        console.error("Error fixing sales:", error);
    }
}

fixDates();
