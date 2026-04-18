// =============================================
// AttendChain v2 — Role-Based Sidebar DApp
// Contract: 0xa47Ce87db7a29BaDC2B3aFAEa1E9c9deE25E4608
// Network: Sepolia Testnet
// =============================================

const CONTRACT_ADDRESS = "0xa47Ce87db7a29BaDC2B3aFAEa1E9c9deE25E4608";

// ABI matches Attendance.sol exactly
const ABI = [
  "function teacher() view returns (address)",
  "function addStudent(address _student, string _studentId, string _name) external",
  "function getStudent(address _student) view returns (string, string, address)",
  "function students(address) view returns (string studentId, string name, address walletAddress, bool exists)",
  "function markAttendance(address _student, string _classId, bool _isPresent) external",
  "function getAttendanceRecords(address _student) view returns (tuple(string classId, string className, bool isPresent, uint256 timestamp)[])",
  "function getAttendancePercentage(address _student) view returns (uint256)",
  "function createClass(string _classId, string _className) external",
  "function classList(uint256) view returns (string)",
  "function studentList(uint256) view returns (address)",
  "function getTotalClasses() view returns (uint256)",
  "function getTotalStudents() view returns (uint256)",
  "function startSession(string _classId) external",
  "function endSession(string _classId) external",
  "function classes(string) view returns (string classId, string className, bool isActive, uint256 startTime, uint256 endTime)",
  "event StudentAdded(address indexed _student, string studentId, string name)"
];

// =============================================
// STATE
// =============================================
let provider, signer, contract;
let walletAddress = "";
let isTeacher = false;
let currentPage = "";
let allRecords = [];

// =============================================
// CLASS DROPDOWN HELPER
// =============================================
async function loadClassOptions(selectId, placeholder) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = `<option value="">⏳ Loading classes...</option>`;
  try {
    const total = await contract.getTotalClasses();
    const n = total.toNumber();
    if (n === 0) {
      sel.innerHTML = `<option value="">No classes found</option>`;
      return;
    }
    const options = [`<option value="">${placeholder || "— Select a Class —"}</option>`];
    for (let i = 0; i < n; i++) {
      const cid = await contract.classList(i);
      const cls = await contract.classes(cid);
      options.push(`<option value="${cid}">${cls.className} (${cid})</option>`);
    }
    sel.innerHTML = options.join("");
  } catch(e) {
    sel.innerHTML = `<option value="">Error loading classes</option>`;
  }
}

// =============================================
// STUDENT DROPDOWN HELPER
// =============================================
async function loadStudentOptions(selectId, placeholder) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Loading students...</option>';
  try {
    const total = await contract.getTotalStudents();
    const n = total.toNumber();
    if (n === 0) {
      sel.innerHTML = '<option value="">No students registered yet</option>';
      return;
    }
    const options = ['<option value="">' + (placeholder || '— Select a Student —') + '</option>'];
    for (let i = 0; i < n; i++) {
      try {
        const addr = await contract.studentList(i);
        const s = await contract.getStudent(addr);
        options.push('<option value="' + addr + '">' + s[1] + ' — ' + s[0] + '</option>');
      } catch(e) { /* skip */ }
    }
    sel.innerHTML = options.join('');
  } catch(e) {
    sel.innerHTML = '<option value="">Error loading students</option>';
    console.error("loadStudentOptions error:", e);
  }
}

// SIDEBAR NAVIGATION CONFIG
// =============================================
const TEACHER_NAV = [
  { id: "dashboard",   icon: "🏠", label: "Dashboard" },
  { id: "createClass", icon: "📚", label: "Create Class" },
  { id: "myClasses",   icon: "🗂️", label: "My Classes" },
  { id: "session",     icon: "▶️", label: "Attendance Session" },
  { id: "students",    icon: "👥", label: "Add Student" },
  { id: "myStudents",  icon: "🎓", label: "My Students" },
  { id: "records",     icon: "📋", label: "Records" },
];

