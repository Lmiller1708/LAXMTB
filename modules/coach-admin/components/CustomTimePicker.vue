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

const isOpen = ref(false)
const activeView = ref<'hour' | 'minute'>('hour')
const inputMode = ref<'dial' | 'keyboard'>('dial')

// Local selection state
const selectedHour = ref(8)
const selectedMinute = ref(0)
const meridiem = ref<'AM' | 'PM'>('AM')

// Keyboard mode inputs
const keyboardHour = ref('08')
const keyboardMinute = ref('00')

const clockDialRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)

// Parse incoming value
const parseValue = (val?: string) => {
  if (!val) {
    selectedHour.value = 8
    selectedMinute.value = 0
    meridiem.value = 'AM'
    keyboardHour.value = '08'
    keyboardMinute.value = '00'
    return
  }
  const clean = val.trim()
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
  syncKeyboardInputs()
}

const syncKeyboardInputs = () => {
  keyboardHour.value = String(selectedHour.value).padStart(2, '0')
  keyboardMinute.value = String(selectedMinute.value).padStart(2, '0')
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

const displayHourStr = computed(() => {
  return String(selectedHour.value).padStart(2, '0')
})

const displayMinuteStr = computed(() => {
  return String(selectedMinute.value).padStart(2, '0')
})

const formattedTime = computed(() => {
  return `${selectedHour.value}:${displayMinuteStr.value} ${meridiem.value}`
})

const openModal = () => {
  if (props.disabled) return
  parseValue(props.modelValue)
  activeView.value = 'hour'
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
}

const handleConfirm = () => {
  if (inputMode.value === 'keyboard') {
    let h = parseInt(keyboardHour.value, 10)
    let m = parseInt(keyboardMinute.value, 10)
    if (isNaN(h) || h < 1) h = 12
    if (h > 12) h = 12
    if (isNaN(m) || m < 0) m = 0
    if (m > 59) m = 59
    selectedHour.value = h
    selectedMinute.value = m
  }
  const finalStr = formattedTime.value
  emit('update:modelValue', finalStr)
  emit('change', finalStr)
  closeModal()
}

const handleCancel = () => {
  parseValue(props.modelValue)
  closeModal()
}

// Dial Needle Angle calculations
const needleAngle = computed(() => {
  if (activeView.value === 'hour') {
    const h = selectedHour.value % 12
    return h * 30 // 30 degrees per hour
  } else {
    return selectedMinute.value * 6 // 6 degrees per minute
  }
})

// Calculate number positions around clock face (diameter = 256px, radius = 128px, num radius = 96px)
const getNumberPosition = (index: number, total: number) => {
  const angle = (index * (360 / total) - 90) * (Math.PI / 180)
  const r = 96 // distance from center
  const x = 128 + r * Math.cos(angle)
  const y = 128 + r * Math.sin(angle)
  return { left: `${x}px`, top: `${y}px` }
}

const hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

// Dial drag and click interaction
const calculateValueFromPointer = (e: MouseEvent | TouchEvent) => {
  if (!clockDialRef.value) return
  const rect = clockDialRef.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  let clientX = 0
  let clientY = 0
  if ('touches' in e && e.touches.length > 0) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else if ('clientX' in e) {
    clientX = (e as MouseEvent).clientX
    clientY = (e as MouseEvent).clientY
  }

  const dx = clientX - centerX
  const dy = clientY - centerY

  let angleDeg = (Math.atan2(dy, dx) * (180 / Math.PI)) + 90
  if (angleDeg < 0) angleDeg += 360

  if (activeView.value === 'hour') {
    let h = Math.round(angleDeg / 30) % 12
    if (h === 0) h = 12
    selectedHour.value = h
  } else {
    let m = Math.round(angleDeg / 6) % 60
    selectedMinute.value = m
  }
  syncKeyboardInputs()
}

const onDialPointerDown = (e: MouseEvent | TouchEvent) => {
  isDragging.value = true
  calculateValueFromPointer(e)
  window.addEventListener('mousemove', onDialPointerMove)
  window.addEventListener('mouseup', onDialPointerUp)
  window.addEventListener('touchmove', onDialPointerMove, { passive: false })
  window.addEventListener('touchend', onDialPointerUp)
}

const onDialPointerMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return
  if (e.cancelable) e.preventDefault()
  calculateValueFromPointer(e)
}

