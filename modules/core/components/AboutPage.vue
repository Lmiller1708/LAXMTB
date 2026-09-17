<script setup lang="ts">
import { ref } from 'vue'
import { useSiteMedia } from '~/modules/core/composables/useSiteMedia'
import { useCoachAuth } from '~/modules/coach-admin/composables/useCoachAuth'
import { useSiteLeadership, type LeaderMember } from '~/modules/core/composables/useSiteLeadership'
import EditPhotoModal from '~/modules/core/components/EditPhotoModal.vue'
import EditLeaderModal from '~/modules/core/components/EditLeaderModal.vue'

const emit = defineEmits<{
  (e: 'navigate', route: 'race' | 'practice' | 'about' | 'home'): void
  (e: 'toast', msg: string): void
}>()

const { media } = useSiteMedia()
const { isCoachAuth } = useCoachAuth()
const { leaders, addLeader, updateLeader, removeLeader } = useSiteLeadership()

const activeEditKey = ref<string>('')
const activeEditLabel = ref<string>('')
const isEditModalOpen = ref(false)

const openPhotoEditor = (key: string, label: string) => {
  activeEditKey.value = key
  activeEditLabel.value = label
  isEditModalOpen.value = true
}

const isEditLeaderModalOpen = ref(false)
const selectedLeader = ref<LeaderMember | null>(null)
const isNewLeader = ref(false)

const openEditLeader = (leader: LeaderMember) => {
  selectedLeader.value = { ...leader }
  isNewLeader.value = false
  isEditLeaderModalOpen.value = true
}

const openAddLeader = () => {
  selectedLeader.value = {
    id: `leader_${Date.now()}`,
    name: '',
    role: '',
    photoKey: '',
    image: '',
    desc: ''
  }
  isNewLeader.value = true
  isEditLeaderModalOpen.value = true
}

const handleSaveLeader = async (leaderData: LeaderMember) => {
  if (isNewLeader.value) {
    await addLeader(leaderData)
  } else {
    await updateLeader(leaderData)
  }
}

const handleDeleteLeader = async (leaderId: string) => {
  await removeLeader(leaderId)
}

const openFaq = ref<number | null>(0)
const toggleFaq = (idx: number) => {
  openFaq.value = openFaq.value === idx ? null : idx
}

const values = [
  {
    letter: 'F',
    word: 'FUN',
    icon: '🎉',
    desc: 'Inspiring a genuine, lifelong passion for mountain biking and the great outdoors. Smiles and trail high-fives come first.'
  },
  {
    letter: 'I',
    word: 'INCLUSIVITY',
    icon: '🌈',
    desc: 'No tryouts, no cuts, and zero benchwarmers. Every student-athlete participates, rides, and belongs regardless of ability.'
  },
  {
    letter: 'E',
    word: 'EQUITY',
    icon: '⚖️',
    desc: 'Ensuring fair opportunities, loaner bikes, and registration scholarships so financial circumstances never bar participation.'
  },
  {
    letter: 'R',
    word: 'RESPECT',
    icon: '🤝',
    desc: 'Treating teammates, competitors, coaches, land managers, trail users, and our natural environment with dignity.'
  },
  {
    letter: 'C',
    word: 'COMMUNITY',
    icon: '🏕️',
    desc: 'Fostering lifelong bonds between riders, coaches, families, and communities across Wisconsin and Minnesota.'
  }
]

