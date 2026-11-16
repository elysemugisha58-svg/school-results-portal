// ===================================================================
// School Results Portal — single-file app (Firebase + Three.js)
// ===================================================================
import * as THREE from "three";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, getDocs, addDoc, updateDoc, setDoc,
  collection, onSnapshot, query, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyBCcWkAzjh9FLpphYIdpLNcDQRhVK5FKcM",
  authDomain: "educonnect-5885b.firebaseapp.com",
  projectId: "educonnect-5885b",
  storageBucket: "educonnect-5885b.firebasestorage.app",
  messagingSenderId: "814892024989",
  appId: "1:814892024989:web:3be333f2078732aa02c074",
  measurementId: "G-GKQ1WWG2PQ"
};

const fbApp  = initializeApp(firebaseConfig);
const auth   = getAuth(fbApp);
const db     = getFirestore(fbApp);

// ---------------------------------------------------------------
// 🌐 2. THREE.JS BACKGROUND
// ---------------------------------------------------------------
(function initThree(){
  const canvas = document.getElementById("bg-canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 100);
  camera.position.z = 8;

  const ico = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.4, 1),
    new THREE.MeshBasicMaterial({ color:0x2563eb, wireframe:true, transparent:true, opacity:0.14 })
  );
  scene.add(ico);

  const ico2 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.6, 0),
    new THREE.MeshBasicMaterial({ color:0x0f766e, wireframe:true, transparent:true, opacity:0.07 })
  );
  ico2.position.set(-3, 1.5, -2);
  scene.add(ico2);

  const COUNT = 900;
  const positions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT * 3; i++) positions[i] = (Math.random() - 0.5) * 22;
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color:0x93c5fd, size:0.045, transparent:true, opacity:0.9, depthWrite:false
  }));
  scene.add(points);

  let tx = 0, ty = 0;
  addEventListener("pointermove", e => {
    tx = (e.clientX / innerWidth  - 0.5) * 0.6;
    ty = (e.clientY / innerHeight - 0.5) * 0.6;
  });

  const clock = new THREE.Clock();
  (function tick(){
    const t = clock.getElapsedTime();
    ico.rotation.x = t * 0.08; ico.rotation.y = t * 0.11;
    ico2.rotation.x = -t * 0.05; ico2.rotation.y = -t * 0.07;
    points.rotation.y = t * 0.02;
    camera.position.x += (tx - camera.position.x) * 0.04;
    camera.position.y += (-ty - camera.position.y) * 0.04;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  })();

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
})();

// ---------------------------------------------------------------
// 🧠 3. APP STATE
// ---------------------------------------------------------------
const state = {
  user:null, profile:null, schoolId:null, role:"admin",
  students:[], teachers:[], results:[], settings:{},
  currentPage:"overview", unsub:null
};

const $   = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const grade = n => n>=80?'A':n>=70?'B':n>=60?'C':n>=50?'D':'E';
const statusClass = s =>
  s==='Approved' ? 'done' :
  s==='Pending review' ? 'pending' : 'review';

// ---------------------------------------------------------------
// 🔐 4. AUTH
// ---------------------------------------------------------------
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("login-message");
  const btn = e.target.querySelector("button[type=submit]");
  msg.textContent = "Signing in...";
  btn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, $("login-email").value.trim(), $("login-password").value);
  } catch (err) {
    msg.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

$("sign-out").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (state.unsub) { state.unsub(); state.unsub = null; }
    $("login-screen").style.display = "grid";
    $("app").style.display = "none";
    return;
  }
  try {
    const snap = await getDoc(doc(db, "profiles", user.uid));
    if (!snap.exists()) throw new Error("No profile found. Contact admin.");
    const profile = snap.data();
    if (!["admin","teacher"].includes(profile.role)) throw new Error("Invalid role.");
    state.user = user;
    state.profile = profile;
    state.schoolId = profile.school_id || user.uid;
    state.role = profile.role;
    await boot();
  } catch (err) {
    $("login-message").textContent = err.message;
    await signOut(auth);
  }
});

