<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { resolveLogoUrl } from '~/modules/races/composables/useCurrentRace'
import { useSiteMedia } from '~/modules/core/composables/useSiteMedia'
import { useSiteSponsors, type SiteSponsor } from '~/modules/core/composables/useSiteSponsors'
import { useCoachAuth } from '~/modules/coach-admin/composables/useCoachAuth'
import EditPhotoModal from './EditPhotoModal.vue'
import EditSponsorModal from './EditSponsorModal.vue'

const emit = defineEmits<{
  (e: 'navigate', route: 'race' | 'practice' | 'about'): void
  (e: 'selectRace', slug: string): void
  (e: 'toast', msg: string): void
}>()

const { races } = useCurrentRace()
const { media, updateMediaItem } = useSiteMedia()
const { isCoachAuth } = useCoachAuth()
const { sponsors, addSponsor, updateSponsor, removeSponsor } = useSiteSponsors()

const isEditPhotoOpen = ref(false)

const isEditSponsorOpen = ref(false)
const selectedSponsor = ref<SiteSponsor | null>(null)
const isNewSponsor = ref(false)

const openAddSponsor = () => {
  selectedSponsor.value = null
  isNewSponsor.value = true
  isEditSponsorOpen.value = true
}

const openEditSponsor = (sp: SiteSponsor) => {
  selectedSponsor.value = { ...sp }
  isNewSponsor.value = false
  isEditSponsorOpen.value = true
}

const handleSaveSponsor = async (sp: SiteSponsor) => {
  try {
    if (isNewSponsor.value) {
      await addSponsor({ name: sp.name, logoUrl: sp.logoUrl, websiteUrl: sp.websiteUrl })
      emit('toast', `✅ Sponsor "${sp.name}" added!`)
    } else {
      await updateSponsor(sp.id, sp)
      emit('toast', `✅ Sponsor "${sp.name}" updated!`)
    }
  } catch (e: any) {
    emit('toast', `❌ Error saving sponsor: ${e?.message || e}`)
  }
}

const handleDeleteSponsor = async (id: string) => {
  try {
    await removeSponsor(id)
    emit('toast', '🗑️ Sponsor removed!')
  } catch (e: any) {
    emit('toast', `❌ Error deleting sponsor: ${e?.message || e}`)
  }
}

const handleSelectRaceCard = (race: any) => {
  emit('selectRace', race.id)
}

const pastSeasons = [
  2025, 2024, 2023, 2022, 2021, 2020,
  2019, 2018, 2017, 2016
]

const seasonRaces = computed(() => {
  return (races.value || []).map((r, i) => ({
    ...r,
    raceNumber: i + 1
  }))
})

const programs = [
  {
    id: 'grit',
    badge: 'Girls Riding Together',
    title: 'GRiT Initiative',
    lead: 'Mary Cherney, Coordinator',
    icon: '🌸',
    color: '#ec4899',
    description: 'Designed to inspire, support, and empower female riders—building confidence, connection, and leadership on and off the bike. Providing a welcoming, inclusive space for girls of all ability levels.'
  },
  {
    id: 'ttc',
    badge: 'Trail Stewardship',
    title: 'Teen Trail Corps',
    lead: 'Andy Meyer, Coordinator',
    icon: '🌲',
    color: '#10b981',
    description: 'Focused on giving back, TTC engages student-athletes in volunteer trail maintenance, community service, and environmental stewardship—instilling deep ownership in the trails we love to ride.'
  },
  {
    id: 'adventure',
    badge: 'Outdoor Progression',
    title: 'Adventure Program',
    lead: 'Arthur Bernstein, Coordinator',
    icon: '🚵',
    color: '#3b82f6',
    description: 'Provides a progression of experiential challenges that inspire youth to grow, develop outdoor resilience, and pursue lifelong backcountry exploration beyond the competitive race tape.'
  }
]

const stats = [
  { value: '90+', label: 'Student Athletes', sub: 'Grades 6–12 Co-Ed' },
  { value: '~40', label: 'Volunteer Coaches', sub: 'NICA Licensed & CPR Trained' },
  { value: '5', label: 'Race Weekends', sub: 'Camping & Adventure Across WI' },
  { value: '2013', label: 'Founded', sub: '13+ Years of Community Growth' }
]

