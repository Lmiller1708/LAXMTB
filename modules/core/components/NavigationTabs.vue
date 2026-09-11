<script setup lang="ts">
export type TabType = 'details' | 'coach' | 'list' | 'results' | 'photos'

defineProps<{
  currentTab: TabType
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'changeTab', tab: TabType): void
}>()

const onTabClick = (tab: TabType, event: MouseEvent) => {
  emit('changeTab', tab)
  const target = event.currentTarget as HTMLElement | null
  if (target?.scrollIntoView) {
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }
}
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
            @click="onTabClick('details', $event)"
          >
            <span>📋</span> Event Details
          </div>
          <div
            class="nav-tab"
            :class="currentTab === 'coach' ? 'active' : 'inactive'"
            id="tabCoachSignups"
            @click="onTabClick('coach', $event)"
          >
            <span>🚵</span> Coach Sign-Ups
          </div>
          <div
            class="nav-tab"
            :class="currentTab === 'list' ? 'active' : 'inactive'"
            id="tabStartLists"
            @click="onTabClick('list', $event)"
          >
            <span>🏁</span> Start Lists
          </div>
          <div
            class="nav-tab"
            :class="currentTab === 'results' ? 'active' : 'inactive'"
            id="tabLiveResults"
            @click="onTabClick('results', $event)"
          >
            <span>⏱️</span> Results
          </div>
          <div
            class="nav-tab"
            :class="currentTab === 'photos' ? 'active' : 'inactive'"
            id="tabPhotos"
            @click="onTabClick('photos', $event)"
          >
            <span>📸</span> Team Photos
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.sub-nav-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.sub-nav-container::-webkit-scrollbar {
  display: none;
}

.sub-nav-row {
  display: flex;
  align-items: center;
  min-height: var(--subnav-height, 40px);
  width: max-content;
  min-width: 100%;
}

.nav-tabs {
  display: flex;
  gap: 16px;
  flex-shrink: 0;
  padding-right: 18px;
}

.nav-tab {
  white-space: nowrap;
  flex-shrink: 0;
}

@media (max-width: 520px) {
  .nav-tabs {
    gap: 12px;
  }
}
@media (max-width: 380px) {
  .nav-tabs {
    gap: 8px;
  }
}
</style>

