<script setup lang="ts">
import { ref } from 'vue'
import { useSiteMedia } from '~/modules/core/composables/useSiteMedia'
import { useCoachAuth } from '~/modules/coach-admin/composables/useCoachAuth'
import EditPhotoModal from './EditPhotoModal.vue'

const emit = defineEmits<{
  (e: 'navigate', route: 'race' | 'practice' | 'about' | 'home'): void
  (e: 'openAuth', mode?: 'login' | 'signup'): void
  (e: 'toast', msg: string): void
}>()

const { media, updateMediaItem } = useSiteMedia()
const { isCoachAuth, canViewPhotos } = useCoachAuth()

const isEditPhotoOpen = ref(false)
const isEditDriveOpen = ref(false)
const driveInputUrl = ref('')

const openDriveEditor = () => {
  driveInputUrl.value = media.value.practiceDriveUrl || ''
  isEditDriveOpen.value = true
}

const saveDriveUrl = async () => {
  if (driveInputUrl.value) {
    await updateMediaItem('practiceDriveUrl', driveInputUrl.value.trim())
    emit('toast', '✅ Google Drive photo link updated')
    isEditDriveOpen.value = false
  }
}

const activeLocation = ref('upper-hixon')

const locations = [
  {
    id: 'upper-hixon',
    name: 'Upper Hixon Forest',
    address: 'Rotary Reserve / 2500 Coulee Dr, La Crosse, WI',
    type: 'Singletrack Flow & Tech',
    highlights: 'Blufftop flow trails, berms, tabletop rollers, and technical limestone switchbacks.',
    badge: 'Primary Location'
  },
  {
    id: 'lower-hixon',
    name: 'Lower Hixon Forest',
    address: 'Milson Park / 2799 Bluff Pass, La Crosse, WI',
    type: 'Classic Forest Singletrack',
    highlights: 'Rooty ascents, tight wooded switchbacks, punchy climbs, and rugged Coulee terrain.',
    badge: 'Tech & Climbing'
  },
  {
    id: 'trail-farm',
    name: 'Community Trail Farm (CTF)',
    address: 'W5723 HWY 33, La Crosse, WI (Town of Shelby)',
    type: 'Shared-Use Trails & Skills Hub',
    highlights: '~300 acres of scenic coulee terrain featuring a 1-mile all-weather loop, 3.5 miles of shared-use singletrack, stone-step bluff trail, and 6 miles of farm roads. Note: Public parking at Pammel Creek Park with bike-in bridge access.',
    badge: 'ORA Community Hub'
  },
  {
    id: 'chad-erickson',
    name: 'Chad Erickson Memorial Park',
    address: '3601 S 28th St, La Crosse, WI',
    type: 'Skills Area & Beginner Loops',
    highlights: 'Expansive grassy field for cornering cones, braking drills, and gentle perimeter singletrack.',
    badge: 'Skills & Drills'
  },
  {
    id: 'lueth-park',
    name: 'Lueth Park & Pump Track',
    address: '1400 Loomis St, La Crosse, WI',
    type: 'Asphalt Pump Track & Dirt Features',
    highlights: 'Pumping without pedaling, roller rhythm, berm pressure, and dynamic bike body separation.',
    badge: 'Bike Handling'
  }
]

const steps = [
  {
    number: '01',
    title: 'Check-In & ABC Quick Check',
    duration: '10 Mins',
    desc: 'Coaches inspect every bike before wheels roll: Air (tire pressure), Brakes (lever bite & pad wear), Chain/Crank (lube & clean shift), and Quick Releases/Thru-axles.'
  },
  {
    number: '02',
    title: 'Dynamic Warm-Up & Skill Clinic',
    duration: '25 Mins',
    desc: 'Coaches introduce and practice core NICA skills: neutral vs. ready position, dynamic cornering, brake modulation, ratcheting pedals, rock roll-downs, and switchbacks.'
  },
  {
    number: '03',
    title: 'Tiered Trail Riding Pods',
    duration: '60–75 Mins',
    desc: 'Athletes split into ability and endurance pods. Every group is led by a licensed Lead Coach and accompanied by a Sweep Coach. Strict "No Rider Left Behind" rule.'
  },
  {
    number: '04',
    title: 'Wrap-Up & High Fives',
    duration: '10 Mins',
    desc: 'Reconvene at trailhead, celebrate rider accomplishments, hydrate, share trail stories, and announce upcoming weekend races and team activities.'
  }
]

