<script setup lang="ts">
import type { PracticePlan } from '../types/hub'

const props = defineProps<{
  plan: PracticePlan | null
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  (e: 'new'): void
  (e: 'edit', plan: PracticePlan): void
  (e: 'duplicate', planId: string): void
}>()
</script>

<template>
  <div v-if="plan" class="practice-plan-card">
    <!-- Header -->
    <div class="card-header">
      <div class="header-left">
        <span class="plan-tag">COACHES CORNER // PRACTICE PLAN</span>
        <h2 class="plan-title">{{ plan.title }}</h2>
        <div class="plan-meta-row">
          <span class="meta-item date-item">📅 {{ plan.date }}</span>
          <span class="meta-item time-item">⏰ {{ plan.time }}</span>
          <span class="meta-item location-item">📍 {{ plan.location }}</span>
        </div>
      </div>

      <div class="header-right">
        <span v-if="plan.status === 'draft'" class="draft-badge">DRAFT</span>

        <button
          v-if="isAdmin"
          type="button"
          class="hub-btn hub-btn-secondary hub-btn-sm"
          title="Create a new practice plan"
          @click="emit('new')"
        >
          <span>＋ New Practice Plan</span>
        </button>

        <button
          v-if="isAdmin"
          type="button"
          class="hub-btn hub-btn-primary hub-btn-sm"
          @click="emit('edit', plan)"
        >
          <span>✏️ Edit Plan</span>
        </button>
      </div>
    </div>

    <!-- Objectives & Materials Row -->
    <div class="two-col-grid">
      <!-- Objectives -->
      <div class="panel-box">
        <div class="panel-title">
          <span>🎯</span>
          <span>Practice Objectives</span>
        </div>
        <ul v-if="plan.objectives && plan.objectives.length" class="styled-list">
          <li v-for="(obj, i) in plan.objectives" :key="i">{{ obj }}</li>
        </ul>
        <p v-else class="empty-field-text">No specific objectives entered.</p>
      </div>

      <!-- Materials -->
      <div class="panel-box">
        <div class="panel-title">
          <span>🎒</span>
          <span>Materials & Gear Required</span>
        </div>
        <ul v-if="plan.materials && plan.materials.length" class="styled-list materials-list">
          <li v-for="(mat, i) in plan.materials" :key="i">
            <span class="check-box">☑</span>
            <span>{{ mat }}</span>
          </li>
        </ul>
        <p v-else class="empty-field-text">Standard coach packs & first aid kits.</p>
      </div>
    </div>

    <!-- Coach Activities Timeline -->
    <div v-if="plan.coachActivities && plan.coachActivities.length" class="section-container">
      <div class="section-title-bar">
        <span>⏱️</span>
        <h3>Session Timeline & Coach Activities</h3>
      </div>
      <div class="timeline-items">
        <div
          v-for="(act, idx) in plan.coachActivities"
          :key="idx"
          class="timeline-card"
        >
          <div class="timeline-time-badge">{{ act.time }}</div>
          <div class="timeline-details">
            <h4 class="timeline-activity-name">{{ act.activity }}</h4>
            <p v-if="act.details" class="timeline-activity-desc">{{ act.details }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Trail Ride Groups & Coaches -->
    <div v-if="plan.rideGroups && plan.rideGroups.length" class="section-container">
      <div class="section-title-bar">
        <span>🚵</span>
        <h3>Trail Group Assignments</h3>
      </div>
      <div class="groups-grid">
        <div v-for="(rg, idx) in plan.rideGroups" :key="idx" class="ride-group-card">
          <div class="group-header">
            <h4 class="group-name">{{ rg.name }}</h4>
          </div>
          <div class="group-info-row">
            <span class="group-label">COACHES:</span>
            <span class="group-value highlight">{{ rg.coach }}</span>
          </div>
          <div class="group-info-row">
            <span class="group-label">TRAIL:</span>
            <span class="group-value">{{ rg.trail }}</span>
          </div>
          <div v-if="rg.focus" class="group-info-row">
            <span class="group-label">FOCUS:</span>
            <span class="group-value">{{ rg.focus }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Cool-Down & Coach Wrap-Up Notes -->
    <div v-if="plan.coolDown || plan.coachDebrief !== undefined" class="panel-box cooldown-box">
      <div class="panel-title">
        <span>🙌</span>
        <span>Cool-Down & Coach Wrap-Up</span>
      </div>
      <p v-if="plan.coolDown" class="cooldown-text">{{ plan.coolDown }}</p>

      <!-- Coach Debrief & Radio Return Panel -->
      <div class="coach-debrief-panel">
        <div class="debrief-panel-header">
          <span class="debrief-radio-icon">📻</span>
          <span class="debrief-panel-title">Coach Debrief & Radio Return</span>
        </div>
        <ol class="debrief-checklist">
          <li>Anything to report?</li>
          <li>What went well, do again?</li>
          <li>What could be better?</li>
        </ol>
        <p v-if="plan.coachDebrief" class="debrief-custom-notes">{{ plan.coachDebrief }}</p>
      </div>
    </div>
  </div>

  <div v-else class="empty-plan-state">
    <span class="empty-icon">📋</span>
    <h3>No Practice Plan Active</h3>
    <p>Practice plans will appear here once published by the Coaching Director.</p>
    <button
      v-if="isAdmin"
      type="button"
      class="hub-btn hub-btn-primary"
      @click="emit('edit', null as any)"
    >
      Create Practice Plan
    </button>
  </div>
</template>

<style scoped>
.practice-plan-card {
  background: var(--bg-card, #171717);
  border: 1px solid var(--border, #262626);
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
}

.practice-plan-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 5px;
  height: 100%;
  background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border, #262626);
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.plan-tag {
  font-family: 'Teko', sans-serif;
  font-size: 14px;
  letter-spacing: 1px;
  color: #60a5fa;
  font-weight: 700;
  text-transform: uppercase;
}

.plan-title {
  margin: 4px 0 8px 0;
  font-size: 24px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
  line-height: 1.2;
}

.plan-meta-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted, #9ca3af);
  background: var(--bg-subtle, #202020);
  padding: 4px 9px;
  border-radius: 6px;
}

.meta-item.location-item {
  color: #f87171;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.draft-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

/* Two Column Grid */
.two-col-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 22px;
}

.panel-box {
  background: var(--bg-subtle, #202020);
  border: 1px solid var(--border, #2c2c2c);
  border-radius: 10px;
  padding: 16px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.styled-list {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13.5px;
  color: var(--text-muted, #d1d5db);
  line-height: 1.45;
}

.materials-list {
  padding-left: 0;
  list-style: none;
}

.materials-list li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.check-box {
  color: #10b981;
  font-size: 14px;
}

.empty-field-text {
  margin: 0;
  font-size: 13px;
  font-style: italic;
  color: var(--text-dim, #707070);
}

/* Timeline */
.section-container {
  margin-bottom: 22px;
}

.section-title-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-title-bar h3 {
  margin: 0;
  font-size: 15.5px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
}

.timeline-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeline-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: var(--bg-subtle, #202020);
  border: 1px solid var(--border, #2c2c2c);
  padding: 12px 16px;
  border-radius: 8px;
}

.timeline-time-badge {
  font-size: 12.5px;
  font-weight: 800;
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.12);
  border: 1px solid rgba(96, 165, 250, 0.25);
  padding: 4px 10px;
  border-radius: 6px;
  white-space: nowrap;
}

.timeline-details {
  flex: 1;
}

.timeline-activity-name {
  margin: 0 0 4px 0;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text-main, #f3f4f6);
}

.timeline-activity-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted, #9ca3af);
  line-height: 1.45;
}

/* Ride Groups Grid */
.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.ride-group-card {
  background: var(--bg-subtle, #202020);
  border: 1px solid var(--border, #2c2c2c);
  border-top: 3px solid #10b981;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 6px;
}

.group-name {
  margin: 0;
  font-size: 14.5px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
}

.group-info-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12.5px;
}

.group-label {
  font-weight: 800;
  color: var(--text-dim, #707070);
  min-width: 60px;
  flex-shrink: 0;
}

.group-value {
  color: var(--text-muted, #d1d5db);
  font-weight: 600;
}

.group-value.highlight {
  color: #34d399;
}

/* Cooldown */
.cooldown-box {
  border-left: 3px solid #f59e0b;
  margin-bottom: 20px;
}

.cooldown-text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text-main, #e5e7eb);
}

/* Coach Debrief & Radio Return */
.coach-debrief-panel {
  margin-top: 14px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.28);
  border-radius: 8px;
  padding: 12px 16px;
}

.debrief-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.debrief-radio-icon {
  font-size: 16px;
}

.debrief-panel-title {
  font-size: 13px;
  font-weight: 800;
  color: #93c5fd;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.debrief-checklist {
  margin: 0 0 0 18px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 13px;
  color: var(--text-main, #f3f4f6);
  line-height: 1.4;
}

.debrief-custom-notes {
  margin: 10px 0 0 0;
  padding-top: 8px;
  border-top: 1px solid rgba(59, 130, 246, 0.2);
  font-size: 12.5px;
  color: var(--text-muted, #9ca3af);
  line-height: 1.45;
  white-space: pre-wrap;
}

/* Buttons */
.hub-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.hub-btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}

.hub-btn-primary {
  background: #3b82f6;
  color: #ffffff;
}

.hub-btn-primary:hover {
  background: #2563eb;
}

.hub-btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main, #f3f4f6);
  border-color: var(--border, #2c2c2c);
}

.hub-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.14);
}

.empty-plan-state {
  text-align: center;
  padding: 48px 24px;
  background: var(--bg-card, #171717);
  border: 1px dashed var(--border, #262626);
  border-radius: 14px;
  color: var(--text-muted, #9ca3af);
}

.empty-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 12px;
}
</style>