const STUDENT_NAV = [
  { id: "dashboard",     icon: "🏠", label: "Dashboard" },
  { id: "myClasses",     icon: "📚", label: "My Classes" },
  { id: "myAttendance",  icon: "📋", label: "My Attendance" },
  { id: "sessionStatus", icon: "📡", label: "Session Status" },
];

// =============================================
// CONNECT
// =============================================
document.getElementById("connectBtn").addEventListener("click", connectWallet);

async function connectWallet() {
  const statusEl = document.getElementById("connectStatus");
  statusEl.textContent = "Connecting...";
  statusEl.className = "connect-status";

  if (!window.ethereum) {
    statusEl.textContent = "❌ MetaMask not found. Please install it.";
    statusEl.className = "connect-status error";
    return;
  }

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    walletAddress = await signer.getAddress();

    const network = await provider.getNetwork();
    if (network.chainId !== 11155111) {
      statusEl.textContent = "❌ Please switch to Sepolia Testnet in MetaMask.";
      statusEl.className = "connect-status error";
      return;
    }

    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    // Use teacher() not owner()
    const teacherAddr = await contract.teacher();
    isTeacher = walletAddress.toLowerCase() === teacherAddr.toLowerCase();

    launchApp();
  } catch (err) {
    statusEl.textContent = "❌ " + (err.message || "Connection failed");
    statusEl.className = "connect-status error";
  }
}

// =============================================
// LAUNCH APP
// =============================================
function launchApp() {
  document.getElementById("connectScreen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  document.getElementById("walletShort").textContent =
    walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4);

  const roleEl = document.getElementById("sidebarRole");
  roleEl.textContent = isTeacher ? "🎓 Teacher" : "👤 Student";
  roleEl.className = "sidebar-role " + (isTeacher ? "teacher" : "student");

  buildSidebar();
  navigateTo("dashboard");
}

// =============================================
// SIDEBAR
// =============================================
function buildSidebar() {
  const nav = document.getElementById("sidebarNav");
  const items = isTeacher ? TEACHER_NAV : STUDENT_NAV;
  nav.innerHTML = items.map(item => `
    <button class="nav-item" data-page="${item.id}" onclick="navigateTo('${item.id}')">
      <span class="nav-icon">${item.icon}</span>
      ${item.label}
    </button>
  `).join("");
}

function setActiveNav(pageId) {
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", el.dataset.page === pageId);
  });
}

// =============================================
// NAVIGATION
// =============================================
function navigateTo(pageId) {
  currentPage = pageId;
  setActiveNav(pageId);

  const navItems = isTeacher ? TEACHER_NAV : STUDENT_NAV;
  const item = navItems.find(n => n.id === pageId);
  document.getElementById("pageTitle").textContent = item ? item.label : pageId;

  const area = document.getElementById("pageArea");
  area.innerHTML = "";

  if (isTeacher) {
    switch (pageId) {
      case "dashboard":   renderTeacherDashboard(area); break;
      case "createClass": renderCreateClass(area); break;
      case "myClasses":   renderMyClasses(area); break;
      case "session":     renderSession(area); break;
      case "students":    renderStudents(area); break;
      case "myStudents":  renderMyStudents(area); break;
      case "records":     renderRecords(area); break;
    }
  } else {
    switch (pageId) {
      case "dashboard":     renderStudentDashboard(area); break;
      case "myClasses":     renderStudentClasses(area); break;
      case "myAttendance":  renderMyAttendance(area); break;
      case "sessionStatus": renderSessionStatus(area); break;
    }
  }

  document.getElementById("sidebar").classList.remove("open");
}

// =============================================
// HAMBURGER & DISCONNECT
// =============================================
document.getElementById("hamburger").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

document.getElementById("disconnectBtn").addEventListener("click", () => {
  location.reload();
});

// =============================================
// TEACHER PAGES
// =============================================

