# 📊 LAXMTB Google Sheets Setup Guide

All 5 season races are pre-configured into the master spreadsheet file: **`LAXMTB_Race_Data.xlsx`**.

Each race has its own dedicated tab with 3 clear sections:
1. **`--- SCHEDULE ---`**
2. **`--- SIGNUP LINKS ---`**
3. **`--- ANNOUNCEMENTS & VENUE GUIDELINES ---`**

---

## 🚀 2-Step Quick Setup

### Step 1: Open the Master Spreadsheet in Google Sheets
1. Go to [Google Drive](https://drive.google.com).
2. Drag and drop **`LAXMTB_Race_Data.xlsx`** (located in the root of this repo) into Google Drive.
3. Double-click to open it with **Google Sheets**.
4. In Google Sheets, click **File > Save as Google Sheets**.
5. Click the green **Share** button in the top right:
   - Change *General access* to: **"Anyone with the link"** ➔ **"Viewer"**.
   - (To allow other coaches/coordinators to edit, add their emails as **"Editor"**).
6. Copy the URL from your browser address bar:
   `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`**`/edit`
   The bold part between `/d/` and `/edit` is your **Sheet ID**.

### Step 2: Paste the Sheet ID into `events.json`
Open `events.json` in this repository and put your Sheet ID at the top:
```json
[
  {
    "googleSheetId": "PASTE_YOUR_SHEET_ID_HERE",
    "id": "bluff-bash",
    ...
  }
]
```
Commit and push to `main`!

---

## 📱 How Coaches Edit on Race Weekend

1. Any coach or coordinator with Editor access can open the Google Sheet on their phone (Google Sheets app for iOS or Android).
2. Tap the tab for the race (e.g. **Bluff Bash**).
3. Update any row under:
   - **`--- SCHEDULE ---`** (Times, pre-rides, team meals)
   - **`--- SIGNUP LINKS ---`** (Volunteer links, food donations)
   - **`--- ANNOUNCEMENTS & VENUE GUIDELINES ---`** (Pit area notes, camping rules)
4. Done! When team families open or refresh the LAXMTB app, the updates appear live.
