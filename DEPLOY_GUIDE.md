# Deploy Guide: Morocco & Portugal Trip Planner

This guide walks you through getting your trip planner online with a real shareable URL. Total time: about 15 to 20 minutes.

You'll do four things:
1. Create a Firebase project (the shared database)
2. Create a GitHub account if you don't have one (where the code lives)
3. Deploy to Vercel (the hosting)
4. Send the link to Kristy and Tirzah

Cost: $0. Both Firebase Spark and Vercel Hobby are free with no credit card required for what you need.

---

## Step 1: Create a Firebase project (about 5 min)

1. Go to https://console.firebase.google.com and sign in with your Google account.
2. Click **"Add project"** or **"Create a project"**.
3. Project name: `morocco-portugal-2026` (or whatever you want). Click Continue.
4. Google Analytics: turn it OFF. You don't need it. Click Create project.
5. Wait about 30 seconds, then click Continue.

You're now on your project dashboard.

### 1a. Set up the database

1. In the left sidebar, click **Build** → **Firestore Database**.
2. Click **Create database**.
3. Pick a location closest to you (e.g., `us-west1` for California). Click Next.
4. Choose **"Start in test mode"** for now. Click Create.

Wait about 30 seconds for it to provision.

### 1b. Get your config keys

1. Click the **gear icon** at the top left next to "Project Overview" → **Project settings**.
2. Scroll down to **"Your apps"** section.
3. Click the **web icon** `</>` to register a web app.
4. App nickname: `morocco-portugal`. Don't check "Firebase Hosting." Click Register app.
5. You'll see a code block with `firebaseConfig = { ... }`. **Keep this tab open** — you'll copy these values in Step 3.

It will look like:
```
const firebaseConfig = {
  apiKey: "AIzaSyA1b2c3...",
  authDomain: "morocco-portugal-2026.firebaseapp.com",
  projectId: "morocco-portugal-2026",
  storageBucket: "morocco-portugal-2026.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

### 1c. Set the security rules (so anyone with the link can read/write)

1. Back in the Firebase console, go to **Firestore Database** → **Rules** tab.
2. Replace the contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /trips/morocco-portugal-2026 {
      allow read, write: if true;
    }
  }
}
```

3. Click **Publish**.

This locks down access to ONLY your one trip document. Anyone with the URL can edit, but they can't read or write anything else in your database.

---

## Step 2: Get the code on GitHub (about 5 min)

If you've never used GitHub, the easiest path is the web-based version:

1. Go to https://github.com and sign up (or sign in).
2. Click the **+** in the top right → **New repository**.
3. Name: `morocco-portugal-2026`. Set to **Public** (Vercel free tier requires public repos).
4. Don't add a README, .gitignore, or license — leave all checkboxes empty.
5. Click **Create repository**.
6. On the next page, click **"uploading an existing file"** in the "...or push an existing repository" section. Or use this direct link pattern: `https://github.com/YOUR_USERNAME/morocco-portugal-2026/upload`.
7. Drag and drop ALL the files from the project folder I gave you (the whole `trip-planner-deploy` folder contents — `package.json`, `vite.config.js`, the `src` folder, etc.).
8. Scroll to the bottom and click **Commit changes**.

---

## Step 3: Add your Firebase keys to the code

Before deploying, you need to put your Firebase keys into `src/firebase.js`.

1. In your GitHub repo, click on `src/firebase.js`.
2. Click the **pencil icon** to edit.
3. Find the `firebaseConfig` block and replace each `PASTE_YOUR_..._HERE` with the actual values from Step 1b.

For example, change:
```
apiKey: "PASTE_YOUR_API_KEY_HERE",
```
to:
```
apiKey: "AIzaSyA1b2c3...",
```

4. Scroll down and click **Commit changes**.

**Note:** These keys are safe to be public. Firebase API keys are designed to be exposed in client code — security is enforced by the Firestore rules you set in step 1c, not by hiding the key.

---

## Step 4: Deploy to Vercel (about 5 min)

1. Go to https://vercel.com and click **Sign Up**.
2. Choose **"Continue with GitHub"** — this connects your accounts automatically.
3. Once signed in, click **Add New** → **Project**.
4. Find your `morocco-portugal-2026` repository in the list and click **Import**.
5. On the configure screen, leave everything as default. Vercel auto-detects it's a Vite + React project.
6. Click **Deploy**.

Wait about 60 seconds. You'll see build logs scroll by.

When it's done, you'll see a celebration screen with a URL like:
```
https://morocco-portugal-2026.vercel.app
```

**That's your link.** Click it to open the planner. Bookmark it.

---

## Step 5: Send to Kristy and Tirzah

Just text them the URL:

> Hey, here's our trip planner: https://morocco-portugal-2026.vercel.app
> No login needed. Bookmark it on your phone home screen. Anything you add updates live for all of us.

That's it. They open the link, no signup, no login.

### To save to phone home screen

**iPhone:** Open in Safari → Share button → Add to Home Screen.
**Android:** Open in Chrome → three-dot menu → Add to Home Screen.

It'll behave like a native app.

---

## What if something breaks?

**The page is blank or shows an error:**
- Most likely your Firebase keys aren't right. Go back to GitHub → `src/firebase.js` and double-check each value matches the Firebase console exactly. After editing, Vercel auto-redeploys in about 30 seconds.

**"Permission denied" errors:**
- Your Firestore rules aren't published. Go back to Step 1c and make sure you clicked Publish.

**Edits aren't syncing between phones:**
- Hard-refresh both devices. If still not working, check the browser console (Safari: Settings → Advanced → Web Inspector) for errors.

**The Firebase test mode warning expires after 30 days.**
- After 30 days, the "test mode" rules expire. The custom rules from Step 1c override this and have no expiration, so as long as you completed Step 1c you're fine forever.

---

## Want a custom domain?

Optional. About $12/year at Cloudflare or Namecheap. Buy a domain like `turnertrip.com`, then in Vercel go to your project → Settings → Domains → Add. Vercel walks you through DNS setup.

---

## What about photos?

The planner stores image URLs, not the photos themselves. The recommended workflow:
- Each family creates a shared album in Google Photos or iCloud
- Paste the album URL into the Photos tab → "Add album link"
- For one-off shots, paste a direct image URL into the photo wall

This keeps your originals at full resolution in your photo app while still letting everyone browse together.

---

## Maintaining it

You don't need to do anything. Vercel and Firebase keep running. The free tiers don't expire.

Two things to be aware of:
- **Firebase free tier:** 50,000 reads/day, 20,000 writes/day. Three families using this won't come close.
- **Vercel free tier:** 100 GB bandwidth/month. You won't come close.

If Firebase ever shows the "test mode expired" banner, ignore it — your custom rules from Step 1c are what's actually controlling access.

---

Done. You've now got a real shared family planner online.