const faqs = [
  {
    q: 'Who can join the La Crosse Area Mountain Bike Team?',
    a: 'Any student entering grades 6–12 for the 2026–2027 school year is welcome! We are a composite team representing riders from across the Coulee Region, including La Crosse, Onalaska, Holmen, West Salem, La Crescent, and Bangor.'
  },
  {
    q: 'Do I have to race to be on the team?',
    a: 'No! Racing is 100% optional. Many of our student-athletes join purely for the weekly practices, trail camaraderie, adventure trips, and skill clinics. Every rider enjoys the exact same coaching, team gear, and team community regardless of whether they ever pin on a race number.'
  },
  {
    q: 'What kind of bike do I need?',
    a: 'You will need a mountain bike with working front and rear hand brakes, multiple gears, and knobby off-road tires. If you do not have a bike, ORA Trails offers a Loaner Bike Program, and Trek offers generous NICA athlete purchase discounts.'
  },
  {
    q: 'Are scholarships or financial aid available?',
    a: 'Yes! Both WI-NICA and the La Crosse team offer need-based financial aid for league registration, team fees, and equipment. We are committed to making sure every child who wants to ride has the opportunity to ride.'
  },
  {
    q: 'How can parents get involved?',
    a: 'We are a 100% volunteer-led organization! Parents can become licensed ride leaders, assistant coaches, race day volunteers, feed-zone support, or help with camping meals. NICA provides all necessary online and on-the-bike coach training.'
  }
]
</script>

