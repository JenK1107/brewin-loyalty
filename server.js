require("dotenv").config();
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// ===== CONFIG =====
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || "3825";
const STAMPS_FOR_REWARD = 6;

// ===== SUPABASE CLIENT =====
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
}
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===== EXPRESS SETUP =====
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// ===== MIDDLEWARE HELPERS =====
function requireLogin(req, res, next) {
  if (!req.session.userId) return res.redirect("/");
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) return res.redirect("/");
  next();
}

// ===== DB HELPERS (SUPABASE) =====
async function getUserById(id) {
  return await supabase.from("users").select("*").eq("id", id).single();
}

async function getUserByUsername(username) {
  return await supabase.from("users").select("*").eq("username", username).single();
}

async function createUser(username, passhash) {
  return await supabase.from("users").insert({ username, passhash }).select("*").single();
}

async function updateUserById(id, patch) {
  return await supabase.from("users").update(patch).eq("id", id).select("*").single();
}

async function updateUserByUsername(username, patch) {
  return await supabase.from("users").update(patch).eq("username", username).select("*").single();
}

// ===== HTML SHELL =====
function htmlPage(title, body) {
  return `<!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>

      <!-- PWA -->
      <link rel="manifest" href="/manifest.webmanifest" />
      <meta name="theme-color" content="#fffaef" />
      <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      <style>
        :root{
          --bg:#fffaef;
          --primary:#950321;
          --secondary:#4a6fa5;
          --border: rgba(149,3,33,0.12);
          --card: rgba(255,255,255,0.7);
        }
        body{
          margin:0;
          font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial;
          background: var(--bg);
          padding:20px;
          max-width:520px;
          margin:0 auto;
          color: var(--primary);
        }
        h2,h3{ margin: 0 0 10px 0; color: var(--primary); }
        .muted{ color: var(--secondary); font-size:14px; line-height:1.35; }
        .card{
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 16px;
          margin: 14px 0;
          backdrop-filter: blur(6px);
        }
        input,button{
          width:100%;
          padding:12px 14px;
          border-radius:14px;
          border:1px solid rgba(74,111,165,0.25);
          font-size:16px;
          box-sizing:border-box;
        }
        input{
          background: rgba(255,255,255,0.9);
          color: var(--primary);
          outline:none;
        }
        button{
          border:none;
          cursor:pointer;
          margin-top:10px;
          background: var(--primary);
          color: var(--bg);
          font-weight:700;
        }
        button.secondary{
          background: rgba(74,111,165,0.12);
          color: var(--primary);
          border: 1px solid rgba(74,111,165,0.25);
        }
        .row{ display:grid; gap:10px; }
        .big{ font-size:28px; font-weight:800; color: var(--primary); }
        hr{ border:none; border-top:1px solid rgba(149,3,33,0.10); margin:14px 0; }

        /* Badge */
        .badge{
          display:flex;
          align-items:center;
          gap:10px;
          padding:12px 14px;
          border-radius:16px;
          border: 1px solid rgba(74,111,165,0.35);
          background: rgba(74,111,165,0.08);
          color: var(--primary);
          font-weight:750;
          line-height:1.2;
          margin-top: 10px;
        }

        /* Stamp card */
        .stamp-grid{
          display:grid;
          grid-template-columns: repeat(3, 1fr);
          gap:12px;
          margin-top:10px;
        }
        .stamp{
          aspect-ratio: 1 / 1;
          border-radius: 18px;
          border: 2px dashed rgba(149,3,33,0.28);
          background: rgba(255,255,255,0.65);
          display:flex;
          align-items:center;
          justify-content:center;
          position:relative;
          overflow:hidden;
        }
        .stamp .label{
          font-weight:800;
          letter-spacing:0.08em;
          font-size:12px;
          color: rgba(149,3,33,0.45);
        }
        .stamp.filled{
          border-style: solid;
          border-color: rgba(149,3,33,0.35);
        }
        .stamp.filled::after{
          content:"STAMPED";
          position:absolute;
          inset:auto -25% auto -25%;
          top:50%;
          transform: translateY(-50%) rotate(-18deg);
          text-align:center;
          font-weight:900;
          letter-spacing:0.12em;
          font-size:18px;
          color: rgba(149,3,33,0.22);
          border: 2px solid rgba(149,3,33,0.22);
          padding:8px 0;
          background: rgba(255,250,239,0.6);
        }

        /* Layout polish */
        .header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .brand{ font-size:26px; font-weight:900; color: var(--primary); letter-spacing:-0.02em; }
        .sub{ margin: 6px 0 16px 0; }

        /* Tabs */
        .tabs{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:10px;
          margin: 10px 0 14px 0;
        }
        .tabbtn{
          width:100%;
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(149,3,33,0.14);
          color: var(--primary);
          font-weight:850;
          padding: 12px 12px;
          border-radius: 16px;
          cursor:pointer;
        }
        .tabbtn.active{
          background: var(--primary);
          color: var(--bg);
          border-color: var(--primary);
        }
        .panel{ display:none; }
        .panel.active{ display:block; }

        /* Admin collapsible */
        details.staff{
          margin-top: 18px;
          border: 1px dashed rgba(149,3,33,0.18);
          border-radius: 18px;
          background: rgba(255,255,255,0.45);
          padding: 12px 14px;
        }
        details.staff summary{
          cursor:pointer;
          font-weight:900;
          color: var(--secondary);
          list-style:none;
        }
        details.staff summary::-webkit-details-marker{ display:none; }
        details.staff[open] summary{ color: var(--primary); }

        /* Admin dropdown sections */
        details.admin{
          margin-top: 14px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: rgba(255,255,255,0.55);
          padding: 14px;
        }

        details.admin summary{
          cursor: pointer;
          font-weight: 900;
          color: var(--primary);
          list-style: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        details.admin summary::-webkit-details-marker{
          display: none;
        }

        details.admin summary span{
          font-size: 13px;
          color: var(--secondary);
          font-weight: 600;
        }

        details.admin[open]{
          background: rgba(255,255,255,0.75);
        }

        .footer{ margin-top: 28px; padding-top: 18px; text-align: center; opacity: 0.7; }
        .footer img{ height: 60px; width: auto; }

        /* A2HS UI */
        #a2hs-btn { display:none; margin-top: 10px; }
        #ios-a2hs { display:none; }
        .a2hs-tip { border:1px dashed rgba(149,3,33,0.18); border-radius:18px; padding:14px; margin:12px 0; background: rgba(255,255,255,0.55); }

        a{ color: var(--secondary); text-decoration: none; font-weight: 650; }
      </style>
    </head>
    <body>
      ${body}

      <!-- Footer logo -->
      <div class="footer">
        <img src="/icons/brand-logo.png" alt="Brewin’ Small logo" />
      </div>

      <!-- Android install button -->
      <button id="a2hs-btn" class="secondary" onclick="handleInstallClick()">Add to Home Screen</button>

      <!-- iOS helper tip -->
      <div id="ios-a2hs" class="a2hs-tip">
        <div class="big" style="font-size:20px;">Add to Home Screen 📲</div>
        <p class="muted" style="margin-top:8px; margin-bottom:0;">
          On iPhone: tap <b>Share</b> → <b>Add to Home Screen</b>.
        </p>
      </div>

      <script src="/a2hs.js"></script>
    </body>
  </html>`;
}