const openExternal = (url: string) => {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

// Practice Section State & Admin Modals
const isEditCoachesPhotoOpen = ref(false)
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

// Collapsible Cards Accordion State
const practiceCards = ref<Record<string, boolean>>({
  howItWorks: false,
  pods: false,
  locations: false,
  gear: false,
  weather: false,
  coaches: false
})

const togglePracticeCard = (key: string) => {
  practiceCards.value[key] = !practiceCards.value[key]
}

const allPracticeOpen = computed(() => {
  return Object.values(practiceCards.value).every(Boolean)
})

const toggleAllPracticeCards = () => {
  const target = !allPracticeOpen.value
  for (const k of Object.keys(practiceCards.value)) {
    practiceCards.value[k] = target
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
    id: 'forest-hills',
    name: 'Forest Hills',
    address: '600 Losey Blvd N, La Crosse, WI',
    type: 'Alternative Weather & Skills Location',
    highlights: 'Open rolling terrain, skills clinics, grass crits, and dry riding alternative when bluff singletrack trails are soft or wet.',
    badge: 'Alternative Location'
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

const scrollToPractice = () => {
  if (typeof window !== 'undefined') {
    const el = document.getElementById('practice')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (!Object.values(practiceCards.value).some(Boolean)) {
        practiceCards.value.howItWorks = true
      }
    }
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    if (window.location.hash === '#practice' || window.location.search.includes('practice')) {
      setTimeout(() => scrollToPractice(), 150)
    }
  }
})
</script>

<template>
  <div class="home-page-root">
    <!-- Hero Banner -->
    <section class="hero-section">
      <div class="hero-bg-overlay" />
      <div class="hero-content">
        <div class="hero-badge-pill">
          <span class="badge-dot" />
          <span>NICA • WISCONSIN INTERSCHOLASTIC CYCLING LEAGUE</span>
        </div>

        <h1 class="hero-title">
          LA CROSSE AREA <br />
          <span class="text-accent-gradient">MOUNTAIN BIKE TEAM</span>
        </h1>

        <p class="hero-subtext">
          Building strong minds, bodies, character, and community on two wheels. Welcoming student-athletes entering
          <strong>grades 6–12</strong> across La Crosse, Onalaska, Holmen, West Salem, La Crescent, and Bangor.
        </p>

        <div class="hero-action-buttons">
          <button class="btn-primary-hero" @click="emit('navigate', 'race')">
            <span class="btn-icon-box red">🏁</span>
            <span class="btn-label">Explore Race Central</span>
          </button>
          <button class="btn-primary-hero" @click="emit('navigate', 'about')">
            <span class="btn-icon-box red">👥</span>
            <span class="btn-label">About Us</span>
          </button>
        </div>

        <!-- Floating Quick Stat Chips -->
        <div class="hero-stats-grid">
          <div v-for="stat in stats" :key="stat.label" class="stat-card">
            <div class="stat-val">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-sub">{{ stat.sub }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Team Photo Hero Showcase -->
    <section class="photo-banner-section">
      <div class="photo-card-wrap">
        <button
          v-if="isCoachAuth"
          type="button"
          class="btn-change-photo-overlay"
          title="Admin: Change Team Photo"
          @click="isEditPhotoOpen = true"
        >
          📷 Change Photo
        </button>

        <img
          :src="media.teamPhoto || '/images/team-2026.jpg'"
          alt="La Crosse Area Mountain Bike Team 2026"
          class="team-hero-img"
          loading="eager"
        />
        <div class="photo-overlay-caption">
          <span class="photo-caption-tag">2026 SQUAD</span>
          <span class="photo-caption-title">La Crosse Area Composite Team</span>
          <span class="photo-caption-sub">Over 90 riders and 40 coaches united by trails, teamwork, and adventure</span>
        </div>
      </div>

      <!-- Admin Photo Editor Modal -->
      <EditPhotoModal
        :is-open="isEditPhotoOpen"
        photo-key="teamPhoto"
        photo-label="Team Photo (Home Page)"
        @close="isEditPhotoOpen = false"
        @toast="(msg) => emit('toast', msg)"
      />
    </section>

    <!-- Core Philosophy / Who We Are -->
    <section class="info-section">
      <div class="section-header-centered">
        <span class="section-eyebrow">OUR PHILOSOPHY</span>
        <h2 class="section-heading">More Than A Team. A Community.</h2>
        <p class="section-subtext">
          The team began in 2013 with fewer than 20 riders. Today, it has grown into a vibrant community of more than 90 student-athletes from across Wisconsin and Minnesota.
        </p>
      </div>

      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon-box red">🏁</div>
          <h3>No Racing Required</h3>
          <p>
            Whether you are hungry to climb the state podium or simply want to ride singletrack with friends, every athlete enjoys the exact same team experience and coaching.
          </p>
          <div class="feature-highlight">Just come ride!</div>
        </div>

        <div class="feature-card">
          <div class="feature-icon-box green">🤝</div>
          <h3>Grades 6–12 Co-Ed</h3>
          <p>
            Open to all middle school and high school riders across the 7 Rivers Region. No benchwarmers—everyone rides, everyone develops, and everyone belongs.
          </p>
          <div class="feature-highlight">Equal opportunity for all</div>
        </div>

        <div class="feature-card">
          <div class="feature-icon-box blue">🧗</div>
          <h3>All Abilities Welcomed</h3>
          <p>
            No prior mountain biking experience required. We teach bike safety, body position, shifting, and obstacle navigation from the ground up.
          </p>
          <div class="feature-highlight">Zero experience needed</div>
        </div>

        <div class="feature-card">
          <div class="feature-icon-box yellow">🏕️</div>
          <h3>Fall Camping Weekends</h3>
          <p>
            During the fall race series, families camp together across Wisconsin. From shared pasta dinners to roaring campfires, the memories last a lifetime.
          </p>
          <div class="feature-highlight">Unmatched family community</div>
        </div>
      </div>
    </section>

    <!-- Team Programs Grid -->
    <section class="programs-section">
      <div class="section-header-centered">
        <span class="section-eyebrow">SPECIALIZED INITIATIVES</span>
        <h2 class="section-heading">Signature Team Programs</h2>
        <p class="section-subtext">
          Fostering leadership, female empowerment, environmental stewardship, and backcountry outdoor mastery.
        </p>
      </div>

      <div class="programs-grid">
        <div
          v-for="prog in programs"
          :key="prog.id"
          class="program-card"
          :style="{ '--prog-color': prog.color }"
        >
          <div class="program-top">
            <span class="program-icon">{{ prog.icon }}</span>
            <span class="program-badge">{{ prog.badge }}</span>
          </div>
          <h3 class="program-title">{{ prog.title }}</h3>
          <div class="program-lead">{{ prog.lead }}</div>
          <p class="program-desc">{{ prog.description }}</p>
        </div>
      </div>
    </section>

    <!-- Practice & Trail Sessions (Merged Collapsible Section) -->
    <section id="practice" class="practice-merged-section">
      <div class="section-header-centered">
        <span class="section-eyebrow">WEEKLY SESSIONS &amp; RIDER GUIDE</span>
        <h2 class="section-heading">Practice &amp; Trail Sessions</h2>
        <p class="section-subtext">
          Where skills are forged, fitness is built, and friendships grow. Our team practices locally across the Coulee Region's premier trail networks under the guidance of licensed, background-checked volunteer coaches.
        </p>
      </div>

      <!-- Quick Summary Highlights Bar -->
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
            <strong>Days &amp; Times</strong>
            <span>Tue &amp; Thu (5:30 – 6:30 PM)</span>
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
            <span>Lead &amp; Sweep on every pod</span>
          </div>
        </div>
      </div>

      <!-- Accordion Toolbar Controls -->
      <div class="practice-accordion-toolbar">
        <span class="toolbar-hint">Tap any card below to explore schedules, ability pods, trail systems, and gear</span>
        <button
          type="button"
          class="btn-toggle-all"
          :title="allPracticeOpen ? 'Collapse all practice sections' : 'Expand all practice sections'"
          @click="toggleAllPracticeCards"
        >
          <span>{{ allPracticeOpen ? '⊟ Collapse All' : '⊞ Expand All' }}</span>
        </button>
      </div>

      <!-- Collapsible Cards Container -->
      <div class="practice-accordion">

        <!-- Card 1: How Practice Works (Timeline) -->
        <div class="accordion-item" :class="{ 'is-open': practiceCards.howItWorks }">
          <button
            type="button"
            class="accordion-trigger"
            :aria-expanded="practiceCards.howItWorks"
            @click="togglePracticeCard('howItWorks')"
          >
            <div class="trigger-left">
              <span class="trigger-icon-box">⏱️</span>
              <div class="trigger-text">
                <h3 class="trigger-title">How An Evening Practice Works</h3>
                <p class="trigger-sub">Check-In, dynamic warm-up, tiered skill clinics, and wrap-up</p>
              </div>
            </div>
            <div class="trigger-right">
              <span class="trigger-badge">4 Steps</span>
              <span class="trigger-chevron" :class="{ rotated: practiceCards.howItWorks }">▾</span>
            </div>
          </button>
          <div v-show="practiceCards.howItWorks" class="accordion-content">
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
          </div>
        </div>

        <!-- Card 2: Rider Ability & Pace Pods -->
        <div class="accordion-item" :class="{ 'is-open': practiceCards.pods }">
          <button
            type="button"
            class="accordion-trigger"
            :aria-expanded="practiceCards.pods"
            @click="togglePracticeCard('pods')"
          >
            <div class="trigger-left">
              <span class="trigger-icon-box">🟢</span>
              <div class="trigger-text">
                <h3 class="trigger-title">Rider Ability &amp; Pace Pods</h3>
                <p class="trigger-sub">Beginner fundamentals, intermediate endurance, and race pace shredders</p>
              </div>
            </div>
            <div class="trigger-right">
              <span class="trigger-badge">3 Levels</span>
              <span class="trigger-chevron" :class="{ rotated: practiceCards.pods }">▾</span>
            </div>
          </button>
          <div v-show="practiceCards.pods" class="accordion-content">
            <div class="pods-grid">
              <div class="pod-card green">
                <div class="pod-header">
                  <span class="pod-indicator">🟢</span>
                  <div>
                    <h3>Sprouts &amp; Skill Builders</h3>
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
                    <h3>Race Pace &amp; Shredders</h3>
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
          </div>
        </div>

        <!-- Card 3: Where We Ride (Trail Networks) -->
        <div class="accordion-item" :class="{ 'is-open': practiceCards.locations }">
          <button
            type="button"
            class="accordion-trigger"
            :aria-expanded="practiceCards.locations"
            @click="togglePracticeCard('locations')"
          >
            <div class="trigger-left">
              <span class="trigger-icon-box">📍</span>
              <div class="trigger-text">
                <h3 class="trigger-title">Where We Ride (Coulee Region Trails)</h3>
                <p class="trigger-sub">Upper &amp; Lower Hixon, Community Trail Farm, Chad Erickson, Lueth Park</p>
              </div>
            </div>
            <div class="trigger-right">
              <span class="trigger-badge">5 Networks</span>
              <span class="trigger-chevron" :class="{ rotated: practiceCards.locations }">▾</span>
            </div>
          </button>
          <div v-show="practiceCards.locations" class="accordion-content">
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
          </div>
        </div>

        <!-- Card 4: What Every Rider Must Bring (Gear Checklist) -->
        <div class="accordion-item" :class="{ 'is-open': practiceCards.gear }">
          <button
            type="button"
            class="accordion-trigger"
            :aria-expanded="practiceCards.gear"
            @click="togglePracticeCard('gear')"
          >
            <div class="trigger-left">
              <span class="trigger-icon-box">🎒</span>
              <div class="trigger-text">
                <h3 class="trigger-title">What Every Rider Must Bring</h3>
                <p class="trigger-sub">Mandatory safety equipment, bike requirements, and recommended trail gear</p>
              </div>
            </div>
            <div class="trigger-right">
              <span class="trigger-badge">Gear Checklist</span>
              <span class="trigger-chevron" :class="{ rotated: practiceCards.gear }">▾</span>
            </div>
          </button>
          <div v-show="practiceCards.gear" class="accordion-content">
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
        </div>

        <!-- Card 5: Trail Care & Severe Weather Policy -->
        <div class="accordion-item" :class="{ 'is-open': practiceCards.weather }">
          <button
            type="button"
            class="accordion-trigger"
            :aria-expanded="practiceCards.weather"
            @click="togglePracticeCard('weather')"
          >
            <div class="trigger-left">
              <span class="trigger-icon-box">🌧️</span>
              <div class="trigger-text">
                <h3 class="trigger-title">Trail Stewardship &amp; Weather Policy</h3>
                <p class="trigger-sub">ORA Trails muddy trail protection protocol and severe weather storm rules</p>
              </div>
            </div>
            <div class="trigger-right">
              <span class="trigger-badge">Safety &amp; Care</span>
              <span class="trigger-chevron" :class="{ rotated: practiceCards.weather }">▾</span>
            </div>
          </button>
          <div v-show="practiceCards.weather" class="accordion-content">
            <div class="policy-card">
              <div class="policy-icon-col">
                <span>🌧️</span>
              </div>
              <div class="policy-content-col">
                <span class="policy-tag">TRAIL CARE &amp; WEATHER CANCELLATION</span>
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
          </div>
        </div>

        <!-- Card 6: Coaches Staff & Practice Photos -->
        <div class="accordion-item" :class="{ 'is-open': practiceCards.coaches }">
          <button
            type="button"
            class="accordion-trigger"
            :aria-expanded="practiceCards.coaches"
            @click="togglePracticeCard('coaches')"
          >
            <div class="trigger-left">
              <span class="trigger-icon-box">📷</span>
              <div class="trigger-text">
                <h3 class="trigger-title">Coaches in Action &amp; Practice Photos</h3>
                <p class="trigger-sub">Certified volunteer coaching mentors and shared Google Drive photo gallery</p>
              </div>
            </div>
            <div class="trigger-right">
              <span class="trigger-badge">Coaches &amp; Photos</span>
              <span class="trigger-chevron" :class="{ rotated: practiceCards.coaches }">▾</span>
            </div>
          </button>
          <div v-show="practiceCards.coaches" class="accordion-content">
            <!-- Coaches Photo Card -->
            <div class="coaches-photo-card">
              <button
                v-if="isCoachAuth"
                type="button"
                class="btn-change-photo-overlay"
                title="Admin: Change Coaches Photo"
                @click="isEditCoachesPhotoOpen = true"
              >
                📷 Change Photo
              </button>

              <img
                :src="media.coachesPhoto || '/images/coaches-2026.jpg'"
                alt="LAX MTB Volunteer Coaches"
                class="coaches-img"
                loading="lazy"
              />
              <div class="coaches-caption">
                <span class="coaches-tag">VOLUNTEER COACHING STAFF</span>
                <span class="coaches-headline">Dedicated, Certified &amp; Passionate Mentors</span>
                <p class="coaches-desc">
                  All coaches complete NICA background checks, CPR &amp; first aid certification, concussion management, and on-the-bike skills clinics to guarantee a safe, welcoming, and empowering environment.
                </p>
              </div>
            </div>

            <!-- Google Drive Photos Action Row -->
            <div class="drive-card">
              <div class="drive-icon-col">📷</div>
              <div class="drive-content-col">
                <span class="drive-tag">TEAM PHOTO GALLERY</span>
                <h2>Practice &amp; Trail Photos</h2>
                <p>
                  Capturing rider progression, skills clinics, and trail sessions throughout the season! All team practice photos are shared in our Google Drive folder for parents and athletes to view, download, and contribute.
                </p>
                <div class="drive-action-row">
                  <a
                    :href="media.practiceDriveUrl || 'https://drive.google.com'"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-drive-link"
                  >
                    <span>📁 Open Practice Photos on Google Drive</span>
                    <span class="external-arrow">↗</span>
                  </a>
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

            <!-- Volunteer Ride Leader Callout -->
            <div class="volunteer-box">
              <h2>Want To Ride Along Or Coach?</h2>
              <p>
                We are always looking for volunteer coaches and parent ride leaders! NICA provides online training, on-the-bike skills instruction, and background checks. No mountain bike racing experience is necessary.
              </p>
              <div style="margin-top:14px;">
                <a href="mailto:lacrossemtb@gmail.com?subject=Practice%20Inquiry%20-%20LAX%20MTB%20Head%20Coach" class="btn-primary-hero">
                  <span class="btn-icon-box red">✉️</span>
                  <span class="btn-label">Contact Us</span>
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- Race Central Teaser Bar -->
    <section class="race-teaser-section">
      <div class="section-header-centered">
        <span class="section-eyebrow">2026 RACE SEASON</span>
        <h2 class="section-heading">Race Central Live Dashboard</h2>
        <p class="section-subtext">
          Stay on top of live timing feeds, wave start lists, coach warm-up signups, venue course maps, and downloadable schedules for all 5 Wisconsin League races.
        </p>
      </div>

      <div class="races-quick-grid">
        <div
          v-for="race in seasonRaces"
          :key="race.id"
          class="race-quick-card"
          @click="handleSelectRaceCard(race)"
        >
          <div class="race-quick-top">
            <span class="race-quick-num">RACE {{ race.raceNumber }}</span>
            <img
              v-if="race.logo"
              :src="resolveLogoUrl(race.logo)"
              :alt="race.name"
              class="race-card-logo"
              onerror="this.style.display='none'"
            />
          </div>
          <div class="race-quick-name">{{ race.name }}</div>
          <div class="race-quick-meta">
            <span>📅 {{ race.dateStr }}</span>
            <span v-if="race.location">📍 {{ race.location }}</span>
          </div>
          <div class="race-quick-btn">
            <span>View Details & Timing</span>
            <span>→</span>
          </div>
        </div>
      </div>

      <!-- Past Events Archive (2025 down to 2016) -->
      <div class="past-events-card">
        <div class="past-events-header">
          <div class="past-events-title-col">
            <div class="past-events-badge-row">
              <span class="past-events-tag">HISTORICAL ARCHIVES</span>
              <span class="coming-soon-badge">
                <span class="pulsing-amber-dot"></span>
                <span>Coming Soon</span>
              </span>
            </div>
            <h3 class="past-events-heading">Past Events & Historical Race Results (2025 – 2016)</h3>
            <p class="past-events-desc">
              Looking for past race results, wave times, or historical finishes? Archived seasons from 2025 down to 2016 will be accessible here soon.
            </p>
          </div>
        </div>

        <!-- Seasons Grid / Pills from 2025 down to 2016 -->
        <div class="past-seasons-grid">
          <div
            v-for="year in pastSeasons"
            :key="year"
            class="past-season-chip"
            :title="`Season ${year} archive coming soon`"
          >
            <span class="past-season-year">{{ year }}</span>
            <span class="past-season-status">Coming Soon</span>
          </div>
        </div>

        <div class="past-events-footer-note">
          <span class="note-icon">ℹ️</span>
          <span>
            <em>Coming Soon:</em> We are currently preparing and integrating official historical race results from 2016 through 2025. Data source updates will appear here automatically.
          </span>
        </div>
      </div>
    </section>

    <!-- Equipment & Assistance Quick Access -->
    <section class="assistance-section">
      <div class="assistance-card">
        <div class="assistance-content">
          <span class="assistance-badge">RIDER SUPPORT</span>
          <h2>Need Gear, Assistance, or a Loaner Bike?</h2>
          <p>
            We believe finances and equipment should never prevent a student from riding. ORA Trails and WI-NICA provide generous equipment discounts, loaner bikes, and registration scholarships.
          </p>
          <div class="assistance-buttons">
            <button
              class="btn-assistance"
              @click="openExternal('https://retailerassetsprd.blob.core.windows.net/techassets/TK25_MISC_NICA_Discount_Program-a-jan25.pdf?sv=2023-01-03&st=2025-01-30T08%3A01%3A25Z&se=2050-01-31T08%3A01%3A00Z&sr=b&sp=r&sig=KJSASlitxeMiC4ruhJagL7MgRxNHi0BWcgMLtShkqGE%3D')"
            >
              <span class="btn-icon-box">🚲</span>
              <span class="btn-label">Trek / NICA Bike Discount</span>
              <span class="external-arrow">↗</span>
            </button>
            <button
              class="btn-assistance"
              @click="openExternal('https://forms.monday.com/forms/132740057d557a697df27961f86068a4?r=use1')"
            >
              <span class="btn-icon-box">🤝</span>
              <span class="btn-label">Request a Loaner Bike</span>
              <span class="external-arrow">↗</span>
            </button>
            <button
              class="btn-assistance"
              @click="openExternal('https://forms.monday.com/forms/f47342ea4039abbd882f7e4277544570?r=use1')"
            >
              <span class="btn-icon-box">🌟</span>
              <span class="btn-label">WI-NICA Financial Assistance</span>
              <span class="external-arrow">↗</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- This Year's Team Sponsors Section -->
    <section v-if="sponsors.length > 0 || isCoachAuth" class="sponsors-section">
      <div class="section-header-centered">
        <span class="section-eyebrow">COMMUNITY CHAMPIONS</span>
        <h2 class="section-heading">This Year's Sponsors</h2>
        <p class="section-subtext">
          A huge thank you to the businesses and community partners who power our student-athletes, coaching resources, and trail programs.
        </p>
        <div v-if="isCoachAuth" class="sponsor-add-btn-wrap">
          <button
            type="button"
            class="btn-add-sponsor"
            @click="openAddSponsor"
          >
            ➕ Add Sponsor
          </button>
        </div>
      </div>

      <div v-if="sponsors.length > 0" class="sponsors-grid">
        <div
          v-for="sp in sponsors"
          :key="sp.id"
          class="sponsor-card"
        >
          <a
            v-if="sp.websiteUrl"
            :href="sp.websiteUrl"
            target="_blank"
            rel="noopener"
            class="sponsor-logo-box"
            :title="'Visit ' + sp.name"
          >
            <img :src="sp.logoUrl" :alt="sp.name" class="sponsor-logo-img" />
          </a>
          <div v-else class="sponsor-logo-box">
            <img :src="sp.logoUrl" :alt="sp.name" class="sponsor-logo-img" />
          </div>
          <div class="sponsor-name-row">
            <span class="sponsor-name">{{ sp.name }}</span>
            <a
              v-if="sp.websiteUrl"
              :href="sp.websiteUrl"
              target="_blank"
              rel="noopener"
              class="sponsor-ext-link"
              title="Visit Sponsor Website"
            >
              ↗
            </a>
          </div>

          <!-- Coach Quick Actions Overlay -->
          <div v-if="isCoachAuth" class="sponsor-admin-actions">
            <button
              type="button"
              class="btn-sponsor-action edit"
              title="Edit Sponsor"
              @click="openEditSponsor(sp)"
            >
              ✏️
            </button>
            <button
              type="button"
              class="btn-sponsor-action delete"
              title="Remove Sponsor"
              @click="handleDeleteSponsor(sp.id)"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
      <div v-else-if="isCoachAuth" style="text-align:center;padding:32px 16px;color:var(--text-muted);font-size:13.5px;background:var(--bg-subtle);border-radius:12px;border:1px dashed var(--border);">
        No sponsors currently stored in the database. Click <strong>➕ Add Sponsor</strong> above to add one.
      </div>
    </section>

    <!-- Affiliations & Parent Organizations Footer -->
    <section class="affiliations-section">
      <div class="affiliations-header">
        <h3>PROUDLY AFFILIATED WITH</h3>
      </div>
      <div class="affiliations-grid">
        <a href="https://www.oratrails.org" target="_blank" rel="noopener" class="affiliation-link">
          <div class="affiliation-box">
            <div class="affil-logo-box">
              <img src="/logos/ora-trails-white.png" alt="ORA Trails" class="affil-logo" />
            </div>
            <span class="affil-title">ORA Trails</span>
            <span class="affil-sub">Our Local Parent Organization</span>
          </div>
        </a>
        <a href="https://wisconsinmtb.org" target="_blank" rel="noopener" class="affiliation-link">
          <div class="affiliation-box">
            <div class="affil-logo-box">
              <img src="/logos/wisconsin-league-logo.png" alt="Wisconsin High School Cycling League" class="affil-logo" />
            </div>
            <span class="affil-title">Wisconsin High School Cycling League</span>
            <span class="affil-sub">WI-NICA State League</span>
          </div>
        </a>
        <a href="https://nationalmtb.org" target="_blank" rel="noopener" class="affiliation-link">
          <div class="affiliation-box">
            <div class="affil-logo-box">
              <img src="/logos/nica-logo.png" alt="NICA" class="affil-logo" />
            </div>
            <span class="affil-title">NICA</span>
            <span class="affil-sub">National Interscholastic Cycling Assoc.</span>
          </div>
        </a>
      </div>

      <div class="home-contact-box">
        <p>Have questions about joining, coaching, or supporting the team?</p>
        <a href="mailto:lacrossemtb@gmail.com" class="home-email-btn">
          <span>✉️ lacrossemtb@gmail.com</span>
        </a>
      </div>
    </section>

    <!-- Admin Sponsor Modal -->
    <EditSponsorModal
      :is-open="isEditSponsorOpen"
      :sponsor="selectedSponsor"
      :is-new="isNewSponsor"
      @close="isEditSponsorOpen = false"
      @save="handleSaveSponsor"
      @delete="handleDeleteSponsor"
      @toast="(msg) => emit('toast', msg)"
    />

    <!-- Admin Coaches Photo Editor Modal -->
    <EditPhotoModal
      :is-open="isEditCoachesPhotoOpen"
      photo-key="coachesPhoto"
      photo-label="Coaches Photo (Practice Section)"
      @close="isEditCoachesPhotoOpen = false"
      @toast="(msg) => emit('toast', msg)"
    />

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
          <button type="button" class="btn-close" @click="isEditDriveOpen = false">✕</button>
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
  </div>
</template>

<style scoped>
.home-page-root {
  max-width: 1220px;
  margin: 0 auto;
  padding: 0 16px 40px;
}

/* Hero Section */
.hero-section {
  position: relative;
  padding: 44px 20px 36px;
  margin: 16px 0 24px;
  border-radius: 20px;
  background: radial-gradient(circle at top right, rgba(239, 68, 68, 0.18), transparent 60%),
              linear-gradient(180deg, var(--bg-card) 0%, var(--bg-body) 100%);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  text-align: center;
}

.hero-badge-pill {
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
  margin-bottom: 18px;
}

.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-red);
  box-shadow: 0 0 8px var(--accent-red);
  animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.hero-title {
  font-family: 'Teko', sans-serif;
  font-size: clamp(38px, 7vw, 72px);
  line-height: 0.95;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 16px;
  color: var(--text-main);
  text-transform: uppercase;
}