<template>
  <div class="about-page-root">
    <!-- Header Hero -->
    <section class="about-hero">
      <div class="about-hero-bg" />
      <div class="about-hero-content">
        <div class="about-badge">
          <span>🌲 COMMUNITY • STEWARDSHIP • OUTDOOR PASSION</span>
        </div>
        <h1 class="about-title">
          ABOUT LAX MTB & <span class="text-accent-gradient">OUR COMMUNITY</span>
        </h1>
        <p class="about-subtext">
          Founded in 2013 with fewer than 20 riders, the La Crosse Area Mountain Bike Team has grown into a vibrant youth community of over 90 student-athletes and nearly 40 dedicated volunteer coaches.
        </p>

        <div class="about-action-buttons">
          <button class="btn-primary-hero" @click="emit('navigate', 'race')">
            <span class="btn-icon-box red">🏁</span>
            <span class="btn-label">Explore Race Central</span>
          </button>
          <button class="btn-primary-hero" @click="emit('navigate', 'home')">
            <span class="btn-icon-box red">🚵🏼</span>
            <span class="btn-label">Team Overview</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Head Coach Testimonial Banner -->
    <section class="testimonial-section">
      <div class="testimonial-card">
        <span class="quote-mark">“</span>
        <blockquote class="testimonial-quote">
          My favorite part about being on the mountain bike team is the festival weekends – I love seeing athletes and families come together with the larger NICA community to embrace mountain bike adventures and cross country racing. From introducing the sport to new riders, to supporting racers hungry for competition, and all the growth and development between, I am honored to be part of the La Crosse Area Mountain Bike Team!
        </blockquote>
        <div class="testimonial-author">
          <div class="author-avatar-wrapper">
            <div class="author-avatar-box">
              <img
                :src="media.careyPhoto || '/images/coach-carey.jpeg'"
                alt="Carey Falkenberry"
                class="author-avatar"
              />
            </div>
            <button
              v-if="isCoachAuth"
              type="button"
              class="btn-edit-avatar"
              title="Admin: Change Coach Carey Photo"
              @click="openPhotoEditor('careyPhoto', 'Coach Carey Testimonial Photo')"
            >
              📷
            </button>
          </div>
          <div>
            <div class="author-name">Carey Falkenberry</div>
            <div class="author-title">Head Coach (2022–2024)</div>
          </div>
        </div>
      </div>
    </section>

    <!-- NICA FIERC Values -->
    <section class="values-section">
      <div class="section-title-wrap">
        <span class="section-tag">GUIDING PRINCIPLES</span>
        <h2>Our Core "FIERC" Values</h2>
        <p>As an official member of NICA and the Wisconsin High School Cycling League, our team operates on five core pillars.</p>
      </div>

      <div class="values-grid">
        <div v-for="val in values" :key="val.letter" class="val-card">
          <div class="val-top">
            <span class="val-letter">{{ val.letter }}</span>
            <span class="val-icon">{{ val.icon }}</span>
          </div>
          <h3 class="val-word">{{ val.word }}</h3>
          <p class="val-desc">{{ val.desc }}</p>
        </div>
      </div>
    </section>

    <!-- 2026 Leadership Team Grid -->
    <section v-if="leaders.length > 0 || isCoachAuth" class="leadership-section">
      <div class="section-title-wrap">
        <span class="section-tag">TEAM STAFF</span>
        <h2>2026 Leadership Team</h2>
        <p>Meet the directors, coordinators, and coaches dedicating their time to mentoring Coulee Region youth on and off the bike.</p>
        <div v-if="isCoachAuth" style="margin-top: 14px;">
          <button
            type="button"
            class="btn-add-leader-pill"
            @click="openAddLeader"
          >
            ➕ Add Leadership Member
          </button>
        </div>
      </div>

      <div v-if="leaders.length > 0" class="leaders-grid">
        <div v-for="leader in leaders" :key="leader.id || leader.name" class="leader-card">
          <div class="leader-photo-wrap">
            <button
              v-if="isCoachAuth"
              type="button"
              class="btn-change-photo-overlay"
              :title="`Admin: Edit ${leader.name}`"
              @click="openEditLeader(leader)"
            >
              ✏️ Edit Member
            </button>
            <img :src="leader.image || 'https://www.oratrails.org/wp-content/plugins/salient-core/includes/img/team-member-default.jpg'" :alt="leader.name" class="leader-img" loading="lazy" />
          </div>
          <div class="leader-info">
            <h3 class="leader-name">{{ leader.name }}</h3>
            <div class="leader-role">{{ leader.role }}</div>
            <p class="leader-desc">{{ leader.desc }}</p>
          </div>
        </div>
      </div>
      <div v-else-if="isCoachAuth" style="text-align:center;padding:32px 16px;color:var(--text-muted);font-size:13.5px;background:var(--bg-subtle);border-radius:12px;border:1px dashed var(--border);">
        No leadership members currently stored in the database. Click <strong>➕ Add Leadership Member</strong> above to add one.
      </div>
    </section>

    <!-- ORA Trails & Governing Bodies -->
    <section class="org-section">
      <div class="org-card">
        <div class="org-content">
          <span class="section-tag">COMMUNITY PARTNERSHIP</span>
          <h2>A Proud Program of ORA Trails</h2>
          <p>
            The La Crosse Area Mountain Bike Team operates under the umbrella of <strong>ORA Trails</strong> (Outdoor Recreation Alliance). Together, we share a mission to create, maintain, and promote world-class silent sports trails that build strong communities.
          </p>
          <div class="org-address-grid">
            <div class="address-box">
              <span class="address-label">Mailing Address</span>
              <strong>ORA Trails</strong>
              <span>PO Box 69</span>
              <span>La Crosse, WI 54602</span>
            </div>
            <div class="address-box">
              <span class="address-label">Community Trail Farm</span>
              <strong>W5723 HWY 33</strong>
              <span>La Crosse, WI 54601</span>
              <span>Home of trails, clinics & community events</span>
            </div>
          </div>

          <div class="org-links">
            <a href="https://www.oratrails.org" target="_blank" rel="noopener" class="org-btn">
              <img src="/logos/ora-trails-white.png" alt="ORA Trails" class="org-btn-logo" />
              <span>ORA Trails Website ↗</span>
            </a>
            <a href="https://wisconsinmtb.org" target="_blank" rel="noopener" class="org-btn">
              <img src="/logos/wisconsin-league-logo.png" alt="Wisconsin League" class="org-btn-logo" />
              <span>Wisconsin League ↗</span>
            </a>
            <a href="https://nationalmtb.org" target="_blank" rel="noopener" class="org-btn">
              <img src="/logos/nica-logo.png" alt="NICA" class="org-btn-logo" />
              <span>National NICA ↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Frequently Asked Questions (Accordion) -->
    <section class="faq-section">
      <div class="section-title-wrap">
        <span class="section-tag">COMMON QUESTIONS</span>
        <h2>Frequently Asked Questions</h2>
        <p>Everything you need to know about joining, riding, and being part of the team.</p>
      </div>

      <div class="faq-list">
        <div
          v-for="(faq, idx) in faqs"
          :key="faq.q"
          class="faq-item"
          :class="{ open: openFaq === idx }"
          @click="toggleFaq(idx)"
        >
          <div class="faq-header">
            <h3>{{ faq.q }}</h3>
            <span class="faq-toggle-icon">{{ openFaq === idx ? '−' : '+' }}</span>
          </div>
          <div v-show="openFaq === idx" class="faq-body">
            <p>{{ faq.a }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact & Join Us -->
    <section class="contact-section">
      <div class="contact-box">
        <h2>Ready To Ride With Us?</h2>
        <p>
          Registration for the 2026 fall season opens in spring. If you have questions about equipment, financial aid, or joining practice, reach out to our team coordinators.
        </p>
        <a href="mailto:lacrossemtb@gmail.com" class="btn-email-us">
          <span>✉️ lacrossemtb@gmail.com</span>
        </a>
      </div>
    </section>

    <!-- Admin Photo Editor Modal -->
    <EditPhotoModal
      :is-open="isEditModalOpen"
      :photo-key="activeEditKey"
      :photo-label="activeEditLabel"
      @close="isEditModalOpen = false"
      @toast="(msg) => emit('toast', msg)"
    />

    <!-- Admin Leadership Member Modal -->
    <EditLeaderModal
      :is-open="isEditLeaderModalOpen"
      :leader="selectedLeader"
      :is-new="isNewLeader"
      @close="isEditLeaderModalOpen = false"
      @save="handleSaveLeader"
      @delete="handleDeleteLeader"
      @toast="(msg) => emit('toast', msg)"
    />
  </div>
</template>

<style scoped>
.about-page-root {
  max-width: 1220px;
  margin: 0 auto;
  padding: 0 16px 40px;
}

/* Hero */
.about-hero {
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

.about-badge {
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

.about-title {
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

.about-subtext {
  max-width: 760px;
  margin: 0 auto 28px;
  font-size: clamp(14px, 2.5vw, 16px);
  line-height: 1.6;
  color: var(--text-muted);
}

.about-action-buttons {
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

.about-action-buttons .btn-icon-box,
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

/* Testimonial */
.testimonial-section {
  margin: 24px 0 48px;
}

.testimonial-card {
  position: relative;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-card) 100%);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 20px;
  padding: 32px 28px;
  box-shadow: var(--shadow-card);
}

.quote-mark {
  font-family: serif;
  font-size: 64px;
  line-height: 1;
  color: var(--accent-red);
  position: absolute;
  top: 14px;
  left: 20px;
  opacity: 0.3;
}

.testimonial-quote {
  font-size: 15.5px;
  line-height: 1.65;
  color: var(--text-main);
  font-style: italic;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 14px;
}

.author-avatar-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.author-avatar-box {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--accent-red);
}

.btn-edit-avatar {
  position: absolute;
  bottom: -4px;
  right: -6px;
  background: rgba(13, 13, 13, 0.9);
  border: 1px solid var(--accent-red);
  color: #fff;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease;
  z-index: 2;
}
.btn-edit-avatar:hover {
  transform: scale(1.15);
  background: var(--accent-red);
}

.author-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.author-name {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-main);
}

.author-title {
  font-size: 12px;
  color: var(--text-muted);
}

/* Values Grid */
.values-section,
.leadership-section,
.org-section,
.faq-section,
.contact-section {
  margin-bottom: 48px;
}

.section-title-wrap {
  text-align: center;
  max-width: 700px;
  margin: 0 auto 30px;
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

.values-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.val-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.val-card:hover {
  transform: translateY(-3px);
  border-color: var(--border-strong);
}

.val-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.val-letter {
  font-family: 'Teko', sans-serif;
  font-size: 36px;
  font-weight: 700;
  color: var(--accent-red);
  line-height: 1;
}

.val-icon {
  font-size: 22px;
}

.val-word {
  font-family: 'Teko', sans-serif;
  font-size: 22px;
  color: var(--text-main);
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.val-desc {
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-muted);
}

/* Leaders Grid */
.leaders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
}

.leader-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.leader-card:hover {
  transform: translateY(-3px);
  border-color: var(--border-strong);
}

.leader-photo-wrap {
  position: relative;
  width: 100%;
  height: 280px;
  background: var(--bg-subtle);
  overflow: hidden;
}

.leader-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.3s ease;
}
.leader-card:hover .leader-img {
  transform: scale(1.03);
}