const gearList = [
  { item: 'Mountain Bike', required: true, note: 'Properly sized, knobby tires, functional front and rear hand brakes' },
  { item: 'CPSC-Certified Helmet', required: true, note: 'Mandatory at all times when straddling or riding the bicycle' },
  { item: 'Water Bottle or Hydration Pack', required: true, note: 'Minimum 20–24 oz (cold water or electrolyte mix)' },
  { item: 'Spare Inner Tube', required: true, note: 'Must match athlete\'s wheel size (24", 26", 27.5", or 29")' },
  { item: 'Closed-Toe Athletic Shoes', required: true, note: 'Sturdy flat sneakers or MTB shoes (no sandals or open shoes)' },
  { item: 'Eye Protection (Sunglasses or Clear)', required: false, note: 'Protects eyes from flying gravel, dust, and low branches' },
  { item: 'Full-Finger Cycling Gloves', required: false, note: 'Improves handlebar grip and protects hands on the trail' },
  { item: 'Weather Layers / Windbreaker', required: false, note: 'Essential for chilly fall evenings on the bluffs' }
]

const openEmail = () => {
  if (typeof window !== 'undefined') {
    window.location.href = 'mailto:lacrossemtb@gmail.com?subject=Practice%20Inquiry%20-%20LAX%20MTB%20Head%20Coach'
  }
}
</script>