.text-accent-gradient {
  background: linear-gradient(90deg, #ef4444 0%, #f87171 60%, #fca5a5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtext {
  max-width: 760px;
  margin: 0 auto 28px;
  font-size: clamp(14px, 2.5vw, 17px);
  line-height: 1.6;
  color: var(--text-muted);
}

.hero-subtext strong {
  color: var(--text-main);
}

.hero-action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 36px;
}

.btn-primary-hero,
.btn-secondary-hero,
.btn-tertiary-hero {
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
.btn-secondary-hero:hover,
.btn-tertiary-hero:hover {
  background: rgba(239, 68, 68, 0.14);
  border-color: var(--accent-red);
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.3);
}
.btn-primary-hero:active,
.btn-secondary-hero:active,
.btn-tertiary-hero:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
}

.hero-action-buttons .btn-icon-box,
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}
.btn-icon-box.red {
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ffffff;
}

.btn-label {
  display: inline-block;
  white-space: nowrap;
}

.cta-arrow {
  font-size: 16px;
  margin-left: 2px;
  transition: transform 0.2s ease;
}
.btn-primary-hero:hover .cta-arrow {
  transform: translateX(3px);
}


/* Hero Stats Grid */
.hero-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  max-width: 880px;
  margin: 0 auto;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px 10px;
  transition: transform 0.2s ease;
}
.stat-card:hover {
  border-color: rgba(239, 68, 68, 0.4);
  transform: translateY(-2px);
}

