<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { parseTimeStrToMinutes, formatMinutesToTimeStr } from '~/modules/results/services/raceresultService'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    disabled?: boolean
    placeholder?: string
  }>(),
  {
    modelValue: '8:00 AM',
    disabled: false,
    placeholder: 'e.g. 8:00 AM'
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
  (e: 'change', val: string): void
}>()

const triggerRef = ref<HTMLElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

const isOpen = ref(false)
const typedText = ref('')
const popoverStyle = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })

// Parsed local state
const selectedHour = ref(8)
const selectedMinute = ref(0)
const meridiem = ref<'AM' | 'PM'>('AM')

// Parse incoming value
const parseValue = (val?: string) => {
  if (!val) {
    selectedHour.value = 8
    selectedMinute.value = 0
    meridiem.value = 'AM'
    typedText.value = '8:00 AM'
    return
  }
  const clean = val.trim()
  typedText.value = clean

  const match = clean.match(/(\d+):(\d+)\s*(AM|PM)?/i)
  if (match) {
    let h = parseInt(match[1], 10)
    const m = parseInt(match[2], 10)
    let med: 'AM' | 'PM' = 'AM'
    if (match[3]) {
      med = match[3].toUpperCase() === 'PM' ? 'PM' : 'AM'
    } else if (h >= 12) {
      med = 'PM'
      if (h > 12) h -= 12
    }
    if (h === 0) h = 12
    if (h > 12) h = 12
    selectedHour.value = h
    selectedMinute.value = isNaN(m) ? 0 : Math.min(59, Math.max(0, m))
    meridiem.value = med
  } else {
    const mins = parseTimeStrToMinutes(clean)
    if (mins !== null) {
      let h = Math.floor(mins / 60)
      const m = mins % 60
      const med = h >= 12 ? 'PM' : 'AM'
      if (h > 12) h -= 12
      if (h === 0) h = 12
      selectedHour.value = h
      selectedMinute.value = m
      meridiem.value = med
    }
  }
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (!isOpen.value) {
      parseValue(newVal)
    }
  },
  { immediate: true }
)

const formattedTime = computed(() => {
  const mStr = selectedMinute.value < 10 ? `0${selectedMinute.value}` : `${selectedMinute.value}`
  return `${selectedHour.value}:${mStr} ${meridiem.value}`
})

const displayMinuteStr = computed(() => {
  return selectedMinute.value < 10 ? `0${selectedMinute.value}` : `${selectedMinute.value}`
})

const commitValue = () => {
  const finalStr = formattedTime.value
  typedText.value = finalStr
  emit('update:modelValue', finalStr)
  emit('change', finalStr)
}

