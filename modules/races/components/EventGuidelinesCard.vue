<script setup lang="ts">
import DOMPurify from 'dompurify'

defineProps<{
  guidelines?: string[]
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()

const isOpen = ref(true)

const sanitizeGuideline = (text: string) => {
  if (!text) return ''
  if (import.meta.server || typeof DOMPurify?.sanitize !== 'function') return text
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'span', 'br', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  })
}
</script>

<template>
  <div class="detail-section" :class="{ 'card-collapsed': !isOpen }" id="guidelinesDetailSection">
    <div class="detail-section-header collapsible-header" @click="isOpen = !isOpen">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="detail-section-title"><span>🏕️</span> Venue Guidelines & Spectator Info</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button
          v-if="isCoachAuth"
          type="button"
          class="card-inline-edit-btn"
          title="Edit Guidelines & Announcements"
          @click.stop="emit('edit')"
        >
          <span>✏️</span>
        </button>
        <span class="card-toggle-icon" :class="{ collapsed: !isOpen }" title="Toggle Guidelines">▼</span>
      </div>
    </div>
    <div v-show="isOpen" class="collapsible-body detail-section-body">
      <div v-if="!guidelines || guidelines.length === 0" class="no-results" style="padding:16px;">
        No specific guidelines posted yet for this venue.
      </div>
      <div v-else style="display:flex;flex-direction:column;gap:6px;">
        <p
          v-for="(g, idx) in guidelines"
          :key="idx"
          class="guideline-item"
        >
          • <span v-html="sanitizeGuideline(g)" />
        </p>
      </div>
    </div>
  </div>
</template>
