# 📊 LAXMTB Google Sheets Setup Guide

All 5 season races are pre-configured into the master spreadsheet file: **`LAXMTB_Race_Data.xlsx`**.

Each race has its own dedicated tab formatted with **interactive formatted tables**, date pickers, and convenient drop-down menus:

1. **`--- SCHEDULE ---` Table**
   - **`Day`**: Dropdown (`Friday`, `Saturday`, `Sunday`, `Monday`)
   - **`Date`**: Formatted `Date` Field (`YYYY-MM-DD` or standard date)
   - **`Start Time`**: Time field (e.g. `8:00 AM`)
   - **`End Time`**: Optional End Time field (e.g. `4:00 PM` or leave blank for single-time events)
   - **`Activity Description`**: Free text activity details
   - **`Tag`**: Dropdown menu (`Pre-Ride`, `Racing`, `Team Event`, `Spectating`, `Team Ride`, `Venue`, `Awards`, `Meeting`, `Other`)
   - **`Highlight Meal (Yes/No)`**: Dropdown (`Yes`, `No`)
2. **`--- SIGNUP LINKS ---` Table**
   - **`Link Name`**: Dropdown suggestions (`Volunteer Sheet`, `Team Dinner / Food`, `Coach Ride Leaders`, `Course Map Embed`, etc.)
   - **`URL`**: Direct web link
3. **`--- ANNOUNCEMENTS & VENUE GUIDELINES ---` Table**
   - **`Guideline / Announcement Text`**: Bulleted team announcements, parking notes, camping rules, etc.

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
Commit and push to `dev`!

---

## 📱 How Coaches Edit on Race Weekend

1. Any coach or coordinator with Editor access can open the Google Sheet on their phone (Google Sheets app for iOS or Android) or computer.
2. Tap the tab for the race (e.g. **Bluff Bash**).
3. Easily select values using the built-in dropdowns:
   - **Days & Tags**: Tap to pick from the curated list.
   - **Start & End Times**: Enter times clearly without messy hyphenated strings.
   - **Highlight Meals**: Select `Yes` or `No` from the drop-down.
4. Done! When team families open or refresh the LAXMTB app, the updates appear live.