.btn-change-photo-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(13, 13, 13, 0.85);
  border: 1px solid var(--accent-red);
  color: #ffffff;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 11.5px;
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

.leader-info {
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.leader-name {
  font-family: 'Teko', sans-serif;
  font-size: 24px;
  line-height: 1.1;
  color: var(--text-main);
}

.leader-role {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent-red);
  text-transform: uppercase;
  margin-bottom: 6px;
}

.leader-desc {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted);
}

/* ORA Section */
.org-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 32px 24px;
}

.org-content h2 {
  font-family: 'Teko', sans-serif;
  font-size: clamp(28px, 4vw, 38px);
  color: var(--text-main);
  margin-bottom: 10px;
}

.org-content p {
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--text-muted);
  max-width: 840px;
  margin-bottom: 24px;
}

.org-address-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.address-box {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  color: var(--text-muted);
}

.address-label {
  font-size: 10.5px;
  font-weight: 800;
  color: var(--accent-red);
  text-transform: uppercase;
  margin-bottom: 4px;
}

.address-box strong {
  color: var(--text-main);
  font-size: 14px;
}

.org-links {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.org-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 8px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  color: var(--text-main);
  text-decoration: none;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.2s ease;
}
.org-btn:hover {
  border-color: var(--accent-red);
  color: var(--accent-red);
  transform: translateY(-2px);
}