// ---------------------------------------------------------------
// 🚀 5. BOOT
// ---------------------------------------------------------------
async function boot() {
  $("login-screen").style.display = "none";
  $("app").style.display = "grid";

  const name = state.profile.full_name || state.user.email;
  $("user-name").textContent   = name;
  $("user-sub").textContent    = state.role === "admin" ? "School management" : "Teacher";
  $("avatar").textContent      = name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
  $("sidebar-role").textContent   = state.role === "admin" ? "Administrator" : "Teacher";
  $("sidebar-school").textContent = state.schoolId;
  $("welcome-title").textContent  = state.role === "admin"
    ? "Good afternoon, Administrator 👋"
    : "Welcome back, Teacher 👋";

  // hide role-specific nav
  document.querySelectorAll("#nav button").forEach(b => {
    const adminOnly   = ["teachers","settings"].includes(b.dataset.page);
    const teacherOnly = ["marks"].includes(b.dataset.page);
    if (state.role === "teacher" && adminOnly)   b.classList.add("hidden");
    if (state.role === "admin"   && teacherOnly) b.classList.add("hidden");
  });

  await loadAll();
  subscribeLive();
  showPage("overview");
}

async function loadAll() {
  const schoolRef = doc(db, "schools", state.schoolId);
  const sSnap = await getDoc(schoolRef);
  state.settings = sSnap.exists() ? sSnap.data()
    : { name:"Green Hills School", pass_mark:50 };

  const [studs, teachs, ress] = await Promise.all([
    getDocs(collection(schoolRef, "students")),
    getDocs(collection(schoolRef, "teachers")),
    getDocs(collection(schoolRef, "results"))
  ]);
  state.students = studs.docs.map(d => ({ _id:d.id, ...d.data() }));
  state.teachers = teachs.docs.map(d => ({ _id:d.id, ...d.data() }));
  state.results  = ress.docs.map(d => ({ _id:d.id, ...d.data() }));
  renderAll();
}

function subscribeLive() {
  if (state.unsub) state.unsub();
  const schoolRef = doc(db, "schools", state.schoolId);
  state.unsub = onSnapshot(collection(schoolRef, "results"), snap => {
    state.results = snap.docs.map(d => ({ _id:d.id, ...d.data() }));
    renderAll();
  });
}

// ---------------------------------------------------------------
// 🎨 6. RENDERERS
// ---------------------------------------------------------------
function renderStats() {
  const isAdmin = state.role === "admin";
  const pending = state.results.filter(r => r.status === "Pending review").length;
  const cards = isAdmin
    ? [["Students", state.students.length, "Registered learners", "♙"],
       ["Teachers", state.teachers.length, "Teaching staff", "♧"],
       ["Results", state.results.length, "Score records", "▤"],
       ["Awaiting review", pending, "Need admin review", "◷"]]
    : [["My classes", 2, "Assigned classes", "▦"],
       ["My students", state.students.length, "In my classes", "♙"],
       ["Marks entered", state.results.length, "Score records", "✎"],
       ["Submitted", pending, "Awaiting review", "◷"]];
  $("stats").innerHTML = cards.map(d => `
    <div class="stat">
      <div class="stat-top"><span>${d[0]}</span><span class="stat-icon">${d[3]}</span></div>
      <strong>${d[1]}</strong><small>${d[2]}</small>
    </div>`).join("");
}

function renderRecent() {
  const rows = state.results.slice(0, 6);
  $("recent-body").innerHTML = rows.map(r => `
    <tr>
      <td><div class="student">
        <span class="mini-avatar">${esc((r.student||"").split(" ").map(x=>x[0]).join("").slice(0,2))}</span>
        ${esc(r.student)}
      </div></td>
      <td>${esc(r.cls)}</td>
      <td>${esc(r.subject)}</td>
      <td><strong>${r.score}%</strong></td>
      <td><span class="status ${statusClass(r.status)}">${esc(r.status)}</span></td>
    </tr>`).join("") || `<tr><td colspan="5">No results yet.</td></tr>`;
}

function renderActivity() {
  const pending = state.results.filter(r => r.status === "Pending review").length;
  const items = [
    ["✓","Results updated","Recent marks were entered.","Today"],
    ["◷","Review required",`${pending} result(s) awaiting approval.`,"This week"],
    ["♙","Student register",`${state.students.length} students registered.`,"This week"],
    ["▤","Term reports","Report printing is available.","This week"]
  ];
  $("activity").innerHTML = items.map(a => `
    <div class="activity-item">
      <div class="activity-icon">${a[0]}</div>
      <div><strong>${a[1]}</strong><p>${a[2]}</p><p style="margin-top:4px">${a[3]}</p></div>
    </div>`).join("");
}

function renderStudents() {
  $("students-body").innerHTML = state.students.map(s => {
    const rr = state.results.filter(r => r.studentId === s._id);
    const avg = rr.length ? Math.round(rr.reduce((a,b)=>a+b.score,0)/rr.length)+"%" : "—";
    return `<tr><td>${esc(s.id||s._id)}</td><td>${esc(s.name)}</td><td>${esc(s.cls)}</td><td>${avg}</td></tr>`;
  }).join("");
}

