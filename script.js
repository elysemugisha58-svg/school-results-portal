import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
  limit,
  serverTimestamp
} from "firebase/firestore";
import * as THREE from "three";

/* ---------------------------------------------------------
   1. FIREBASE CONFIG
   --------------------------------------------------------- */
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
const formNote   = document.getElementById("form-note");
const emailField = document.getElementById("field-email");
const passField  = document.getElementById("field-password");
const submitBtn  = document.getElementById("login-submit");

let lastFocused = null;

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
  if (loginForm) loginForm.hidden = false;
  if (formNote) { formNote.textContent = ""; formNote.className = "form-note"; }
}

function updateAuthFields(role) {
  if (emailField) emailField.hidden = false;
  if (passField)  passField.hidden  = false;
  if (submitBtn)  submitBtn.textContent = "Sign in";
  if (modalSub)   modalSub.textContent = `Signing in as ${ROLE_LABELS[role]}.`;
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
   5. SIGN IN — EMAIL / PASSWORD (all roles)
   --------------------------------------------------------- */
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!firebaseReady) return note(formNote, "Add your Firebase config in script.js first.", "error");

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

function friendlyAuthError(err) {
  const map = {
    "auth/invalid-email":         "That email address doesn't look right.",
    "auth/user-not-found":        "No account found with that email.",
    "auth/wrong-password":        "Incorrect password.",
    "auth/invalid-credential":    "Email or password is incorrect.",
    "auth/too-many-requests":     "Too many attempts. Try again later.",
    "auth/operation-not-allowed": "Email/Password sign-in isn't enabled in Firebase yet.",
    "auth/unauthorized-domain":   "This domain isn't authorised in Firebase Authentication settings.",
    "auth/network-request-failed":"Network error — check your connection."
  };
  return map[err?.code] || err?.message || "Something went wrong. Please try again.";
}

function note(el, text, type = "") {
  if (!el) return;
  el.textContent = text;
  el.className = "form-note" + (type ? " " + type : "");
}

/* ---------------------------------------------------------
   6. SESSION STATE → ROLE-BASED DASHBOARD
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
      ["users-panel","parent-panel","student-panel","admin-extras"].forEach(id => showPanel(id, false));
      return;
    }

    navSignin?.setAttribute("hidden", "");
    navSignout?.removeAttribute("hidden");

    const profile = await loadProfile(user.uid);
    if (!profile) {
      if (dashSection) {
        dashSection.hidden = false;
        document.getElementById("dash-name").textContent = user.email || "there";
        document.getElementById("dash-role-label").textContent = "No profile found";
        document.getElementById("dash-sub").textContent =
          "Your account is authenticated but has no Firestore profile yet. Create a doc in `users` with ID " + user.uid + " and fields { role, schoolId, name }.";
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
  document.getElementById("dash-name").textContent = profile.name || user.email || "there";
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

    showPanel("users-panel",     profile.role === "super-admin");
    showPanel("parent-panel",    profile.role === "parent");
    showPanel("student-panel",   profile.role === "student");
    showPanel("admin-extras",    profile.role === "school-admin");

    if (profile.role === "super-admin")  await renderUsersPanel(profile.uid);
    if (profile.role === "parent")       await renderParentPanel(profile);
    if (profile.role === "student")      await renderStudentPanel(profile);
    if (profile.role === "school-admin") await renderAdminExtras(profile);
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
    cards.push({ label: "Applications", value: await count("applications"), detail: "Public enrolment submissions" });
    cards.push({ label: "Your access", value: "Full", detail: "Platform governance" });
  } else if (profile.role === "school-admin" && sid) {
    cards.push({ label: "Students", value: await count(`schools/${sid}/students`), detail: "Enrolled in your school" });
    cards.push({ label: "Teachers", value: await count(`schools/${sid}/teachers`), detail: "Staff registered" });
    cards.push({ label: "Classes", value: await count(`schools/${sid}/classes`), detail: "Active classes" });
    cards.push({ label: "CPD sessions", value: await count(`schools/${sid}/cpd`), detail: "Scheduled workshops" });
  } else if (profile.role === "teacher" && sid) {
    cards.push({ label: "School", value: sid, detail: "Your assigned workspace" });
    cards.push({ label: "Classes", value: await count(`schools/${sid}/classes`), detail: "Available to you" });
    cards.push({ label: "Assignments", value: await count(`schools/${sid}/assignments`), detail: "Posted by staff" });
    cards.push({ label: "CPD sessions", value: await count(`schools/${sid}/cpd`), detail: "Open for check-in" });
  } else if (profile.role === "parent") {
    const kids = Array.isArray(profile.childUids) ? profile.childUids : [];
    cards.push({ label: "Children", value: String(kids.length), detail: kids.length ? "Linked to your account" : "None linked yet" });
    cards.push({ label: "Fee status", value: profile.feesCleared ? "Cleared" : "Unpaid", detail: profile.feesCleared ? "Results unlocked" : "Results locked" });
    cards.push({ label: "Access", value: "Read-only", detail: "Plus feedback & applications" });
  } else if (profile.role === "student") {
    cards.push({ label: "Student ID", value: profile.studentId || "—", detail: "Your academic record" });
    cards.push({ label: "School", value: sid || "—", detail: "Your workspace" });
    cards.push({ label: "Assignments", value: await count(`schools/${sid}/assignments`), detail: "Open for submission" });
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

function showPanel(id, on) {
  const el = document.getElementById(id);
  if (el) el.hidden = !on;
}

/* ---------------------------------------------------------
   7. SUPER ADMIN — USER ROLE MANAGEMENT
   --------------------------------------------------------- */
