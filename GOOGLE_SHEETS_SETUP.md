# 📊 LAXMTB Google Sheets & Coach Admin Portal Guide

All season races are pre-configured into the master spreadsheet file: **`LAXMTB_Race_Data.xlsx`**.

Each race has its own dedicated tab formatted with **interactive tables**, date pickers, dropdown menus, and 5 standardized sections:

1. **`--- VENUE & GENERAL INFO ---` Table**
   - **`Venue Name`**: Primary park or venue name
   - **`Exact Trailhead`**: Specific trailhead/entrance
   - **`Address` / `City`**: Physical address
   - **`Date Range` / `Conference`**: Race weekend dates and conference (North/South/State)
   - **`Navigation Warning`**: Important venue-specific driving/parking directions
   - **`Google Maps URL` / `Apple Maps URL` / `Event Guide URL`**: External links
   - **`Race Result Event ID`**: 6-digit RaceResult.com event ID for live timing

2. **`--- SCHEDULE ---` Table**
   - **`Day`**: Dropdown (`Friday`, `Saturday`, `Sunday`, `Monday`)
   - **`Date`**: Formatted `Date` Field (`YYYY-MM-DD` or standard date)
   - **`Start Time`**: Start time (e.g. `8:00 AM`)
   - **`End Time`**: Optional End time (e.g. `4:00 PM` or leave blank for single-time events)
   - **`Activity Description`**: Free text activity details
   - **`Tag`**: Dropdown menu (`Pre-Ride`, `Racing`, `Team Event`, `Spectating`, `Team Ride`, `Venue`, `Awards`, `Other`)
   - **`Highlight Meal (Yes/No)`**: Dropdown (`Yes`, `No`) to highlight team breakfast/dinner

3. **`--- SIGNUP LINKS ---` Table**
   - **`Link Name`**: (`Volunteer Sheet`, `Team Dinner / Food`, `Coach Ride Leaders`)
   - **`URL / ID`**: SignUp.com invitation ID or full URL

4. **`--- ANNOUNCEMENTS & VENUE GUIDELINES ---` Table**
   - **`Guideline / Announcement Text`**: Bulleted team announcements, parking pass requirements, camping quiet hours, leashed pet policies.

5. **`--- WAVE & STAGING SCHEDULE ---` Table**
   - **`Category`**: Division name (e.g. `Varsity Boys`, `Freshman Girls`, etc.)
   - **`Wave`**: Wave number (`1`, `2`, `3`, etc.)
   - **`Staging Call-up Time`**: Staging grid call-up time (e.g. `9:45 AM`)
   - **`Wave Gun Start Time`**: Official race start time (e.g. `10:00 AM`)

---

## 🔒 Coach Admin Portal (In-App)

The LAXMTB app features a built-in **Coach Admin Portal** accessible directly from the app menu:

1. Tap **Menu (☰)** in the top navigation bar.
2. Tap **⚙️ Coach Admin**.
3. Enter the coach passcode: **`laxmtb2026`**.
4. Inside the portal:
   - **Live Sync Status**: View relative sync timestamps and live status indicators.
   - **🔄 Force Sync Now**: Instantly refresh the app with the latest Google Sheet data.
   - **✏️ Open in Google Sheets**: One-click deep link to open your Google Sheet for editing.
   - **Tabbed Overview**: Switch between tabs for *📍 Venue Info*, *⏱️ Waves & Staging*, *📅 Team Schedule*, *🔗 Links & Maps*, *📢 Guidelines*, and *⚙️ Config*.
   - **Config & Backup**: Change the active Google Sheet ID, download `events.json`, or copy the full season JSON configuration to your clipboard.

---

## 🚀 Quick Setup & Syncing

### Step 1: Open the Master Spreadsheet in Google Sheets
1. Go to [Google Drive](https://drive.google.com).
2. Drag and drop **`LAXMTB_Race_Data.xlsx`** into Google Drive.
3. Open with **Google Sheets** and choose **File > Save as Google Sheets**.
4. Click **Share** (top right) ➔ Set *General access* to **"Anyone with the link"** ➔ **"Viewer"**.
   *(Add coach emails as "Editor" so they can edit from their phones)*.
5. Copy your **Sheet ID** from the URL (between `/d/` and `/edit`):
   `https://docs.google.com/spreadsheets/d/`**`1vicChOhjglaieWpuJPHsN2LGAN8RA6kE0oDWt0OAPvM`**`/edit`

### Step 2: Set Sheet ID in the App or `events.json`
- In the **Coach Admin Portal** ➔ **Config Tab**, paste your Sheet ID and tap **Save**.
- Or update `events.json` in the GitHub repo with your Sheet ID.