<template>
  <div class="practice-page-root">
    <!-- Header Hero -->
    <section class="practice-hero">
      <div class="practice-hero-bg" />
      <div class="practice-hero-content">
        <div class="practice-badge">
          <span>🚵 WEEKLY TEAM SESSIONS • JULY THROUGH OCTOBER</span>
        </div>
        <h1 class="practice-title">
          PRACTICE & <span class="text-accent-gradient">TRAIL SESSIONS</span>
        </h1>
        <p class="practice-subtext">
          Where skills are forged, fitness is built, and friendships grow. Our team practices locally across the Coulee Region's premier trail networks under the guidance of licensed, background-checked volunteer coaches.
        </p>

        <div class="practice-quick-chips">
          <div class="quick-chip">
            <span class="chip-icon">📅</span>
            <div>
              <strong>Season Cadence</strong>
              <span>July – Late October</span>
            </div>
          </div>
          <div class="quick-chip">
            <span class="chip-icon">⏰</span>
            <div>
              <strong>Days & Times</strong>
              <span>Tue & Thu (5:30 – 6:30 PM)</span>
            </div>
          </div>
          <div class="quick-chip">
            <span class="chip-icon">🌲</span>
            <div>
              <strong>Trail Stewardship</strong>
              <span>Never ride muddy trails</span>
            </div>
          </div>
          <div class="quick-chip">
            <span class="chip-icon">🤝</span>
            <div>
              <strong>Coaching Standard</strong>
              <span>Lead & Sweep on every pod</span>
            </div>
          </div>
        </div>

        <div class="practice-action-buttons">
          <button class="btn-primary-hero" @click="emit('navigate', 'race')">
            <span class="btn-icon-box red">🏁</span>
            <span class="btn-label">Explore Race Central</span>
          </button>
          <button class="btn-primary-hero" @click="emit('navigate', 'about')">
            <span class="btn-icon-box red">👥</span>
            <span class="btn-label">About Us</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Coaches in Action Photo Showcase -->
    <section class="coaches-banner-section">
      <div class="coaches-photo-card">
        <button
          v-if="isCoachAuth"
          type="button"
          class="btn-change-photo-overlay"
          title="Admin: Change Coaches Photo"
          @click="isEditPhotoOpen = true"
        >
          📷 Change Photo
        </button>

        <img
          :src="media.coachesPhoto || '/images/coaches-2026.jpg'"
          alt="LAX MTB Volunteer Coaches"
          class="coaches-img"
          loading="eager"
        />
        <div class="coaches-caption">
          <span class="coaches-tag">VOLUNTEER COACHING STAFF</span>
          <span class="coaches-headline">Dedicated, Certified & Passionate Mentors</span>
          <p class="coaches-desc">
            All coaches complete NICA background checks, CPR & first aid certification, concussion management, and on-the-bike skills clinics to guarantee a safe, welcoming, and empowering environment.
          </p>
        </div>
      </div>

      <!-- Admin Photo Editor Modal -->
      <EditPhotoModal
        :is-open="isEditPhotoOpen"
        photo-key="coachesPhoto"
        photo-label="Coaches Photo (Practice Page)"
        @close="isEditPhotoOpen = false"
        @toast="(msg) => emit('toast', msg)"
      />
    </section>

    <!-- What Happens at Practice (Timeline) -->
    <section class="timeline-section">
      <div class="section-title-wrap">
        <span class="section-tag">PRACTICE STRUCTURE</span>
        <h2>How An Evening Practice Works</h2>
        <p>A typical 2-hour practice combines bike safety, structured skill clinics, and matched trail rides.</p>
      </div>

      <div class="practice-steps-grid">
        <div v-for="step in steps" :key="step.number" class="step-card">
          <div class="step-top">
            <span class="step-num">{{ step.number }}</span>
            <span class="step-duration">{{ step.duration }}</span>
          </div>
          <h3>{{ step.title }}</h3>
          <p>{{ step.desc }}</p>
        </div>
      </div>
    </section>

    <!-- Ability Pods Breakdown -->
    <section class="pods-section">
      <div class="section-title-wrap">
        <span class="section-tag">ALL ABILITY LEVELS</span>
        <h2>Rider Ability & Pace Pods</h2>
        <p>We believe every rider flourishes best when riding with peers at their comfortable pace and skill level.</p>
      </div>

      <div class="pods-grid">
        <div class="pod-card green">
          <div class="pod-header">
            <span class="pod-indicator">🟢</span>
            <div>
              <h3>Sprouts & Skill Builders</h3>
              <span class="pod-level">Beginner / Fundamentals</span>
            </div>
          </div>
          <p class="pod-desc">
            Focused on mastering trail fundamentals: balance, gear selection, proper braking, and learning how to love riding singletrack.
          </p>
          <ul class="pod-points">
            <li>Comfortable pacing with frequent rest stops</li>
            <li>Focus on trail flow, momentum, and obstacle confidence</li>
            <li>No pressure, zero intimidation</li>
          </ul>
        </div>

        <div class="pod-card yellow">
          <div class="pod-header">
            <span class="pod-indicator">🟡</span>
            <div>
              <h3>Trail Explorers</h3>
              <span class="pod-level">Intermediate / Endurance</span>
            </div>
          </div>
          <p class="pod-desc">
            Riders comfortable on singletrack who want to build stamina, tackle steeper Coulee climbs, and conquer rockier terrain.
          </p>
          <ul class="pod-points">
            <li>Moderate sustained aerobic pace</li>
            <li>Rolling drops, root ladders, and switchback ascents</li>
            <li>Longer trail loops across Upper and Lower Hixon</li>
          </ul>
        </div>

        <div class="pod-card red">
          <div class="pod-header">
            <span class="pod-indicator">🔴</span>
            <div>
              <h3>Race Pace & Shredders</h3>
              <span class="pod-level">Advanced / High Intensity</span>
            </div>
          </div>
          <p class="pod-desc">
            Experienced riders and racers training at race-pace speeds with intense interval climbs, technical lines, and race prep.
          </p>
          <ul class="pod-points">
            <li>High aerobic tempo and continuous pace</li>
            <li>Advanced line choice on technical descents</li>
            <li>Simulated race passing drills and starts</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Rotating Practice Locations -->
    <section class="locations-section">
      <div class="section-title-wrap">
        <span class="section-tag">WHERE WE RIDE</span>
        <h2>Coulee Region Trail Networks</h2>
        <p>Our team rotates practice locations to expose athletes to diverse trail types, elevation profiles, and terrain.</p>
      </div>

      <div class="locations-grid">
        <div
          v-for="loc in locations"
          :key="loc.id"
          class="location-card"
          :class="{ active: activeLocation === loc.id }"
          @click="activeLocation = loc.id"
        >
          <div class="location-top">
            <span class="location-badge">{{ loc.badge }}</span>
            <span class="location-type">{{ loc.type }}</span>
          </div>
          <h3 class="location-name">{{ loc.name }}</h3>
          <div class="location-address">📍 {{ loc.address }}</div>
          <p class="location-highlights">{{ loc.highlights }}</p>
        </div>
      </div>
    </section>

    <!-- What to Bring Checklist -->
    <section class="gear-section">
      <div class="gear-card-wrapper">
        <div class="section-title-wrap left">
          <span class="section-tag">RIDER PREPARATION</span>
          <h2>What Every Rider Must Bring</h2>
          <p>Please arrive 10 minutes early dressed and ready to roll with your bike and required safety gear.</p>
        </div>

        <div class="gear-table">
          <div v-for="gear in gearList" :key="gear.item" class="gear-row">
            <div class="gear-item-col">
              <span class="check-icon">✓</span>
              <div>
                <div class="gear-title">
                  {{ gear.item }}
                  <span v-if="gear.required" class="required-badge">Required</span>
                  <span v-else class="recommended-badge">Recommended</span>
                </div>
                <div class="gear-note">{{ gear.note }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Trail Stewardship & Weather Policy -->
    <section class="policy-section">
      <div class="policy-card">
        <div class="policy-icon-col">
          <span>🌧️</span>
        </div>
        <div class="policy-content-col">
          <span class="policy-tag">TRAIL CARE & WEATHER CANCELLATION</span>
          <h3>Our Commitment to Trail Stewardship</h3>
          <p>
            As a proud program of <strong>ORA Trails</strong>, our team takes immense pride in protecting local trails.
            <strong>We NEVER ride muddy or fragile trails.</strong> If it rains or trail conditions are soft, practice will either be relocated to gravel paths/pump track or cancelled.
          </p>
          <p class="policy-sub">
            ⚡ <strong>Severe Weather Protocol:</strong> If lightning occurs within 10 miles or active storm warnings are issued, practice will be cancelled. Announcements will be posted in team notifications and emailed 1–2 hours in advance.
          </p>
        </div>
      </div>
    </section>

    <!-- Practice Photos on Google Drive -->
    <section class="drive-photos-section">
      <div class="drive-card">
        <div class="drive-icon-col">📷</div>
        <div class="drive-content-col">
          <span class="drive-tag">TEAM PHOTO GALLERY</span>
          <h2>Practice & Trail Photos</h2>
          <p>
            Capturing rider progression, skills clinics, and trail sessions throughout the season! All team practice photos are shared in our Google Drive folder for parents and athletes to view, download, and contribute.
          </p>
          <div class="drive-action-row">
            <a
              v-if="canViewPhotos"
              :href="media.practiceDriveUrl || 'https://drive.google.com'"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-drive-link"
            >
              <span>📁 Open Practice Photos on Google Drive</span>
              <span class="external-arrow">↗</span>
            </a>
            <button
              v-else
              type="button"
              class="btn-drive-link"
              style="cursor: pointer;"
              title="Guardian access required to view practice photos"
              @click="emit('openAuth', 'login')"
            >
              <span>🔒 Log In to Access Photos</span>
              <span class="external-arrow">↗</span>
            </button>
            <button
              v-if="isCoachAuth"
              type="button"
              class="btn-edit-drive"
              title="Admin: Change Google Drive Link"
              @click="openDriveEditor"
            >
              ⚙️ Change Drive Link
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Drive Link Editor Modal for Admin -->
      <div v-if="isEditDriveOpen" class="modal-backdrop" @click.self="isEditDriveOpen = false">
        <div class="modal-dialog">
          <div class="modal-header">
            <div class="modal-title-row">
              <span class="modal-icon">📁</span>
              <div>
                <h3>Update Google Drive Link</h3>
                <span class="modal-sub">Practice Photos Folder</span>
              </div>
            </div>
            <button class="btn-close" @click="isEditDriveOpen = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Google Drive Folder URL</label>
              <input
                v-model="driveInputUrl"
                type="url"
                class="form-input"
                placeholder="https://drive.google.com/drive/folders/..."
              />
              <span class="form-hint">Paste your public or team-shared Google Drive folder link</span>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-cancel" @click="isEditDriveOpen = false">Cancel</button>
            <button type="button" class="btn-save" @click="saveDriveUrl">Save Link</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Join Coaching Staff CTA -->
    <section class="coach-volunteer-section">
      <div class="volunteer-box">
        <h2>Want To Ride Along Or Coach?</h2>
        <p>
          We are always looking for volunteer coaches and parent ride leaders! NICA provides online training, on-the-bike skills instruction, and background checks. No mountain bike racing experience is necessary.
        </p>
        <button class="btn-volunteer" @click="openEmail">
          <span>✉️ lacrossemtb@gmail.com</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.practice-page-root {
  max-width: 1220px;
  margin: 0 auto;
  padding: 0 16px 40px;
}

/* Hero */
.practice-hero {
  position: relative;
  padding: 44px 20px 36px;
  margin: 16px 0 24px;
  border-radius: 20px;
  background: radial-gradient(circle at top right, rgba(239, 68, 68, 0.16), transparent 60%),
              linear-gradient(180deg, var(--bg-card) 0%, var(--bg-body) 100%);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
  text-align: center;
}

.practice-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 9999px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--accent-red);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.practice-title {
  font-family: 'Teko', sans-serif;
  font-size: clamp(36px, 6.5vw, 64px);
  line-height: 0.95;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text-main);
  text-transform: uppercase;
  margin-bottom: 16px;
}