async function renderTeacherDashboard(area) {
  area.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card green"><div class="stat-val" id="tStatClasses">—</div><div class="stat-lbl">Classes</div></div>
      <div class="stat-card blue"><div class="stat-val" id="tStatStudents">—</div><div class="stat-lbl">Students</div></div>
      <div class="stat-card orange"><div class="stat-val">✓</div><div class="stat-lbl">Contract Live</div></div>
    </div>
    <div class="card">
      <div class="card-title">Quick Actions</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="navigateTo('createClass')">＋ Create Class</button>
        <button class="btn btn-secondary" onclick="navigateTo('students')">＋ Add Student</button>
        <button class="btn btn-secondary" onclick="navigateTo('session')">▶ Start Session</button>
        <button class="btn btn-secondary" onclick="navigateTo('records')">📋 View Records</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Contract Info</div>
      <p style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);word-break:break-all;">${CONTRACT_ADDRESS}</p>
      <p style="font-size:12px;color:var(--text-muted);margin-top:8px;">Network: Sepolia Testnet</p>
    </div>
  `;
  try {
    const total = await contract.getTotalClasses();
    const students = await contract.getTotalStudents();
    document.getElementById("tStatClasses").textContent = total.toString();
    document.getElementById("tStatStudents").textContent = students.toString();
  } catch(e) {}
}

function renderCreateClass(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-title">Create New Class</div>
      <div class="form-group">
        <label class="form-label">Class ID</label>
        <input class="form-input" id="newClassId" placeholder="e.g. CS101" />
      </div>
      <div class="form-group">
        <label class="form-label">Class Name</label>
        <input class="form-input" id="newClassName" placeholder="e.g. Blockchain Technology" />
      </div>
      <button class="btn btn-primary btn-full" onclick="doCreateClass()">Create Class</button>
      <div class="alert" id="createClassAlert"></div>
    </div>
  `;
}

async function doCreateClass() {
  const id = document.getElementById("newClassId").value.trim();
  const name = document.getElementById("newClassName").value.trim();
  const alertEl = document.getElementById("createClassAlert");
  if (!id || !name) return showAlert(alertEl, "Please fill both fields.", "error");
  showAlert(alertEl, "⏳ Sending transaction...", "info");
  try {
    const tx = await contract.createClass(id, name);
    await tx.wait();
    showAlert(alertEl, `✅ Class "${name}" (${id}) created!`, "success");
    document.getElementById("newClassId").value = "";
    document.getElementById("newClassName").value = "";
  } catch(e) {
    showAlert(alertEl, "❌ " + (e.reason || e.message), "error");
  }
}

