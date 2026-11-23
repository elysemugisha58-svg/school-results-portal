import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Grab HTML Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const userNameDisplay = document.getElementById('user-name-display');

// --- 1. HANDLE LOGIN ---
loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none'; // Hide previous errors

    try {
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        // Success is handled by onAuthStateChanged below
    } catch (error) {
        loginError.textContent = "Login failed: " + error.message;
        loginError.style.display = 'block';
    }
});

// --- 2. HANDLE LOGOUT ---
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log("Logged out successfully");
    }).catch((error) => {
        console.error("Error logging out:", error);
    });
});

// --- 3. CHECK LOGIN STATUS & SECURITY ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in, fetch their profile
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // 🔒 SECURITY CHECK: Only allow superAdmins
                if (userData.role === 'superAdmin') {
                    
                    if (userData.name) {
                        userNameDisplay.textContent = userData.name;
                    }

                    // Show Dashboard, Hide Login
                   document.getElementById('landing-page').style.display = 'none';)
                    dashboardScreen.style.display = 'flex';
                } else {
                    // Logged in, but not a super admin
                    alert("Access Denied. You are not a Super Admin.");
                    signOut(auth);
                }
            } else {
                alert("No profile found in Firestore.");
                signOut(auth);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    } else {
        // User is NOT logged in
        loginScreen.style.display = 'flex';
        dashboardScreen.style.display = 'none';
    }
});
