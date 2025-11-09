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

/* ---------- GLOBAL STRUCTURE ---------- */
let globalData = {
  flashNews: "Welcome to Results Portal",
  admin: { username: "admin", password: "admin123" },
  sheets: {
    regular: ["", "", "", "", "", "", "", ""],
    supplementary: ["", "", "", "", "", "", "", ""],
    revaluation: ["", "", "", "", "", "", "", ""]
  }
};

/* ---------- SYNC DATA FROM FIREBASE ---------- */
async function loadData() {
  const snap = await db.ref("/").get();
  if (snap.exists()) {
    globalData = { ...globalData, ...snap.val() };
  } else {
    // If first-time use, upload default data
    await db.ref("/").set(globalData);
  }

  // Update Flash News in UI
  const news = document.getElementById("flashNews");
  if (news) news.innerHTML = `<span>${globalData.flashNews}</span>`;
}

/* ---------- REALTIME FLASH NEWS ---------- */
if (document.getElementById("flashNews")) {
  const flashRef = db.ref("flashNews");
  flashRef.on("value", (snap) => {
    const text = snap.val() || "Welcome to Results Portal";
    document.getElementById("flashNews").innerHTML = `<span>${text}</span>`;
  });
}

/* ---------- PARSE GOOGLE SHEET JSON ---------- */
function parseGviz(txt) {
  const s = txt.indexOf("{"),
    e = txt.lastIndexOf("}");
  return JSON.parse(txt.slice(s, e + 1));
}

/* ---------- FETCH RESULTS FROM SHEET ---------- */
async function fetchResults(url) {
  const res = await fetch(url);
  const txt = await res.text();
  return parseGviz(txt).table.rows.map((r) => r.c.map((c) => (c && c.v) || ""));
}

/* ---------- RENDER RESULTS ---------- */
function renderResults(rows, htno) {
  const match = rows.filter(
    (r) => r[0].toString().toLowerCase() === htno.toLowerCase()
  );
  if (!match.length) return `<p>No records found.</p>`;
  return `<table>
    <thead><tr>
      <th>Htno</th><th>Subcode</th><th>Subname</th><th>Internals</th><th>Grade</th><th>Credits</th>
    </tr></thead>
    <tbody>${match
      .map(
        (r) =>
          `<tr>${r
            .slice(0, 6)
            .map((c) => `<td>${c}</td>`)
            .join("")}</tr>`
      )
      .join("")}</tbody>
  </table>`;
}

/* ---------- MAIN INITIALIZATION ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();

  // ==== STUDENT PAGE ====
  const viewBtn = document.getElementById("viewBtn");
  if (viewBtn) {
    viewBtn.onclick = async () => {
      const htno = document.getElementById("htno").value.trim();
      const type = document.getElementById("resultType").value;
      const sem = +document.getElementById("semester").value;
      const msg = document.getElementById("msg");

      if (!htno) return (msg.textContent = "Enter Hall Ticket Number");

      msg.textContent = "Fetching results...";
      const url = globalData.sheets[type][sem - 1];
      if (!url) return (msg.textContent = "Link not set by admin.");

      try {
        const rows = await fetchResults(url);
        document.getElementById("resultContainer").innerHTML = renderResults(
          rows,
          htno
        );
        document.getElementById("resultSection").classList.remove("hidden");
        msg.textContent = "";
      } catch (err) {
        msg.textContent = "Error loading results. Check sheet access.";
      }
    };
  }

  // ==== ADMIN LOGIN ====
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.onclick = async () => {
      const u = document.getElementById("adminUser").value.trim();
      const p = document.getElementById("adminPass").value.trim();

      const adminSnap = await db.ref("admin").get();
      const adminData = adminSnap.exists()
        ? adminSnap.val()
        : globalData.admin;

      if (u === adminData.username && p === adminData.password) {
        document.getElementById("loginCard").classList.add("hidden");
        document.getElementById("adminPanel").classList.remove("hidden");
        initAdmin();
      } else {
        document.getElementById("loginMsg").textContent =
          "❌ Invalid credentials";
      }
    };
  }
});

/* ---------- ADMIN PANEL ---------- */
function initAdmin() {
  document.getElementById("newsText").value = globalData.flashNews || "";
  const linkInputs = document.getElementById("linkInputs");
  linkInputs.innerHTML = "";

  ["regular", "supplementary", "revaluation"].forEach((type) => {
    const h = document.createElement("h3");
    h.textContent = type.toUpperCase();
    linkInputs.appendChild(h);

    globalData.sheets[type].forEach((link, i) => {
      const inp = document.createElement("input");
      inp.value = link;
      inp.placeholder = `${type} Sem ${i + 1} JSON URL`;
      inp.dataset.type = type;
      inp.dataset.index = i;
      linkInputs.appendChild(inp);
    });
  });

  // Update Flash News
  document.getElementById("saveNews").onclick = () => {
    const val = document.getElementById("newsText").value.trim();
    db.ref("flashNews").set(val);
    alert("✅ Flash News updated globally!");
  };

  // Update Links
  document.getElementById("saveLinks").onclick = async () => {
    linkInputs.querySelectorAll("input").forEach((inp) => {
      globalData.sheets[inp.dataset.type][inp.dataset.index] =
        inp.value.trim();
    });
    await db.ref("sheets").set(globalData.sheets);
    alert("✅ Sheet links saved globally!");
  };

  // Update Admin Password (optional future feature)
}