const ROLE_OPTIONS = [
  { value: "super-admin",  label: "Super Admin" },
  { value: "school-admin", label: "School Admin" },
  { value: "teacher",      label: "Teacher" },
  { value: "parent",       label: "Parent" },
  { value: "student",      label: "Student" }
];

async function renderUsersPanel(currentUid) {
  const tbody  = document.getElementById("users-tbody");
  const noteEl = document.getElementById("users-note");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="users-empty">Loading users…</td></tr>`;
  if (noteEl) { noteEl.textContent = ""; noteEl.className = "form-note"; }

  try {
    const snap = await getDocs(collection(db, "users"));
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="5" class="users-empty">No user documents yet.</td></tr>`;
      return;
    }

    const rows = [];
    snap.forEach(d => {
      const data = d.data();
      rows.push({
        uid:      d.id,
        email:    data.email    || "",
        phone:    data.phone    || "",
        name:     data.name     || "—",
        schoolId: data.schoolId || "—",
        role:     data.role     || "student"
      });
    });
    rows.sort((a, b) => a.name.localeCompare(b.name));

    tbody.innerHTML = rows.map(r => {
      const isSelf = r.uid === currentUid;
      const options = ROLE_OPTIONS.map(o =>
        `<option value="${o.value}" ${o.value === r.role ? "selected" : ""}>${o.label}</option>`
      ).join("");

      return `
        <tr>
          <td>${escapeHtml(r.name)}${isSelf ? ' <small>(you)</small>' : ""}</td>
          <td>${escapeHtml(r.email || r.phone || "—")}</td>
          <td>${escapeHtml(r.schoolId)}</td>
          <td><span class="role-pill">${escapeHtml(ROLE_LABELS[r.role] || r.role)}</span></td>
          <td>
            <select class="role-select" data-uid="${escapeHtml(r.uid)}"
              ${isSelf ? `disabled title="You cannot change your own role"` : ""}>
              ${options}
            </select>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll(".role-select").forEach(sel => {
      sel.addEventListener("change", () => changeUserRole(sel.dataset.uid, sel.value, sel));
    });
  } catch (err) {
    console.error("Failed to load users:", err);
    tbody.innerHTML = `<tr><td colspan="5" class="users-empty">Failed to load: ${escapeHtml(err.message)}</td></tr>`;
  }
}

async function changeUserRole(uid, newRole, selectEl) {
  const noteEl = document.getElementById("users-note");
  if (!ROLE_OPTIONS.some(o => o.value === newRole)) return;

  selectEl.disabled = true;
  if (noteEl) { noteEl.textContent = "Updating role…"; noteEl.className = "form-note"; }

  try {
    await updateDoc(doc(db, "users", uid), { role: newRole });
    if (noteEl) {
      noteEl.textContent = `Role updated to ${ROLE_LABELS[newRole] || newRole}. The affected user will see the change on their next page load.`;
      noteEl.className = "form-note ok";
    }
    const row  = selectEl.closest("tr");
    const pill = row?.querySelector(".role-pill");
    if (pill) pill.textContent = ROLE_LABELS[newRole] || newRole;
  } catch (err) {
    console.error("Role update failed:", err);
    if (noteEl) { noteEl.textContent = "Update failed: " + err.message; noteEl.className = "form-note error"; }
  } finally {
    selectEl.disabled = false;
  }
}

/* ---------------------------------------------------------
   8. PARENT PANEL
   --------------------------------------------------------- */
function renderMarksTable(marks) {
  if (!marks.length) return `<p class="muted">No marks recorded yet.</p>`;
  const rows = marks.map(m => `
    <tr>
      <td>${escapeHtml(m.subjectId || "—")}</td>
      <td>${escapeHtml(m.examName || "—")}</td>
      <td>${m.score ?? "—"} / ${m.outOf ?? "—"}</td>
    </tr>`).join("");
  return `<table class="mini-table"><thead><tr><th>Subject</th><th>Exam</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function renderParentPanel(profile) {
  const sid = profile.schoolId;

  const banner = document.getElementById("fee-banner");
  if (banner) banner.hidden = profile.feesCleared === true;

  const resultsEl = document.getElementById("parent-results");
  if (resultsEl) {
    if (!profile.feesCleared) {
      resultsEl.innerHTML = `<p class="muted">Results will appear here once fees are cleared.</p>`;
    } else if (!Array.isArray(profile.childUids) || profile.childUids.length === 0) {
      resultsEl.innerHTML = `<p class="muted">No children linked to your account yet.</p>`;
    } else {
      try {
        const all = [];
        for (const childUid of profile.childUids) {
          const snap = await getDocs(query(
            collection(db, "schools", sid, "marks"),
            where("studentId", "==", childUid),
            limit(30)
          ));
          snap.forEach(d => all.push(d.data()));
        }
        resultsEl.innerHTML = renderMarksTable(all);
      } catch (err) {
        resultsEl.innerHTML = `<p class="muted error">Could not load marks: ${escapeHtml(err.message)}</p>`;
      }
    }
  }

  const annEl = document.getElementById("parent-announcements");
  if (annEl) {
    try {
      const snap = await getDocs(collection(db, "schools", sid, "announcements"));
      const items = [];
      snap.forEach(d => items.push(d.data()));
      annEl.innerHTML = items.length
        ? items.map(a => `<div class="list-item"><strong>${escapeHtml(a.title||"")}</strong><p>${escapeHtml(a.body||"")}</p></div>`).join("")
        : `<p class="muted">No announcements yet.</p>`;
    } catch (err) {
      annEl.innerHTML = `<p class="muted error">${escapeHtml(err.message)}</p>`;
    }
  }

  const fbEl = document.getElementById("feedback-history");
  if (fbEl) {
    try {
      const snap = await getDocs(collection(db, "schools", sid, "feedback"));
      const mine = [];
      snap.forEach(d => { if (d.data().authorUid === profile.uid) mine.push(d.data()); });
      fbEl.innerHTML = mine.length
        ? mine.map(f => `<div class="list-item"><strong>${escapeHtml(f.target||"general")}</strong><p>${escapeHtml(f.message||"")}</p>${f.reply ? `<p class="reply"><em>School reply:</em> ${escapeHtml(f.reply)}</p>` : ""}</div>`).join("")
        : `<p class="muted">You haven't sent any messages yet.</p>`;
    } catch { fbEl.innerHTML = `<p class="muted">—</p>`; }
  }

  const fbForm = document.getElementById("feedback-form");
  if (fbForm && !fbForm.dataset.wired) {
    fbForm.dataset.wired = "1";
    fbForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = document.getElementById("fb-message").value.trim();
      const tgt = document.getElementById("fb-target").value;
      const n   = document.getElementById("fb-note");
      if (!msg) return note(n, "Write a message first.", "error");
      try {
        await addDoc(collection(db, "schools", sid, "feedback"), {
          authorUid: profile.uid, authorName: profile.name || "Parent",
          message: msg, target: tgt, createdAt: serverTimestamp()
        });
        note(n, "Sent. Thank you!", "ok");
        fbForm.reset();
        await renderParentPanel(profile);
      } catch (err) {
        note(n, "Could not send: " + err.message, "error");
      }
    });
  }

  const asgEl = document.getElementById("parent-assignments");
  if (asgEl && Array.isArray(profile.childUids)) {
    try {
      const snap = await getDocs(collection(db, "schools", sid, "assignments"));
      const items = [];
      snap.forEach(d => items.push(d.data()));
      asgEl.innerHTML = items.length
        ? items.map(a => `<div class="list-item"><strong>${escapeHtml(a.title||"")}</strong><p>${escapeHtml(a.description||"")}</p><small>Due: ${escapeHtml(a.dueDate||"—")}</small></div>`).join("")
        : `<p class="muted">No assignments posted.</p>`;
    } catch { asgEl.innerHTML = `<p class="muted">—</p>`; }
  }
}

