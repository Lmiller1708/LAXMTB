<script setup lang="ts">
import type { WeeklyUpdate } from '../types/hub'

const props = defineProps<{
  update: WeeklyUpdate | null
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  (e: 'new'): void
  (e: 'edit', update: WeeklyUpdate): void
  (e: 'duplicate', updateId: string): void
}>()

const formatDate = (isoStr?: string): string => {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    if (isNaN(d.getTime())) return isoStr
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return isoStr
  }
}
</script>

<template>
  <div v-if="update" class="weekly-update-card">
    <!-- Header with status & admin actions -->
    <div class="card-header">
      <div class="header-left">
        <span class="week-badge">THIS WEEK</span>
        <h2 class="update-title">{{ update.title }}</h2>
        <span v-if="update.status === 'draft'" class="draft-badge">DRAFT (Unpublished)</span>
      </div>

      <div class="header-right">
        <div v-if="update.emailSent" class="email-sent-badge" title="Dispatched to Google Group">
          <span>✉️ Emailed to Team</span>
        </div>

        <button
          v-if="isAdmin"
          type="button"
          class="hub-btn hub-btn-secondary hub-btn-sm"
          title="Create a new weekly update"
          @click="emit('new')"
        >
          <span>＋ New Weekly Update</span>
        </button>

        <button
          v-if="isAdmin"
          type="button"
          class="hub-btn hub-btn-primary hub-btn-sm"
          @click="emit('edit', update)"
        >
          <span>✏️ Edit</span>
        </button>
      </div>
    </div>

    <!-- Practice Schedule Highlight Block -->
    <div
      class="practice-spotlight"
      :class="{
        'is-canceled': update.practiceStatus === 'canceled',
        'is-moved': update.practiceStatus === 'moved'
      }"
    >
      <div class="practice-spotlight-top">
        <div class="practice-label-group">
          <span class="spotlight-tag">PRACTICE SCHEDULE</span>
          <span
            v-if="update.practiceStatus === 'canceled'"
            class="status-pill status-pill-canceled"
          >
            🚨 CANCELED
          </span>
          <span
            v-else-if="update.practiceStatus === 'moved'"
            class="status-pill status-pill-moved"
          >
            📍 LOCATION MOVED
          </span>
          <span v-else class="status-pill status-pill-scheduled">
            ✅ ON SCHEDULE
          </span>
        </div>

        <span v-if="update.weather" class="weather-chip">
          🌤️ {{ update.weather }}
        </span>
      </div>

      <div class="practice-grid">
        <div class="practice-info-col">
          <span class="info-label">DAYS</span>
          <span class="info-value">{{ update.practiceDays || 'Tues / Thurs' }}</span>
        </div>
        <div class="practice-info-col">
          <span class="info-label">TIME</span>
          <span class="info-value">{{ update.practiceTime || '4:30 PM – 6:30 PM' }}</span>
        </div>
        <div class="practice-info-col span-2">
          <span class="info-label">LOCATION</span>
          <span class="info-value location-name">
            📍 {{ update.practiceLocation || 'Upper Hixon Forest' }}
          </span>
        </div>
      </div>

      <div v-if="update.practiceNote" class="practice-alert-note">
        <span class="note-icon">⚠️</span>
        <span>{{ update.practiceNote }}</span>
      </div>
    </div>

    <!-- Conversational Greeting / Message Body -->
    <div v-if="update.greeting" class="update-body">
      <p class="greeting-text">{{ update.greeting }}</p>
    </div>

    <!-- Upcoming Events Grid -->
    <div v-if="update.upcomingEvents && update.upcomingEvents.length" class="section-block">
      <div class="section-header">
        <span class="section-icon">🗓️</span>
        <h3 class="section-title">Upcoming Events & Deadlines</h3>
      </div>
      <div class="events-list">
        <div v-for="(ev, idx) in update.upcomingEvents" :key="idx" class="event-item-card">
          <div class="event-item-content">
            <h4 class="event-item-title">{{ ev.title }}</h4>
            <p class="event-item-details">{{ ev.details }}</p>
          </div>
          <div v-if="ev.dueDate || ev.link" class="event-item-meta">
            <span v-if="ev.dueDate" class="event-due-tag">⏰ {{ ev.dueDate }}</span>
            <a
              v-if="ev.link"
              :href="ev.link"
              target="_blank"
              rel="noopener noreferrer"
              class="event-link-btn"
            >
              Details &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Team Notes (Raffle, Store, etc.) -->
    <div v-if="update.teamNotes && update.teamNotes.length" class="section-block">
      <div class="section-header">
        <span class="section-icon">📢</span>
        <h3 class="section-title">Team Notes</h3>
      </div>
      <div class="notes-grid">
        <div v-for="(note, idx) in update.teamNotes" :key="idx" class="team-note-card">
          <h4 class="note-title">{{ note.title }}</h4>
          <p class="note-body">{{ note.body }}</p>
          <div v-if="note.link" class="note-action">
            <a
              :href="note.link"
              target="_blank"
              rel="noopener noreferrer"
              class="note-link-btn"
            >
              <span>{{ note.linkLabel || 'Open Link' }}</span>
              <span class="link-arrow">&rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Document Attachments / Google Drive Links -->
    <div v-if="update.attachments && update.attachments.length" class="section-block attachments-block">
      <div class="section-header">
        <span class="section-icon">📎</span>
        <h3 class="section-title">Documents & Shared Links</h3>
      </div>
      <div class="attachments-chips">
        <a
          v-for="(att, idx) in update.attachments"
          :key="idx"
          :href="att.url"
          target="_blank"
          rel="noopener noreferrer"
          class="attachment-chip"
        >
          <span class="attachment-icon">📄</span>
          <span class="attachment-label">{{ att.label }}</span>
          <span class="external-icon">↗</span>
        </a>
      </div>
    </div>

    <!-- Footer Signature -->
    <div class="card-footer">
      <div v-if="update.closingMessage" class="signature-text">
        {{ update.closingMessage }}
      </div>
      <div class="meta-stamp">
        <span>Week of {{ formatDate(update.weekOf) }}</span>
        <span v-if="update.updatedBy" class="meta-dot">•</span>
        <span v-if="update.updatedBy">Updated by {{ update.updatedBy }}</span>
      </div>
    </div>
  </div>

  <div v-else class="empty-update-state">
    <span class="empty-icon">🚴</span>
    <h3>No Weekly Update Published Yet</h3>
    <p>Check back soon for the latest practice schedule and team announcements.</p>
    <button
      v-if="isAdmin"
      type="button"
      class="hub-btn hub-btn-primary"
      @click="emit('edit', null as any)"
    >
      Create First Weekly Update
    </button>
  </div>
