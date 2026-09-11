<script setup lang="ts">
import type { ResultsSortOrder, ResultsGroupMode, TeamScope } from '../types/results'

const props = defineProps<{
  currentTab: 'list' | 'results'
  categories: string[]
  teams?: string[]
  availableReports?: { ID: string; Name: string }[]
  isLive: boolean
  isCompleted?: boolean
  totalCount: number
}>()

const searchQuery = defineModel<string>('searchQuery', { default: '' })
const listMode = defineModel<ResultsGroupMode>('listMode', { default: 'WAVE' })
const selectedListId = defineModel<string>('selectedListId', { default: '' })
const sortOrder = defineModel<ResultsSortOrder>('sortOrder', { default: 'TIME' })
const selectedCategory = defineModel<string>('selectedCategory', { default: 'ALL' })
const selectedTeamScope = defineModel<TeamScope>('selectedTeamScope', { default: 'DEFAULT_TEAMS' })

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'reportChange', reportId: string): void
}>()

const isFilterOpen = ref(false)

const formatReportName = (name?: string) => {
  if (!name) return 'Standard View'
  return name
    .replace(/^(\d+\s*-\s*[^|]+\|)/i, '')
    .replace(/\s*-\s*Print$/i, '')
    .trim()
}

const onListChange = () => {
  emit('reportChange', selectedListId.value)
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
  if (selectedListId.value && props.availableReports && props.availableReports.length > 0) {
    const rep = props.availableReports.find(r => r.ID === selectedListId.value)
    chips.push({
      label: 'View: ',
      strongText: formatReportName(rep ? rep.Name : '')
    })
  } else if (listMode.value === 'TEAM') {
    chips.push({ label: 'View: ', strongText: 'By Team' })
  } else {
    chips.push({ label: 'View: ', strongText: 'Wave & Category' })
  }

  // Sort chip
  if (sortOrder.value === 'TIME') {
    chips.push({ label: 'Sort: ', strongText: '⏱️ Start Time' })
  } else if (sortOrder.value === 'GRADE_ASC') {
    chips.push({ label: 'Sort: ', strongText: '6th Grade → Varsity' })
  } else if (sortOrder.value === 'GRADE' || sortOrder.value === 'GRADE_DESC') {
    chips.push({ label: 'Sort: ', strongText: 'Varsity → 6th Grade' })
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
  } else if (selectedTeamScope.value !== 'ALL') {
    chips.push({
      label: 'Team: ',
      strongText: selectedTeamScope.value,
      onRemove: removeTeamFilter
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

      <!-- Live Timing / Final Results Connection Badge -->
      <div
        class="toolbar-live-badge"
        :class="isCompleted ? 'cached' : (isLive ? 'live' : 'upcoming')"
        id="toolbarLiveBadge"
      >
        <span v-if="!isCompleted && isLive" class="pulse-dot" id="toolbarLiveDot" />
        <span id="toolbarLiveText">{{ isCompleted ? 'Final Results' : (isLive ? 'Live Timing' : 'Upcoming') }}</span>
      </div>
    </div>

    <!-- Collapsible Detailed Filters -->
    <div v-show="isFilterOpen" class="collapsible-filters show" id="collapsibleFilters">
      <div class="filters-grid">
        <div class="filter-group">
          <label class="filter-label">Group By / View</label>
          <select v-model="selectedListId" id="listSelect" class="select-dropdown" @change="onListChange">
            <template v-if="availableReports && availableReports.length > 0">
              <option
                v-for="rep in availableReports"
                :key="rep.ID"
                :value="rep.ID"
              >
                {{ formatReportName(rep.Name) }}
              </option>
            </template>
            <template v-else-if="currentTab === 'list'">
              <option value="">Category & Wave / Field</option>
            </template>
            <template v-else>
              <option value="">Individual Results - ALL</option>
            </template>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Sort By</label>
          <select v-model="sortOrder" id="sortOrderSelect" class="select-dropdown">
            <option value="TIME">Start Time (Default)</option>
            <option value="GRADE_ASC">Grade (6th Grade → Varsity)</option>
            <option value="GRADE">Grade (Varsity → 6th Grade)</option>
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
            <optgroup v-if="teams && teams.length > 0" label="All Teams">
              <option v-for="team in teams" :key="team" :value="team">{{ team }}</option>
            </optgroup>
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
