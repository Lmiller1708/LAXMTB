<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

export interface ScheduleDayObj {
  day?: string
  date?: string
  subtitle?: string
  isRaceDay?: boolean
  events?: any[]
}

const props = withDefaults(
  defineProps<{
    mode?: 'scheduleDay' | 'single' | 'range'
    modelValue?: string // YYYY-MM-DD for single mode
    start?: string // YYYY-MM-DD for range mode
    end?: string // YYYY-MM-DD for range mode
    day?: ScheduleDayObj // For scheduleDay mode
    placeholder?: string
    defaultYear?: number
    minDate?: string
    maxDate?: string
    disabled?: boolean
    fullWidth?: boolean
  }>(),
  {
    mode: 'scheduleDay',
    modelValue: '',
    start: '',
    end: '',
    placeholder: 'Select date...',
    disabled: false,
    fullWidth: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
  (e: 'update:start', val: string): void
  (e: 'update:end', val: string): void
  (e: 'update:day', val: ScheduleDayObj): void
  (e: 'change', val: any): void
}>()

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
]

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9,
  nov: 10, november: 10, dec: 11, december: 11
}

const containerRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

// Active calendar view state (month: 0-11, year: full year)
const now = new Date()
const viewMonth = ref(now.getMonth())
const viewYear = ref(props.defaultYear || now.getFullYear())

// Local editable inputs for scheduleDay mode inside the popover
const editDayName = ref('')
const editDateStr = ref('')

// Temporary range selection state
const tempRangeStart = ref<string>('')
const tempRangeEnd = ref<string>('')

// Parse date string like "Sept 5" or "September 5" or ISO string
const parseDayDateToIso = (dayDateStr?: string, year?: number): string => {
  if (!dayDateStr) return ''
  const str = dayDateStr.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const m = str.match(/^([A-Za-z]+)\s+(\d{1,2})$/)
  if (m) {
    const mon = MONTH_MAP[m[1].toLowerCase()]
    if (mon !== undefined) {
      const d = parseInt(m[2], 10)
      const yr = year || viewYear.value || now.getFullYear()
      return `${yr}-${String(mon + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }
  return ''
}

// Format ISO string to display text
const formatIsoToDisplay = (isoStr: string): string => {
  if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return ''
  const [y, m, d] = isoStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dayName = DAYS_OF_WEEK[dt.getDay()]
  const monthName = MONTHS_SHORT[m - 1]
  return `${dayName}, ${monthName} ${d}`
}

// Sync calendar view to selected date when opening
const syncViewToSelection = () => {
  let targetIso = ''
  if (props.mode === 'scheduleDay') {
    editDayName.value = props.day?.day || ''
    editDateStr.value = props.day?.date || ''
    targetIso = parseDayDateToIso(props.day?.date, props.defaultYear)
  } else if (props.mode === 'range') {
    targetIso = props.start || ''
  } else {
    targetIso = props.modelValue || ''
  }

  if (targetIso && /^\d{4}-\d{2}-\d{2}$/.test(targetIso)) {
    const [y, m] = targetIso.split('-').map(Number)
    viewYear.value = y
    viewMonth.value = m - 1
  } else if (props.defaultYear) {
    viewYear.value = props.defaultYear
  }
}

const toggleOpen = () => {
  if (props.disabled) return
  if (!isOpen.value) {
    syncViewToSelection()
    if (props.mode === 'range') {
      tempRangeStart.value = props.start || ''
      tempRangeEnd.value = props.end || ''
    }
    isOpen.value = true
  } else {
    isOpen.value = false
  }
}

const close = () => {
  isOpen.value = false
}

// Close on outside click
const handleDocClick = (e: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    close()
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleDocClick)
    document.addEventListener('keydown', handleKeydown)
  }
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleDocClick)
    document.removeEventListener('keydown', handleKeydown)
  }
})

// Month navigation
const prevMonth = () => {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

const nextMonth = () => {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

// Calendar grid computation
interface CalendarDay {
  year: number
  month: number
  dayNumber: number
  iso: string
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  isInRange: boolean
  isRangeStart: boolean
  isRangeEnd: boolean
  isDisabled: boolean
}

const calendarDays = computed<CalendarDay[]>(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const firstDayIndex = new Date(y, m, 1).getDay() // 0 = Sunday

  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  let selectedIso = ''
  if (props.mode === 'scheduleDay') {
    selectedIso = parseDayDateToIso(props.day?.date, props.defaultYear || y)
  } else if (props.mode === 'single') {
    selectedIso = props.modelValue || ''
  }

  const rangeStartIso = props.mode === 'range' ? (tempRangeStart.value || props.start) : ''
  const rangeEndIso = props.mode === 'range' ? (tempRangeEnd.value || props.end) : ''

  const days: CalendarDay[] = []

  // Overflow days from previous month
  const prevMonthDays = new Date(y, m, 0).getDate()
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dNum = prevMonthDays - i
    const prevM = m === 0 ? 11 : m - 1
    const prevY = m === 0 ? y - 1 : y
    const iso = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`
    days.push({
      year: prevY,
      month: prevM,
      dayNumber: dNum,
      iso,
      isCurrentMonth: false,
      isToday: iso === todayIso,
      isSelected: iso === selectedIso,
      isInRange: isDateInRange(iso, rangeStartIso, rangeEndIso),
      isRangeStart: iso === rangeStartIso,
      isRangeEnd: iso === rangeEndIso,
      isDisabled: checkDisabled(iso)
    })
  }

  // Days in current month
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      year: y,
      month: m,
      dayNumber: d,
      iso,
      isCurrentMonth: true,
      isToday: iso === todayIso,
      isSelected: iso === selectedIso,
      isInRange: isDateInRange(iso, rangeStartIso, rangeEndIso),
      isRangeStart: iso === rangeStartIso,
      isRangeEnd: iso === rangeEndIso,
      isDisabled: checkDisabled(iso)
    })
  }

  // Overflow days for next month to complete 5 or 6 weeks (total multiple of 7)
  const remainder = (7 - (days.length % 7)) % 7
  for (let d = 1; d <= remainder; d++) {
    const nextM = m === 11 ? 0 : m + 1
    const nextY = m === 11 ? y + 1 : y
    const iso = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      year: nextY,
      month: nextM,
      dayNumber: d,
      iso,
      isCurrentMonth: false,
      isToday: iso === todayIso,
      isSelected: iso === selectedIso,
      isInRange: isDateInRange(iso, rangeStartIso, rangeEndIso),
      isRangeStart: iso === rangeStartIso,
      isRangeEnd: iso === rangeEndIso,
      isDisabled: checkDisabled(iso)
    })
  }

  return days
})