.stat-val {
  font-family: 'Teko', sans-serif;
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  color: var(--accent-red);
}

.stat-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-main);
  margin-top: 3px;
}

.stat-sub {
  font-size: 10.5px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* Photo Banner */
.photo-banner-section {
  margin: 16px 0 40px;
}

.photo-card-wrap {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
  background: #000000;
}

.team-hero-img {
  width: 100%;
  height: clamp(250px, 44vw, 560px);
  object-fit: cover;
  object-position: center 15%;
  display: block;
  filter: brightness(0.92);
  transition: transform 0.4s ease;
}
.photo-card-wrap:hover .team-hero-img {
  transform: scale(1.02);
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

.photo-overlay-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.4) 60%, transparent 100%);
  padding: 24px 20px 18px;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.photo-caption-tag {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #ef4444;
  text-transform: uppercase;
}

.photo-caption-title {
  font-family: 'Teko', sans-serif;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.5px;
}

.photo-caption-sub {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.82);
}

/* Sections */
.info-section,
.programs-section,
.assistance-section,
.race-teaser-section,
.affiliations-section {
  margin-bottom: 48px;
}

.section-header-centered {
  text-align: center;
  max-width: 720px;
  margin: 0 auto 32px;
}

.section-eyebrow {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--accent-red);
  text-transform: uppercase;
  margin-bottom: 6px;
}

