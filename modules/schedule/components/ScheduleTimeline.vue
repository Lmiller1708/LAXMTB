<script setup lang="ts">
import type { ScheduleDay, ScheduleItem } from '~/modules/races/types/race'

const props = defineProps<{
  schedule?: ScheduleDay[] | ScheduleItem[]
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()

const isOpen = ref(true)

const splitTimeRange = (str: string) => {
  if (!str) return { start: '', end: '' }
  const parts = String(str).split(/\s*[-–—]\s*|\s+to\s+/i)
  if (parts.length >= 2) {
    return { start: parts[0].trim(), end: parts[1].trim() }
  }
  return { start: String(str).trim(), end: '' }
}

const dayGroups = computed<ScheduleDay[]>(() => {
  if (!props.schedule || !Array.isArray(props.schedule) || props.schedule.length === 0) {
    return []
  }

  // Check if already in day-grouped format
  if ((props.schedule[0] as any).day && (props.schedule[0] as any).events) {
    return props.schedule as ScheduleDay[]
  }

  // Automatically group flat schedule items by day
  const groups: ScheduleDay[] = []
  const daysMap: Record<string, ScheduleDay> = {}

  ;(props.schedule as ScheduleItem[]).forEach(item => {
    let dayName = 'Weekend'
    let timeText = item.time || ''
    const match = timeText.match(/^(Friday|Saturday|Sunday|Monday)/i)
    if (match) {
      dayName = match[1]
      timeText = timeText.replace(/^(Friday|Saturday|Sunday|Monday)\s*/i, '')
    }
    if (!daysMap[dayName]) {
      daysMap[dayName] = { day: dayName, events: [] }
      groups.push(daysMap[dayName])
    }
    daysMap[dayName].events.push({
      time: timeText,
      desc: item.desc,
      tag: item.tag || null,
      isSpecial: item.isSpecial || item.desc.toLowerCase().includes('dinner') || item.desc.toLowerCase().includes('breakfast')
    })
  })

  return groups
})

const getDayIcon = (day: string) => {
  const d = day.toLowerCase()
  if (d.includes('sun')) return '🏁'
  if (d.includes('sat')) return '🚵'
  if (d.includes('fri')) return '⛺'
  return '📅'
}

const checkIsRaceDay = (grp: ScheduleDay) => {
  return grp.isRaceDay || grp.day.toLowerCase().includes('sun')
}
</script>

<template>
  <div class="detail-section" id="scheduleDetailSection">
    <div class="detail-section-header collapsible-header" @click="isOpen = !isOpen">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="detail-section-title"><span>⏱️</span> LAXMTB Team Schedule Highlights</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button
          v-if="isCoachAuth"
          type="button"
          class="card-inline-edit-btn"
          title="Edit Team Schedule"
          @click.stop="emit('edit')"
        >
          <span>✏️</span>
        </button>
        <span class="card-toggle-icon" :class="{ collapsed: !isOpen }" title="Toggle Schedule">▼</span>
      </div>
    </div>

    <div v-show="isOpen" class="collapsible-body detail-section-body">
      <div v-if="dayGroups.length === 0" class="no-results" style="padding:16px;">
        Schedule details coming soon.
      </div>
      <div v-else class="schedule-days-container">
        <div
          v-for="grp in dayGroups"
          :key="grp.day"
          class="schedule-day-group"
          :class="{ 'group-raceday': checkIsRaceDay(grp) }"
        >
          <div class="schedule-day-header" :class="{ 'day-raceday': checkIsRaceDay(grp) }">
            <div style="display:flex;align-items:center;gap:6px;">
              <span>{{ getDayIcon(grp.day) }}</span>
              <span style="font-weight:800;">{{ grp.day }}</span>
              <span v-if="grp.date" class="schedule-date-badge">📅 {{ grp.date }}</span>
            </div>
            <span v-if="grp.subtitle" class="schedule-day-badge">{{ grp.subtitle }}</span>
            <span v-else-if="checkIsRaceDay(grp)" class="schedule-day-badge">RACE DAY</span>
          </div>

          <ul class="schedule-day-list">
            <li
              v-for="(ev, idx) in grp.events"
              :key="idx"
              class="schedule-row"
              :class="{ 'special-event': ev.isSpecial || ev.desc.toLowerCase().includes('dinner') || ev.desc.toLowerCase().includes('breakfast') }"
            >
              <span class="schedule-row-time">
                <span class="time-badge">{{ splitTimeRange(ev.time || '').start || ev.time }}</span>
                <template v-if="splitTimeRange(ev.time || '').end">
                  <span class="time-to-badge">to</span>
                  <span class="time-badge">{{ splitTimeRange(ev.time || '').end }}</span>
                </template>
              </span>
              <div class="schedule-row-desc">
                <span>{{ ev.desc }}</span>
                <span
                  v-if="ev.isSpecial || ev.desc.toLowerCase().includes('dinner') || ev.desc.toLowerCase().includes('breakfast')"
                  class="schedule-tag tag-special"
                >
                  {{ ev.desc.toLowerCase().includes('dinner') ? '🍽️ Team Dinner' : ev.desc.toLowerCase().includes('breakfast') ? '🍽️ Team Breakfast' : '★ Team Event' }}
                </span>
                <span
                  v-else-if="(ev.tag === 'Pre-Ride' || ev.desc.toLowerCase().includes('pre-ride'))"
                  class="schedule-tag tag-preride"
                >
                  Pre-Ride
                </span>
                <span
                  v-else-if="ev.isRace || ev.tag === 'Racing' || ev.desc.toLowerCase().includes('racing starts') || ev.desc.toLowerCase().includes('race waves')"
                  class="schedule-tag tag-special"
                >
                  🏁 Racing
                </span>
                <span
                  v-else-if="ev.tag === 'Awards' || ev.desc.toLowerCase().includes('awards')"
                  class="schedule-tag"
                >
                  🏆 Awards
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
