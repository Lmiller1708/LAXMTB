<script setup lang="ts">
import type { ResultsSortOrder, ResultsGroupMode, TeamScope } from '../types/results'

const props = defineProps<{
  currentTab: 'list' | 'results'
  categories: string[]
  isLive: boolean
  totalCount: number
}>()

const searchQuery = defineModel<string>('searchQuery', { default: '' })
const listMode = defineModel<ResultsGroupMode>('listMode', { default: 'WAVE' })
const selectedListId = defineModel<string>('selectedListId', { default: 'A76F6B' })
const sortOrder = defineModel<ResultsSortOrder>('sortOrder', { default: 'GRADE' })
const selectedCategory = defineModel<string>('selectedCategory', { default: 'ALL' })
const selectedTeamScope = defineModel<TeamScope>('selectedTeamScope', { default: 'DEFAULT_TEAMS' })

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const isFilterOpen = ref(false)

const onListChange = () => {
  if (selectedListId.value === '747B52' || selectedListId.value === 'E07F7C') {
    listMode.value = 'TEAM'
  } else {
    listMode.value = 'WAVE'
  }
  emit('refresh')
}

const clearSearch = () => {
  searchQuery.value = ''
}

const toggleFilterDrawer = () => {
  isFilterOpen.value = !isFilterOpen.value
}

const removeCategoryFilter = () => {
  selectedCategory.value = 'ALL'
}

const removeTeamFilter = () => {
  selectedTeamScope.value = 'ALL'
}

const activeFilterChips = computed(() => {
  const chips: { label: string; strongText?: string; isLaxScope?: boolean; onRemove?: () => void }[] = []

  // View chip
  if (selectedListId.value === '747B52' || selectedListId.value === 'E07F7C') {
    chips.push({ label: 'View: ', strongText: 'By Team' })
  } else {
    chips.push({ label: 'View: ', strongText: 'Wave & Category' })
  }

  // Sort chip
  if (sortOrder.value === 'TIME') {
    chips.push({ label: 'Sort: ', strongText: '⏱️ Start Time' })
  }

  // Category chip
  if (selectedCategory.value !== 'ALL') {
    chips.push({
      label: 'Category: ',
      strongText: selectedCategory.value,
      onRemove: removeCategoryFilter
    })
  }

  // Team scope chip
  if (selectedTeamScope.value === 'DEFAULT_TEAMS') {
    chips.push({
      label: 'Scope: ',
      strongText: 'LAXMTB Team',
      isLaxScope: true,
      onRemove: removeTeamFilter
    })
  } else {
    chips.push({
      label: 'Scope: ',
      strongText: 'All Teams'
    })
  }

  // Search query chip
  if (searchQuery.value.trim()) {
    chips.push({
      label: 'Search: ',
      strongText: `"${searchQuery.value.trim()}"`,
      onRemove: clearSearch
    })
  }

  return chips
})
</script>

<template>
  <div class="compact-toolbar" id="controlsPanel">
    <div class="toolbar-main-row">
      <!-- Quick Search -->
      <div class="search-input-wrapper">
        <input
          v-model="searchQuery"
          type="text"
          id="searchInput"
          class="search-input"
          placeholder="Search rider, plate #, team..."
        >
        <button v-if="searchQuery" class="search-clear-btn" @click="clearSearch">✕</button>
      </div>

      <!-- Filter Toggle Button -->
      <button class="btn-icon toggle-filter-btn" id="filterToggleBtn" @click="toggleFilterDrawer">
        <span>⚙️</span> <span id="filterBtnLabel">Filter</span>
      </button>

      <!-- Refresh Button -->
      <button class="btn-icon" title="Refresh live data" @click="emit('refresh')">
        <span>🔄</span>
      </button>

      <!-- Live Timing Connection Badge -->
      <div class="toolbar-live-badge" :class="isLive ? 'live' : 'upcoming'" id="toolbarLiveBadge">
        <span class="pulse-dot" id="toolbarLiveDot" />
        <span id="toolbarLiveText">{{ isLive ? 'Live Timing' : 'Upcoming' }}</span>
      </div>
    </div>

    <!-- Collapsible Detailed Filters -->
    <div v-show="isFilterOpen" class="collapsible-filters show" id="collapsibleFilters">
      <div class="filters-grid">
        <div class="filter-group">
          <label class="filter-label">Group By / View</label>
          <select v-model="selectedListId" id="listSelect" class="select-dropdown" @change="onListChange">
            <template v-if="currentTab === 'list'">
              <option value="A76F6B">Category & Wave</option>
              <option value="747B52">By Team</option>
            </template>
            <template v-else>
              <option value="4C8C1F">Individual Results - ALL</option>
              <option value="E07F7C">Individual Results - By Team</option>
              <option value="674D5B">Team Results</option>
            </template>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Sort By</label>
          <select v-model="sortOrder" id="sortOrderSelect" class="select-dropdown">
            <option value="GRADE">Grade / Division (Default)</option>
            <option value="TIME">Start Time (Earliest First)</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Category</label>
          <select v-model="selectedCategory" id="categoryFilter" class="select-dropdown">
            <option value="ALL">&lt;All Categories&gt;</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Team Scope</label>
          <select v-model="selectedTeamScope" id="teamFilter" class="select-dropdown">
            <option value="DEFAULT_TEAMS">LAXMTB Team (La Crosse, Holmen, La Crescent)</option>
            <option value="ALL">&lt;Show All Event Teams&gt;</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Active Filter Chips -->
    <div v-if="activeFilterChips.length > 0" class="filter-summary-chips" id="filterSummaryChips">
      <span
        v-for="(chip, idx) in activeFilterChips"
        :key="idx"
        class="filter-chip"
        :style="chip.isLaxScope ? 'border-color:var(--accent-red);color:var(--accent-red);' : ''"
      >
        <span>{{ chip.label }}<strong v-if="chip.strongText">{{ chip.strongText }}</strong></span>
        <span
          v-if="chip.onRemove"
          class="chip-remove"
          @click.stop="chip.onRemove"
        >✕</span>
      </span>
    </div>
  </div>
</template>