.text-accent-gradient {
  background: linear-gradient(90deg, #ef4444 0%, #f87171 60%, #fca5a5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.practice-subtext {
  max-width: 760px;
  margin: 0 auto 28px;
  font-size: clamp(14px, 2.5vw, 16px);
  line-height: 1.6;
  color: var(--text-muted);
}

.practice-quick-chips {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  max-width: 900px;
  margin: 0 auto 28px;
  text-align: left;
}

.quick-chip {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.chip-icon {
  font-size: 24px;
}

.quick-chip strong {
  display: block;
  font-size: 12.5px;
  color: var(--text-main);
}

.quick-chip span {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 1px;
}

.practice-action-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-primary-hero,
.btn-secondary-hero {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-card);
  color: var(--text-main);
  border: 1px solid rgba(239, 68, 68, 0.45);
  border-radius: 12px;
  padding: 10px 20px;
  font-size: 14.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  transition: all 0.2s ease;
}
.btn-primary-hero:hover,
.btn-secondary-hero:hover {
  background: rgba(239, 68, 68, 0.14);
  border-color: var(--accent-red);
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.3);
}
.btn-primary-hero:active,
.btn-secondary-hero:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
}

.practice-action-buttons .btn-icon-box,
.btn-icon-box.red {
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ffffff;
}