.section-heading {
  font-family: 'Teko', sans-serif;
  font-size: clamp(30px, 4.5vw, 44px);
  line-height: 1;
  color: var(--text-main);
  text-transform: uppercase;
  margin-bottom: 10px;
}

.section-subtext {
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--text-muted);
}

/* Features Grid */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.feature-card:hover {
  transform: translateY(-3px);
  border-color: var(--border-strong);
}

.feature-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 14px;
}
.feature-icon-box.red { background: rgba(239, 68, 68, 0.14); }
.feature-icon-box.green { background: rgba(16, 185, 129, 0.14); }
.feature-icon-box.blue { background: rgba(59, 130, 246, 0.14); }
.feature-icon-box.yellow { background: rgba(245, 158, 11, 0.14); }

.feature-card h3 {
  font-family: 'Teko', sans-serif;
  font-size: 22px;
  letter-spacing: 0.5px;
  color: var(--text-main);
  margin-bottom: 8px;
}

.feature-card p {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--text-muted);
  flex-grow: 1;
}

.feature-highlight {
  margin-top: 14px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--accent-red);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* Programs Grid */
.programs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
}

.program-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-left: 4px solid var(--prog-color, var(--accent-red));
  border-radius: 16px;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease;
}
.program-card:hover {
  transform: translateY(-3px);
}

