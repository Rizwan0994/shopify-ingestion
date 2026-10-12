# Insytix — Setup & Run Guide (for a brand-new PC)

> **For the person reading this:** You don't need to understand any of the commands below.
> Open **Claude** (Claude Code) on your computer, paste this **entire file**, and say:
> *"Please follow this guide to set up and run the project on my PC, and tell me when it's ready."*
> Then just follow what Claude tells you. The app runs **locally on this computer** — nothing is
> published to the internet.

---

## Instructions for Claude

You are setting up a small full-stack web app called **Insytix** on a **fresh Windows PC** for a
**non-technical user**. Work through the steps **in order**, run the commands for the user, verify
each step before moving on, and explain what's happening in **simple, friendly language**. If a
step fails, stop and fix it using the Troubleshooting section before continuing.

**What the app is:** a React frontend + a Node.js/Express backend that uses a built-in file
database (SQLite). There is **no external database or cloud service to install** — it all runs on
this one computer.

**What you'll end up running:** two (optionally three) small servers that stay open in separate
terminals:
- Backend API → http://localhost:8080
- Frontend website → http://localhost:5173  ← this is what the user opens in their browser
- (Optional) a tiny local FTP server → used only to demo the "FTP supplier" feature offline

**Ground rules**
- Run commands **one at a time**. Do **not** chain them with `&&` (this PC's PowerShell may not
  support it). Run each line on its own.
- The three `npm run dev` / `npm run ftp-demo` commands **keep running and never "finish"** — that
  is correct. Each needs its **own terminal window left open**. Open new terminals as needed.
- Prefer **Node.js LTS (version 20 or 22)**.

---

## Step 0 — Install the prerequisites (only needed once per PC)

Check whether Node.js and Git are already installed:

```powershell
node --version
```
```powershell
git --version
```

- If `node --version` prints something like `v20.x` or `v22.x`, Node is installed — skip ahead.
- If either command says *"not recognized"*, install it:

**Install Node.js (LTS):**
```powershell
winget install OpenJS.NodeJS.LTS
```

**Install Git:**
```powershell
winget install Git.Git
```

> If `winget` itself isn't available, download the installers manually and run them with default
> options: Node.js from **https://nodejs.org** (choose the **LTS** button) and Git from
> **https://git-scm.com/download/win**.

**Important:** after installing, **close and reopen the terminal** (so it picks up the new
programs), then re-run `node --version` and `git --version` to confirm both work.

---

## Step 1 — Get the project code

Pick a simple folder (e.g. the Desktop) and download the code there:

```powershell
cd $HOME\Desktop
```
```powershell
git clone https://github.com/Rizwan0994/shopify-ingestion.git
```

This creates a folder named **`shopify-ingestion`** containing two sub-folders:
`Insytix-backend` and `Insytix-frontend`.

> If the clone asks you to sign in or fails with a "permission"/"not found" error, the repository
> may be **private**. In that case ask the project owner (Rizwan) to either make the GitHub repo
> **public**, or to grant this GitHub account access / provide a personal access token. Then retry
> the clone.

---

## Step 2 — First-time setup (install dependencies + demo data)

This downloads the libraries the app needs. It only has to be done **once** (and again only if the
code is updated). It can take a couple of minutes each.

**Backend:**
```powershell
cd $HOME\Desktop\shopify-ingestion\Insytix-backend
```
```powershell
npm install
```
```powershell
npm run seed
```
`npm run seed` fills the app with a ready-made demo catalog and prints a demo login. You should see
**"✓ Seed complete"** with the login `demo@insytix.app` / `demo12345`.

**Frontend:**
```powershell
cd $HOME\Desktop\shopify-ingestion\Insytix-frontend
```
```powershell
npm install
```

> No configuration files need editing — the app works with its built-in defaults.

---

## Step 3 — Start the app (do this every time you want to use it)

You need **two terminal windows** open at the same time (a third is optional, for the FTP demo).

**Terminal 1 — Backend** (leave this window open):
```powershell
cd $HOME\Desktop\shopify-ingestion\Insytix-backend
```
```powershell
npm run dev
```
Wait until it prints **"Insytix backend running at http://localhost:8080"**.