.btn-primary-hero:hover .btn-icon-box,
.btn-secondary-hero:hover .btn-icon-box {
  background: rgba(239, 68, 68, 0.24);
  border-color: rgba(239, 68, 68, 0.55);
}

.btn-icon-box {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ffffff;
  flex-shrink: 0;
}

.btn-label {
  display: inline-block;
  white-space: nowrap;
}

/* Coaches Banner */
.coaches-banner-section {
  margin: 20px 0 40px;
}

.coaches-photo-card {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
  background: #000000;
}

.coaches-img {
  width: 100%;
  height: clamp(220px, 38vw, 480px);
  object-fit: cover;
  object-position: center 15%;
  display: block;
  filter: brightness(0.92);
}

.btn-change-photo-overlay {
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(13, 13, 13, 0.85);
  border: 1px solid var(--accent-red);
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  z-index: 10;
  backdrop-filter: blur(6px);
  transition: all 0.15s ease;
}
.btn-change-photo-overlay:hover {
  background: var(--accent-red);
  color: #ffffff;
  transform: scale(1.05);
}

.coaches-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.5) 65%, transparent 100%);
  padding: 24px 20px 18px;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.coaches-tag {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #ef4444;
  text-transform: uppercase;
}

.coaches-headline {
  font-family: 'Teko', sans-serif;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.5px;
}