async function renderMyClasses(area) {
  area.innerHTML = `<div class="card"><div class="card-title">All Classes</div><div id="classList"><p style="color:var(--text-muted)">Loading...</p></div></div>`;
  try {
    const total = await contract.getTotalClasses();
    const listEl = document.getElementById("classList");
    if (total.toNumber() === 0) {
      listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>No classes yet.</p></div>`;
      return;
    }
    const classIds = [];
    for (let i = 0; i < total.toNumber(); i++) {
      const cid = await contract.classList(i);
      classIds.push(cid);
    }
    const rows = await Promise.all(classIds.map(async (cid, i) => {
      const cls = await contract.classes(cid);
      return `<tr>
        <td>${i+1}</td>
        <td style="font-family:var(--font-mono);font-size:12px;">${cid}</td>
        <td>${cls.className}</td>
        <td>${cls.isActive
          ? '<span class="badge badge-active">🟢 Active</span>'
          : '<span class="badge badge-ended">⚫ Inactive</span>'}</td>
      </tr>`;
    }));
    listEl.innerHTML = `
      <div class="table-wrap">
        <table class="att-table">
          <thead><tr><th>#</th><th>Class ID</th><th>Class Name</th><th>Status</th></tr></thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>`;
  } catch(e) {
    document.getElementById("classList").innerHTML = `<p style="color:var(--danger)">Error: ${e.message}</p>`;
  }
}

async function renderSession(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-title">Start / End Session</div>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:14px;">Select the class you want to start or end a session for.</p>
      <div class="form-group">
        <label class="form-label">Class</label>
        <select class="form-input" id="sessionClass">
          <option value="">⏳ Loading classes...</option>
        </select>
      </div>
      <div style="display:flex;gap:10px;margin-top:4px;">
        <button class="btn btn-green btn-full" onclick="doSession('start')">▶ Start Session</button>
        <button class="btn btn-danger btn-full" onclick="doSession('end')">⏹ End Session</button>
      </div>
      <div class="alert" id="sessionAlert"></div>
    </div>
    <div class="card">
      <div class="card-title">Mark Attendance</div>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:14px;">Session must be active before marking attendance.</p>
      <div class="form-group">
        <label class="form-label">Student</label>
        <select class="form-input" id="markAddr">
          <option value="">⏳ Loading students...</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Class</label>
        <select class="form-input" id="markClass">
          <option value="">⏳ Loading classes...</option>
        </select>
      </div>
      <div class="check-row">
        <input type="checkbox" id="markPresent" checked />
        <label for="markPresent">Mark as Present</label>
      </div>
      <button class="btn btn-primary btn-full" onclick="doMarkAttendance()">Mark Attendance</button>
      <div class="alert" id="markAlert"></div>
    </div>
  `;
  await loadClassOptions("sessionClass", "— Select a Class —");
  await loadClassOptions("markClass", "— Select a Class —");
  await loadStudentOptions("markAddr", "— Select a Student —");
}

async function doSession(action) {
  const cls = document.getElementById("sessionClass").value.trim();
  const alertEl = document.getElementById("sessionAlert");
  if (!cls) return showAlert(alertEl, "Please select a class.", "error");
  showAlert(alertEl, "⏳ Sending transaction...", "info");
  try {
    const tx = action === "start" ? await contract.startSession(cls) : await contract.endSession(cls);
    await tx.wait();
    showAlert(alertEl, `✅ Session ${action === "start" ? "started" : "ended"} for "${cls}"`, "success");
  } catch(e) {
    showAlert(alertEl, "❌ " + (e.reason || e.message), "error");
  }
}

async function doMarkAttendance() {
  const addr = document.getElementById("markAddr").value.trim();
  const cls = document.getElementById("markClass").value.trim();
  const present = document.getElementById("markPresent").checked;
  const alertEl = document.getElementById("markAlert");
  if (!addr || !cls) return showAlert(alertEl, "Please select a student and a class.", "error");
  showAlert(alertEl, "⏳ Sending transaction...", "info");
  try {
    const tx = await contract.markAttendance(addr, cls, present);
    await tx.wait();
    showAlert(alertEl, `✅ Marked ${present ? "Present" : "Absent"} for class ${cls}`, "success");
  } catch(e) {
    showAlert(alertEl, "❌ " + (e.reason || e.message), "error");
  }
}

function renderStudents(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-title">Add New Student</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px;">
       Each student must have a unique MetaMask wallet address. To get one, create a new account in MetaMask (click the profile icon → Add Account) and paste that address here.So, The student's connected wallet address will be linked.
      </p>
      <div class="form-group">
        <label class="form-label">Student Wallet Address</label>
        <input class="form-input" id="stuAddr" placeholder="0x... paste student's MetaMask address" />
      </div>
      <div class="form-group">
        <label class="form-label">Student ID</label>
        <input class="form-input" id="stuId" placeholder="e.g. STU001" />
      </div>
      <div class="form-group">
        <label class="form-label">Student Name</label>
        <input class="form-input" id="stuName" placeholder="e.g. Tom" />
      </div>
      <button class="btn btn-primary btn-full" onclick="doAddStudent()">Add Student</button>
      <div class="alert" id="addStuAlert"></div>
    </div>
    <div class="card">
      <div class="card-title">Lookup Student</div>
      <div class="form-group">
        <label class="form-label">Search by Name or Student ID</label>
        <input class="form-input" id="lookupQuery" placeholder="Enter name or student ID..." oninput="doLookup()" />
      </div>
      <div id="lookupResult" style="margin-top:14px;"></div>
    </div>
  `;
}

async function doAddStudent() {
  const addr = document.getElementById("stuAddr").value.trim();
  const id = document.getElementById("stuId").value.trim();
  const name = document.getElementById("stuName").value.trim();
  const alertEl = document.getElementById("addStuAlert");
  if (!addr || !id || !name) return showAlert(alertEl, "Please fill in all fields: wallet address, student ID, and name.", "error");
  showAlert(alertEl, "⏳ Checking for duplicates...", "info");
  try {
    // Pre-check 1: is this wallet already registered?
    try {
      const existing = await contract.getStudent(addr);
      if (existing && existing[2] !== "0x0000000000000000000000000000000000000000") {
        return showAlert(alertEl, `❌ This wallet address is already registered to student "${existing[1]}" (${existing[0]}).`, "error");
      }
    } catch(notFound) { /* getStudent throws if not found — that's expected, continue */ }

    // Pre-check 2: is this Student ID already taken?
    const total = await contract.getTotalStudents();
    const n = total.toNumber();
    for (let i = 0; i < n; i++) {
      try {
        const existingAddr = await contract.studentList(i);
        const s = await contract.getStudent(existingAddr);
        if (s[0].toLowerCase() === id.toLowerCase()) {
          return showAlert(alertEl, `❌ Student ID "${id}" already exists (assigned to "${s[1]}"). Please use a unique ID.`, "error");
        }
      } catch(e) {}
    }

    showAlert(alertEl, "⏳ Sending transaction...", "info");
    const tx = await contract.addStudent(addr, id, name);
    await tx.wait();
    showAlert(alertEl, `✅ Student "${name}" (${id}) added successfully!`, "success");
    document.getElementById("stuAddr").value = "";
    document.getElementById("stuId").value = "";
    document.getElementById("stuName").value = "";
  } catch(e) {
    // Translate common contract errors to friendly messages
    const msg = e.reason || e.message || "";
    if (msg.includes("Student already exists")) {
      showAlert(alertEl, "❌ This wallet address is already registered to a student.", "error");
    } else {
      showAlert(alertEl, "❌ " + msg, "error");
    }
  }
}

async function renderMyStudents(area) {
  area.innerHTML = `<div class="card"><div class="card-title">All Students</div><div id="myStudentList"><p style="color:var(--text-muted)">Loading...</p></div></div>`;
  try {
    const total = await contract.getTotalStudents();
    const n = total.toNumber();
    const listEl = document.getElementById("myStudentList");
    if (n === 0) {
      listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>No students registered yet.</p></div>`;
      return;
    }
    const rows = [];
    for (let i = 0; i < n; i++) {
      try {
        const addr = await contract.studentList(i);
        const s = await contract.getStudent(addr);
        rows.push(`<tr>
          <td>${i + 1}</td>
          <td>${s[1]}</td>
          <td style="font-family:var(--font-mono);font-size:12px;">${s[0]}</td>
          <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);">${addr.slice(0,8)}...${addr.slice(-6)}</td>
        </tr>`);
      } catch(e) {}
    }
    if (!rows.length) {
      listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>No students found.</p></div>`;
      return;
    }
    listEl.innerHTML = `
      <div class="table-wrap">
        <table class="att-table">
          <thead><tr><th>#</th><th>Name</th><th>Student ID</th><th>Wallet</th></tr></thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>`;
  } catch(e) {
    document.getElementById("myStudentList").innerHTML = `<p style="color:var(--danger)">Error: ${e.message}</p>`;
  }
}