const updatePosition = () => {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const popoverWidth = 280
  const popoverHeight = 350

  let left = rect.left + rect.width / 2 - popoverWidth / 2
  if (left < 10) left = 10
  if (left + popoverWidth > window.innerWidth - 10) {
    left = window.innerWidth - popoverWidth - 10
  }

  let top = rect.bottom + 6
  if (top + popoverHeight > window.innerHeight - 10 && rect.top > popoverHeight + 10) {
    top = rect.top - popoverHeight - 6
  }

  popoverStyle.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`
  }
}

const openPopover = () => {
  if (props.disabled) return
  parseValue(props.modelValue)
  isOpen.value = true
  nextTick(() => {
    updatePosition()
  })
}

const closePopover = () => {
  if (!isOpen.value) return
  isOpen.value = false
  commitValue()
}

const togglePopover = () => {
  if (isOpen.value) {
    closePopover()
  } else {
    openPopover()
  }
}

const selectHour = (h: number) => {
  selectedHour.value = h
  commitValue()
}

const selectMinute = (m: number) => {
  selectedMinute.value = m
  commitValue()
}

const setMeridiem = (med: 'AM' | 'PM') => {
  meridiem.value = med
  commitValue()
}

const nudgeMinutes = (delta: number) => {
  let totalMins = selectedHour.value * 60 + selectedMinute.value
  if (meridiem.value === 'PM' && selectedHour.value !== 12) totalMins += 12 * 60
  if (meridiem.value === 'AM' && selectedHour.value === 12) totalMins -= 12 * 60

  totalMins += delta
  if (totalMins < 0) totalMins += 1440
  totalMins = totalMins % 1440

  let h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  const med: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
  if (h > 12) h -= 12
  if (h === 0) h = 12

  selectedHour.value = h
  selectedMinute.value = m
  meridiem.value = med
  commitValue()
}

const resetToDefault = () => {
  selectedHour.value = 8
  selectedMinute.value = 0
  meridiem.value = 'AM'
  commitValue()
}

// Direct keyboard input in the trigger box
const onInputBlur = () => {
  parseValue(typedText.value)
  commitValue()
}

const onInputKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    parseValue(typedText.value)
    commitValue()
    if (isOpen.value) closePopover()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    nudgeMinutes(e.shiftKey ? 5 : 1)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    nudgeMinutes(e.shiftKey ? -5 : -1)
  } else if (e.key === 'Escape') {
    if (isOpen.value) {
      e.preventDefault()
      closePopover()
    }
  }
}

// Click outside handling
const handleDocPointerDown = (e: PointerEvent) => {
  if (!isOpen.value) return
  const target = e.target as Node
  if (triggerRef.value && triggerRef.value.contains(target)) return
  if (popoverRef.value && popoverRef.value.contains(target)) return
  closePopover()
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', handleDocPointerDown)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointerdown', handleDocPointerDown)
    window.removeEventListener('scroll', updatePosition, true)
    window.removeEventListener('resize', updatePosition)
  }
})
</script>

<template>
  <div ref="triggerRef" class="custom-time-picker-trigger">
    <div class="time-input-container" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
      <input
        ref="inputRef"
        v-model="typedText"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        class="time-text-input"
        @focus="openPopover"
        @blur="onInputBlur"
        @keydown="onInputKeydown"
      />
      <button
        type="button"
        class="time-clock-btn"
        tabindex="-1"
        :title="isOpen ? 'Close time picker' : 'Pick time'"
        @click.stop="togglePopover"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </button>
    </div>

    <!-- Floating Popover via Teleport to Body -->
    <Teleport to="body">
      <Transition name="picker-pop">
        <div
          v-if="isOpen"
          ref="popoverRef"
          class="custom-time-popover"
          :style="popoverStyle"
          @pointerdown.stop
        >
          <!-- Top Clock Display & AM/PM Toggle -->
          <div class="popover-clock-display">
            <div class="clock-digits-group">
              <span class="digit-box">{{ selectedHour }}</span>
              <span class="colon-sep">:</span>
              <span class="digit-box">{{ displayMinuteStr }}</span>
            </div>
            <div class="meridiem-toggle">
              <button
                type="button"
                class="meridiem-btn"
                :class="{ active: meridiem === 'AM' }"
                @click="setMeridiem('AM')"
              >
                AM
              </button>
              <button
                type="button"
                class="meridiem-btn"
                :class="{ active: meridiem === 'PM' }"
                @click="setMeridiem('PM')"
              >
                PM
              </button>
            </div>
          </div>

          <!-- Quick Nudge Row (+2m, +5m wave offsets) -->
          <div class="nudge-section">
            <span class="nudge-label">Wave Shift:</span>
            <div class="nudge-pills">
              <button type="button" class="nudge-pill" title="Subtract 5 minutes" @click="nudgeMinutes(-5)">-5m</button>
              <button type="button" class="nudge-pill" title="Subtract 2 minutes" @click="nudgeMinutes(-2)">-2m</button>
              <button type="button" class="nudge-pill accent" title="Add 2 minutes (standard wave interval)" @click="nudgeMinutes(2)">+2m</button>
              <button type="button" class="nudge-pill accent" title="Add 5 minutes" @click="nudgeMinutes(5)">+5m</button>
              <button type="button" class="nudge-pill" title="Add 15 minutes" @click="nudgeMinutes(15)">+15m</button>
            </div>
          </div>

          <!-- Hours Selector -->
          <div class="picker-section">
            <div class="section-title">Hour</div>
            <div class="hours-grid">
              <button
                v-for="h in [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7]"
                :key="h"
                type="button"
                class="picker-btn hour-btn"
                :class="{ active: selectedHour === h }"
                @click="selectHour(h)"
              >
                {{ h }}
              </button>
            </div>
          </div>

          <!-- Minutes Selector with Stepper -->
          <div class="picker-section">
            <div class="section-header-row">
              <span class="section-title">Minute</span>
              <div class="minute-stepper">
                <button type="button" class="stepper-btn" title="Subtract 1 minute" @click="nudgeMinutes(-1)">−</button>
                <span class="stepper-value">:{{ displayMinuteStr }}</span>
                <button type="button" class="stepper-btn" title="Add 1 minute" @click="nudgeMinutes(1)">+</button>
              </div>
            </div>
            <div class="minutes-grid">
              <button
                v-for="m in [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]"
                :key="m"
                type="button"
                class="picker-btn minute-btn"
                :class="{ active: selectedMinute === m }"
                @click="selectMinute(m)"
              >
                :{{ m < 10 ? `0${m}` : m }}
              </button>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="popover-footer">
            <button type="button" class="popover-action-btn secondary" @click="resetToDefault">
              Default (8:00 AM)
            </button>
            <button type="button" class="popover-action-btn primary" @click="closePopover">
              Done
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-time-picker-trigger {
  display: inline-block;
  position: relative;
}

.time-input-container {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0 4px 0 8px;
  transition: all 0.15s ease;
  width: 110px;
  box-sizing: border-box;
}

:root.theme-light .time-input-container,
.theme-light .time-input-container,
:root[data-theme="light"] .time-input-container {
  background: #ffffff;
  border-color: #cbd5e1;
}

.time-input-container:hover {
  border-color: rgba(239, 68, 68, 0.4);
}

.time-input-container.is-open,
.time-input-container:focus-within {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.25);
}

.time-text-input {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-main);
  font-size: 12px;
  font-weight: 700;
  padding: 5px 0;
  text-align: center;
  outline: none;
}

:root.theme-light .time-text-input,
.theme-light .time-text-input,
:root[data-theme="light"] .time-text-input {
  color: #0f172a;
}

.time-clock-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 3px 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease;
}

.time-clock-btn:hover {
  color: #ef4444;
}

/* Floating Popover */
.custom-time-popover {
  position: fixed;
  z-index: 999999;
  width: 275px;
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 12px;
  color: #f4f4f5;
  font-family: inherit;
  user-select: none;
}

:root.theme-light .custom-time-popover,
.theme-light .custom-time-popover,
:root[data-theme="light"] .custom-time-popover {
  background: #ffffff;
  border-color: #e2e8f0;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
  color: #0f172a;
}

/* Top Clock Display */
.popover-clock-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 6px 10px;
  margin-bottom: 10px;
}

:root.theme-light .popover-clock-display,
.theme-light .popover-clock-display,
:root[data-theme="light"] .popover-clock-display {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.clock-digits-group {
  display: flex;
  align-items: center;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.digit-box {
  min-width: 24px;
  text-align: center;
}

.colon-sep {
  opacity: 0.6;
  margin: 0 2px;
}

.meridiem-toggle {
  display: inline-flex;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

:root.theme-light .meridiem-toggle,
.theme-light .meridiem-toggle,
:root[data-theme="light"] .meridiem-toggle {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.meridiem-btn {
  background: transparent;
  border: none;
  color: #a1a1aa;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.meridiem-btn.active {
  background: #ef4444;
  color: #ffffff;
}

/* Nudge section */
.nudge-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

:root.theme-light .nudge-section,
.theme-light .nudge-section,
:root[data-theme="light"] .nudge-section {
  border-bottom-color: #e2e8f0;
}

.nudge-label {
  font-size: 10.5px;
  color: #a1a1aa;
  font-weight: 600;
  white-space: nowrap;
}

.nudge-pills {
  display: flex;
  gap: 4px;
}

.nudge-pill {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #d4d4d8;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.nudge-pill:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.nudge-pill.accent {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
  color: #f87171;
}

.nudge-pill.accent:hover {
  background: #ef4444;
  color: #ffffff;
}

/* Sections */
.picker-section {
  margin-bottom: 10px;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
}

.section-title {
  font-size: 10.5px;
  font-weight: 700;
  color: #a1a1aa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 5px;
}

.minute-stepper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 1px 4px;
}

.stepper-btn {
  background: transparent;
  border: none;
  color: #f87171;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  padding: 1px 4px;
  cursor: pointer;
  border-radius: 2px;
}

.stepper-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.stepper-value {
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
}

:root.theme-light .stepper-value,
.theme-light .stepper-value,
:root[data-theme="light"] .stepper-value {
  color: #0f172a;
}

/* Grids */
.hours-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
}

.minutes-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
}

.picker-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e4e4e7;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 0;
  border-radius: 5px;
  cursor: pointer;
  text-align: center;
  transition: all 0.12s ease;
}

:root.theme-light .picker-btn,
.theme-light .picker-btn,
:root[data-theme="light"] .picker-btn {
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #334155;
}

.picker-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.2);
}

.picker-btn.active {
  background: #ef4444 !important;
  border-color: #dc2626 !important;
  color: #ffffff !important;
  font-weight: 800;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
}

/* Popover Footer */
.popover-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

:root.theme-light .popover-footer,
.theme-light .popover-footer,
:root[data-theme="light"] .popover-footer {
  border-top-color: #e2e8f0;
}

.popover-action-btn {
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.popover-action-btn.secondary {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #a1a1aa;
}

.popover-action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.popover-action-btn.primary {
  background: #ef4444;
  border: 1px solid #ef4444;
  color: #ffffff;
}

.popover-action-btn.primary:hover {
  background: #dc2626;
  border-color: #dc2626;
}

/* Transition */
.picker-pop-enter-active,
.picker-pop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.picker-pop-enter-from,
.picker-pop-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(-4px);
}
</style>
