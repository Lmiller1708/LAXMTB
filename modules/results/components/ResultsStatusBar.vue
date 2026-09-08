<script setup lang="ts">
defineProps<{
  filteredCount: number
  totalCount: number
  lastUpdated: string
  allCardsCollapsed: boolean
}>()

const emit = defineEmits<{
  (e: 'toggleAll'): void
  (e: 'print'): void
}>()
</script>

<template>
  <div class="status-bar" id="statusBar">
    <div class="status-info-group">
      <span id="statusCount">
        Showing <span class="stat-bold">{{ filteredCount }}</span> of <span class="stat-bold">{{ totalCount }}</span> riders
      </span>
      <span class="status-dot-sep">•</span>
      <span id="lastUpdatedText">{{ lastUpdated || 'Connecting...' }}</span>
    </div>
    <div class="status-actions-group">
      <button
        class="btn-action-pill"
        id="toggleAllCardsBtn"
        :title="allCardsCollapsed ? 'Expand All Cards' : 'Collapse All Cards'"
        @click="emit('toggleAll')"
      >
        <span>↕️</span>
        <span id="toggleAllCardsLabel">{{ allCardsCollapsed ? 'Expand All' : 'Collapse All' }}</span>
      </button>
      <button
        class="btn-action-pill"
        title="Print page or save as PDF"
        @click="emit('print')"
      >
        <span>📄</span> Print / PDF
      </button>
    </div>
  </div>
</template>