function isDateInRange(iso: string, start?: string, end?: string): boolean {
  if (!start || !end || start === end) return false
  return iso > start && iso < end
}

function checkDisabled(iso: string): boolean {
  if (props.minDate && iso < props.minDate) return true
  if (props.maxDate && iso > props.maxDate) return true
  return false
}

// Day click handler
const selectDay = (calDay: CalendarDay) => {
  if (calDay.isDisabled) return

  const dt = new Date(calDay.year, calDay.month, calDay.dayNumber)
  const dayName = DAYS_OF_WEEK[dt.getDay()]
  const dateShort = `${MONTHS_SHORT[calDay.month]} ${calDay.dayNumber}`
  const iso = calDay.iso

  if (props.mode === 'scheduleDay') {
    editDayName.value = dayName
    editDateStr.value = dateShort
    if (props.day) {
      const updated = { ...props.day, day: dayName, date: dateShort }
      if (dayName === 'Sunday' && props.day.isRaceDay === undefined) {
        updated.isRaceDay = true
      }
      emit('update:day', updated)
      emit('change', updated)
    }
    close()
  } else if (props.mode === 'single') {
    emit('update:modelValue', iso)
    emit('change', iso)
    close()
  } else if (props.mode === 'range') {
    if (!tempRangeStart.value || (tempRangeStart.value && tempRangeEnd.value)) {
      tempRangeStart.value = iso
      tempRangeEnd.value = ''
    } else {
      if (iso < tempRangeStart.value) {
        tempRangeEnd.value = tempRangeStart.value
        tempRangeStart.value = iso
      } else {
        tempRangeEnd.value = iso
      }
      emit('update:start', tempRangeStart.value)
      emit('update:end', tempRangeEnd.value)
      emit('change', { start: tempRangeStart.value, end: tempRangeEnd.value })
      close()
    }
  }
}

// Save custom text from manual inputs in popover header
const applyCustomScheduleText = () => {
  if (props.mode === 'scheduleDay' && props.day) {
    const updated = {
      ...props.day,
      day: editDayName.value.trim(),
      date: editDateStr.value.trim()
    }
    emit('update:day', updated)
    emit('change', updated)
  }
}