.program-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.program-icon {
  font-size: 26px;
}

.program-badge {
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 3px 8px;
  border-radius: 9999px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.program-title {
  font-family: 'Teko', sans-serif;
  font-size: 26px;
  letter-spacing: 0.5px;
  color: var(--text-main);
  margin-bottom: 2px;
}

.program-lead {
  font-size: 12px;
  font-weight: 700;
  color: var(--prog-color, var(--accent-red));
  margin-bottom: 12px;
}

.program-desc {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--text-muted);
}

/* Assistance Section */
.assistance-card {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-card) 100%);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 20px;
  padding: 32px 24px;
}

.assistance-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: var(--accent-red);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.assistance-content h2 {
  font-family: 'Teko', sans-serif;
  font-size: clamp(26px, 3.5vw, 36px);
  line-height: 1.05;
  color: var(--text-main);
  margin-bottom: 10px;
}

.assistance-content p {
  max-width: 800px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-muted);
  margin-bottom: 24px;
}

.assistance-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.btn-assistance {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}
.btn-assistance:hover {
  background: var(--bg-card-hover);
  border-color: var(--accent-red);
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.2);
}

.btn-assistance:hover .external-arrow {
  opacity: 1;
  color: var(--accent-red);
  transform: translate(2px, -2px);
}