/* ---------------------------------------------------------
   9. STUDENT PANEL
   --------------------------------------------------------- */
async function renderStudentPanel(profile) {
  const sid = profile.schoolId;
  const sidUid = profile.studentId;

  const asgEl = document.getElementById("student-assignments");
  const subEl = document.getElementById("student-submissions");

  let assignments = [], submissions = [];
  try {
    const aSnap = await getDocs(collection(db, "schools", sid, "assignments"));
    aSnap.forEach(d => assignments.push({ id: d.id, ...d.data() }));
    const sSnap = await getDocs(query(
      collection(db, "schools", sid, "submissions"),
      where("studentId", "==", sidUid)
    ));
    sSnap.forEach(d => submissions.push({ id: d.id, ...d.data() }));
  } catch (err) {
    if (asgEl) asgEl.innerHTML = `<p class="muted error">${escapeHtml(err.message)}</p>`;
    return;
  }

  const submitted = new Set(submissions.map(s => s.assignmentId));

  if (asgEl) {
    asgEl.innerHTML = assignments.length
      ? assignments.map(a => {
          const done = submitted.has(a.id);
          return `<div class="list-item"><strong>${escapeHtml(a.title||"")}</strong><p>${escapeHtml(a.description||"")}</p><small>Due: ${escapeHtml(a.dueDate||"—")}</small>${done ? `<span class="badge ok">Submitted</span>` : `<button class="btn btn-primary btn-sm" data-submit="${escapeHtml(a.id)}">Submit</button>`}</div>`;
        }).join("")
      : `<p class="muted">No assignments yet.</p>`;
    asgEl.querySelectorAll("[data-submit]").forEach(b =>
      b.addEventListener("click", () => submitAssignment(b.dataset.submit, profile))
    );
  }

  if (subEl) {
    subEl.innerHTML = submissions.length
      ? submissions.map(s => `<div class="list-item"><strong>${escapeHtml(s.assignmentId||"")}</strong><p>${escapeHtml(s.content||"")}</p><small>Status: ${escapeHtml(s.status||"submitted")}${s.grade ? ` · Grade: ${escapeHtml(String(s.grade))}` : ""}</small></div>`).join("")
      : `<p class="muted">No submissions yet.</p>`;
  }

  const resEl = document.getElementById("student-results");
  if (resEl) {
    try {
      const snap = await getDocs(query(
        collection(db, "schools", sid, "marks"),
        where("studentId", "==", sidUid)
      ));
      const marks = [];
      snap.forEach(d => marks.push(d.data()));
      resEl.innerHTML = renderMarksTable(marks);
    } catch (err) {
      resEl.innerHTML = `<p class="muted error">${escapeHtml(err.message)}</p>`;
    }
  }

  const annEl = document.getElementById("student-announcements");
  if (annEl) {
    try {
      const snap = await getDocs(collection(db, "schools", sid, "announcements"));
      const items = [];
      snap.forEach(d => items.push(d.data()));
      annEl.innerHTML = items.length
        ? items.map(a => `<div class="list-item"><strong>${escapeHtml(a.title||"")}</strong><p>${escapeHtml(a.body||"")}</p></div>`).join("")
        : `<p class="muted">No announcements.</p>`;
    } catch { annEl.innerHTML = `<p class="muted">—</p>`; }
  }
}