const onDialPointerUp = () => {
  if (!isDragging.value) return
  isDragging.value = false
  window.removeEventListener('mousemove', onDialPointerMove)
  window.removeEventListener('mouseup', onDialPointerUp)
  window.removeEventListener('touchmove', onDialPointerMove)
  window.removeEventListener('touchend', onDialPointerUp)

  // Auto-advance from hour to minute view once selected (Material Design standard)
  if (activeView.value === 'hour') {
    setTimeout(() => {
      activeView.value = 'minute'
    }, 220)
  }
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
  syncKeyboardInputs()
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isOpen.value) {
    closeModal()
  } else if (e.key === 'Enter' && isOpen.value) {
    handleConfirm()
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('mousemove', onDialPointerMove)
    window.removeEventListener('mouseup', onDialPointerUp)
    window.removeEventListener('touchmove', onDialPointerMove)
    window.removeEventListener('touchend', onDialPointerUp)
  }
})
</script>

<template>
  <div class="m2-timepicker-wrapper">
    <!-- Trigger Button in Table Cell -->
    <button
      type="button"
      class="m2-time-trigger"
      :disabled="disabled"
      title="Click to edit wave time"
      @click="openModal"
    >
      <span class="m2-trigger-text">{{ modelValue || '8:00 AM' }}</span>
      <span class="m2-trigger-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </span>
    </button>

    <!-- Material Design 2 Time Picker Dialog Modal -->
    <Teleport to="body">
      <Transition name="m2-dialog-fade">
        <div v-if="isOpen" class="m2-dialog-backdrop" @click.self="handleCancel">
          <div class="m2-time-dialog" role="dialog" aria-modal="true" aria-label="Select time">
            <!-- Header Label -->
            <div class="m2-dialog-header-label">
              <span>SELECT TIME</span>
              <!-- Quick Nudge Chips for Race Waves -->
              <div class="m2-nudge-group">
                <button type="button" class="m2-nudge-btn" title="Shift back 5 min" @click="nudgeMinutes(-5)">-5m</button>
                <button type="button" class="m2-nudge-btn" title="Shift back 2 min" @click="nudgeMinutes(-2)">-2m</button>
                <button type="button" class="m2-nudge-btn accent" title="Standard wave gap (+2m)" @click="nudgeMinutes(2)">+2m</button>
                <button type="button" class="m2-nudge-btn accent" title="Wave gap (+5m)" @click="nudgeMinutes(5)">+5m</button>
              </div>
            </div>

            <!-- Main Time Display Section -->
            <div class="m2-time-display-row">
              <div class="m2-time-inputs-group">
                <!-- Hour Display / Input -->
                <button
                  v-if="inputMode === 'dial'"
                  type="button"
                  class="m2-time-box"
                  :class="{ active: activeView === 'hour' }"
                  @click="activeView = 'hour'"
                >
                  {{ selectedHour }}
                </button>
                <input
                  v-else
                  v-model="keyboardHour"
                  type="text"
                  maxlength="2"
                  class="m2-time-box-input"
                  placeholder="08"
                />

                <span class="m2-time-colon">:</span>

                <!-- Minute Display / Input -->
                <button
                  v-if="inputMode === 'dial'"
                  type="button"
                  class="m2-time-box"
                  :class="{ active: activeView === 'minute' }"
                  @click="activeView = 'minute'"
                >
                  {{ displayMinuteStr }}
                </button>
                <input
                  v-else
                  v-model="keyboardMinute"
                  type="text"
                  maxlength="2"
                  class="m2-time-box-input"
                  placeholder="00"
                />
              </div>

              <!-- AM / PM Segmented Selector -->
              <div class="m2-period-selector">
                <button
                  type="button"
                  class="m2-period-btn"
                  :class="{ active: meridiem === 'AM' }"
                  @click="meridiem = 'AM'"
                >
                  AM
                </button>
                <button
                  type="button"
                  class="m2-period-btn"
                  :class="{ active: meridiem === 'PM' }"
                  @click="meridiem = 'PM'"
                >
                  PM
                </button>
              </div>
            </div>

            <!-- Material 2 Clock Dial Face -->
            <div v-if="inputMode === 'dial'" class="m2-dial-container">
              <div
                ref="clockDialRef"
                class="m2-clock-dial"
                @mousedown="onDialPointerDown"
                @touchstart.prevent="onDialPointerDown"
              >
                <!-- Central Pin -->
                <div class="m2-dial-center-pin"></div>

                <!-- Hand / Needle extending from center to number -->
                <div
                  class="m2-dial-needle"
                  :style="{ transform: `rotate(${needleAngle}deg)` }"
                >
                  <div class="m2-dial-selector-dot"></div>
                </div>

                <!-- Clock Numbers -->
                <template v-if="activeView === 'hour'">
                  <div
                    v-for="(h, idx) in hoursList"
                    :key="`hour-${h}`"
                    class="m2-dial-number"
                    :class="{ selected: selectedHour === h }"
                    :style="getNumberPosition(idx, 12)"
                  >
                    {{ h }}
                  </div>
                </template>

                <template v-else>
                  <div
                    v-for="(m, idx) in minutesList"
                    :key="`min-${m}`"
                    class="m2-dial-number"
                    :class="{ selected: selectedMinute === m }"
                    :style="getNumberPosition(idx, 12)"
                  >
                    {{ m === 0 ? '00' : (m < 10 ? `0${m}` : m) }}
                  </div>
                </template>
              </div>
            </div>

            <!-- Material 2 Keyboard Helper Text -->
            <div v-else class="m2-keyboard-helper">
              <div class="m2-keyboard-labels">
                <span>Hour (1–12)</span>
                <span>Minute (0–59)</span>
              </div>
              <p class="m2-keyboard-hint">Type hour and minute or toggle back to dial picker.</p>
            </div>

            <!-- Dialog Actions Footer -->
            <div class="m2-dialog-footer">
              <!-- Mode Switcher (Keyboard vs Dial) -->
              <button
                type="button"
                class="m2-mode-icon-btn"
                :title="inputMode === 'dial' ? 'Switch to text input' : 'Switch to dial picker'"
                @click="inputMode = inputMode === 'dial' ? 'keyboard' : 'dial'"
              >
                <svg v-if="inputMode === 'dial'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                  <line x1="6" y1="8" x2="6" y2="8"></line>
                  <line x1="10" y1="8" x2="10" y2="8"></line>
                  <line x1="14" y1="8" x2="14" y2="8"></line>
                  <line x1="18" y1="8" x2="18" y2="8"></line>
                  <line x1="6" y1="12" x2="6" y2="12"></line>
                  <line x1="18" y1="12" x2="18" y2="12"></line>
                  <line x1="7" y1="16" x2="17" y2="16"></line>
                </svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </button>

              <!-- Cancel & OK Action Buttons -->
              <div class="m2-actions-group">
                <button type="button" class="m2-action-btn" @click="handleCancel">
                  CANCEL
                </button>
                <button type="button" class="m2-action-btn confirm" @click="handleConfirm">
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.m2-timepicker-wrapper {
  display: inline-block;
}