async function doLookup() {
  const query = (document.getElementById("lookupQuery")?.value || "").trim().toLowerCase();
  const result = document.getElementById("lookupResult");
  if (!query) { result.innerHTML = ""; return; }
  result.innerHTML = `<p style="color:var(--text-muted)">Searching...</p>`;
  try {
    const total = await contract.getTotalStudents();
    const n = total.toNumber();
    const matches = [];
    for (let i = 0; i < n; i++) {
      try {
        const addr = await contract.studentList(i);
        const s = await contract.getStudent(addr);
        if (s[0].toLowerCase().includes(query) || s[1].toLowerCase().includes(query)) {
          matches.push({ id: s[0], name: s[1], wallet: addr });
        }
      } catch(e) {}
    }
    if (!matches.length) {
      result.innerHTML = `<p style="color:var(--danger)">No student found matching "${query}".</p>`;
      return;
    }
    result.innerHTML = matches.map(m => `
      <div class="student-header" style="margin-bottom:10px;">
        <div class="student-avatar">🎓</div>
        <div class="student-meta">
          <h3>${m.name}</h3>
          <p>ID: ${m.id} · ${m.wallet.slice(0,8)}...${m.wallet.slice(-6)}</p>
        </div>
      </div>`).join("");
  } catch(e) {
    result.innerHTML = `<p style="color:var(--danger)">Error: ${e.message}</p>`;
  }
}

