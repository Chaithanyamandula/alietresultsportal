// ==== FIREBASE CONFIGURATION ====
const firebaseConfig = {
  apiKey: "AIzaSyAa0lRVztX561W7aTtwi5CrSy_MLEa7Lp8",
  authDomain: "college-results-portal.firebaseapp.com",
  databaseURL: "https://college-results-portal-default-rtdb.firebaseio.com",
  projectId: "college-results-portal",
  storageBucket: "college-results-portal.firebasestorage.app",
  messagingSenderId: "178855254203",
  appId: "1:178855254203:web:4401f8bfd4bcafbd47719e"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ==== STUDENT PAGE FUNCTIONALITY ====
if (document.getElementById("flashNews")) {
  const flashRef = db.ref("flashNews");
  flashRef.on("value", snap => {
    const news = snap.val() || "Welcome to College Results Portal!";
    document.getElementById("flashNews").innerHTML = `<span>${news}</span>`;
  });

  document.getElementById("viewBtn").onclick = async () => {
    const htno = document.getElementById("htno").value.trim();
    const type = document.getElementById("type").value;
    const sem = document.getElementById("sem").value;
    const msg = document.getElementById("msg");
    if (!htno) { msg.textContent = "Please enter Hall Ticket Number"; return; }

    const sheetRef = db.ref(`links/${type}/sem${sem}`);
    const sheetURL = await sheetRef.get().then(s => s.val());

    if (!sheetURL) { msg.textContent = "Link not set by admin."; return; }

    msg.textContent = "Fetching results...";
    try {
      const res = await fetch(sheetURL);
      const text = await res.text();
      const json = JSON.parse(text.match(/{.*}/s)[0]);
      const rows = json.table.rows.map(r => r.c.map(c => c?.v || ""));
      const match = rows.filter(r => r[0].toLowerCase() === htno.toLowerCase());
      if (!match.length) msg.textContent = "No record found.";
      else {
        const table = `<table><tr><th>Htno</th><th>Subcode</th><th>Subname</th><th>Internals</th><th>Grade</th><th>Credits</th></tr>` +
          match.map(r => `<tr>${r.slice(0,6).map(c => `<td>${c}</td>`).join('')}</tr>`).join('') + `</table>`;
        document.getElementById("resultContainer").innerHTML = table;
        msg.textContent = "";
      }
    } catch (e) { msg.textContent = "Error fetching sheet."; console.error(e); }
  };
}

// ==== ADMIN PAGE FUNCTIONALITY ====
if (document.getElementById("saveFlashBtn")) {
  document.getElementById("saveFlashBtn").onclick = () => {
    const news = document.getElementById("flashNewsInput").value.trim();
    if (!news) return alert("Enter flash news text.");
    db.ref("flashNews").set(news);
    alert("Flash news updated successfully!");
  };

  document.getElementById("saveLinkBtn").onclick = () => {
    const type = document.getElementById("typeSelect").value;
    const sem = document.getElementById("semSelect").value;
    const link = document.getElementById("sheetLink").value.trim();
    if (!link) return alert("Paste valid Google Sheet JSON link!");
    db.ref(`links/${type}/sem${sem}`).set(link);
    alert(`Link saved for ${type} Sem ${sem}`);
  };
}