/* Trigger Button in Table Cell */
.m2-time-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 8px;
  color: var(--text-main);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  width: 108px;
  box-sizing: border-box;
  transition: all 0.15s ease;
}

:root.theme-light .m2-time-trigger,
.theme-light .m2-time-trigger,
:root[data-theme="light"] .m2-time-trigger {
  background: #ffffff;
  border-color: #cbd5e1;
  color: #0f172a;
}

.m2-time-trigger:hover {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.m2-trigger-text {
  flex: 1;
  text-align: center;
}

.m2-trigger-icon {
  color: var(--text-muted);
  display: flex;
  align-items: center;
}

/* Modal Backdrop */
.m2-dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(2px);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}

/* Material Design 2 Time Picker Dialog Box */
.m2-time-dialog {
  width: 320px;
  background: #1e1e24;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.06);
  padding: 20px 20px 14px 20px;
  color: #ffffff;
  font-family: Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  user-select: none;
  animation: m2-pop 0.2s cubic-bezier(0, 0, 0.2, 1);
}

:root.theme-light .m2-time-dialog,
.theme-light .m2-time-dialog,
:root[data-theme="light"] .m2-time-dialog {
  background: #ffffff;
  border-color: #e2e8f0;
  color: #0f172a;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.2);
}

/* Header Label */
.m2-dialog-header-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #a1a1aa;
  margin-bottom: 12px;
}

.m2-nudge-group {
  display: flex;
  gap: 4px;
}

.m2-nudge-btn {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #d4d4d8;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.m2-nudge-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.m2-nudge-btn.accent {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
  color: #f87171;
}

.m2-nudge-btn.accent:hover {
  background: #ef4444;
  color: #ffffff;
}

/* Big Display Row */
.m2-time-display-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 18px;
}

