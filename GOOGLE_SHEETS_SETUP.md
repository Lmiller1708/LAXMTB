# 📊 LAXMTB Google Sheets Setup Guide

This guide explains how to connect a Google Sheet so coaches and volunteer coordinators can update race schedules, SignUp.com links, and announcements directly from their phones or laptops.

---

## 🚀 3-Minute Quick Setup

### Step 1: Create Your Google Sheet
1. Open [Google Sheets](https://sheets.new) in your web browser.
2. Name the sheet: **`LAXMTB Race Data`**.
3. Create 3 tabs at the bottom with these exact names:
   - **`Schedule`**
   - **`Links`**
   - **`Announcements`**

### Step 2: Import the Templates
You can either copy-paste the columns or import the CSVs from the `templates/` folder:
- **`Schedule`** tab headers:
  `Race | Day | Date | Time | Activity Description | Tag | Highlight Meal`
- **`Links`** tab headers:
  `Race | Volunteer SignUp URL | Team Dinner SignUp URL | Hospitality SignUp URL | Course Map Embed URL`
- **`Announcements`** tab headers:
  `Race | Announcement Text`

*(Check the pre-filled templates in the `templates/` folder for exact examples!)*

### Step 3: Make the Sheet Publicly Readable
1. Click the green **Share** button in the top right.
2. Under *General access*, change it to: **"Anyone with the link"** ➔ **"Viewer"**.
3. Copy the URL from your browser address bar. It looks like:
   `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
4. The **Sheet ID** is the long string of letters and numbers between `/d/` and `/edit`.
   In the example above, the ID is: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`.

### Step 4: Add the Sheet ID to `events.json`
Open `events.json` in this repository and paste your Sheet ID at the top:
```json
{
  "googleSheetId": "YOUR_SHEET_ID_HERE",
  "races": [ ... ]
}
```
Commit and push to GitHub!

---

## 📱 How Coaches Edit on Race Weekend

1. Any coach or coordinator with **Editor** access on the Google Sheet can open it on the **Google Sheets mobile app (iOS / Android)**.
2. If pre-ride times change, a team breakfast is moved, or a new SignUp.com volunteer link opens:
   - Just edit the cell in Google Sheets!
3. The LAXMTB web app automatically fetches the latest data when team families view or refresh the page.
4. If cellular signal in the park is weak, the app seamlessly uses the local offline cache.