.coaches-desc {
  max-width: 800px;
  font-size: 12.5px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.85);
}

/* Section Shared */
.timeline-section,
.pods-section,
.locations-section,
.gear-section,
.policy-section,
.coach-volunteer-section {
  margin-bottom: 48px;
}

.section-title-wrap {
  text-align: center;
  max-width: 700px;
  margin: 0 auto 30px;
}

.section-title-wrap.left {
  text-align: left;
  margin: 0 0 24px;
}

.section-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--accent-red);
  text-transform: uppercase;
  margin-bottom: 6px;
}

.section-title-wrap h2 {
  font-family: 'Teko', sans-serif;
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1;
  color: var(--text-main);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.section-title-wrap p {
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--text-muted);
}

/* Steps Grid */
.practice-steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 16px;
}

.step-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 22px 18px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.step-card:hover {
  transform: translateY(-3px);
  border-color: var(--border-strong);
}

.step-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.step-num {
  font-family: 'Teko', sans-serif;
  font-size: 32px;
  font-weight: 700;
  color: var(--accent-red);
  line-height: 1;
}

.step-duration {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 9999px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.step-card h3 {
  font-family: 'Teko', sans-serif;
  font-size: 22px;
  letter-spacing: 0.5px;
  color: var(--text-main);
  margin-bottom: 8px;
}

.step-card p {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--text-muted);
}

/* Ability Pods */
.pods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
}

.pod-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
}

