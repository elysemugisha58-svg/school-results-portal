import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getCountFromServer
} from "firebase/firestore";
import * as THREE from "three";
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

let app = null, auth = null, db = null, firebaseReady = false;
const statusEl = document.getElementById("firebase-status");

try {
  app  = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db   = getFirestore(app);
  firebaseReady = true;
  if (statusEl) statusEl.textContent = "Firebase: connected ✓";
} catch (err) {
  console.error("Firebase init failed:", err);
  if (statusEl) {
    statusEl.textContent = "Firebase: add your config in script.js";
    statusEl.style.color = "#ff7a7a";
  }
}

/* ---------------------------------------------------------
   2. THEME / CATEGORY MANAGER
   --------------------------------------------------------- */
const THEMES = ["super-admin", "school-admin", "teacher", "parent", "student"];
const ROLE_LABELS = {
  "super-admin":  "Platform Super Administrator",
  "school-admin": "School Administrator",
  "teacher":      "Teacher",
  "parent":       "Parent",
  "student":      "Student"
};

let currentRole = "school-admin";

function applyTheme(role) {
  if (!THEMES.includes(role)) return;
  currentRole = role;
  document.body.dataset.theme = role;

  document.querySelectorAll(".cat-tile").forEach(t => {
    t.setAttribute("aria-pressed", String(t.dataset.theme === role));
  });
  document.querySelectorAll(".role-tab").forEach(t => {
    t.setAttribute("aria-selected", String(t.dataset.role === role));
  });

  updateAuthFields(role);
  if (globe) updateGlobeAccent();
}

document.querySelectorAll(".cat-tile").forEach(tile => {
  tile.addEventListener("click", () => applyTheme(tile.dataset.theme));
});

document.getElementById("cat-continue")?.addEventListener("click", () => {
  openModal(currentRole);
});

/* ---------------------------------------------------------
   3. NAV / BURGER / YEAR
   --------------------------------------------------------- */
const burger = document.getElementById("nav-burger");
const navLinks = document.getElementById("nav-links");
burger?.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  burger.setAttribute("aria-expanded", String(open));
});
navLinks?.querySelectorAll("a").forEach(a => {
  a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    burger?.setAttribute("aria-expanded", "false");
  });
});

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

/* ---------------------------------------------------------
   4. AUTH MODAL
   --------------------------------------------------------- */
const modal      = document.getElementById("login-modal");
const modalSub   = document.getElementById("modal-sub");
const loginForm  = document.getElementById("login-form");
const otpForm    = document.getElementById("otp-form");
const formNote   = document.getElementById("form-note");
const otpNote    = document.getElementById("otp-note");
const emailField = document.getElementById("field-email");
const phoneField = document.getElementById("field-phone");
const passField  = document.getElementById("field-password");
const submitBtn  = document.getElementById("login-submit");

let lastFocused = null;
let confirmationResult = null;

function openModal(role) {
  if (!modal) return;
  applyTheme(role);
  lastFocused = document.activeElement;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  resetForms();
  updateAuthFields(role);
  document.getElementById("login-email")?.focus();
}

function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  lastFocused?.focus?.();
}

function resetForms() {
  loginForm?.reset();
  otpForm?.reset();
  if (loginForm) loginForm.hidden = false;
  if (otpForm)   otpForm.hidden = true;
  if (formNote) { formNote.textContent = ""; formNote.className = "form-note"; }
  if (otpNote)  { otpNote.textContent = "";  otpNote.className  = "form-note"; }
  confirmationResult = null;
}

function updateAuthFields(role) {
  const isTeacher = role === "teacher";
  if (emailField) emailField.hidden = isTeacher;
  if (passField)  passField.hidden  = isTeacher;
  if (phoneField) phoneField.hidden = !isTeacher;
  if (submitBtn)  submitBtn.textContent = isTeacher ? "Send SMS code" : "Sign in";
  if (modalSub)   modalSub.textContent = isTeacher
    ? "Teachers sign in with a phone number and SMS code."
    : `Signing in as ${ROLE_LABELS[role]}.`;
}

document.querySelectorAll("[data-open-modal]").forEach(btn => {
  btn.addEventListener("click", () => openModal(btn.dataset.openModal));
});
document.querySelectorAll("[data-close-modal]").forEach(btn => {
  btn.addEventListener("click", closeModal);
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && modal && !modal.hidden) closeModal();
});

document.querySelectorAll(".role-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    resetForms();
    applyTheme(tab.dataset.role);
  });
});

