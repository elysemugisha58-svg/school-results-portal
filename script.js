// 1. IMPORT FIREBASE MODULES (Using CDN for standard HTML sites)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
const firebaseConfig = {
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBCcWkAzjh9FLpphYIdpLNcDQRhVK5FKcM",
  authDomain: "educonnect-5885b.firebaseapp.com",
  projectId: "educonnect-5885b",
  storageBucket: "educonnect-5885b.firebasestorage.app",
  messagingSenderId: "814892024989",
  appId: "1:814892024989:web:3be333f2078732aa02c074",
  measurementId: "G-GKQ1WWG2PQ"
};
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
    e.preventDefault();
    
    const email = emailInput.value;
    const password = passwordInput.value;

    loginError.style.display = 'none';

    try {
        // Authenticate with Firebase
        await signInWithEmailAndPassword(auth, email, password);
        // The `onAuthStateChanged` function below will handle the screen switch!
    } catch (error) {
        // Show error if password is wrong, etc.
        loginError.textContent = "Login failed: " + error.message;
        loginError.style.display = 'block';
    }
});

// 5. HANDLE LOGOUT BUTTON CLICK
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// 6. CHECK LOGIN STATUS (This runs automatically when page loads)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in!
        
        try {
            // Fetch their profile from Firestore to check their role
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Optional: Update the name in the sidebar
                if (userData.name) {
                    userNameDisplay.textContent = userData.name;
                }

                // YOU ARE NOW LOGGED IN AND VERIFIED.
                // Hide Login Screen, Show Dashboard Screen
                loginScreen.style.display = 'none';
                dashboardScreen.style.display = 'flex';
                
                // Optional: If you want to check roles before showing the dashboard:
                /*
                if (userData.role === 'superAdmin') {
                    dashboardScreen.style.display = 'flex';
                } else {
                    alert("You are not a Super Admin!");
                    signOut(auth);
                }
                */

            } else {
                console.error("No profile found in Firestore!");
                loginError.textContent = "No profile found. Please contact admin.";
                loginError.style.display = 'block';
                signOut(auth);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }

    } else {
        // User is NOT logged in
        // Show Login Screen, Hide Dashboard Screen
        loginScreen.style.display = 'flex';
        dashboardScreen.style.display = 'none';
    }
});
