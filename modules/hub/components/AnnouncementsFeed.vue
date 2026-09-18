<script setup lang="ts">
import type { Announcement } from '../types/hub'

const props = defineProps<{
  announcements: Announcement[]
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  (e: 'new'): void
  (e: 'edit', item: Announcement): void
  (e: 'delete', id: string): void
}>()

const formatTimestamp = (isoStr?: string): string => {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    if (isNaN(d.getTime())) return isoStr

    const now = Date.now()
    const diffHours = (now - d.getTime()) / (1000 * 60 * 60)

    if (diffHours < 1) {
      const diffMins = Math.max(1, Math.round((now - d.getTime()) / (1000 * 60)))
      return `${diffMins}m ago`
    }
    if (diffHours < 24) {
      return `${Math.round(diffHours)}h ago`
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return isoStr
  }
}

const isNew = (isoStr?: string): boolean => {
  if (!isoStr) return false
  try {
    const d = new Date(isoStr)
    const diffHours = (Date.now() - d.getTime()) / (1000 * 60 * 60)
    return diffHours <= 48
  } catch {
    return false
  }
}
</script>

<template>
  <div class="announcements-feed-container">
    <div class="feed-header">
      <div class="feed-header-left">
        <span class="feed-badge">TEAM BULLETINS</span>
        <h3 class="feed-title">Announcements & Alerts</h3>
      </div>

      <button
        v-if="isAdmin"
        type="button"
        class="hub-btn hub-btn-primary hub-btn-sm"
        @click="emit('new')"
      >
        <span>＋ New Announcement</span>
      </button>
    </div>

    <!-- Feed Items -->
    <div v-if="announcements && announcements.length" class="feed-list">
      <div
        v-for="ann in announcements"
        :key="ann.id"
        class="announcement-card"
        :class="[
          `type-${ann.type}`,
          `priority-${ann.priority}`,
          { 'is-pinned': ann.pinned }
        ]"
      >
        <div class="ann-top-row">
          <div class="ann-badge-group">
            <span v-if="ann.pinned" class="badge-pinned">
              📌 PINNED
            </span>

            <span
              v-if="ann.type === 'practice-update'"
              class="badge-type badge-practice"
            >
              🚴 PRACTICE UPDATE
            </span>
            <span
              v-else-if="ann.type === 'schedule-change'"
              class="badge-type badge-schedule"
            >
              🗓️ SCHEDULE
            </span>
            <span
              v-else-if="ann.type === 'safety'"
              class="badge-type badge-safety"
            >
              ⚠️ SAFETY
            </span>
            <span
              v-else-if="ann.type === 'team-store'"
              class="badge-type badge-store"
            >
              🛒 STORE
            </span>
            <span v-else class="badge-type badge-general">
              ℹ️ GENERAL
            </span>

            <span v-if="ann.priority === 'urgent'" class="badge-priority badge-urgent">
              URGENT
            </span>
            <span v-else-if="ann.priority === 'important'" class="badge-priority badge-important">
              IMPORTANT
            </span>

            <span v-if="isNew(ann.createdAt)" class="badge-new">NEW</span>
          </div>

          <div class="ann-meta-right">
            <span class="time-stamp">{{ formatTimestamp(ann.createdAt) }}</span>

            <div v-if="isAdmin" class="admin-actions">
              <button
                type="button"
                class="icon-action-btn"
                title="Edit announcement"
                @click="emit('edit', ann)"
              >
                ✏️
              </button>
              <button
                type="button"
                class="icon-action-btn delete-btn"
                title="Delete announcement"
                @click="emit('delete', ann.id)"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>

        <h4 class="ann-title">{{ ann.title }}</h4>
        <p class="ann-message">{{ ann.message }}</p>

        <!-- Attachments -->
        <div v-if="ann.attachments && ann.attachments.length" class="ann-attachments">
          <a
            v-for="(att, idx) in ann.attachments"
            :key="idx"
            :href="att.url"
            target="_blank"
            rel="noopener noreferrer"
            class="ann-att-chip"
          >
            <span>📎</span>
            <span>{{ att.label }}</span>
            <span>↗</span>
          </a>
        </div>
      </div>
    </div>

    <div v-else class="empty-feed-card">
      <span class="empty-icon">📯</span>
      <p>No active announcements at this time.</p>
    </div>
  </div>
</template>

<style scoped>
.announcements-feed-container {
  margin-bottom: 28px;
}

.feed-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.feed-badge {
  font-family: 'Teko', sans-serif;
  font-size: 13.5px;
  letter-spacing: 1px;
  color: #dc2626;
  font-weight: 700;
  text-transform: uppercase;
}

.feed-title {
  margin: 2px 0 0 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.announcement-card {
  background: var(--bg-card, #171717);
  border: 1px solid var(--border, #262626);
  border-left: 4px solid #3b82f6;
  border-radius: 10px;
  padding: 16px 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s, border-color 0.15s;
}

.announcement-card:hover {
  border-color: var(--border-strong, #3f3f3f);
}

.announcement-card.is-pinned {
  background: rgba(220, 38, 38, 0.04);
  border-left-color: #dc2626;
}

.announcement-card.type-practice-update {
  border-left-color: #f59e0b;
}

.announcement-card.type-schedule-change {
  border-left-color: #ef4444;
}

.announcement-card.type-safety {
  border-left-color: #ef4444;
}

.announcement-card.type-team-store {
  border-left-color: #10b981;
}

.ann-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 10px;
  flex-wrap: wrap;
}

.ann-badge-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.badge-pinned {
  font-size: 11px;
  font-weight: 800;
  color: #f87171;
  background: rgba(239, 68, 68, 0.15);
  padding: 2px 7px;
  border-radius: 4px;
}

.badge-type {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
}

.badge-practice {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.badge-schedule {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.badge-safety {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.badge-store {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.badge-general {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
}

.badge-priority {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-urgent {
  background: #dc2626;
  color: #ffffff;
}

.badge-important {
  background: #d97706;
  color: #ffffff;
}

.badge-new {
  font-size: 10px;
  font-weight: 800;
  background: #2563eb;
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 4px;
}

.ann-meta-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-stamp {
  font-size: 12px;
  color: var(--text-dim, #707070);
  font-weight: 600;
}

.admin-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 13px;
  padding: 3px 6px;
  border-radius: 4px;
  opacity: 0.7;
  transition: opacity 0.15s, background 0.15s;
}

.icon-action-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.08);
}

.ann-title {
  margin: 0 0 6px 0;
  font-size: 15.5px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
}

.ann-message {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--text-muted, #d1d5db);
  white-space: pre-wrap;
}

.ann-attachments {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ann-att-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-subtle, #202020);
  border: 1px solid var(--border, #2c2c2c);
  color: var(--text-main, #f3f4f6);
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s;
}

.ann-att-chip:hover {
  border-color: #3b82f6;
  color: #60a5fa;
}

.empty-feed-card {
  text-align: center;
  padding: 32px 16px;
  background: var(--bg-card, #171717);
  border: 1px dashed var(--border, #262626);
  border-radius: 10px;
  color: var(--text-muted, #9ca3af);
  font-size: 13.5px;
}

.empty-icon {
  font-size: 28px;
  display: block;
  margin-bottom: 6px;
}

.hub-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 12.5px;
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
</style>