.m2-time-inputs-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.m2-time-box {
  width: 80px;
  height: 64px;
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid transparent;
  border-radius: 8px;
  color: #d4d4d8;
  font-size: 44px;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

:root.theme-light .m2-time-box,
.theme-light .m2-time-box,
:root[data-theme="light"] .m2-time-box {
  background: #f1f5f9;
  color: #334155;
}

.m2-time-box.active {
  background: rgba(239, 68, 68, 0.16);
  border-color: #ef4444;
  color: #f87171;
  font-weight: 500;
}

.m2-time-box-input {
  width: 80px;
  height: 64px;
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid #ef4444;
  border-radius: 8px;
  color: #ffffff;
  font-size: 40px;
  font-weight: 500;
  text-align: center;
  outline: none;
}

:root.theme-light .m2-time-box-input,
.theme-light .m2-time-box-input,
:root[data-theme="light"] .m2-time-box-input {
  background: #f8fafc;
  color: #0f172a;
}

.m2-time-colon {
  font-size: 40px;
  font-weight: 300;
  color: #a1a1aa;
  line-height: 1;
  margin: 0 2px;
}

/* AM / PM Selector */
.m2-period-selector {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  overflow: hidden;
  height: 64px;
  width: 44px;
}

:root.theme-light .m2-period-selector,
.theme-light .m2-period-selector,
:root[data-theme="light"] .m2-period-selector {
  border-color: #cbd5e1;
}

.m2-period-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: #a1a1aa;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.m2-period-btn:first-child {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

:root.theme-light .m2-period-btn:first-child,
.theme-light .m2-period-btn:first-child,
:root[data-theme="light"] .m2-period-btn:first-child {
  border-bottom-color: #cbd5e1;
}

.m2-period-btn.active {
  background: #ef4444;
  color: #ffffff;
}

/* Dial Container & Clock Face */
.m2-dial-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 6px 0 10px 0;
}

.m2-clock-dial {
  position: relative;
  width: 256px;
  height: 256px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  cursor: pointer;
  touch-action: none;
}

:root.theme-light .m2-clock-dial,
.theme-light .m2-clock-dial,
:root[data-theme="light"] .m2-clock-dial {
  background: #f1f5f9;
}

.m2-dial-center-pin {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
}

/* Dial Needle */
.m2-dial-needle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 96px;
  background: #ef4444;
  transform-origin: top center;
  z-index: 4;
  pointer-events: none;
  transition: transform 0.08s ease-out;
}

/* Selector Bubble at the end of needle */
.m2-dial-selector-dot {
  position: absolute;
  bottom: -18px;
  left: -17px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.45);
}

/* Number Label placed around dial */
.m2-dial-number {
  position: absolute;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  color: #e4e4e7;
  pointer-events: none;
  z-index: 6;
  transition: color 0.1s ease;
}

:root.theme-light .m2-dial-number,
.theme-light .m2-dial-number,
:root[data-theme="light"] .m2-dial-number {
  color: #334155;
}

.m2-dial-number.selected {
  color: #ffffff !important;
  font-weight: 700;
}

/* Keyboard Input Helper */
.m2-keyboard-helper {
  min-height: 256px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
}

.m2-keyboard-labels {
  display: flex;
  gap: 50px;
  font-size: 11px;
  color: #a1a1aa;
  margin-bottom: 8px;
}

.m2-keyboard-hint {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  margin-top: 14px;
}

/* Dialog Footer */
.m2-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

:root.theme-light .m2-dialog-footer,
.theme-light .m2-dialog-footer,
:root[data-theme="light"] .m2-dialog-footer {
  border-top-color: #e2e8f0;
}

.m2-mode-icon-btn {
  background: none;
  border: none;
  color: #a1a1aa;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.m2-mode-icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

:root.theme-light .m2-mode-icon-btn:hover,
.theme-light .m2-mode-icon-btn:hover,
:root[data-theme="light"] .m2-mode-icon-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.m2-actions-group {
  display: flex;
  gap: 8px;
}

.m2-action-btn {
  background: transparent;
  border: none;
  color: #a1a1aa;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.m2-action-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

:root.theme-light .m2-action-btn:hover,
.theme-light .m2-action-btn:hover,
:root[data-theme="light"] .m2-action-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.m2-action-btn.confirm {
  color: #ef4444;
}

.m2-action-btn.confirm:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

/* Dialog Transitions */
.m2-dialog-fade-enter-active,
.m2-dialog-fade-leave-active {
  transition: opacity 0.18s ease;
}

.m2-dialog-fade-enter-from,
.m2-dialog-fade-leave-to {
  opacity: 0;
}

@keyframes m2-pop {
  0% {
    opacity: 0;
    transform: scale(0.92);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