async function submitAssignment(assignmentId, profile) {
  const content = prompt("Paste your answer / notes for this assignment:");
  if (!content) return;
  try {
    await addDoc(collection(db, "schools", profile.schoolId, "submissions"), {
      assignmentId, studentId: profile.studentId,
      studentName: profile.name || "Student",
      content, submittedAt: serverTimestamp(), status: "submitted"
    });
    await renderStudentPanel(profile);
  } catch (err) { alert("Submission failed: " + err.message); }
}

/* ---------------------------------------------------------
   10. ADMIN EXTRAS
   --------------------------------------------------------- */
async function renderAdminExtras(profile) {
  const sid = profile.schoolId;

  const apEl = document.getElementById("admin-applications");
  if (apEl) {
    try {
      const snap = await getDocs(query(
        collection(db, "applications"),
        where("schoolId", "==", sid),
        where("status", "==", "pending")
      ));
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      apEl.innerHTML = items.length
        ? items.map(a => `<div class="list-item"><strong>${escapeHtml(a.studentName||"")}</strong><p>${escapeHtml(a.parentName||"")} · ${escapeHtml(a.parentPhone||"")} · ${escapeHtml(a.classAppliedFor||"")}</p><div class="row-actions"><button class="btn btn-primary btn-sm" data-app-approve="${escapeHtml(a.id)}">Approve</button><button class="btn btn-ghost btn-sm" data-app-reject="${escapeHtml(a.id)}">Reject</button></div></div>`).join("")
        : `<p class="muted">No pending applications.</p>`;
      apEl.querySelectorAll("[data-app-approve]").forEach(b =>
        b.addEventListener("click", () => updateApplication(b.dataset.appApprove, "approved")));
      apEl.querySelectorAll("[data-app-reject]").forEach(b =>
        b.addEventListener("click", () => updateApplication(b.dataset.appReject, "rejected")));
    } catch (err) {
      apEl.innerHTML = `<p class="muted error">${escapeHtml(err.message)}</p>`;
    }
  }

  const prEl = document.getElementById("admin-parents");
  if (prEl) {
    try {
      const snap = await getDocs(query(
        collection(db, "users"),
        where("schoolId", "==", sid),
        where("role", "==", "parent")
      ));
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      prEl.innerHTML = items.length
        ? items.map(p => `<div class="list-item fee-row"><div><strong>${escapeHtml(p.name||p.email||p.id)}</strong><p class="muted">${escapeHtml(p.email||"")}</p></div><label class="switch"><input type="checkbox" data-parent-toggle="${escapeHtml(p.id)}" ${p.feesCleared ? "checked" : ""} /><span>${p.feesCleared ? "Cleared" : "Unpaid"}</span></label></div>`).join("")
        : `<p class="muted">No parents in your school yet.</p>`;
      prEl.querySelectorAll("[data-parent-toggle]").forEach(cb => {
        cb.addEventListener("change", async () => {
          try {
            await updateDoc(doc(db, "users", cb.dataset.parentToggle), { feesCleared: cb.checked });
            cb.nextElementSibling.textContent = cb.checked ? "Cleared" : "Unpaid";
          } catch (err) {
            alert("Update failed: " + err.message);
            cb.checked = !cb.checked;
          }
        });
      });
    } catch (err) {
      prEl.innerHTML = `<p class="muted error">${escapeHtml(err.message)}</p>`;
    }
  }
}