// ===== ROUTES =====

// ===== ADMIN AUTH =====
app.post("/admin/login", (req, res) => {
  const u = (req.body.username || "").trim();
  const p = req.body.password || "";

  const ADMIN_USER = process.env.ADMIN_USER || "admin";
  const ADMIN_PASS = process.env.ADMIN_PASS || "3825";

  if (u === ADMIN_USER && p === ADMIN_PASS) {
    req.session.isAdmin = true;
    return res.redirect("/admin/dashboard");
  }

  return res.send(
    htmlPage(
      "Admin Login",
      `<div class="card"><p class="muted">Invalid admin login.</p><p><a href="/">Back</a></p></div>`
    )
  );
});

app.get("/admin/logout", (req, res) => {
  req.session.isAdmin = false;
  res.redirect("/");
});

// ===== ADMIN DASHBOARD =====
app.get("/admin/dashboard", requireAdmin, async (req, res) => {
  const q = (req.query.q || "").trim().toLowerCase();

  let query = supabase
    .from("users")
    .select("username, stamps, rewards")
    .order("stamps", { ascending: false })
    .order("username", { ascending: true });

  if (q) query = query.ilike("username", `%${q}%`);

  const { data: users, error } = await query;
  const safeUsers = users || [];

  const rows = safeUsers
    .map(
      (u) => `
      <tr>
        <td style="padding:10px 8px; border-top:1px solid rgba(149,3,33,0.10);"><b>${u.username}</b></td>
        <td style="padding:10px 8px; border-top:1px solid rgba(149,3,33,0.10);">${u.stamps}</td>
        <td style="padding:10px 8px; border-top:1px solid rgba(149,3,33,0.10);">${u.rewards}</td>
      </tr>`
    )
    .join("");

  res.send(
    htmlPage(
      "Admin Dashboard",
      `
      <h2>Admin Dashboard ☕️</h2>
      <p class="muted">${error ? "DB error: " + error.message : "View customers, manage stamps and passcodes."}</p>

      <div class="card">
        <form class="row" method="GET" action="/admin/dashboard">
          <input name="q" placeholder="Search username..." value="${q.replace(/"/g, "&quot;")}" />
          <button type="submit" class="secondary">Search</button>
        </form>
      </div>

      <div class="card">
        <h3>Customers (${safeUsers.length})</h3>
        <div style="overflow:auto; border-radius:14px;">
          <table style="width:100%; border-collapse:collapse; min-width:420px;">
            <thead>
              <tr>
                <th style="text-align:left; padding:10px 8px;">Username</th>
                <th style="text-align:left; padding:10px 8px;">Stamps</th>
                <th style="text-align:left; padding:10px 8px;">Rewards</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="3" style="padding:12px 8px; border-top:1px solid rgba(149,3,33,0.10);" class="muted">No users found.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <details class="admin">
        <summary>
          Reset Customer Passcode
          <span>Forgot login</span>
        </summary>

        <p class="muted" style="margin-top:10px;">
          Use this if a customer forgets their passcode.
        </p>

        <form class="row" method="POST" action="/admin/reset-passcode-dashboard">
          <input name="username" placeholder="Customer username" required />
          <input name="newPasscode" placeholder="New passcode (min 4 chars)" type="password" required />
          <button type="submit">Reset Passcode</button>
        </form>
    </details>

    <details class="admin">
      <summary>
        Stamp Actions
        <span>Add / Redeem</span>
      </summary>

      <p class="muted" style="margin-top:10px;">
        Add a stamp or redeem a free cup by username.
      </p>

      <form class="row" method="POST" action="/admin/add-stamp-by-username">
        <input name="username" placeholder="Customer username" required />
        <button type="submit">+1 Stamp</button>
      </form>

      <hr />

      <form class="row" method="POST" action="/admin/redeem-by-username">
        <input name="username" placeholder="Customer username" required />
        <button type="submit" class="secondary">Redeem Free Cup</button>
      </form>
    </details>

      <p><a href="/admin/logout">Logout</a></p>
      `
    )
  );
});