</template>

<style scoped>
.weekly-update-card {
  background: var(--bg-card, #171717);
  border: 1px solid var(--border, #262626);
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
}

.weekly-update-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 5px;
  height: 100%;
  background: linear-gradient(180deg, #dc2626 0%, #ef4444 100%);
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

.header-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.week-badge {
  font-family: 'Teko', sans-serif;
  font-size: 14px;
  letter-spacing: 1px;
  color: #dc2626;
  font-weight: 700;
  text-transform: uppercase;
}

.update-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
  line-height: 1.2;
}

.draft-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
  width: fit-content;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.email-sent-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 5px 10px;
  border-radius: 9999px;
}

/* Practice Spotlight */
.practice-spotlight {
  background: var(--bg-subtle, #202020);
  border: 1px solid var(--border, #2c2c2c);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
  transition: border-color 0.2s;
}

.practice-spotlight.is-canceled {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.06);
}

.practice-spotlight.is-moved {
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.06);
}

.practice-spotlight-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.practice-label-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.spotlight-tag {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: var(--text-muted, #9ca3af);
  text-transform: uppercase;
}

.status-pill {
  font-size: 11.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 9999px;
}

.status-pill-scheduled {
  background: rgba(16, 185, 129, 0.18);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-pill-moved {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.status-pill-canceled {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.weather-chip {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted, #9ca3af);
  background: rgba(255, 255, 255, 0.05);
  padding: 3px 8px;
  border-radius: 6px;
}

.practice-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 14px;
}

.practice-info-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.practice-info-col.span-2 {
  grid-column: span 2;
}

@media (max-width: 640px) {
  .practice-info-col.span-2 {
    grid-column: span 1;
  }
}

.info-label {
  font-size: 10px;
  font-weight: 800;
  color: var(--text-dim, #707070);
  letter-spacing: 0.6px;
}

.info-value {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text-main, #f3f4f6);
}

.info-value.location-name {
  color: #f87171;
}

.practice-alert-note {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.12);
  border-left: 3px solid #f59e0b;
  border-radius: 4px;
  color: #fbbf24;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Greeting Body */
.update-body {
  margin-bottom: 24px;
}

.greeting-text {
  font-size: 15px;
  line-height: 1.65;
  color: var(--text-main, #e5e7eb);
  white-space: pre-wrap;
  margin: 0;
}

/* Section Blocks */
.section-block {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-icon {
  font-size: 16px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
  letter-spacing: 0.2px;
}

/* Events List */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: var(--bg-subtle, #202020);
  border: 1px solid var(--border, #2c2c2c);
  padding: 12px 14px;
  border-radius: 8px;
  flex-wrap: wrap;
}

.event-item-content {
  flex: 1;
  min-width: 220px;
}

.event-item-title {
  margin: 0 0 3px 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main, #f3f4f6);
}

.event-item-details {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted, #9ca3af);
  line-height: 1.4;
}

.event-item-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.event-due-tag {
  font-size: 11.5px;
  font-weight: 700;
  color: #f87171;
  background: rgba(239, 68, 68, 0.12);
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.event-link-btn {
  font-size: 12px;
  font-weight: 700;
  color: #60a5fa;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.25);
  transition: all 0.15s;
}

.event-link-btn:hover {
  background: rgba(96, 165, 250, 0.2);
  color: #93c5fd;
}

/* Notes Grid */
.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.team-note-card {
  background: var(--bg-subtle, #202020);
  border: 1px solid var(--border, #2c2c2c);
  border-left: 3px solid #dc2626;
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.note-title {
  margin: 0;
  font-size: 14.5px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
}

.note-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted, #d1d5db);
  white-space: pre-wrap;
  flex: 1;
}

.note-action {
  margin-top: 6px;
}

.note-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #dc2626;
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s, transform 0.1s;
}

.note-link-btn:hover {
  background: #b91c1c;
  transform: translateX(2px);
}

.link-arrow {
  font-size: 14px;
}

/* Attachments Chips */
.attachments-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-subtle, #202020);
  border: 1px solid var(--border, #2c2c2c);
  color: var(--text-main, #f3f4f6);
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s;
}

.attachment-chip:hover {
  border-color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
  color: #ffffff;
}

.attachment-icon {
  font-size: 14px;
}

.external-icon {
  font-size: 11px;
  opacity: 0.7;
}

/* Footer */
.card-footer {
  padding-top: 18px;
  border-top: 1px solid var(--border, #262626);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.signature-text {
  font-size: 14px;
  font-style: italic;
  color: var(--text-muted, #9ca3af);
  white-space: pre-wrap;
}

.meta-stamp {
  font-size: 12px;
  color: var(--text-dim, #707070);
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-dot {
  opacity: 0.5;
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
  background: #dc2626;
  color: #ffffff;
}

.hub-btn-primary:hover {
  background: #b91c1c;
}

.hub-btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main, #f3f4f6);
  border-color: var(--border, #2c2c2c);
}

.hub-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.14);
}

.empty-update-state {
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
