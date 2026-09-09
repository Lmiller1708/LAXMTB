<script setup lang="ts">
import { ref } from 'vue'
import type { Race } from '~/modules/races/types/race'

const props = defineProps<{
  race: Race
  isCoachAuth?: boolean
}>()

defineEmits<{
  (e: 'edit'): void
}>()

// Session switcher (Pre‑Rides / Warm‑ups)
const activeSession = ref<'pr' | 'wu'>('pr')

// Reactive state for leaders and support coaches per slot
const leaderClaims = ref<Record<string, string | null>>({})
const supportCoaches = ref<Record<string, string[]>>({})

function getLeaderName(slotId: string): string | null {
  return leaderClaims.value[slotId] || null
}

function toggleLeader(slotId: string) {
  const current = getLeaderName(slotId)
  if (current) {
    leaderClaims.value[slotId] = null
  } else {
    const name = window.prompt('Enter Ride Leader name:')
    if (name && name.trim()) {
      leaderClaims.value[slotId] = name.trim()
    }
  }
}

function addSupport(slotId: string) {
  const name = window.prompt('Enter Ride Support name:')
  if (!name || !name.trim()) return
  if (!supportCoaches.value[slotId]) supportCoaches.value[slotId] = []
  supportCoaches.value[slotId].push(name.trim())
}

function removeSupport(slotId: string, idx: number) {
  supportCoaches.value[slotId]?.splice(idx, 1)
}

function getCapStyle(slotId: string) {
  const map: Record<string, { fill: number; text: string; cls?: string; full?: boolean }> = {
    A: { fill: 50, text: '2 / 4' },
    B: { fill: 75, text: '3 / 4', cls: 'warn' },
    C: { fill: 25, text: '1 / 4' },
    D: { fill: 100, text: '4 / 4 — Full', cls: 'full-c', full: true },
    E: { fill: 33, text: '1 / 3' },
    F: { fill: 0, text: '0 / 3 — Open' },
    G: { fill: 67, text: '2 / 3', cls: 'warn' },
    H: { fill: 0, text: '0 / 4 — Open' }
  }
  return map[slotId] || { fill: 0, text: '0 / 0' }
}
</script>