// ===== ADMIN ACTIONS =====
app.post("/admin/reset-passcode-dashboard", requireAdmin, async (req, res) => {
  const username = (req.body.username || "").trim().toLowerCase();
  const newPasscode = req.body.newPasscode || "";

  if (username.length < 3 || newPasscode.length < 4) {
    return res.send(htmlPage("Error", `<div class="card"><p class="muted">Username must be 3+ chars and passcode 4+.</p><p><a href="/admin/dashboard">Back</a></p></div>`));
  }

  const found = await getUserByUsername(username);
  if (found.error || !found.data) {
    return res.send(htmlPage("Not found", `<div class="card"><p class="muted">Username not found.</p><p><a href="/admin/dashboard">Back</a></p></div>`));
  }

  const passhash = bcrypt.hashSync(newPasscode, 10);
  await updateUserById(found.data.id, { passhash });

  return res.redirect("/admin/dashboard?q=" + encodeURIComponent(username));
});

app.post("/admin/add-stamp-by-username", requireAdmin, async (req, res) => {
  const username = (req.body.username || "").trim().toLowerCase();

  const found = await getUserByUsername(username);
  if (found.error || !found.data) {
    return res.send(htmlPage("Not found", `<div class="card"><p class="muted">Username not found.</p><p><a href="/admin/dashboard">Back</a></p></div>`));
  }

  await updateUserById(found.data.id, { stamps: (found.data.stamps || 0) + 1 });
  return res.redirect("/admin/dashboard?q=" + encodeURIComponent(username));
});

