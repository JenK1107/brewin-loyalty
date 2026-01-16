const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const app = express();
const db = new Database("loyalty.db");

// ===== CONFIG =====
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || "3825";
const STAMPS_FOR_REWARD = 6;

// ===== DB SETUP =====
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  passhash TEXT NOT NULL,
  stamps INTEGER NOT NULL DEFAULT 0,
  rewards INTEGER NOT NULL DEFAULT 0
);
`);

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public")); // serve /public
app.use(
    session({
        secret: process.env.SESSION_SECRET || "change-this-secret",
        resave: false,
        saveUninitialized: false,
    })
);

function requireLogin(req, res, next) {
    if (!req.session.userId) return res.redirect("/");
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.isAdmin) return res.redirect("/admin");
    next();
}


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
        .badge .dot{
          width:10px; height:10px;
          border-radius:999px;
          background: var(--primary);
          flex: 0 0 auto;
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

        details summary{
            cursor:pointer;
            font-weight:800;
            color: var(--primary);
            list-style:none;
        }
        details summary::-webkit-details-marker{ display:none; }
        details{
            border: 1px solid var(--border);
            border-radius: 18px;
            background: rgba(255,255,255,0.55);
            padding: 14px;
        }
        details[open]{ background: rgba(255,255,255,0.75); }

        /* Layout polish */
        .header{
        display:flex; align-items:center; justify-content:space-between;
        margin-bottom:8px;
        }
        .brand{
        font-size:26px; font-weight:900; color: var(--primary);
        letter-spacing:-0.02em;
        }
        .sub{
        margin: 6px 0 16px 0;
        }

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

        /* Inputs tighter */
        .card h3{ margin-bottom: 12px; }
        input{
        border:1px solid rgba(74,111,165,0.25);
        }
        button{
        border-radius:16px;
        }

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
        }
        details.staff[open] summary{ color: var(--primary); }

        .footer{
        margin-top: 28px;
        padding-top: 18px;
        text-align: center;
        opacity: 0.7;
        }

        .footer img{
        height: 60px;           /* adjust if needed */
        width: auto;
        }

        .footer p{
        margin-top: 6px;
        font-size: 12px;
        color: var(--secondary);
        }

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


      <!-- Android install button (only shows when available) -->
      <button id="a2hs-btn" class="secondary" onclick="handleInstallClick()">Add to Home Screen</button>

      <!-- iOS helper tip (shows on iPhone Safari when not installed) -->
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
            `<div class="card"><p class="muted">Invalid admin login.</p><p><a href="/admin">Try again</a></p></div>`
        )
    );
});

app.get("/admin/logout", (req, res) => {
    req.session.isAdmin = false;
    res.redirect("/");
});

app.get("/admin/dashboard", requireAdmin, (req, res) => {
    const q = (req.query.q || "").trim().toLowerCase();

    let users = [];
    if (q) {
        users = db
            .prepare("SELECT username, stamps, rewards FROM users WHERE username LIKE ? ORDER BY stamps DESC, username ASC")
            .all(`%${q}%`);
    } else {
        users = db
            .prepare("SELECT username, stamps, rewards FROM users ORDER BY stamps DESC, username ASC")
            .all();
    }

    const rows = users
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
      <p class="muted">View customers, manage stamps and passcodes.</p>

      <div class="card">
        <form class="row" method="GET" action="/admin/dashboard">
          <input name="q" placeholder="Search username..." value="${q.replace(/"/g, "&quot;")}" />
          <button type="submit" class="secondary">Search</button>
        </form>
      </div>

      <div class="card">
        <h3>Customers (${users.length})</h3>
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

      <div class="card">
        <h3>Reset Customer Passcode</h3>
        <p class="muted">Use this if a customer forgets their passcode.</p>
        <form class="row" method="POST" action="/admin/reset-passcode-dashboard">
          <input name="username" placeholder="Customer username" required />
          <input name="newPasscode" placeholder="New passcode (min 4 chars)" type="password" required />
          <button type="submit">Reset Passcode</button>
        </form>
      </div>

      <div class="card">
        <h3>Stamp Actions</h3>
        <p class="muted">Add a stamp or redeem a free cup by username.</p>
        <form class="row" method="POST" action="/admin/add-stamp-by-username">
          <input name="username" placeholder="Customer username" required />
          <button type="submit">+1 Stamp</button>
        </form>

        <form class="row" method="POST" action="/admin/redeem-by-username" style="margin-top:12px;">
          <input name="username" placeholder="Customer username" required />
          <button type="submit" class="secondary">Redeem Free Cup</button>
        </form>
      </div>

      <p><a href="/admin/logout">Logout</a>
      `
        )
    );
});