**Terminal 2 — Frontend** (open a NEW terminal, leave it open):
```powershell
cd $HOME\Desktop\shopify-ingestion\Insytix-frontend
```
```powershell
npm run dev
```
Wait until it prints a **Local: http://localhost:5173** line.

**Terminal 3 — Demo FTP server (OPTIONAL)** — only needed to try the "FTP supplier" feature
offline. Open a THIRD terminal and leave it open:
```powershell
cd $HOME\Desktop\shopify-ingestion\Insytix-backend
```
```powershell
npm run ftp-demo
```

---

## Step 4 — Open the app

Open a web browser and go to:

**http://localhost:5173**

Sign in with the demo account:
- **Email:** `demo@insytix.app`
- **Password:** `demo12345`

(Or click **Create an account** to make a fresh workspace.)

You should see a Dashboard with products, suppliers, and charts. 🎉

**Quick things to try**
- **Suppliers → Add supplier → CSV upload**, then **Upload feed** and pick the file
  `Insytix-backend\src\sample-data\furniture-feed.csv`.
- **Suppliers → Add supplier → FTP / SFTP feed → "Use demo FTP server"** (this needs Terminal 3
  running), click **Test connection**, **Add supplier**, then **Fetch now**.
- **Products** page → open a product → **Sync to Shopify** (this last one only fully works if a
  real Shopify store is connected under **Settings → Store**; without one it shows a friendly
  "connect your store first" message, which is expected).

---

## How to STOP the app

Click each terminal window and press **Ctrl + C** (then close the window). That stops the servers.
Your data is saved in `Insytix-backend\data\` and will still be there next time.

---

## ▶️ Every time AFTER the first setup (the short version)

You do **NOT** repeat Step 0, 1, or 2 again. Just start the servers:

1. Terminal 1:
   ```powershell
   cd $HOME\Desktop\shopify-ingestion\Insytix-backend
   ```
   ```powershell
   npm run dev
   ```
2. Terminal 2:
   ```powershell
   cd $HOME\Desktop\shopify-ingestion\Insytix-frontend
   ```
   ```powershell
   npm run dev
   ```
3. Open **http://localhost:5173**

That's it.

> If the owner updates the code later, run `git pull` inside the `shopify-ingestion` folder, then
> run `npm install` once in **each** of the two sub-folders, then start the servers as above.

---

## Troubleshooting

**`node` or `npm` is "not recognized"** → Node.js isn't installed or the terminal was opened before
installing. Do Step 0, then **close and reopen the terminal**.

**`git` is "not recognized"** → Install Git (Step 0) and reopen the terminal. (Alternatively,
download the code as a ZIP from the GitHub page's green **Code → Download ZIP** button and unzip it
to the Desktop — then skip the `git clone` and use that folder.)

**The `&&` symbol causes an error** → Don't combine commands. Run each line separately.

**"Port 8080 (or 5173) is already in use"** → Another copy is already running, or another app uses
the port. Close the other terminal/app, or restart the PC, then try again.

**The website at localhost:5173 loads but shows errors / no data** → Make sure **Terminal 1
(backend)** is running and shows "running at http://localhost:8080". The frontend needs the backend
on. Start the backend first, then refresh the browser.

**An error mentioning `better-sqlite3` during `npm install`** → You're likely on an unusual Node
version. Install **Node.js LTS 20 or 22** (Step 0), then delete the `node_modules` folder in that
sub-folder and run `npm install` again. (Only as a last resort, if it asks for a compiler, install
Microsoft "Desktop development with C++" build tools — but with Node LTS this is normally not
needed.)

**`npm install` is slow or fails once** → It needs internet. Check the connection and run
`npm install` again in that folder.

**Nothing opens in the browser** → Type the address exactly: `http://localhost:5173` (not https).

---

### Summary for Claude
1. Install Node.js LTS + Git (once), reopen terminal.
2. `git clone` the repo to the Desktop.
3. In `Insytix-backend`: `npm install` → `npm run seed`. In `Insytix-frontend`: `npm install`.
4. Run `npm run dev` in each sub-folder (separate terminals), open http://localhost:5173, log in
   with `demo@insytix.app` / `demo12345`.
5. For later sessions, only step 4's `npm run dev` commands are needed.
