// 1. IMPORT FIREBASE MODULES
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyBCcWkAzjh9FLpphYIdpLNcDQRhVK5FKcM",
  authDomain: "educonnect-5885b.firebaseapp.com",
  projectId: "educonnect-5885b",
  storageBucket: "educonnect-5885b.firebasestorage.app",
  messagingSenderId: "814892024989",
  appId: "1:814892024989:web:3be333f2078732aa02c074",
  measurementId: "G-GKQ1WWG2PQ"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const userNameDisplay = document.getElementById('user-name-display');
loginBtn.addEventListener('click', async (e) => {
    e.preventDefault(); // Prevents page reload
    loginError.style.display = 'none'; // Hide previous errors

    try {
        // Authenticate with Firebase
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        // If successful, the onAuthStateChanged function below will handle the screen switch
    } catch (error) {
        // If password is wrong or user doesn't exist, show error
        loginError.textContent = "Login failed: " + error.message;
        loginError.style.display = 'block';
    }
});

// 6. HANDLE LOGOUT BUTTON CLICK
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// 7. CHECK LOGIN STATUS AUTOMATICALLY ON PAGE LOAD
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in
        try {
            // Fetch their profile from Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Update the name in the sidebar
                if (userData.name) {
                    userNameDisplay.textContent = userData.name;
                }

                // Hide Login, Show Dashboard
                loginScreen.style.display = 'none';
                dashboardScreen.style.display = 'flex';
            } else {
                // No profile in Firestore
                loginError.textContent = "No profile found in Firestore. Contact admin.";
                loginError.style.display = 'block';
                signOut(auth);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    } else {
        // User is NOT logged in
        // Show Login, Hide Dashboard
        loginScreen.style.display = 'flex';
        dashboardScreen.style.display = 'none';
    }
});