// Select today
const selectToday = () => {
  const tY = now.getFullYear()
  const tM = now.getMonth()
  const tD = now.getDate()
  viewYear.value = tY
  viewMonth.value = tM
  const todayIso = `${tY}-${String(tM + 1).padStart(2, '0')}-${String(tD).padStart(2, '0')}`
  const calDay: CalendarDay = {
    year: tY,
    month: tM,
    dayNumber: tD,
    iso: todayIso,
    isCurrentMonth: true,
    isToday: true,
    isSelected: true,
    isInRange: false,
    isRangeStart: false,
    isRangeEnd: false,
    isDisabled: false
  }
  selectDay(calDay)
}

// Display string for the input trigger
const triggerDisplay = computed(() => {
  if (props.mode === 'scheduleDay') {
    if (props.day?.day || props.day?.date) {
      const parts: string[] = []
      if (props.day.day) parts.push(props.day.day)
      if (props.day.date) parts.push(props.day.date)
      return parts.join(', ')
    }
    return props.placeholder || 'Select Day & Date'
  }

  if (props.mode === 'range') {
    const s = props.start
    const e = props.end
    if (s && e) {
      return `${formatIsoToDisplay(s)} – ${formatIsoToDisplay(e)}`
    } else if (s) {
      return `${formatIsoToDisplay(s)} – ...`
    }
    return props.placeholder || 'Select Date Range'
  }

  if (props.modelValue) {
    return formatIsoToDisplay(props.modelValue) || props.modelValue
  }

  return props.placeholder || 'Select Date'
})

const hasValue = computed(() => {
  if (props.mode === 'scheduleDay') {
    return !!(props.day?.day || props.day?.date)
  }
  if (props.mode === 'range') {
    return !!(props.start || props.end)
  }
  return !!props.modelValue
})
</script>

<template>
  <div ref="containerRef" class="custom-date-picker-container" :class="{ 'is-full-width': fullWidth }">
    <!-- Combined Trigger Input / Button -->
    <button
      type="button"
      class="cdp-trigger-btn"
      :class="{
        'is-open': isOpen,
        'has-value': hasValue,
        'is-disabled': disabled,
        'is-full-width': fullWidth
      }"
      :disabled="disabled"
      @click="toggleOpen"
    >
      <span class="cdp-icon">📅</span>
      <span class="cdp-label" :class="{ 'is-placeholder': !hasValue }">
        {{ triggerDisplay }}
      </span>
      <span class="cdp-chevron" :class="{ 'is-rotated': isOpen }">▾</span>
    </button>

    <!-- Custom Dark Calendar Popover -->
    <Transition name="cdp-fade">
      <div v-if="isOpen" class="cdp-popover" @click.stop>
        <!-- Schedule Day Mode: Quick edit fields -->
        <div v-if="mode === 'scheduleDay'" class="cdp-quick-edit-row">
          <input
            v-model="editDayName"
            type="text"
            placeholder="Day (e.g. Saturday)"
            class="cdp-quick-input"
            title="Day of week / name"
            @input="applyCustomScheduleText"
          >
          <input
            v-model="editDateStr"
            type="text"
            placeholder="Date (e.g. Sept 5)"
            class="cdp-quick-input"
            title="Date string"
            @input="applyCustomScheduleText"
          >
        </div>

        <!-- Popover Header: Month / Year Navigation -->
        <div class="cdp-header">
          <button
            type="button"
            class="cdp-nav-btn"
            title="Previous Month"
            @click="prevMonth"
          >
            ‹
          </button>
          <div class="cdp-month-year">
            <span class="cdp-month">{{ MONTHS_FULL[viewMonth] }}</span>
            <span class="cdp-year">{{ viewYear }}</span>
          </div>
          <button
            type="button"
            class="cdp-nav-btn"
            title="Next Month"
            @click="nextMonth"
          >
            ›
          </button>
        </div>

        <!-- Popover Day of Week Headers -->
        <div class="cdp-weekdays">
          <span v-for="(dayName, idx) in DAYS_SHORT" :key="idx" class="cdp-weekday">
            {{ dayName }}
          </span>
        </div>

        <!-- Days Grid -->
        <div class="cdp-grid">
          <button
            v-for="(calDay, idx) in calendarDays"
            :key="idx"
            type="button"
            class="cdp-day-btn"
            :class="{
              'is-current-month': calDay.isCurrentMonth,
              'is-other-month': !calDay.isCurrentMonth,
              'is-today': calDay.isToday,
              'is-selected': calDay.isSelected || calDay.isRangeStart || calDay.isRangeEnd,
              'is-in-range': calDay.isInRange,
              'is-range-start': calDay.isRangeStart,
              'is-range-end': calDay.isRangeEnd,
              'is-disabled': calDay.isDisabled
            }"
            :disabled="calDay.isDisabled"
            @click="selectDay(calDay)"
          >
            {{ calDay.dayNumber }}
          </button>
        </div>

        <!-- Popover Footer -->
        <div class="cdp-footer">
          <button
            type="button"
            class="cdp-action-btn cdp-today-btn"
            @click="selectToday"
          >
            ⚡ Today
          </button>

          <span v-if="mode === 'range' && tempRangeStart && !tempRangeEnd" class="cdp-range-hint">
            Click end date
          </span>

          <button
            type="button"
            class="cdp-action-btn cdp-close-btn"
            @click="close"
          >
            Done
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.custom-date-picker-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  user-select: none;
}