/* ---------------------------------------------------------
   5. SIGN IN — EMAIL / PASSWORD
   --------------------------------------------------------- */
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!firebaseReady) return note(formNote, "Add your Firebase config in script.js first.", "error");

  if (currentRole === "teacher") {
    return startPhoneSignIn();
  }

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) return note(formNote, "Enter your email and password.", "error");

  submitBtn.disabled = true;
  note(formNote, "Signing in…");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    note(formNote, "Signed in. Loading your workspace…", "ok");
    closeModal();
  } catch (err) {
    note(formNote, friendlyAuthError(err), "error");
  } finally {
    submitBtn.disabled = false;
  }
});

/* ---------------------------------------------------------
   6. SIGN IN — PHONE OTP (TEACHERS)
   --------------------------------------------------------- */
async function startPhoneSignIn() {
  const phone = document.getElementById("login-phone").value.trim();
  if (!/^\+\d{8,15}$/.test(phone.replace(/\s+/g, ""))) {
    return note(formNote, "Enter the phone number with country code, e.g. +250788123456.", "error");
  }

  submitBtn.disabled = true;
  note(formNote, "Sending SMS code…");

  try {
    if (!window.__recaptcha) {
      window.__recaptcha = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
    }
    confirmationResult = await signInWithPhoneNumber(auth, phone, window.__recaptcha);
    loginForm.hidden = true;
    otpForm.hidden = false;
    document.getElementById("otp-code").focus();
    note(otpNote, `Code sent to ${phone}.`);
  } catch (err) {
    console.error(err);
    note(formNote, friendlyAuthError(err), "error");
    try { window.__recaptcha?.clear(); window.__recaptcha = null; } catch {}
  } finally {
    submitBtn.disabled = false;
  }
}

otpForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = document.getElementById("otp-code").value.trim();
  if (!/^\d{6}$/.test(code)) return note(otpNote, "Enter the 6-digit code.", "error");
  if (!confirmationResult)   return note(otpNote, "Request a new code first.", "error");

  document.getElementById("otp-submit").disabled = true;
  note(otpNote, "Verifying…");

  try {
    await confirmationResult.confirm(code);
    note(otpNote, "Verified. Loading your workspace…", "ok");
    closeModal();
  } catch (err) {
    note(otpNote, friendlyAuthError(err), "error");
  } finally {
    document.getElementById("otp-submit").disabled = false;
  }
});

document.getElementById("otp-back")?.addEventListener("click", () => {
  resetForms();
  updateAuthFields(currentRole);
});

function friendlyAuthError(err) {
  const map = {
    "auth/invalid-email":          "That email address doesn't look right.",
    "auth/user-not-found":         "No account found with that email.",
    "auth/wrong-password":         "Incorrect password.",
    "auth/invalid-credential":     "Email or password is incorrect.",
    "auth/too-many-requests":      "Too many attempts. Try again later.",
    "auth/invalid-phone-number":   "That phone number isn't valid. Include the country code.",
    "auth/invalid-verification-code": "That SMS code is incorrect.",
    "auth/code-expired":           "That code has expired. Request a new one.",
    "auth/operation-not-allowed":  "This sign-in method isn't enabled in Firebase yet.",
    "auth/unauthorized-domain":    "This domain isn't authorised in Firebase Authentication settings.",
    "auth/invalid-app-credential": "reCAPTCHA failed. Reload the page and try again."
  };
  return map[err?.code] || err?.message || "Something went wrong. Please try again.";
}

function note(el, text, type = "") {
  if (!el) return;
  el.textContent = text;
  el.className = "form-note" + (type ? " " + type : "");
}

/* ---------------------------------------------------------
   7. SESSION STATE → ROLE-BASED DASHBOARD
   --------------------------------------------------------- */
const navSignin   = document.getElementById("nav-signin");
const navSignout  = document.getElementById("nav-signout");
const dashSection = document.getElementById("dashboard");

if (firebaseReady) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      navSignin?.removeAttribute("hidden");
      navSignout?.setAttribute("hidden", "");
      if (dashSection) dashSection.hidden = true;
      return;
    }

    navSignin?.setAttribute("hidden", "");
    navSignout?.removeAttribute("hidden");

    const profile = await loadProfile(user.uid);
    if (!profile) {
      if (dashSection) {
        dashSection.hidden = false;
        document.getElementById("dash-name").textContent = user.email || user.phoneNumber || "there";
        document.getElementById("dash-role-label").textContent = "No profile found";
        document.getElementById("dash-sub").textContent =
          "Your account is authenticated but has no Firestore profile yet. Create a doc in the `users` collection with ID " + user.uid + ".";
        document.getElementById("dash-grid").innerHTML = "";
      }
      return;
    }

    applyTheme(profile.role || "school-admin");
    await renderDashboard(user, profile);
  });
}