function renderRecords(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-title">View Student Records</div>
      <div class="form-group">
        <label class="form-label">Search by Student Name or ID</label>
        <input class="form-input" id="recQuery" placeholder="Enter student name or ID..." />
      </div>
      <button class="btn btn-primary" onclick="doLoadRecords()">📋 Load Records</button>
      <div class="alert" id="recAlert"></div>
    </div>
    <div id="recResult"></div>
  `;
}

async function doLoadRecords() {
  const query = document.getElementById("recQuery").value.trim().toLowerCase();
  const alertEl = document.getElementById("recAlert");
  const result = document.getElementById("recResult");
  if (!query) return showAlert(alertEl, "Enter a student name or ID.", "error");
  showAlert(alertEl, "⏳ Searching...", "info");
  try {
    const total = await contract.getTotalStudents();
    const n = total.toNumber();
    let matched = null;
    for (let i = 0; i < n; i++) {
      try {
        const addr = await contract.studentList(i);
        const s = await contract.getStudent(addr);
        if (s[0].toLowerCase().includes(query) || s[1].toLowerCase().includes(query)) {
          matched = { student: s, addr };
          break;
        }
      } catch(e) {}
    }
    if (!matched) {
      showAlert(alertEl, "❌ No student found matching that name or ID.", "error");
      return;
    }
    const records = await contract.getAttendanceRecords(matched.addr);
    const pct = await contract.getAttendancePercentage(matched.addr);
    alertEl.classList.remove("show");
    renderRecordsTable(result, matched.student, records, pct);
  } catch(e) {
    showAlert(alertEl, "❌ " + (e.reason || e.message), "error");
  }
}

// =============================================
// STUDENT PAGES
// =============================================

async function renderStudentDashboard(area) {
  area.innerHTML = `
    <div id="stuDashHeader"><p style="color:var(--text-muted)">Loading your info...</p></div>
    <div class="stats-grid" id="stuStats" style="display:none">
      <div class="stat-card green"><div class="stat-val" id="sDTotal">—</div><div class="stat-lbl">Total</div></div>
      <div class="stat-card blue"><div class="stat-val" id="sDPresent">—</div><div class="stat-lbl">Present</div></div>
      <div class="stat-card red"><div class="stat-val" id="sDAbsent">—</div><div class="stat-lbl">Absent</div></div>
      <div class="stat-card orange"><div class="stat-val" id="sDRate">—</div><div class="stat-lbl">Rate</div></div>
    </div>
    <div class="card">
      <div class="card-title">Quick Actions</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="navigateTo('myAttendance')">📋 My Attendance</button>
        <button class="btn btn-secondary" onclick="navigateTo('sessionStatus')">📡 Check Session</button>
      </div>
    </div>
  `;

  try {
    const student = await contract.getStudent(walletAddress);
    const headerEl = document.getElementById("stuDashHeader");
    headerEl.innerHTML = `
      <div class="student-header">
        <div class="student-avatar">🎓</div>
        <div class="student-meta">
          <h3>${student[1]}</h3>
          <p>ID: ${student[0]} · ${walletAddress.slice(0,8)}...${walletAddress.slice(-6)}</p>
        </div>
      </div>`;

    const records = await contract.getAttendanceRecords(walletAddress);
    const pct = await contract.getAttendancePercentage(walletAddress);
    const total = records.length;
    const present = records.filter(r => r.isPresent).length;

    document.getElementById("stuStats").style.display = "grid";
    document.getElementById("sDTotal").textContent = total;
    document.getElementById("sDPresent").textContent = present;
    document.getElementById("sDAbsent").textContent = total - present;
    document.getElementById("sDRate").textContent = pct.toString() + "%";
  } catch(e) {
    document.getElementById("stuDashHeader").innerHTML = `
      <div class="student-header">
        <div class="student-avatar">👤</div>
        <div class="student-meta">
          <h3>Not Registered</h3>
          <p>Ask your teacher to add you to the system.</p>
        </div>
      </div>`;
  }
}

async function renderStudentClasses(area) {
  area.innerHTML = `<div class="card"><div class="card-title">My Classes</div><div id="stuClassList"><p style="color:var(--text-muted)">Loading...</p></div></div>`;
  try {
    const records = await contract.getAttendanceRecords(walletAddress);
    const classIds = [...new Set(records.map(r => r.classId))];
    const listEl = document.getElementById("stuClassList");
    if (!classIds.length) {
      listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>No attendance records yet.</p></div>`;
      return;
    }
    listEl.innerHTML = `
      <div class="table-wrap">
        <table class="att-table">
          <thead><tr><th>#</th><th>Class ID</th><th>Class Name</th><th>Attended/Total</th></tr></thead>
          <tbody>${classIds.map((cid, i) => {
            const cr = records.filter(r => r.classId === cid);
            const attended = cr.filter(r => r.isPresent).length;
            return `<tr><td>${i+1}</td><td style="font-family:var(--font-mono);font-size:12px;">${cid}</td><td>${cr[0]?.className || cid}</td><td>${attended}/${cr.length}</td></tr>`;
          }).join("")}
          </tbody>
        </table>
      </div>`;
  } catch(e) {
    document.getElementById("stuClassList").innerHTML = `<p style="color:var(--danger)">Error: ${e.message}</p>`;
  }
}