.custom-date-picker-container.is-full-width {
  width: 100%;
}

/* Trigger Button */
.cdp-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-subtle, #18181b);
  border: 1px solid var(--border, #3f3f46);
  border-radius: 8px;
  padding: 5px 12px;
  height: 34px;
  color: var(--text-main, #f4f4f5);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.cdp-trigger-btn.is-full-width {
  width: 100%;
  justify-content: space-between;
}

.cdp-trigger-btn:hover:not(.is-disabled) {
  border-color: #71717a;
  background: #27272a;
}

.cdp-trigger-btn.is-open {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.25);
}

.cdp-trigger-btn.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cdp-icon {
  font-size: 14px;
  line-height: 1;
}

.cdp-label {
  color: var(--text-main, #f4f4f5);
}

.cdp-label.is-placeholder {
  color: var(--text-muted, #a1a1aa);
  font-weight: 500;
}

.cdp-chevron {
  font-size: 11px;
  color: var(--text-muted, #a1a1aa);
  transition: transform 0.2s ease;
  line-height: 1;
  margin-left: 2px;
}

.cdp-chevron.is-rotated {
  transform: rotate(180deg);
}

/* Popover Panel */
.cdp-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 9999;
  width: 290px;
  max-width: calc(100vw - 28px);
  background: #18181b;
  border: 1px solid #3f3f46;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05);
  box-sizing: border-box;
}

@media (max-width: 480px) {
  .cdp-popover {
    left: auto;
    right: 0;
  }
}

/* Quick edit row inside popover */
.cdp-quick-edit-row {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #27272a;
}

.cdp-quick-input {
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 2px 8px;
  font-size: 11.5px;
  font-weight: 600;
  background: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 6px;
  color: #f4f4f5;
  outline: none;
}

.cdp-quick-input:focus {
  border-color: #ef4444;
}

/* Header */
.cdp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.cdp-month-year {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 700;
  color: #f4f4f5;
}

.cdp-year {
  color: #a1a1aa;
}

.cdp-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #3f3f46;
  background: #27272a;
  color: #f4f4f5;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cdp-nav-btn:hover {
  background: #3f3f46;
  color: #ffffff;
}

/* Weekday column headers */
.cdp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 6px;
  text-align: center;
}

.cdp-weekday {
  font-size: 10.5px;
  font-weight: 700;
  color: #71717a;
  text-transform: uppercase;
  padding: 2px 0;
}

/* Days Grid */
.cdp-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.cdp-day-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: #f4f4f5;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s ease;
  padding: 0;
}

.cdp-day-btn.is-other-month {
  color: #52525b;
}

.cdp-day-btn:hover:not(.is-disabled):not(.is-selected) {
  background: #27272a;
  color: #ffffff;
}

.cdp-day-btn.is-today:not(.is-selected) {
  border-color: rgba(239, 68, 68, 0.6);
  color: #ef4444;
}

.cdp-day-btn.is-selected {
  background: linear-gradient(135deg, #ef4444, #dc2626) !important;
  color: #ffffff !important;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.45);
}

.cdp-day-btn.is-in-range {
  background: rgba(239, 68, 68, 0.18);
  border-radius: 0;
  color: #f87171;
}

.cdp-day-btn.is-range-start {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.cdp-day-btn.is-range-end {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.cdp-day-btn.is-disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

/* Footer */
.cdp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #27272a;
}

.cdp-action-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.cdp-today-btn {
  background: #27272a;
  border-color: #3f3f46;
  color: #d4d4d8;
}

.cdp-today-btn:hover {
  background: #3f3f46;
  color: #ffffff;
}

.cdp-close-btn {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
  color: #f87171;
}

.cdp-close-btn:hover {
  background: #ef4444;
  color: #ffffff;
}

.cdp-range-hint {
  font-size: 10.5px;
  color: #eab308;
  font-weight: 600;
}

/* Animations */
.cdp-fade-enter-active,
.cdp-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.cdp-fade-enter-from,
.cdp-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