function renderTeachers() {
  $("teachers-body").innerHTML = state.teachers.map(t => `
    <tr>
      <td>${esc(t.name)}</td>
      <td>${esc(t.subject)}</td>
      <td>${esc((t.classes||[]).join(", ") || "Not assigned")}</td>
      <td><span class="status done">Active</span></td>
    </tr>`).join("");
}

function renderResults() {
  $("results-body").innerHTML = state.results.map(r => `
    <tr>
      <td>${esc(r.student)}</td>
      <td>${esc(r.cls)}</td>
      <td>${esc(r.subject)}</td>
      <td>${r.score}%</td>
      <td><strong>${grade(r.score)}</strong></td>
      <td>
        <span class="status ${statusClass(r.status)}">${esc(r.status)}</span>
        ${state.role==="admin" && r.status==="Pending review" ? `
          <button class="btn green approve" data-id="${r._id}" style="padding:5px 8px;font-size:11px">Approve</button>
          <button class="btn secondary return-mark" data-id="${r._id}" style="padding:5px 8px;font-size:11px">Return</button>` : ""}
        ${state.role==="teacher" && r.status==="Returned for correction" ? `
          <button class="btn secondary correct-mark" data-id="${r._id}" style="padding:5px 8px;font-size:11px">Correct</button>` : ""}
      </td>
      <td>${esc(r.returnReason || "—")}</td>
    </tr>`).join("");

  document.querySelectorAll(".approve").forEach(b =>
    b.onclick = () => updateStatus(b.dataset.id, "Approved"));
  document.querySelectorAll(".return-mark").forEach(b => b.onclick = () => {
    const reason = prompt("Why are these marks being returned?");
    if (!reason?.trim()) return alert("A reason is required.");
    updateStatus(b.dataset.id, "Returned for correction", reason.trim());
  });
  document.querySelectorAll(".correct-mark").forEach(b => b.onclick = () => {
    const r = state.results.find(x => x._id === b.dataset.id);
    const v = prompt(`Corrected score for ${r.student} (0–100):`, r.score);
    if (v === null) return;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100) return alert("Enter 0–100.");
    updateDoc(doc(db, "schools", state.schoolId, "results", r._id), {
      score: n, status: "Pending review", returnReason: "", updatedAt: serverTimestamp()
    });
  });
}

async function updateStatus(resultId, status, reason = "") {
  await updateDoc(doc(db, "schools", state.schoolId, "results", resultId), {
    status, returnReason: reason, updatedAt: serverTimestamp(), approvedBy: state.user.uid
  });
}