async function renderMyAttendance(area) {
  area.innerHTML = `
    <div class="stats-grid" id="myAttStats" style="display:none">
      <div class="stat-card green"><div class="stat-val" id="maTotal">—</div><div class="stat-lbl">Total</div></div>
      <div class="stat-card blue"><div class="stat-val" id="maPresent">—</div><div class="stat-lbl">Present</div></div>
      <div class="stat-card red"><div class="stat-val" id="maAbsent">—</div><div class="stat-lbl">Absent</div></div>
      <div class="stat-card orange"><div class="stat-val" id="maRate">—</div><div class="stat-lbl">Rate</div></div>
    </div>
    <div class="card">
      <div class="card-title">Attendance Records</div>
      <div class="filter-row">
        <input class="form-input" id="maSearch" placeholder="🔍 Search class..." oninput="filterMyAttendance()" />
        <select class="form-input" id="maFilter" onchange="filterMyAttendance()">
          <option value="">All statuses</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
        </select>
      </div>
      <div id="myAttTable"><p style="color:var(--text-muted)">Loading...</p></div>
    </div>
  `;

  try {
    const records = await contract.getAttendanceRecords(walletAddress);
    const pct = await contract.getAttendancePercentage(walletAddress);
    allRecords = records;
    const total = records.length;
    const present = records.filter(r => r.isPresent).length;

    document.getElementById("myAttStats").style.display = "grid";
    document.getElementById("maTotal").textContent = total;
    document.getElementById("maPresent").textContent = present;
    document.getElementById("maAbsent").textContent = total - present;
    document.getElementById("maRate").textContent = pct.toString() + "%";
    renderMyAttTable(records);
  } catch(e) {
    document.getElementById("myAttTable").innerHTML = `<p style="color:var(--danger)">Error: ${e.message}</p>`;
  }
}