<template>
  <div class="card event-coach-card">
    <div class="card-header">
      <div class="card-header-left">
        <div class="card-icon">🚵</div>
        <div>
          <div class="card-title">Coach Sign‑Ups</div>
          <div class="card-subtitle">{{ props.race.name }} &bull; Sign up to lead Pre‑Rides or Warm‑ups</div>
        </div>
      </div>
      <span class="coaches-only-badge">🟣 Coaches Only</span>
    </div>

    <div style="padding:18px 18px 0">
      <div class="info-banner">
        <span>ℹ️</span>
        <div>Each session needs a <strong>Ride Leader (Level 2+)</strong> and optional <strong>Ride Support</strong> (L1‑L3). Add any name to volunteer.</div>
      </div>

      <div class="session-tabs">
        <div class="session-tab" :class="{ active: activeSession === 'pr' }" @click="activeSession = 'pr'">
          <div class="st-icon">🚵</div>
          <div class="st-name">Pre‑Rides</div>
          <div class="st-sub">Course preview</div>
        </div>
        <div class="session-tab" :class="{ active: activeSession === 'wu' }" @click="activeSession = 'wu'">
          <div class="st-icon">🔥</div>
          <div class="st-name">Warm‑ups</div>
          <div class="st-sub">Race‑day warm‑up</div>
        </div>
      </div>
    </div>

    <!-- Pre‑Rides -->
    <div v-show="activeSession === 'pr'" class="session-content" style="padding:0 18px 18px">
      <div class="day-header"><div class="day-label">Saturday</div><div class="day-date">Sept 5</div><span class="tag tag-south">South Conference</span></div>
      <div class="slot-list">
        <div class="slot-card" v-for="slotId in ['A','B']" :key="slotId" :class="{ full: getCapStyle(slotId).full }">
          <div class="slot-top">
            <div class="slot-time-col">
              <div class="slot-time" v-if="slotId==='A'">5:00 – 6:00 PM</div>
              <div class="slot-time" v-else>6:00 – 7:00 PM</div>
              <div class="slot-duration">60 min</div>
            </div>
            <div class="slot-body">
              <div class="slot-name" v-if="slotId==='A'">🟣 Coaches Only Pre‑Ride</div>
              <div class="slot-name" v-else>🔴 Varsity / JV3 Pre‑Ride</div>
              <div class="slot-desc">{{ slotId==='A' ? 'Course preview for credentialed coaches only.' : 'Guided preview for Varsity & JV3 athletes.' }}</div>
              <div class="slot-cap">
                <div class="cap-bar"><div class="cap-fill" :class="getCapStyle(slotId).cls" :style="{ width: getCapStyle(slotId).fill + '%' }"></div></div>
                <span class="cap-text" :style="getCapStyle(slotId).full ? 'color:var(--accent-red)' : ''">{{ getCapStyle(slotId).text }}</span>
              </div>
            </div>
          </div>
          <div class="person-rows">
            <div class="person-row">
              <span class="role-label role-leader">⭐ Ride Leader</span>
              <span class="cert-badge cert-l2plus">L2+ Required</span>
              <span v-if="getLeaderName(slotId)" class="person-name">{{ getLeaderName(slotId) }}</span>
              <span v-else class="person-name empty">— Available</span>
              <button class="action-btn" :class="{ 'remove-btn': getLeaderName(slotId) }" @click="toggleLeader(slotId)">
                {{ getLeaderName(slotId) ? '✕' : 'Add Name' }}
              </button>
            </div>
            <div class="support-rows">
              <div v-if="!supportCoaches[slotId] || supportCoaches[slotId].length === 0" class="empty-placeholder">No ride support yet.</div>
              <div v-for="(name, idx) in supportCoaches[slotId]" :key="idx" class="person-row">
                <span class="role-label role-support">🚵 Ride Support</span>
                <span class="cert-badge cert-l2">L2</span>
                <span class="person-name">{{ name }}</span>
                <button class="remove-btn" @click="removeSupport(slotId, idx)">✕</button>
              </div>
            </div>
            <div class="add-support-row"><button class="add-support-btn" @click="addSupport(slotId)">+ Add Name to Ride Support</button></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Warm‑ups -->
    <div v-show="activeSession === 'wu'" class="session-content" style="padding:0 18px 18px">
      <div class="day-header"><div class="day-label">Sunday</div><div class="day-date">Sept 6 — Race Day</div><span class="tag tag-north">North Conference</span></div>
      <div class="slot-list">
        <div class="slot-card" v-for="slotId in ['E','F','G','H']" :key="slotId" :class="{ full: getCapStyle(slotId).full }">
          <div class="slot-top">
            <div class="slot-time-col">
              <div class="slot-time" v-if="slotId==='E'">8:30 – 9:00 AM</div>
              <div class="slot-time" v-else-if="slotId==='F'">8:30 – 9:15 AM</div>
              <div class="slot-time" v-else-if="slotId==='G'">9:00 – 9:30 AM</div>
              <div class="slot-time" v-else>7:00 – 7:45 AM</div>
              <div class="slot-duration">{{ slotId==='F' ? '45' : slotId==='E' ? '30' : slotId==='G' ? '30' : '45' }} min</div>
            </div>
            <div class="slot-body">
              <div class="slot-name" v-if="slotId==='E'">🟢 JV1 / JV2 Warmup</div>
              <div class="slot-name" v-else-if="slotId==='F'">🔴 JV3 / Varsity Warmup</div>
              <div class="slot-name" v-else-if="slotId==='G'">⚡ First‑Wave Activation</div>
              <div class="slot-name" v-else>🟢 All‑Levels Warmup</div>
              <div class="slot-desc">{{ slotId==='E' ? 'Warm‑up for younger athletes.' : slotId==='F' ? 'Higher‑intensity warm‑up.' : slotId==='G' ? 'Last‑minute activation.' : 'General warm‑up for all.' }}</div>
              <div class="slot-cap">
                <div class="cap-bar"><div class="cap-fill" :class="getCapStyle(slotId).cls" :style="{ width: getCapStyle(slotId).fill + '%' }"></div></div>
                <span class="cap-text" :style="getCapStyle(slotId).full ? 'color:var(--accent-red)' : ''">{{ getCapStyle(slotId).text }}</span>
              </div>
            </div>
          </div>
          <div class="person-rows">
            <div class="person-row">
              <span class="role-label role-leader">⭐ Ride Leader</span>
              <span class="cert-badge cert-l2plus">L2+ Required</span>
              <span v-if="getLeaderName(slotId)" class="person-name">{{ getLeaderName(slotId) }}</span>
              <span v-else class="person-name empty">— Available</span>
              <button class="action-btn" :class="{ 'remove-btn': getLeaderName(slotId) }" @click="toggleLeader(slotId)">
                {{ getLeaderName(slotId) ? '✕' : 'Add Name' }}
              </button>
            </div>
            <div class="support-rows">
              <div v-if="!supportCoaches[slotId] || supportCoaches[slotId].length === 0" class="empty-placeholder">No ride support yet.</div>
              <div v-for="(name, idx) in supportCoaches[slotId]" :key="idx" class="person-row">
                <span class="role-label role-support">🚵 Ride Support</span>
                <span class="cert-badge cert-l2">L2</span>
                <span class="person-name">{{ name }}</span>
                <button class="remove-btn" @click="removeSupport(slotId, idx)">✕</button>
              </div>
            </div>
            <div class="add-support-row"><button class="add-support-btn" @click="addSupport(slotId)">+ Add Name to Ride Support</button></div>
          </div>
        </div>
      </div>
    </div>

    <div class="notes-box"><span>⚠️</span><div><strong>Pre‑Ride Policy:</strong> Ride Leader must hold NICA Level 2+ and is responsible for participants.</div></div>
  </div>
</template>