// ---------------------------------------------------------------
// 📝 7. MARKS ENTRY
// ---------------------------------------------------------------
function renderMarks() {
  const cls        = $("marks-class").value;
  const subject    = $("marks-subject").value;
  const term       = $("marks-term").value;
  const assessment = $("assessment").value;
  const list = state.students.filter(s => s.cls === cls);

  $("marks-body").innerHTML = list.map(s => {
    const existing = state.results.find(r =>
      r.studentId === s._id && r.subject === subject &&
      r.term === term && r.assessment === assessment);
    const val = existing?.score ?? "";
    return `<tr>
      <td>${esc(s.name)}</td>
      <td><input type="number" min="0" max="100" class="score-input" data-id="${s._id}" value="${val}"></td>
      <td class="grade-cell" data-id="${s._id}">${val===""?"—":grade(Number(val))}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="3">No students in this class.</td></tr>`;

  document.querySelectorAll(".score-input").forEach(inp => {
    inp.addEventListener("input", () => {
      const n = Number(inp.value);
      const cell = document.querySelector(`.grade-cell[data-id="${inp.dataset.id}"]`);
      cell.textContent = inp.value === "" ? "—" :
                         (n >= 0 && n <= 100) ? grade(n) : "Invalid";
    });
  });
}

async function saveMarks(status) {
  const cls        = $("marks-class").value;
  const subject    = $("marks-subject").value;
  const term       = $("marks-term").value;
  const assessment = $("assessment").value;
  let count = 0;

  for (const inp of document.querySelectorAll(".score-input")) {
    if (inp.value === "") continue;
    const score = Number(inp.value);
    if (!Number.isFinite(score) || score < 0 || score > 100) continue;

    const s = state.students.find(x => x._id === inp.dataset.id);
    if (!s) continue;

    const existing = state.results.find(r =>
      r.studentId === s._id && r.subject === subject &&
      r.term === term && r.assessment === assessment);

    if (existing) {
      if (existing.status === "Approved" && status !== "Draft") continue;
      await updateDoc(doc(db, "schools", state.schoolId, "results", existing._id), {
        score, status, returnReason: "", updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, "schools", state.schoolId, "results"), {
        studentId: s._id, student: s.name, cls, subject,
        term, assessment, score, status,
        teacherId: state.user.uid, updatedAt: serverTimestamp()
      });
    }
    count++;
  }
  $("marks-message").textContent =
    `${count} score(s) ${status === "Draft" ? "saved as draft." : "submitted for review."}`;
}

// ---------------------------------------------------------------
// ➕ 8. STUDENTS / TEACHERS / SETTINGS
// ---------------------------------------------------------------
$("add-student").onclick   = () => $("student-form").classList.toggle("hidden");
$("cancel-student").onclick= () => $("student-form").classList.add("hidden");
$("save-student").onclick  = async () => {
  const name = $("new-name").value.trim();
  if (!name) return $("new-name").focus();
  await addDoc(collection(db, "schools", state.schoolId, "students"), {
    id: "ST" + Date.now().toString().slice(-6),
    name, cls: $("new-class").value, createdAt: serverTimestamp()
  });
  $("new-name").value = "";
  $("student-form").classList.add("hidden");
  await loadAll();
};

$("add-teacher").onclick   = () => $("teacher-form").classList.toggle("hidden");
$("cancel-teacher").onclick= () => $("teacher-form").classList.add("hidden");
$("save-teacher").onclick  = async () => {
  const name = $("teacher-name").value.trim();
  const subject = $("teacher-subject").value.trim();
  if (!name || !subject) return;
  await addDoc(collection(db, "schools", state.schoolId, "teachers"), {
    name, subject, classes: [], createdAt: serverTimestamp()
  });
  $("teacher-name").value = ""; $("teacher-subject").value = "";
  $("teacher-form").classList.add("hidden");
  await loadAll();
};

$("save-settings").onclick = async () => {
  await setDoc(doc(db, "schools", state.schoolId), {
    name: $("school-name").value,
    academic_year: $("academic-year").value,
    current_term: $("current-term").value,
    pass_mark: Number($("pass-mark").value),
    updatedAt: serverTimestamp()
  }, { merge: true });
  $("settings-message").textContent = "Settings saved.";
};

// ---------------------------------------------------------------
// 🧭 9. NAVIGATION
// ---------------------------------------------------------------
function showPage(page) {
  state.currentPage = page;
  document.querySelectorAll(".page").forEach(el => el.classList.add("hidden"));
  $(page + "-page").classList.remove("hidden");
  document.querySelectorAll("#nav button").forEach(b =>
    b.classList.toggle("active", b.dataset.page === page));
  $("page-title").textContent = ({
    overview:"Overview", students:"Students", marks:"Enter marks",
    results:"Results and reports", teachers:"Teachers", settings:"Settings"
  })[page];
  if (page === "students") renderStudents();
  if (page === "teachers") renderTeachers();
  if (page === "marks")    renderMarks();
  if (page === "results")  renderResults();
}
$("nav").addEventListener("click", e => {
  const b = e.target.closest("button[data-page]");
  if (b) showPage(b.dataset.page);
});
$("view-all").onclick      = () => showPage("results");
$("marks-class").onchange  = renderMarks;
$("marks-subject").onchange= renderMarks;
$("marks-term").onchange   = renderMarks;
$("assessment").onchange   = renderMarks;
$("save-draft").onclick    = () => saveMarks("Draft");
$("submit-marks").onclick  = () => saveMarks("Pending review");

// ---------------------------------------------------------------
// 📊 10. CSV / PRINT
// ---------------------------------------------------------------
$("download-results").onclick = () => {
  const rows = [["Student","Class","Subject","Score","Grade","Status"],
    ...state.results.map(r => [r.student, r.cls, r.subject, r.score, grade(r.score), r.status])];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type:"text/csv;charset=utf-8;" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob), download: "school-results.csv"
  });
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(a.href);
};
$("print-results").onclick = () => window.print();

// ---------------------------------------------------------------
// 🔁 11. MASTER RENDER
// ---------------------------------------------------------------
function renderAll() {
  renderStats(); renderRecent(); renderActivity();
  if (state.currentPage === "students") renderStudents();
  if (state.currentPage === "teachers") renderTeachers();
  if (state.currentPage === "marks")    renderMarks();
  if (state.currentPage === "results")  renderResults();
}