.pod-card.green { border-top: 4px solid #10b981; }
.pod-card.yellow { border-top: 4px solid #f59e0b; }
.pod-card.red { border-top: 4px solid #ef4444; }

.pod-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.pod-indicator {
  font-size: 24px;
}

.pod-header h3 {
  font-family: 'Teko', sans-serif;
  font-size: 24px;
  line-height: 1.1;
  color: var(--text-main);
}

.pod-level {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
}

.pod-desc {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.pod-points {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text-main);
}

.pod-points li {
  position: relative;
  padding-left: 16px;
}

.pod-points li::before {
  content: '•';
  position: absolute;
  left: 4px;
  color: var(--accent-red);
  font-weight: 900;
}

/* Locations */
.locations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.location-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.location-card:hover,
.location-card.active {
  border-color: var(--accent-red);
  transform: translateY(-2px);
}

.location-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.location-badge {
  font-size: 10.5px;
  font-weight: 800;
  color: var(--accent-red);
  text-transform: uppercase;
}

.location-type {
  font-size: 10.5px;
  color: var(--text-muted);
}

.location-name {
  font-family: 'Teko', sans-serif;
  font-size: 22px;
  color: var(--text-main);
  margin-bottom: 4px;
}

.location-address {
  font-size: 11.5px;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.location-highlights {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted);
}

/* Gear Checklist */
.gear-card-wrapper {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 30px 24px;
}

.gear-table {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gear-row {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 16px;
}

.gear-item-col {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.check-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
  margin-top: 1px;
}

.gear-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.required-badge {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  background: rgba(239, 68, 68, 0.15);
  color: var(--accent-red);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.recommended-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.gear-note {
  font-size: 12.5px;
  color: var(--text-muted);
  margin-top: 3px;
}

/* Policy Section */
.policy-card {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-card) 100%);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 18px;
  padding: 28px 24px;
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.policy-icon-col {
  font-size: 36px;
  line-height: 1;
}

.policy-tag {
  font-size: 11px;
  font-weight: 800;
  color: var(--accent-red);
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.policy-content-col h3 {
  font-family: 'Teko', sans-serif;
  font-size: 26px;
  color: var(--text-main);
  margin: 4px 0 8px;
}

.policy-content-col p {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.policy-sub {
  margin-top: 10px;
  font-size: 13px !important;
}

/* Volunteer CTA */
.volunteer-box {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 32px 24px;
  text-align: center;
}

.volunteer-box h2 {
  font-family: 'Teko', sans-serif;
  font-size: 32px;
  color: var(--text-main);
  margin-bottom: 8px;
}

.volunteer-box p {
  max-width: 680px;
  margin: 0 auto 20px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-muted);
}

.btn-volunteer {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-red);
  color: #ffffff;
  border: none;
  padding: 13px 26px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
  transition: all 0.2s ease;
}
.btn-volunteer:hover {
  background: var(--accent-red-hover);
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.45);
}

/* Google Drive Practice Photos Section */
.drive-photos-section {
  margin-bottom: 48px;
}

.drive-card {
  background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 70%),
              linear-gradient(180deg, var(--bg-card) 0%, var(--bg-body) 100%);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 32px 28px;
  box-shadow: var(--shadow-card);
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.drive-icon-col {
  font-size: 40px;
  line-height: 1;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 16px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.drive-content-col {
  flex: 1;
}

.drive-tag {
  font-size: 11px;
  font-weight: 800;
  color: #3b82f6;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  display: inline-block;
  margin-bottom: 4px;
}

.drive-content-col h2 {
  font-family: 'Teko', sans-serif;
  font-size: 28px;
  color: var(--text-main);
  margin: 0 0 8px;
  line-height: 1.1;
}

.drive-content-col p {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-muted);
  max-width: 800px;
  margin-bottom: 20px;
}

.drive-action-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-drive-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: #2563eb;
  color: #ffffff;
  padding: 12px 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
  transition: all 0.2s ease;
}
.btn-drive-link:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45);
}

.external-arrow {
  font-size: 14px;
  opacity: 0.8;
}

.btn-edit-drive {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-edit-drive:hover {
  color: var(--text-main);
  border-color: var(--border-strong);
  background: var(--bg-card-hover);
}

/* Modal Styling */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-dialog {
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-icon {
  font-size: 24px;
}

.modal-title-row h3 {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-main);
}

.modal-sub {
  font-size: 12px;
  color: #3b82f6;
  font-weight: 700;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 18px;
  color: var(--text-muted);
  cursor: pointer;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-main);
}

.form-input {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13.5px;
  outline: none;
  transition: border-color 0.2s ease;
}
.form-input:focus {
  border-color: var(--accent-red);
}

.form-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.modal-footer {
  padding: 14px 20px;
  background: var(--bg-subtle);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.btn-save {
  background: var(--accent-red);
  color: #ffffff;
  border: none;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
}
.btn-save:hover {
  background: var(--accent-red-hover);
}

@media (max-width: 640px) {
  .practice-hero {
    padding: 30px 14px 24px;
  }
  .policy-card {
    flex-direction: column;
    gap: 12px;
  }
  .practice-action-buttons {
    flex-direction: column;
  }
  .btn-hero-nav {
    width: 100%;
    justify-content: center;
  }
}
</style>