<style scoped>
.event-coach-card { margin-bottom: 20px; }
.coaches-only-badge { background: var(--accent-purple-sub); border: 1px solid rgba(167,139,250,0.3); color: var(--accent-purple); border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
.info-banner { display: flex; gap: 12px; background: rgba(167,139,250,0.05); border: 1px solid rgba(167,139,250,0.13); border-radius: 8px; padding: 12px 14px; margin-bottom: 20px; font-size: 13px; color: var(--text-muted); line-height: 1.6; }
.info-banner strong { color: var(--text-main); }
.session-tabs { display: flex; gap: 10px; margin-bottom: 22px; }
.session-tab { flex: 1; padding: 12px 16px; background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.15s; }
.session-tab:hover { border-color: var(--border-strong); }
.session-tab.active { border-color: var(--accent-red); background: var(--accent-red-subtle); }
.st-icon { font-size: 24px; margin-bottom: 4px; }
.st-name { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-muted); }
.session-tab.active .st-name { color: var(--accent-red); }
.st-sub { font-size: 11px; color: var(--text-dim); margin-top: 2px; }
.day-header { display: flex; align-items: center; gap: 8px; margin: 20px 0 10px; }
.day-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: var(--text-muted); }
.day-date { font-size: 11px; color: var(--text-dim); background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 4px; padding: 1px 7px; }
.tag { display: inline-flex; align-items: center; padding: 1px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
.tag-south { background: rgba(245,158,11,0.12); color: var(--accent-amber); border: 1px solid rgba(245,158,11,0.2); }
.tag-north { background: var(--accent-red-subtle); color: var(--accent-red); border: 1px solid rgba(239,68,68,0.2); }
.slot-list { display: flex; flex-direction: column; gap: 12px; }
.slot-card { background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; transition: border-color 0.15s; }
.slot-card:hover { border-color: var(--border-strong); }
.slot-card.full { opacity: 0.65; }
.slot-top { display: flex; align-items: flex-start; gap: 14px; padding: 14px 16px 10px; }
.slot-time-col { min-width: 108px; }
.slot-time { font-size: 13px; font-weight: 700; }
.slot-duration { font-size: 11px; color: var(--text-dim); margin-top: 2px; }
.slot-body { flex: 1; }
.slot-name { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
.slot-desc { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
.slot-cap { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.cap-bar { flex: 1; max-width: 80px; height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; }
.cap-fill { height: 100%; border-radius: 2px; background: var(--accent-green); transition: width 0.3s; }
.cap-fill.warn { background: var(--accent-amber); }
.cap-fill.full-c { background: var(--accent-red); }
.cap-text { font-size: 11px; color: var(--text-dim); }
.person-rows { border-top: 1px solid var(--border); }
.person-row { display: flex; align-items: center; gap: 10px; padding: 8px 16px; border-bottom: 1px solid var(--border); }
.person-row:last-child { border-bottom: none; }
.role-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; white-space: nowrap; display: flex; align-items: center; gap: 5px; }
.role-leader { color: #fbbf24; }
.role-support { color: var(--text-muted); }
.cert-badge { display: inline-flex; align-items: center; border-radius: 20px; padding: 1px 7px; font-size: 10px; font-weight: 700; letter-spacing: 0.3px; white-space: nowrap; }
.cert-l2plus { background: var(--accent-purple-sub); border: 1px solid rgba(167,139,250,0.25); color: var(--accent-purple); }
.cert-l2 { background: rgba(245,158,11,0.09); border: 1px solid rgba(245,158,11,0.22); color: var(--accent-amber); }
.person-name { font-size: 13px; font-weight: 600; color: var(--text-main); flex: 1; }
.person-name.empty { font-style: italic; color: var(--text-dim); font-weight: 400; }
.action-btn { margin-left: auto; background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.28); color: var(--accent-purple); border-radius: 6px; padding: 5px 12px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.action-btn:hover { background: rgba(167,139,250,0.18); }
.remove-btn { margin-left: auto; background: none; border: 1px solid transparent; color: var(--text-dim); border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; transition: all 0.12s; }
.remove-btn:hover { color: var(--accent-red); border-color: rgba(239,68,68,0.3); }
.add-support-row { padding: 8px 16px 12px; }
.add-support-btn { background: none; border: 1px dashed var(--border-strong); color: var(--text-muted); border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; width: 100%; text-align: center; }
.add-support-btn:hover { border-color: var(--text-dim); color: var(--text-main); background: rgba(255,255,255,0.02); }
.empty-placeholder { font-size: 12px; font-style: italic; color: var(--text-dim); padding: 8px 16px; }
.notes-box { background: rgba(245,158,11,0.04); border: 1px solid rgba(245,158,11,0.16); border-radius: 8px; padding: 11px 14px; font-size: 12px; color: var(--text-muted); display: flex; gap: 9px; margin-top: 16px; line-height: 1.6; }
.notes-box strong { color: var(--accent-amber); }
@media (max-width: 560px) { .slot-top { flex-wrap: wrap; } .slot-time-col { min-width: 100%; } .session-tabs { flex-direction: column; } }
</style>