.external-arrow {
  font-size: 14px;
  opacity: 0.7;
  margin-left: 2px;
  transition: all 0.2s ease;
}

/* Race Teaser */
.teaser-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}

.races-quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
}

.race-quick-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.2s ease;
}
.race-quick-card:hover {
  border-color: var(--accent-red);
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}

.race-quick-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.race-card-logo {
  max-height: 38px;
  max-width: 90px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}

.race-quick-num {
  font-size: 10px;
  font-weight: 800;
  color: var(--accent-red);
  letter-spacing: 0.5px;
}

.race-quick-name {
  font-family: 'Teko', sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--text-main);
}

.race-quick-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11.5px;
  color: var(--text-muted);
  margin-top: 4px;
}

.race-quick-btn {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-red);
}

/* Past Events Archive Card */
.past-events-card {
  margin-top: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  overflow: hidden;
}

.past-events-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.past-events-title-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 780px;
}

.past-events-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.past-events-tag {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.coming-soon-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fbbf24;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pulsing-amber-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 8px #fbbf24;
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.past-events-heading {
  font-family: 'Teko', sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--text-main);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.past-events-desc {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted);
}

.past-seasons-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 2px 0;
}

.past-season-chip {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  padding: 6px 12px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: default;
  transition: all 0.15s ease;
}
.past-season-chip:hover {
  border-color: rgba(245, 158, 11, 0.4);
  background: var(--bg-card-hover);
}

.past-season-year {
  font-family: 'Teko', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1;
}

.past-season-status {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 6px;
  letter-spacing: 0.3px;
}

.past-events-footer-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.45;
}

.note-icon {
  font-size: 14px;
  flex-shrink: 0;
}

/* Sponsors Section */
.sponsors-section {
  margin-bottom: 48px;
}

.sponsors-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.sponsors-title-col {
  max-width: 680px;
}

.sponsor-add-btn-wrap {
  margin-top: 14px;
  display: flex;
  justify-content: center;
}

.btn-add-sponsor {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-subtle);
  border: 1px solid var(--accent-red);
  color: var(--text-main);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-add-sponsor:hover {
  background: var(--accent-red);
  color: #ffffff;
  transform: translateY(-2px);
}

.sponsors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.sponsor-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px 12px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  text-align: center;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.sponsor-card:hover {
  transform: translateY(-3px);
  border-color: var(--accent-red);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.sponsor-logo-box {
  width: 100%;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  background: #ffffff;
  border-radius: 10px;
  margin-bottom: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease;
  text-decoration: none;
}
.sponsor-card:hover .sponsor-logo-box {
  transform: scale(1.02);
}

.sponsor-logo-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.sponsor-name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
}

.sponsor-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sponsor-ext-link {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 13px;
  transition: color 0.15s ease, transform 0.15s ease;
}
.sponsor-ext-link:hover,
.sponsor-card:hover .sponsor-ext-link {
  color: var(--accent-red);
  transform: translate(1px, -1px);
}

.sponsor-admin-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  z-index: 5;
}

.btn-sponsor-action {
  background: rgba(13, 13, 13, 0.85);
  border: 1px solid var(--border-strong);
  color: var(--text-main);
  border-radius: 6px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  cursor: pointer;
}
.btn-sponsor-action:hover {
  background: var(--accent-red);
  color: #fff;
}

/* Affiliations */
.affiliations-section {
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.affiliations-header {
  text-align: center;
  margin-bottom: 16px;
}
.affiliations-header h3 {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.affiliations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 28px;
}

.affiliation-link {
  text-decoration: none;
  color: inherit;
}

.affiliation-box {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: all 0.2s ease;
}
.affiliation-box:hover {
  border-color: var(--accent-red);
  background: var(--bg-subtle);
}

.affil-logo-box {
  width: 100%;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.affil-logo {
  max-width: 150px;
  max-height: 48px;
  object-fit: contain;
  filter: brightness(0.95);
  transition: filter 0.2s ease;
}
.affiliation-box:hover .affil-logo {
  filter: brightness(1.1);
}

.affil-title {
  display: block;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main);
}

.affil-sub {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.home-contact-box {
  background: var(--bg-subtle);
  border-radius: 14px;
  padding: 20px;
  text-align: center;
  border: 1px solid var(--border);
}

.home-contact-box p {
  font-size: 13.5px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.home-email-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 13px 26px;
  border-radius: 12px;
  background: var(--accent-red);
  border: none;
  color: #ffffff;
  text-decoration: none;
  font-size: 15px;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
  transition: all 0.2s ease;
}
.home-email-btn:hover {
  background: var(--accent-red-hover);
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.45);
}

@media (max-width: 640px) {
  .hero-section {
    padding: 30px 14px 24px;
  }
  .hero-action-buttons {
    flex-direction: column;
    width: 100%;
  }
  .btn-primary-hero,
  .btn-secondary-hero,
  .btn-tertiary-hero {
    width: 100%;
    justify-content: center;
  }
}

/* ============================================================
   PRACTICE & TRAIL SESSIONS (MERGED COLLAPSIBLE SECTION)
   ============================================================ */
.practice-merged-section {
  margin: 36px 0 52px;
  scroll-margin-top: calc(var(--site-header-height, 70px) + 20px);
}

.practice-quick-chips {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  width: 100%;
  margin: 0 auto 24px;
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
  line-height: 1;
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

.practice-accordion-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin: 0 auto 14px;
  padding: 0 4px;
  flex-wrap: wrap;
  gap: 10px;
}

.toolbar-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.btn-toggle-all {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-toggle-all:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  color: var(--accent-red);
}

.practice-accordion {
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.accordion-item {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.accordion-item.is-open {
  border-color: rgba(239, 68, 68, 0.45);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.accordion-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}
.accordion-trigger:hover {
  background: rgba(255, 255, 255, 0.03);
}

.trigger-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.trigger-icon-box {
  font-size: 20px;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.trigger-title {
  margin: 0;
  font-family: 'Teko', sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--text-main);
  line-height: 1.1;
}

.trigger-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trigger-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.trigger-badge {
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 3px 8px;
  border-radius: 9999px;
  white-space: nowrap;
}

.trigger-chevron {
  font-size: 16px;
  color: var(--text-muted);
  transition: transform 0.2s ease;
  display: inline-block;
  line-height: 1;
}
.trigger-chevron.rotated {
  transform: rotate(180deg);
  color: var(--accent-red);
}

.accordion-content {
  padding: 8px 20px 24px;
  border-top: 1px solid var(--border);
}

/* Steps Grid */
.practice-steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
}

.step-card {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.step-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-strong);
}

.step-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.step-num {
  font-family: 'Teko', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--accent-red);
  line-height: 1;
}