app.post("/admin/redeem-by-username", requireAdmin, async (req, res) => {
  const username = (req.body.username || "").trim().toLowerCase();

  const found = await getUserByUsername(username);
  if (found.error || !found.data) {
    return res.send(htmlPage("Not found", `<div class="card"><p class="muted">Username not found.</p><p><a href="/admin/dashboard">Back</a></p></div>`));
  }

  if ((found.data.stamps || 0) < STAMPS_FOR_REWARD) {
    return res.send(htmlPage("Not yet", `<div class="card"><p class="muted">Not enough stamps to redeem for this user.</p><p><a href="/admin/dashboard?q=${encodeURIComponent(username)}">Back</a></p></div>`));
  }

  await updateUserById(found.data.id, {
    stamps: found.data.stamps - STAMPS_FOR_REWARD,
    rewards: (found.data.rewards || 0) + 1,
  });

  return res.redirect("/admin/dashboard?q=" + encodeURIComponent(username));
});

// ===== CUSTOMER LOGIN PAGE =====
app.get("/", (req, res) => {
  if (req.session.isAdmin) return res.redirect("/admin/dashboard");
  if (req.session.userId) return res.redirect("/card");

  res.send(
    htmlPage(
      "Brewin’ Small Loyalty",
      `
        <div class="header">
          <div class="brand">Brewin’ Small Loyalty ☕️</div>
        </div>
        <p class="muted sub">Login with your username + passcode. No apps needed.</p>

        <div class="tabs">
          <button class="tabbtn active" id="tab-login" type="button" onclick="showTab('login')">Login</button>
          <button class="tabbtn" id="tab-create" type="button" onclick="showTab('create')">Create</button>
        </div>

        <div class="card panel active" id="panel-login">
          <h3>Customer Login</h3>
          <form class="row" method="POST" action="/login">
            <input name="username" placeholder="Username" required />
            <input name="passcode" placeholder="Passcode" type="password" required />
            <button type="submit">Login</button>
          </form>
        </div>

        <div class="card panel" id="panel-create">
          <h3>Create Account</h3>
          <form class="row" method="POST" action="/register">
            <input name="username" placeholder="Choose a username" required />
            <input name="passcode" placeholder="Choose a passcode" type="password" required />
            <p class="muted" style="margin-top:10px; margin-bottom:0;">Tip: choose something you’ll remember.</p>
            <button type="submit">Create</button>
          </form>
        </div>

        <details class="staff">
          <summary>Staff access 🔒</summary>
          <div style="margin-top:12px;">
            <form class="row" method="POST" action="/admin/login">
              <input name="username" placeholder="Admin username" required />
              <input name="password" placeholder="Admin password" type="password" required />
              <button type="submit" class="secondary">Login as Admin</button>
            </form>
          </div>
        </details>

        <script>
          function showTab(which){
            const loginBtn = document.getElementById('tab-login');
            const createBtn = document.getElementById('tab-create');
            const loginPanel = document.getElementById('panel-login');
            const createPanel = document.getElementById('panel-create');

            if(which === 'login'){
              loginBtn.classList.add('active');
              createBtn.classList.remove('active');
              loginPanel.classList.add('active');
              createPanel.classList.remove('active');
            } else {
              createBtn.classList.add('active');
              loginBtn.classList.remove('active');
              createPanel.classList.add('active');
              loginPanel.classList.remove('active');
            }
          }
        </script>
      `
    )
  );
});