navSignout?.addEventListener("click", async () => {
  try { await signOut(auth); } catch (e) { console.error(e); }
});

async function loadProfile(uid) {
  if (!firebaseReady) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? { uid, ...snap.data() } : null;
  } catch (err) {
    console.error("Profile load failed:", err);
    return null;
  }
}

async function renderDashboard(user, profile) {
  if (!dashSection) return;
  dashSection.hidden = false;

  document.getElementById("dash-role-label").textContent = ROLE_LABELS[profile.role] || "Portal";
  document.getElementById("dash-name").textContent = profile.name || user.email || user.phoneNumber || "there";
  document.getElementById("dash-sub").textContent =
    profile.schoolId ? `School workspace: ${profile.schoolId}` : "Platform-wide workspace";

  const grid = document.getElementById("dash-grid");
  const noteEl = document.getElementById("dash-note");
  grid.innerHTML = "";
  if (noteEl) { noteEl.textContent = "Loading live counts from Firestore…"; noteEl.className = "dash-note"; }

  try {
    const cards = await buildCards(profile);
    grid.innerHTML = cards.map(c => `
      <div class="dash-card">
        <div class="dash-label">${escapeHtml(c.label)}</div>
        <div class="dash-value">${escapeHtml(c.value)}</div>
        <div class="dash-detail">${escapeHtml(c.detail || "")}</div>
      </div>
    `).join("");
    if (noteEl) { noteEl.textContent = "Counts are read live from Firestore, scoped to your school."; noteEl.className = "dash-note"; }
  } catch (err) {
    console.error(err);
    if (noteEl) { noteEl.textContent = "Could not read Firestore: " + err.message; noteEl.className = "dash-note error"; }
  }
}

async function buildCards(profile) {
  const cards = [];
  const sid = profile.schoolId;

  const count = async (path) => {
    try {
      const snap = await getCountFromServer(collection(db, path));
      return snap.data().count;
    } catch { return "—"; }
  };

  if (profile.role === "super-admin") {
    cards.push({ label: "Schools", value: await count("schools"), detail: "Registered on the platform" });
    cards.push({ label: "Users", value: await count("users"), detail: "All portal accounts" });
    cards.push({ label: "Your access", value: "Full", detail: "Platform governance" });
  } else if (profile.role === "school-admin" && sid) {
    cards.push({ label: "Students", value: await count(`schools/${sid}/students`), detail: "Enrolled in your school" });
    cards.push({ label: "Teachers", value: await count(`schools/${sid}/teachers`), detail: "Staff registered" });
    cards.push({ label: "Classes", value: await count(`schools/${sid}/classes`), detail: "Active classes" });
    cards.push({ label: "CPD sessions", value: await count(`schools/${sid}/cpd`), detail: "Scheduled workshops" });
  } else if (profile.role === "teacher" && sid) {
    cards.push({ label: "School", value: sid, detail: "Your assigned workspace" });
    cards.push({ label: "Classes", value: await count(`schools/${sid}/classes`), detail: "Available to you" });
    cards.push({ label: "CPD sessions", value: await count(`schools/${sid}/cpd`), detail: "Open for check-in" });
  } else if (profile.role === "parent") {
    const kids = Array.isArray(profile.children) ? profile.children : [];
    cards.push({ label: "Children", value: String(kids.length), detail: kids.map(k => k.name || k.studentId).join(", ") || "None linked yet" });
    cards.push({ label: "Access", value: "Read-only", detail: "Downloads and printing disabled" });
  } else if (profile.role === "student") {
    cards.push({ label: "Student ID", value: profile.studentId || "—", detail: "Your academic record" });
    cards.push({ label: "School", value: sid || "—", detail: "Your workspace" });
  } else {
    cards.push({ label: "Status", value: "Signed in", detail: "Profile loaded" });
  }

  return cards;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

/* ---------------------------------------------------------
   8. THREE.JS HERO — interactive globe with data arcs
   --------------------------------------------------------- */
let renderer = null, scene = null, camera = null;
let globe = null, arcsGroup = null, globePoints = null;
let animId = null;
let lowPower = false;
let pointer = { x: 0, y: 0 };
let threeInit = false;

const fallback = document.getElementById("hero-fallback");
const powerToggle = document.getElementById("power-toggle");

function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch { return false; }
}

