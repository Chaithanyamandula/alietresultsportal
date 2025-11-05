/* ---------- CONFIG ---------- */
const GITHUB_USER = "Chaithanyakumarmandula";
const GITHUB_REPO = "alietresultsportal";
const GITHUB_BRANCH = "main";
const GITHUB_FILE_PATH = "data.json";

const GITHUB_RAW_URL = `https://rawcdn.githack.com/Chaithanyamandula/alietresultsportal/refs/heads/main/data.json`;

/* ---------- THEME ---------- */
function applyTheme(theme){document.body.classList.remove('light','dark');document.body.classList.add(theme);localStorage.setItem('theme',theme);}
function toggleTheme(){const t=localStorage.getItem('theme')||'light';applyTheme(t==='light'?'dark':'light');}
document.addEventListener('DOMContentLoaded',()=>{applyTheme(localStorage.getItem('theme')||'light');const btn=document.getElementById('themeToggle');if(btn)btn.onclick=toggleTheme;});

/* ---------- GLOBALS ---------- */
let globalData=null;

/* ---------- FETCH LIVE JSON ---------- */
async function loadData(){
  const res=await fetch(GITHUB_RAW_URL+"?nocache="+Date.now());
  globalData=await res.json();
  const news=document.getElementById("flashNews");
  if(news)news.innerHTML=`<span>${globalData.flashNews||""}</span>`;
}

/* ---------- PARSE GVIZ ---------- */
function parseGviz(txt){const s=txt.indexOf("{"),e=txt.lastIndexOf("}");return JSON.parse(txt.slice(s,e+1));}

/* ---------- FETCH RESULTS ---------- */
async function fetchResults(url){
  const res=await fetch(url);const txt=await res.text();
  return parseGviz(txt).table.rows.map(r=>r.c.map(c=>(c&&c.v)||""));
}

/* ---------- RENDER RESULTS ---------- */
function renderResults(rows,htno){
  const f=rows.filter(r=>r[0].toString().toLowerCase()===htno.toLowerCase());
  if(!f.length)return`<p>No records found.</p>`;
  return `<table><thead><tr><th>Htno</th><th>Subcode</th><th>Subname</th><th>Internals</th><th>Grade</th><th>Credits</th></tr></thead>
  <tbody>${f.map(r=>`<tr>${r.slice(0,6).map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

/* ---------- GITHUB UPDATE ---------- */
async function updateGithubFile(newData,token){
  const api=`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
  const get=await fetch(api);const meta=await get.json();
  const content=btoa(unescape(encodeURIComponent(JSON.stringify(newData,null,2))));
  const res=await fetch(api,{
    method:"PUT",
    headers:{
      "Authorization":`token ${token}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      message:"Admin updated data.json",
      content,sha:meta.sha,branch:GITHUB_BRANCH
    })
  });
  if(!res.ok)throw new Error("GitHub update failed");
}

/* ---------- ENCRYPT TOKEN ---------- */
function encryptToken(token){
  const secret="ResultsPortalSecret";
  return CryptoJS.AES.encrypt(token,secret).toString();
}
function decryptToken(cipher){
  const secret="ResultsPortalSecret";
  return CryptoJS.AES.decrypt(cipher,secret).toString(CryptoJS.enc.Utf8);
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded',async()=>{
  await loadData();
  const viewBtn=document.getElementById("viewBtn");
  if(viewBtn){
    viewBtn.onclick=async()=>{
      const htno=document.getElementById("htno").value.trim();
      const type=document.getElementById("resultType").value;
      const sem=+document.getElementById("semester").value;
      const msg=document.getElementById("msg");
      msg.textContent="Fetching...";
      const url=globalData.sheets[type][sem-1];
      if(!url)return msg.textContent="No link set for this semester.";
      try{
        const rows=await fetchResults(url);
        document.getElementById("resultContainer").innerHTML=renderResults(rows,htno);
        document.getElementById("resultSection").classList.remove("hidden");
        msg.textContent="";
      }catch{msg.textContent="Error fetching results.";}
    };
    document.getElementById("printBtn").onclick=()=>window.print();
  }

  const loginBtn=document.getElementById("loginBtn");
  if(loginBtn){
    loginBtn.onclick=()=>{
      const u=document.getElementById("adminUser").value;
      const p=document.getElementById("adminPass").value;
      if(u===globalData.admin.username&&p===globalData.admin.password){
        document.getElementById("loginCard").classList.add("hidden");
        document.getElementById("adminPanel").classList.remove("hidden");
        initAdmin();
      }else{
        document.getElementById("loginMsg").textContent="Invalid credentials";
      }
    };
  }
});

/* ---------- ADMIN PANEL ---------- */
function initAdmin(){
  document.getElementById("newsText").value=globalData.flashNews;
  const linkInputs=document.getElementById("linkInputs");
  linkInputs.innerHTML="";
  ['regular','supplementary','revaluation'].forEach(type=>{
    const h=document.createElement('h3');h.textContent=type.toUpperCase();linkInputs.appendChild(h);
    globalData.sheets[type].forEach((link,i)=>{
      const inp=document.createElement('input');
      inp.value=link;inp.placeholder=`${type} Sem ${i+1} JSON URL`;
      inp.dataset.type=type;inp.dataset.index=i;
      linkInputs.appendChild(inp);
    });
  });

  document.getElementById("saveNews").onclick=()=>{globalData.flashNews=document.getElementById("newsText").value;alert("Flash news updated!");};

  document.getElementById("saveLinks").onclick=async()=>{
    linkInputs.querySelectorAll("input").forEach(inp=>{
      globalData.sheets[inp.dataset.type][inp.dataset.index]=inp.value.trim();
    });

    let token=localStorage.getItem("encToken");
    if(!token){
      const plain=prompt("Enter your GitHub Access Token:");
      if(!plain)return alert("Token required!");
      token=encryptToken(plain);
      localStorage.setItem("encToken",token);
    }
    const decrypted=decryptToken(token);
    try{
      await updateGithubFile(globalData,decrypted);
      document.getElementById("saveMsg").style.color="green";
      document.getElementById("saveMsg").textContent="✅ Data saved to GitHub successfully!";
    }catch(e){
      document.getElementById("saveMsg").style.color="red";
      document.getElementById("saveMsg").textContent="❌ Failed: "+e.message;
      localStorage.removeItem("encToken");
    }
  };
}