async function updateApplication(id, status) {
  try {
    await updateDoc(doc(db, "applications", id), { status });
    const el = document.getElementById("admin-applications");
    if (el) el.querySelector(`[data-app-approve="${id}"], [data-app-reject="${id}"]`)?.closest(".list-item")?.remove();
  } catch (err) { alert("Update failed: " + err.message); }
}

/* ---------------------------------------------------------
   11. PUBLIC APPLICATION FORM (no login required)
   --------------------------------------------------------- */
(function wireApplicationForm() {
  const form = document.getElementById("apply-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const n = document.getElementById("apply-note");
    if (!firebaseReady) return note(n, "Firebase not configured.", "error");
    try {
      await addDoc(collection(db, "applications"), {
        studentName:     document.getElementById("ap-student").value.trim(),
        classAppliedFor: document.getElementById("ap-class").value.trim(),
        parentName:      document.getElementById("ap-parent").value.trim(),
        parentPhone:     document.getElementById("ap-phone").value.trim(),
        parentEmail:     document.getElementById("ap-email").value.trim(),
        schoolId:        document.getElementById("ap-school").value.trim(),
        previousSchool:  "",
        notes:           document.getElementById("ap-notes").value.trim(),
        status:          "pending",
        submittedAt:     serverTimestamp()
      });
      note(n, "Application submitted ✓ The school will contact you.", "ok");
      form.reset();
    } catch (err) {
      note(n, "Could not submit: " + err.message, "error");
    }
  });
})();

/* ---------------------------------------------------------
   12. THREE.JS HERO
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
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return showFallback();
  if (lowPower) return showFallback();
  if (!supportsWebGL()) return showFallback();
  if (threeInit) return;

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
    0.1, 100
  );
  camera.position.set(0, 0, 6.2);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));

  const geo = new THREE.SphereGeometry(2, 32, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(accentColor()),
    wireframe: true, transparent: true, opacity: 0.22
  });
  globe = new THREE.Mesh(geo, mat);
  scene.add(globe);

  const glowGeo = new THREE.SphereGeometry(1.95, 32, 24);
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(accentColor()),
    transparent: true, opacity: 0.05
  });
  scene.add(new THREE.Mesh(glowGeo, glowMat));

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

  arcsGroup = new THREE.Group();
  const arcMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(accentColor()),
    transparent: true, opacity: 0.4
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

if (document.readyState === "complete") {
  initThree();
} else {
  window.addEventListener("load", initThree);
}
