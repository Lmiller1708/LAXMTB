# LAXMTB Race Results & Start Lists Dashboard

Live race tracking and team coordination dashboard for local area mountain bike teams — La Crosse Central, La Crosse Logan, La Crosse Aquinas, La Crosse Composite, La Crescent, and Holmen.

## Features

### Race Day
- **Live Sync**: Automatically fetches data in real-time from the official RACE RESULT API.
- **Live Results**: Streams lap times and finish results as riders cross timing mats.
- **Wave & Staging Schedule**: Accurate wave times, staging grid call-ups, and pre-ride windows synced with the official race schedule.
- **Stage & Wave Notifications**: Real-time reminders for upcoming staging/race starts (30, 15, 5, or custom minutes) with subscriptions for categories, waves, or individual riders — delivered via browser notifications, audio chimes, and in-app toasts.
- **Wave & Category Filter**: Filter by Varsity, JV, Freshman, and Middle School divisions.
- **Instant Search**: Search by rider name, plate number, bib, or school.

### Coach Sign-Ups
- **Coach Sign-Ups Tab**: Dedicated tab for coaches to sign up as Ride Leaders (Level 2+ required) or Ride Support (L1–L3) for Pre-Rides and Race-Day Warm-ups.
- **Inline Editing**: Add and manage coach names directly in the UI — no native browser prompts.
- **Session Switcher**: Toggle between Pre-Rides and Warm-ups views.

### Admin Portal
- **In-App Coach Admin**: Manage all race data directly inside the app — no spreadsheet or external tool required.
- **Google Sign-In**: Access restricted to authorized coaches (authenticated via Google OAuth).
- **Editable Tabs**: Venue Info, Schedule, Race Info (Wave/Staging), Volunteers & Food, Photos Album, Course Maps, Venue Guidelines, and Manage Coaches.
- **Race Selector**: Switch between multiple races within the portal.

### UI & Accessibility
- **Mobile-First Responsive UI**: Compact navigation, locked brand typography, dark/light theme switching, and offline/online status monitoring.
- **Print & Venue Friendly**: Optimized for on-course viewing at the race venue and for clean physical printing.

## Live Website

Hosted via GitHub Pages:
https://Lmiller1708.github.io/LAXMTB/

## Tech Stack

- **Nuxt 3** + **Vue 3** + **TypeScript**
- **Vite** + **TailwindCSS**
- **Firebase** (Authentication & Firestore for admin data)
- **RACE RESULT API** (live timing data)
- Deployed via **GitHub Actions** → **GitHub Pages**

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

> Admin access requires a Google account authorized in the Firebase project. Contact the team admin to add new coaches.