function initThree() {
  // Guard: re-select the canvas every time in case DOM wasn't ready earlier
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) {
    console.warn("Hero canvas not found — showing fallback.");
    return showFallback();
  }
  if (lowPower) return showFallback();
  if (!supportsWebGL()) {
    console.warn("WebGL not supported — showing fallback.");
    return showFallback();
  }
  if (threeInit) return; // prevent double-init

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !reduced,
      alpha: true,
      powerPreference: "low-power"
    });
  } catch (err) {
    console.error("WebGLRenderer failed:", err);
    return showFallback();
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    45,
    (canvas.clientWidth || window.innerWidth) / (canvas.clientHeight || window.innerHeight),
    0.1,
    100
  );
  camera.position.set(0, 0, 6.2);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));

  // Wireframe sphere
  const geo = new THREE.SphereGeometry(2, 32, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(accentColor()),
    wireframe: true,
    transparent: true,
    opacity: 0.22
  });
  globe = new THREE.Mesh(geo, mat);
  scene.add(globe);

  // Inner glow
  const glowGeo = new THREE.SphereGeometry(1.95, 32, 24);
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(accentColor()),
    transparent: true,
    opacity: 0.05
  });
  scene.add(new THREE.Mesh(glowGeo, glowMat));

  // Node dots
  globePoints = new THREE.Group();
  const dotGeo = new THREE.SphereGeometry(0.028, 8, 8);
  const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(accentColor()) });
  const N = 90;
  for (let i = 0; i < N; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / N);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 2.02;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.sin(theta);
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(x, y, z);
    globePoints.add(dot);
  }
  scene.add(globePoints);

  // Data arcs
  arcsGroup = new THREE.Group();
  const arcMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(accentColor()),
    transparent: true,
    opacity: 0.4
  });
  const schools = [
    [1.9, 0.3, 0.4], [-1.2, 1.4, 0.6], [0.4, -1.8, 0.7],
    [-1.7, -0.6, 0.9], [1.3, 1.5, -0.6], [-0.5, 0.9, 1.7]
  ];
  for (let i = 0; i < schools.length; i++) {
    const a = new THREE.Vector3(...schools[i]).normalize().multiplyScalar(2.05);
    const b = new THREE.Vector3(...schools[(i + 1) % schools.length]).normalize().multiplyScalar(2.05);
    const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(2.9);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const pts = curve.getPoints(40);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    arcsGroup.add(new THREE.Line(lineGeo, arcMat));
  }
  scene.add(arcsGroup);

  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  window.addEventListener("resize", onResize, { passive: true });
  onResize();

  if (fallback) fallback.style.display = "none";
  threeInit = true;
  loop();
}

function onResize() {
  if (!renderer || !camera) return;
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function loop() {
  if (lowPower) return;
  animId = requestAnimationFrame(loop);

  if (globe) globe.rotation.y += 0.0016;
  if (globePoints) globePoints.rotation.y += 0.0016;
  if (arcsGroup) {
    arcsGroup.rotation.y += 0.0016;
    arcsGroup.children.forEach((line, i) => {
      line.material.opacity = 0.18 + Math.abs(Math.sin(performance.now() * 0.0008 + i)) * 0.4;
    });
  }
  if (camera) {
    camera.position.x += (pointer.x * 0.55 - camera.position.x) * 0.03;
    camera.position.y += (-pointer.y * 0.35 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);
  }

  if (renderer && scene && camera) renderer.render(scene, camera);
}

function stopLoop() {
  if (animId) cancelAnimationFrame(animId);
  animId = null;
}

function showFallback() {
  stopLoop();
  const canvas = document.getElementById("hero-canvas");
  if (canvas) canvas.style.display = "none";
  if (fallback) fallback.style.display = "flex";
}

function accentColor() {
  const v = getComputedStyle(document.body).getPropertyValue("--accent").trim();
  return v || "#2fd08a";
}

function updateGlobeAccent() {
  const color = new THREE.Color(accentColor());
  if (globe) globe.material.color.copy(color);
  if (globePoints) globePoints.children.forEach(d => d.material.color.copy(color));
  if (arcsGroup) arcsGroup.children.forEach(l => l.material.color.copy(color));
}

powerToggle?.addEventListener("click", () => {
  lowPower = !lowPower;
  powerToggle.setAttribute("aria-pressed", String(lowPower));
  if (lowPower) {
    showFallback();
  } else {
    const canvas = document.getElementById("hero-canvas");
    if (canvas) canvas.style.display = "block";
    if (fallback) fallback.style.display = "none";
    if (!threeInit) initThree();
    else loop();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopLoop();
  else if (!lowPower && threeInit) loop();
});

/* ---------------------------------------------------------
   9. BOOT — wait for full page load so the canvas exists
   --------------------------------------------------------- */
if (document.readyState === "complete") {
  initThree();
} else {
  window.addEventListener("load", initThree);
}