app.post("/admin/reset-passcode-dashboard", requireAdmin, (req, res) => {
    const username = (req.body.username || "").trim().toLowerCase();
    const newPasscode = req.body.newPasscode || "";

    if (username.length < 3 || newPasscode.length < 4) {
        return res.send(htmlPage("Error", `<div class="card"><p class="muted">Username must be 3+ chars and passcode 4+.</p><p><a href="/admin/dashboard">Back</a></p></div>`));
    }

    const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (!user) {
        return res.send(htmlPage("Not found", `<div class="card"><p class="muted">Username not found.</p><p><a href="/admin/dashboard">Back</a></p></div>`));
    }

    const passhash = bcrypt.hashSync(newPasscode, 10);
    db.prepare("UPDATE users SET passhash = ? WHERE id = ?").run(passhash, user.id);

    return res.redirect("/admin/dashboard?q=" + encodeURIComponent(username));
});

app.post("/admin/add-stamp-by-username", requireAdmin, (req, res) => {
    const username = (req.body.username || "").trim().toLowerCase();

    const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (!user) {
        return res.send(htmlPage("Not found", `<div class="card"><p class="muted">Username not found.</p><p><a href="/admin/dashboard">Back</a></p></div>`));
    }

    db.prepare("UPDATE users SET stamps = stamps + 1 WHERE id = ?").run(user.id);
    return res.redirect("/admin/dashboard?q=" + encodeURIComponent(username));
});

app.post("/admin/redeem-by-username", requireAdmin, (req, res) => {
    const username = (req.body.username || "").trim().toLowerCase();

    const user = db.prepare("SELECT id, stamps FROM users WHERE username = ?").get(username);
    if (!user) {
        return res.send(htmlPage("Not found", `<div class="card"><p class="muted">Username not found.</p><p><a href="/admin/dashboard">Back</a></p></div>`));
    }

    if (user.stamps < STAMPS_FOR_REWARD) {
        return res.send(htmlPage("Not yet", `<div class="card"><p class="muted">Not enough stamps to redeem for this user.</p><p><a href="/admin/dashboard?q=${encodeURIComponent(username)}">Back</a></p></div>`));
    }

    db.prepare("UPDATE users SET stamps = stamps - ?, rewards = rewards + 1 WHERE id = ?")
        .run(STAMPS_FOR_REWARD, user.id);

    return res.redirect("/admin/dashboard?q=" + encodeURIComponent(username));
});


// Login/Register page
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


app.post("/register", (req, res) => {
    const username = (req.body.username || "").trim().toLowerCase();
    const passcode = req.body.passcode || "";

    if (username.length < 3 || passcode.length < 4) {
        return res.send(
            htmlPage("Error", `<div class="card"><p class="muted">Username must be 3+ characters, passcode 4+.</p><p><a href="/">Back</a></p></div>`)
        );
    }

    try {
        const passhash = bcrypt.hashSync(passcode, 10);
        const stmt = db.prepare("INSERT INTO users (username, passhash) VALUES (?, ?)");
        const info = stmt.run(username, passhash);
        req.session.userId = info.lastInsertRowid;
        res.redirect("/card");
    } catch (e) {
        res.send(
            htmlPage("Error", `<div class="card"><p class="muted">That username is taken. Try another.</p><p><a href="/">Back</a></p></div>`)
        );
    }
});

app.post("/login", (req, res) => {
    const username = (req.body.username || "").trim().toLowerCase();
    const passcode = req.body.passcode || "";

    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (!user) {
        return res.send(htmlPage("Error", `<div class="card"><p class="muted">Invalid login.</p><p><a href="/">Back</a></p></div>`));
    }

    const ok = bcrypt.compareSync(passcode, user.passhash);
    if (!ok) {
        return res.send(htmlPage("Error", `<div class="card"><p class="muted">Invalid login.</p><p><a href="/">Back</a></p></div>`));
    }

    req.session.userId = user.id;
    res.redirect("/card");
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
});