// ===== CUSTOMER AUTH =====
app.post("/register", async (req, res) => {
  const username = (req.body.username || "").trim().toLowerCase();
  const passcode = req.body.passcode || "";

  if (username.length < 3 || passcode.length < 4) {
    return res.send(htmlPage("Error", `<div class="card"><p class="muted">Username must be 3+ characters, passcode 4+.</p><p><a href="/">Back</a></p></div>`));
  }

  try {
    const passhash = bcrypt.hashSync(passcode, 10);
    const created = await createUser(username, passhash);

    if (created.error || !created.data) {
      return res.send(htmlPage("Error", `<div class="card"><p class="muted">That username is taken. Try another.</p><p><a href="/">Back</a></p></div>`));
    }

    req.session.userId = created.data.id;
    res.redirect("/card");
  } catch {
    res.send(htmlPage("Error", `<div class="card"><p class="muted">Something went wrong.</p><p><a href="/">Back</a></p></div>`));
  }
});

app.post("/login", async (req, res) => {
  const username = (req.body.username || "").trim().toLowerCase();
  const passcode = req.body.passcode || "";

  const found = await getUserByUsername(username);
  if (found.error || !found.data) {
    return res.send(htmlPage("Error", `<div class="card"><p class="muted">Invalid login.</p><p><a href="/">Back</a></p></div>`));
  }

  const ok = bcrypt.compareSync(passcode, found.data.passhash);
  if (!ok) {
    return res.send(htmlPage("Error", `<div class="card"><p class="muted">Invalid login.</p><p><a href="/">Back</a></p></div>`));
  }

  req.session.userId = found.data.id;
  res.redirect("/card");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ===== CUSTOMER CARD =====
app.get("/card", requireLogin, async (req, res) => {
  const found = await getUserById(req.session.userId);
  if (found.error || !found.data) {
    return res.redirect("/logout");
  }

  const user = found.data;
  const stampsToNext = Math.max(STAMPS_FOR_REWARD - (user.stamps || 0), 0);
  const rewardUnlocked = (user.stamps || 0) >= STAMPS_FOR_REWARD;

  res.send(
    htmlPage(
      "Your Loyalty Card",
      `
      <h2>${user.username}'s Loyalty Card 🌿</h2>

      <div class="badge">
        <span>Show this screen upon collection to earn a stamp.</span>
      </div>

      <div class="card">
        <div class="stamp-grid">
          ${Array.from({ length: STAMPS_FOR_REWARD }).map((_, i) => {
        const filled = i < (user.stamps || 0) ? "filled" : "";
        return `<div class="stamp ${filled}"><div class="label">${i + 1}</div></div>`;
      }).join("")}
        </div>

        <p class="muted" style="margin-top:12px; font-weight:300; color:#4a6fa5;">
          ${rewardUnlocked
        ? "🎉 Reward unlocked! Redeem your free drink from us (any drink on our menu) 🎉"
        : `Collect ${stampsToNext} stamp(s) and enjoy a free cup on us 🤍`
      }
        </p>

        <p style="margin-top:10px; margin-bottom:0; font-size: 10px; font-weight:600; color:#950321;">
          Rewards are non-transferable and not valid with other offers.
        </p>
      </div>

      <p><a href="/logout">Logout</a></p>
      `
    )
  );
});

app.listen(PORT, () => {
  console.log(`Loyalty app running at http://localhost:${PORT}`);
});
