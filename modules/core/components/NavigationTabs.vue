<script setup lang="ts">
export type TabType = 'details' | 'coach' | 'list' | 'results' | 'photos'

defineProps<{
  currentTab: TabType
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'changeTab', tab: TabType): void
}>()
</script>

<template>
  <nav class="sub-nav-sticky-wrapper">
    <div class="sub-nav-container">
      <div class="sub-nav-row">
        <div class="nav-tabs">
          <div
            class="nav-tab"
            :class="currentTab === 'details' ? 'active' : 'inactive'"
            id="tabEventDetails"
            @click="emit('changeTab', 'details')"
          >
            <span>📋</span> Event Details
          </div>
          <div
            class="nav-tab"
            :class="currentTab === 'coach' ? 'active' : 'inactive'"
            id="tabCoachSignups"
            @click="emit('changeTab', 'coach')"
          >
            <span>🚵</span> Coach Sign-Ups
          </div>
          <div
            class="nav-tab"
            :class="currentTab === 'list' ? 'active' : 'inactive'"
            id="tabStartLists"
            @click="emit('changeTab', 'list')"
          >
            <span>🏁</span> Start Lists
          </div>
          <div
            class="nav-tab"
            :class="currentTab === 'results' ? 'active' : 'inactive'"
            id="tabLiveResults"
            @click="emit('changeTab', 'results')"
          >
            <span>⏱️</span> Results
          </div>
          <div
            class="nav-tab"
            :class="currentTab === 'photos' ? 'active' : 'inactive'"
            id="tabPhotos"
            @click="emit('changeTab', 'photos')"
          >
            <span>📸</span> Team Photos
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>