// Customer card page
app.get("/card", requireLogin, (req, res) => {
    const user = db.prepare("SELECT username, stamps, rewards FROM users WHERE id = ?").get(req.session.userId);

    const stampsToNext = Math.max(STAMPS_FOR_REWARD - user.stamps, 0);
    const rewardUnlocked = user.stamps >= STAMPS_FOR_REWARD;

    res.send(
        htmlPage(
            "Your Loyalty Card",
            `
      <h2>Your Loyalty Card 🌿</h2>

      <div class="card">
        <div class="muted">Username</div>
        <div class="big">${user.username}</div>
        <hr />
        <div class="muted">Stamps</div>
        <div class="stamp-grid">
            ${Array.from({ length: STAMPS_FOR_REWARD }).map((_, i) => {
                const filled = i < user.stamps ? "filled" : "";
                return `<div class="stamp ${filled}"><div class="label">${i + 1}</div></div>`;
            }).join("")}
        </div>

        <div class="badge">
          <span>Show this screen upon collection to earn a stamp.</span>
        </div>

        <p class="muted" style="margin-top:12px;">
          ${rewardUnlocked
                ? "🎉 Reward unlocked! Enjoy your 7th cup free (any drink on our menu)."
                : `${stampsToNext} more to unlock your 7th cup free (any drink on our menu).`
            }

          <p style="margin-top:10px; margin-bottom:0; font-weight:700; color:#950321;">
                Rewards are non-transferable and not valid with other offers.
           </p>

        </p>
      </div>

      <p><a href="/logout">Logout</a></p>
      `
        )
    );
});

// Admin: add stamp
app.post("/admin/add-stamp", requireLogin, (req, res) => {
    const pin = req.body.pin || "";
    if (pin !== ADMIN_PIN) {
        return res.send(htmlPage("Wrong PIN", `<div class="card"><p class="muted">Wrong PIN.</p><p><a href="/card">Back</a></p></div>`));
    }
    db.prepare("UPDATE users SET stamps = stamps + 1 WHERE id = ?").run(req.session.userId);
    res.redirect("/card");
});

// Admin: redeem reward (any drink)
app.post("/admin/redeem", requireLogin, (req, res) => {
    const pin = req.body.pin || "";
    if (pin !== ADMIN_PIN) {
        return res.send(htmlPage("Wrong PIN", `<div class="card"><p class="muted">Wrong PIN.</p><p><a href="/card">Back</a></p></div>`));
    }

    const user = db.prepare("SELECT stamps, rewards FROM users WHERE id = ?").get(req.session.userId);
    if (user.stamps < STAMPS_FOR_REWARD) {
        return res.send(htmlPage("Not yet", `<div class="card"><p class="muted">Not enough stamps to redeem yet.</p><p><a href="/card">Back</a></p></div>`));
    }

    db.prepare("UPDATE users SET stamps = stamps - ?, rewards = rewards + 1 WHERE id = ?")
        .run(STAMPS_FOR_REWARD, req.session.userId);

    res.redirect("/card");
});

// Admin: reset user password
app.post("/admin/reset-passcode", requireLogin, (req, res) => {
    const pin = req.body.pin || "";
    const username = (req.body.username || "").trim().toLowerCase();
    const newPasscode = req.body.newPasscode || "";

    if (pin !== ADMIN_PIN) {
        return res.send(
            htmlPage(
                "Wrong PIN",
                `<div class="card"><p class="muted">Wrong PIN.</p><p><a href="/card">Back</a></p></div>`
            )
        );
    }

    if (username.length < 3 || newPasscode.length < 4) {
        return res.send(
            htmlPage(
                "Error",
                `<div class="card"><p class="muted">Username must be 3+ chars and new passcode 4+.</p><p><a href="/card">Back</a></p></div>`
            )
        );
    }

    const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (!user) {
        return res.send(
            htmlPage(
                "Not found",
                `<div class="card"><p class="muted">Username not found.</p><p><a href="/card">Back</a></p></div>`
            )
        );
    }

    const passhash = bcrypt.hashSync(newPasscode, 10);
    db.prepare("UPDATE users SET passhash = ? WHERE id = ?").run(passhash, user.id);

    return res.send(
        htmlPage(
            "Passcode reset",
            `<div class="card">
        <h3>Passcode updated ✅</h3>
        <p class="muted">Username <b>${username}</b> can now log in using the new passcode.</p>
        <p><a href="/card">Back</a></p>
      </div>`
        )
    );
});


app.listen(PORT, () => {
    console.log(`Loyalty app running at http://localhost:${PORT}`);
});