.org-btn-logo {
  height: 24px;
  max-width: 60px;
  object-fit: contain;
}

.btn-add-leader-pill {
  background: var(--bg-card);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: var(--text-main);
  padding: 8px 18px;
  border-radius: 9999px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-add-leader-pill:hover {
  background: var(--bg-card-hover);
  border-color: var(--accent-red);
  color: var(--accent-red);
  transform: translateY(-2px);
}

/* FAQ List */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 840px;
  margin: 0 auto;
}

.faq-item {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 20px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}
.faq-item:hover,
.faq-item.open {
  border-color: var(--border-strong);
}

.faq-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
}

.faq-header h3 {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
}

.faq-toggle-icon {
  font-size: 20px;
  font-weight: 800;
  color: var(--accent-red);
  flex-shrink: 0;
}

.faq-body {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
}

.faq-body p {
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--text-muted);
}

/* Contact */
.contact-box {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 32px 20px;
  text-align: center;
}

.contact-box h2 {
  font-family: 'Teko', sans-serif;
  font-size: 32px;
  color: var(--text-main);
  margin-bottom: 8px;
}

.contact-box p {
  max-width: 640px;
  margin: 0 auto 20px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-muted);
}

.btn-email-us {
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
  text-decoration: none;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
  transition: all 0.2s ease;
}
.btn-email-us:hover {
  background: var(--accent-red-hover);
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.45);
}

@media (max-width: 640px) {
  .about-hero {
    padding: 30px 14px 24px;
  }
  .about-action-buttons {
    flex-direction: column;
  }
  .btn-hero-nav {
    width: 100%;
    justify-content: center;
  }
}
</style>