function renderMyAttTable(records) {
  const el = document.getElementById("myAttTable");
  if (!records.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>No records found.</p></div>`;
    return;
  }
  el.innerHTML = `
    <div class="table-wrap">
      <table class="att-table">
        <thead><tr><th>#</th><th>Class ID</th><th>Class Name</th><th>Status</th><th>Date & Time</th></tr></thead>
        <tbody>${records.map((r, i) => `
          <tr>
            <td>${i+1}</td>
            <td style="font-family:var(--font-mono);font-size:12px;">${r.classId}</td>
            <td>${r.className}</td>
            <td>${r.isPresent
              ? '<span class="badge badge-present">✅ Present</span>'
              : '<span class="badge badge-absent">❌ Absent</span>'}</td>
            <td>${new Date(r.timestamp * 1000).toLocaleString()}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function filterMyAttendance() {
  const q = document.getElementById("maSearch")?.value.toLowerCase() || "";
  const fs = document.getElementById("maFilter")?.value || "";
  const filtered = allRecords.filter(r => {
    const matchClass = r.className.toLowerCase().includes(q) || r.classId.toLowerCase().includes(q);
    const matchStatus = fs === "" || (fs === "present" && r.isPresent) || (fs === "absent" && !r.isPresent);
    return matchClass && matchStatus;
  });
  renderMyAttTable(filtered);
}

async function renderSessionStatus(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-title">Check Session Status</div>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:14px;">Select a class to check if a session is currently active.</p>
      <div class="form-group">
        <label class="form-label">Class</label>
        <select class="form-input" id="checkSessionClass">
          <option value="">⏳ Loading classes...</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="doCheckSession()">📡 Check Status</button>
      <div id="sessionStatusResult" style="margin-top:16px;"></div>
    </div>
  `;
  await loadClassOptions("checkSessionClass", "— Select a Class —");
}

async function doCheckSession() {
  const cls = document.getElementById("checkSessionClass").value.trim();
  const result = document.getElementById("sessionStatusResult");
  if (!cls) {
    result.innerHTML = `<p style="color:var(--danger)">Please select a class first.</p>`;
    return;
  }
  result.innerHTML = `<p style="color:var(--text-muted)">Checking...</p>`;
  try {
    const classData = await contract.classes(cls);
    const isActive = classData.isActive;
    result.innerHTML = `
      <div class="session-status-box">
        <div class="big-icon">${isActive ? "🟢" : "🔴"}</div>
        <h3>${isActive ? "Session Active" : "No Active Session"}</h3>
        <p>Class: ${classData.className || cls}<br>
        ${isActive ? "Session is open — attendance can be marked." : "No session is currently running."}</p>
      </div>`;
  } catch(e) {
    result.innerHTML = `<p style="color:var(--danger)">Class not found: ${e.message}</p>`;
  }
}

// =============================================
// SHARED RECORDS TABLE
// =============================================
function renderRecordsTable(container, student, records, pct) {
  const total = records.length;
  const present = records.filter(r => r.isPresent).length;
  const absent = total - present;

  container.innerHTML = `
    <div class="student-header">
      <div class="student-avatar">🎓</div>
      <div class="student-meta">
        <h3>${student[1]}</h3>
        <p>ID: ${student[0]} · Classes: ${[...new Set(records.map(r => r.className))].join(", ") || "—"}</p>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card green"><div class="stat-val">${total}</div><div class="stat-lbl">Total</div></div>
      <div class="stat-card blue"><div class="stat-val">${present}</div><div class="stat-lbl">Present</div></div>
      <div class="stat-card red"><div class="stat-val">${absent}</div><div class="stat-lbl">Absent</div></div>
      <div class="stat-card orange"><div class="stat-val">${pct.toString()}%</div><div class="stat-lbl">Rate</div></div>
    </div>
    <div class="card">
      <div class="card-title">All Records</div>
      <div class="table-wrap">
        <table class="att-table">
          <thead><tr><th>#</th><th>Class ID</th><th>Class Name</th><th>Status</th><th>Date & Time</th></tr></thead>
          <tbody>${records.length === 0
            ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No records found.</td></tr>`
            : records.map((r, i) => `
              <tr>
                <td>${i+1}</td>
                <td style="font-family:var(--font-mono);font-size:12px;">${r.classId}</td>
                <td>${r.className}</td>
                <td>${r.isPresent
                  ? '<span class="badge badge-present">✅ Present</span>'
                  : '<span class="badge badge-absent">❌ Absent</span>'}</td>
                <td>${new Date(r.timestamp * 1000).toLocaleString()}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
}

// =============================================
// UTILS
// =============================================
function showAlert(el, msg, type) {
  el.textContent = msg;
  el.className = "alert";
  if (type) el.classList.add("show", type);
}

// Auto-connect if already connected
window.addEventListener("load", async () => {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts.length > 0) connectWallet();
  }
});