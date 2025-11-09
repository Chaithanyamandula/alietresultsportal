/* ---------- FIREBASE CONFIG ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyAa0lRVztX561W7aTtwi5CrSy_MLEa7Lp8",
  authDomain: "college-results-portal.firebaseapp.com",
  databaseURL: "https://college-results-portal-default-rtdb.firebaseio.com",
  projectId: "college-results-portal",
  storageBucket: "college-results-portal.firebasestorage.app",
  messagingSenderId: "178855254203",
  appId: "1:178855254203:web:4401f8bfd4bcafbd47719e"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/* ---------- GLOBAL VARIABLES ---------- */
let globalData = {
  flashNews: "",
  admin: { username: "admin", password: "admin123" },
  sheets: {
    regular: ["", "", "", "", "", "", "", ""],
    supplementary: ["", "", "", "", "", "", "", ""],
    revaluation: ["", "", "", "", "", "", "", ""]
  }
};

/* ---------- LOAD DATA FROM FIREBASE ---------- */
async function loadData() {
  const snapshot = await db.ref("/").get();
  if (snapshot.exists()) globalData = snapshot.val();

  // Update flash news on index page
  const flashNews = document.getElementById("flashNews");
  if (flashNews) {
    flashNews.innerHTML = `<span>${globalData.flashNews || "Welcome to Results Portal"}</span>`;
  }
}

/* ---------- REALTIME FLASH NEWS UPDATES ---------- */
if (document.getElementById("flashNews")) {
  const flashRef = db.ref("flashNews");
  flashRef.on("value", (snap) => {
    const val = snap.val() || "Welcome to Results Portal";
    document.getElementById("flashNews").innerHTML = `<span>${val}</span>`;
  });
}

/* ---------- PARSE GOOGLE SHEETS JSON ---------- */
function parseGviz(txt) {
  const s = txt.indexOf("{"), e = txt.lastIndexOf("}");
  return JSON.parse(txt.slice(s, e + 1));
}

/* ---------- FETCH RESULTS FROM GOOGLE SHEET ---------- */
async function fetchResults(url) {
  const res = await fetch(url);
  const txt = await res.text();
  return parseGviz(txt).table.rows.map(r => r.c.map(c => (c && c.v) || ""));
}

/* ---------- RENDER RESULTS IN TABLE ---------- */
function renderResults(rows, htno) {
  const filtered = rows.filter(r => r[0].toString().toLowerCase() === htno.toLowerCase());
  if (!filtered.length) return `<p>No records found.</p>`;

  return `<table>
    <thead>
      <tr>
        <th>Htno</th><th>Subcode</th><th>Subname</th><th>Internals</th><th>Grade</th><th>Credits</th>
      </tr>
    </thead>
    <tbody>
      ${filtered.map(r => `<tr>${r.slice(0,6).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>`;
}

/* ---------- STUDENT PORTAL LOGIC ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();

  const viewBtn = document.getElementById("viewBtn");
  if (viewBtn) {
    viewBtn.onclick = async () => {
      const htno = document.getElementById("htno").value.trim();
      const type = document.getElementById("resultType").value;
      const sem = +document.getElementById("semester").value;
      const msg = document.getElementById("msg");

      if (!htno) return (msg.textContent = "Enter valid Hall Ticket Number.");

      msg.textContent = "Fetching results...";

      const url = globalData.sheets[type][sem - 1];
      if (!url) return (msg.textContent = "Result link not set by admin.");

      try {
        const rows = await fetchResults(url);
        document.getElementById("resultContainer").innerHTML = renderResults(rows, htno);
        document.getElementById("resultSection").classList.remove("hidden");
        msg.textContent = "";
      } catch (e) {
        msg.textContent = "Error fetching data. Check link or sheet access.";
        console.error(e);
      }
    };

    const printBtn = document.getElementById("printBtn");
    if (printBtn) printBtn.onclick = () => window.print();
  }

  /* ---------- ADMIN LOGIN LOGIC ---------- */
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.onclick = () => {
      const u = document.getElementById("adminUser").value.trim();
      const p = document.getElementById("adminPass").value.trim();
      if (u === globalData.admin.username && p === globalData.admin.password) {
        document.getElementById("loginCard").classList.add("hidden");
        document.getElementById("adminPanel").classList.remove("hidden");
        initAdmin();
      } else {
        document.getElementById("loginMsg").textContent = "Invalid credentials";
      }
    };
  }
});

/* ---------- ADMIN PANEL LOGIC ---------- */
function initAdmin() {
  document.getElementById("newsText").value = globalData.flashNews || "";
  const linkInputs = document.getElementById("linkInputs");
  linkInputs.innerHTML = "";

  ['regular', 'supplementary', 'revaluation'].forEach(type => {
    const h = document.createElement('h3');
    h.textContent = type.toUpperCase();
    linkInputs.appendChild(h);

    globalData.sheets[type].forEach((link, i) => {
      const inp = document.createElement('input');
      inp.value = link;
      inp.placeholder = `${type} Sem ${i + 1} JSON URL`;
      inp.dataset.type = type;
      inp.dataset.index = i;
      linkInputs.appendChild(inp);
    });
  });

  // Save Flash News
  document.getElementById("saveNews").onclick = () => {
    const val = document.getElementById("newsText").value.trim();
    db.ref("flashNews").set(val);
    alert("✅ Flash news updated globally!");
  };

  // Save All Google Sheet Links
  document.getElementById("saveLinks").onclick = async () => {
    linkInputs.querySelectorAll("input").forEach(inp => {
      globalData.sheets[inp.dataset.type][inp.dataset.index] = inp.value.trim();
    });
    await db.ref("sheets").set(globalData.sheets);
    alert("✅ All sheet links saved globally!");
  };
}