.step-duration {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.step-card h3 {
  font-family: 'Teko', sans-serif;
  font-size: 20px;
  letter-spacing: 0.5px;
  color: var(--text-main);
  margin-bottom: 6px;
}

.step-card p {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted);
  margin: 0;
}

/* Ability Pods */
.pods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.pod-card {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px 18px;
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
  margin-bottom: 10px;
}

.pod-indicator {
  font-size: 22px;
}

.pod-header h3 {
  font-family: 'Teko', sans-serif;
  font-size: 22px;
  line-height: 1.1;
  color: var(--text-main);
  margin: 0;
}

.pod-level {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
}

.pod-desc {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted);
  margin-bottom: 14px;
}

.pod-points {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--text-main);
}

.pod-points li {
  position: relative;
  padding-left: 14px;
}

.pod-points li::before {
  content: '•';
  position: absolute;
  left: 2px;
  color: var(--accent-red);
  font-weight: 900;
}

/* Locations */
.locations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.location-card {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px;
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
  margin-bottom: 8px;
}

.location-badge {
  font-size: 10px;
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
  font-size: 20px;
  color: var(--text-main);
  margin: 0 0 4px;
}

.location-address {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.location-highlights {
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text-muted);
  margin: 0;
}

/* Gear Checklist */
.gear-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gear-row {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 14px;
}

.gear-item-col {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.check-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  flex-shrink: 0;
  margin-top: 1px;
}

.gear-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.required-badge {
  font-size: 9.5px;
  font-weight: 800;
  text-transform: uppercase;
  background: rgba(239, 68, 68, 0.15);
  color: var(--accent-red);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.recommended-badge {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.gear-note {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* Policy Card */
.policy-card {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-subtle) 100%);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 14px;
  padding: 22px 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.policy-icon-col {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
}

.policy-content-col {
  flex: 1;
}

.policy-tag {
  display: block;
  font-size: 10.5px;
  font-weight: 800;
  color: var(--accent-red);
  letter-spacing: 0.8px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.policy-content-col h3 {
  font-family: 'Teko', sans-serif;
  font-size: 22px;
  color: var(--text-main);
  margin: 0 0 8px;
}

.policy-content-col p {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted);
  margin: 0 0 8px;
}

.policy-sub {
  font-size: 12.5px;
  color: var(--text-main) !important;
  margin: 0 !important;
}

/* Coaches Card & Photos */
.coaches-photo-card {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #000000;
  margin-bottom: 20px;
}

.coaches-img {
  width: 100%;
  height: clamp(200px, 32vw, 420px);
  object-fit: cover;
  object-position: center 15%;
  display: block;
  filter: brightness(0.92);
}

.coaches-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.5) 65%, transparent 100%);
  padding: 20px 18px 14px;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 3px;
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
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.5px;
}

.coaches-desc {
  max-width: 800px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}

.drive-card {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 22px 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.drive-icon-col {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
}

.drive-content-col {
  flex: 1;
}

.drive-tag {
  font-size: 10.5px;
  font-weight: 800;
  color: var(--accent-red);
  letter-spacing: 0.8px;
  text-transform: uppercase;
  display: block;
  margin-bottom: 4px;
}

.drive-content-col h2 {
  font-family: 'Teko', sans-serif;
  font-size: 24px;
  color: var(--text-main);
  margin: 0 0 6px;
}

.drive-content-col p {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted);
  margin: 0 0 14px;
}

.drive-action-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-drive-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-red);
  color: #ffffff;
  padding: 9px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.2s ease;
}
.btn-drive-link:hover {
  background: var(--accent-red-hover);
  transform: translateY(-2px);
}

.btn-edit-drive {
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-edit-drive:hover {
  color: var(--text-main);
  border-color: var(--border-strong);
}

.volunteer-box {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 22px 20px;
  text-align: center;
}

.volunteer-box h2 {
  font-family: 'Teko', sans-serif;
  font-size: 24px;
  color: var(--text-main);
  margin: 0 0 6px;
}

.volunteer-box p {
  font-size: 13px;
  color: var(--text-muted);
  max-width: 680px;
  margin: 0 auto;
  line-height: 1.5;
}

/* Modal Backdrop & Dialog for Drive link editor */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-dialog {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  padding: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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
  font-family: 'Teko', sans-serif;
  font-size: 22px;
  margin: 0;
  color: var(--text-main);
}

.modal-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}
.btn-close:hover {
  color: var(--text-main);
}

.modal-body .form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-body label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-main);
}

.form-input {
  width: 100%;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--text-main);
  font-size: 13px;
  box-sizing: border-box;
}
.form-input:focus {
  outline: none;
  border-color: var(--accent-red);
}

.form-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
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
.btn-cancel:hover {
  color: var(--text-main);
}

.btn-save {
  background: var(--accent-red);
  border: none;
  color: #ffffff;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.btn-save:hover {
  background: var(--accent-red-hover);
}

@media (max-width: 640px) {
  .trigger-sub {
    display: none;
  }
  .trigger-title {
    font-size: 19px;
  }
  .trigger-icon-box {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }
  .accordion-trigger {
    padding: 12px 14px;
  }
  .accordion-content {
    padding: 6px 14px 18px;
  }
  .policy-card,
  .drive-card {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
