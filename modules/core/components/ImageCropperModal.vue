<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { compressImage } from '../utils/imageCompressor'

export type AspectPreset = '16:9' | '4:3' | '1:1' | 'free'
export type BackgroundMode = 'transparent' | 'white' | 'black'

const props = withDefaults(defineProps<{
  isOpen: boolean
  imageSrc: string
  aspectRatioPreset?: AspectPreset
  defaultBackground?: BackgroundMode
  title?: string
  subtitle?: string
}>(), {
  aspectRatioPreset: '16:9',
  defaultBackground: 'transparent',
  title: 'Crop & Reposition Image',
  subtitle: 'Drag to adjust framing or use zoom and position controls'
})

const emit = defineEmits<{
  (e: 'crop', dataUrl: string): void
  (e: 'close'): void
}>()

const activeAspect = ref<AspectPreset>('16:9')
const backgroundMode = ref<BackgroundMode>('transparent')
const scale = ref(1.0)
const panX = ref(0)
const panY = ref(0)
const rotation = ref(0)

const isDragging = ref(false)
const isProcessing = ref(false)
const errorMessage = ref('')

const naturalWidth = ref(1)
const naturalHeight = ref(1)
const isImageLoaded = ref(false)

const imgRef = ref<HTMLImageElement | null>(null)
const viewportRef = ref<HTMLDivElement | null>(null)

// Initialize and reset on open
watch(() => props.isOpen, (open) => {
  if (open) {
    activeAspect.value = props.aspectRatioPreset || '16:9'
    backgroundMode.value = props.defaultBackground || (props.aspectRatioPreset === 'free' ? 'transparent' : 'white')
    resetTransform()
    loadImageDimensions()
  }
})

watch(() => props.imageSrc, () => {
  if (props.isOpen) {
    resetTransform()
    loadImageDimensions()
  }
})

const resetTransform = () => {
  scale.value = 1.0
  panX.value = 0
  panY.value = 0
  rotation.value = 0
  errorMessage.value = ''
}

const loadImageDimensions = () => {
  if (!props.imageSrc) return
  isImageLoaded.value = false
  errorMessage.value = ''

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    naturalWidth.value = img.naturalWidth || 800
    naturalHeight.value = img.naturalHeight || 600
    isImageLoaded.value = true
    clampPan()
  }
  img.onerror = () => {
    errorMessage.value = 'Unable to load image for cropping. You can still save it directly.'
  }
  img.src = props.imageSrc
}

// Aspect ratio calculations
const currentAspectRatio = computed(() => {
  switch (activeAspect.value) {
    case '16:9': return 16 / 9
    case '4:3': return 4 / 3
    case '1:1': return 1.0
    case 'free':
    default: {
      const effW = rotation.value % 180 === 0 ? naturalWidth.value : naturalHeight.value
      const effH = rotation.value % 180 === 0 ? naturalHeight.value : naturalWidth.value
      return effW / (effH || 1)
    }
  }
})

// Viewport layout dimensions (px)
const MAX_VP_WIDTH = 440
const MAX_VP_HEIGHT = 300

const viewportDimensions = computed(() => {
  const aspect = currentAspectRatio.value
  let width = MAX_VP_WIDTH
  let height = Math.round(width / aspect)

  if (height > MAX_VP_HEIGHT) {
    height = MAX_VP_HEIGHT
    width = Math.round(height * aspect)
  }

  return { width, height }
})

// Effective image dimensions after 90/270 deg rotations
const effectiveImageDimensions = computed(() => {
  const isRotated = rotation.value === 90 || rotation.value === 270
  return {
    width: isRotated ? naturalHeight.value : naturalWidth.value,
    height: isRotated ? naturalWidth.value : naturalHeight.value
  }
})

// Base dimensions to cover the crop viewport completely at scale = 1.0
const baseDimensions = computed(() => {
  const vp = viewportDimensions.value
  const eff = effectiveImageDimensions.value
  const effAspect = eff.width / (eff.height || 1)
  const vpAspect = vp.width / (vp.height || 1)

  let baseWidth = vp.width
  let baseHeight = vp.height

  if (effAspect > vpAspect) {
    baseHeight = vp.height
    baseWidth = Math.round(vp.height * effAspect)
  } else {
    baseWidth = vp.width
    baseHeight = Math.round(vp.width / effAspect)
  }

  return { baseWidth, baseHeight }
})

const maxPan = computed(() => {
  const vp = viewportDimensions.value
  const base = baseDimensions.value
  const s = scale.value

  const maxPanX = Math.max(0, ((base.baseWidth * s) - vp.width) / 2)
  const maxPanY = Math.max(0, ((base.baseHeight * s) - vp.height) / 2)

  return { maxPanX, maxPanY }
})

const clampPan = () => {
  const { maxPanX, maxPanY } = maxPan.value
  panX.value = Math.max(-maxPanX, Math.min(maxPanX, panX.value))
  panY.value = Math.max(-maxPanY, Math.min(maxPanY, panY.value))
}

watch([scale, activeAspect, rotation], () => {
  clampPan()
})

// Quick position aligners
const setPosition = (pos: 'center' | 'top' | 'bottom' | 'left' | 'right') => {
  const { maxPanX, maxPanY } = maxPan.value
  switch (pos) {
    case 'center':
      panX.value = 0
      panY.value = 0
      break
    case 'top':
      panY.value = maxPanY
      break
    case 'bottom':
      panY.value = -maxPanY
      break
    case 'left':
      panX.value = maxPanX
      break
    case 'right':
      panX.value = -maxPanX
      break
  }
}

const rotateClockwise = () => {
  rotation.value = (rotation.value + 90) % 360
  panX.value = 0
  panY.value = 0
}

// Drag & Pan handlers
let dragStartX = 0
let dragStartY = 0
let initialPanX = 0
let initialPanY = 0

const onPointerDown = (e: PointerEvent) => {
  if (!isImageLoaded.value) return
  isDragging.value = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  initialPanX = panX.value
  initialPanY = panY.value
  ;(e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId)
}

const onPointerMove = (e: PointerEvent) => {
  if (!isDragging.value) return
  panX.value = initialPanX + (e.clientX - dragStartX)
  panY.value = initialPanY + (e.clientY - dragStartY)
  clampPan()
}

const onPointerUp = (e: PointerEvent) => {
  if (isDragging.value) {
    isDragging.value = false
    try {
      ;(e.currentTarget as HTMLElement)?.releasePointerCapture?.(e.pointerId)
    } catch {
      // ignore
    }
  }
}

const onWheel = (e: WheelEvent) => {
  e.preventDefault()
  const delta = -e.deltaY * 0.0015
  scale.value = Math.max(1.0, Math.min(3.0, Number((scale.value + delta).toFixed(2))))
  clampPan()
}

// Render Offscreen Canvas with Transform
const renderCropCanvas = async (targetMaxDim = 1400): Promise<HTMLCanvasElement> => {
  const vp = viewportDimensions.value
  const eff = effectiveImageDimensions.value
  const base = baseDimensions.value

  // Determine high-res canvas output size
  let outWidth = Math.min(targetMaxDim, Math.max(600, Math.round(eff.width)))
  let outHeight = Math.round(outWidth / currentAspectRatio.value)

  if (outHeight > targetMaxDim) {
    outHeight = targetMaxDim
    outWidth = Math.round(outHeight * currentAspectRatio.value)
  }

  const canvas = document.createElement('canvas')
  canvas.width = outWidth
  canvas.height = outHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Calculate scale factor from viewport to high-res canvas
  const scaleRatio = outWidth / vp.width

  // Pre-fill canvas with chosen background
  if (backgroundMode.value === 'white') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, outWidth, outHeight)
  } else if (backgroundMode.value === 'black') {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, outWidth, outHeight)
  } else {
    ctx.clearRect(0, 0, outWidth, outHeight)
  }

  // Canvas coordinate transform
  ctx.save()
  // 1. Move to canvas center + pan offset
  ctx.translate(
    outWidth / 2 + (panX.value * scaleRatio),
    outHeight / 2 + (panY.value * scaleRatio)
  )
  // 2. Rotate
  ctx.rotate((rotation.value * Math.PI) / 180)

  // 3. Draw image centered
  const baseScaleFactor = (base.baseWidth / eff.width) * scale.value * scaleRatio
  const drawW = naturalWidth.value * baseScaleFactor
  const drawH = naturalHeight.value * baseScaleFactor

  const img = new Image()
  img.crossOrigin = 'anonymous'

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = (err) => reject(err)
    img.src = props.imageSrc
  })

  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
  ctx.restore()

  return canvas
}

// Save cropped image (Base64 for Database)
const handleApplyCrop = async () => {
  if (!props.imageSrc || !isImageLoaded.value) return

  isProcessing.value = true
  errorMessage.value = ''

  try {
    const isLogo = activeAspect.value === 'free'
    const targetDim = isLogo ? 800 : (activeAspect.value === '1:1' ? 900 : 1400)
    const canvas = await renderCropCanvas(targetDim)
    const isTransparent = isLogo && backgroundMode.value === 'transparent'
    const mime = isTransparent ? 'image/png' : 'image/jpeg'
    const rawDataUrl = canvas.toDataURL(mime, isTransparent ? undefined : 0.88)
    const optimized = await compressImage(rawDataUrl, targetDim, targetDim, 0.85, !isTransparent)

    emit('crop', optimized)
    emit('close')
  } catch (err: any) {
    console.error('Failed to crop image:', err)
    errorMessage.value = 'Failed to crop this image. Saving original.'
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="cropper-backdrop" @click.self="emit('close')">
    <div class="cropper-dialog">
      <!-- Header -->
      <div class="cropper-header">
        <div class="cropper-title-box">
          <span class="cropper-icon">✂️</span>
          <div>
            <h3>{{ title }}</h3>
            <span class="cropper-sub">{{ subtitle }}</span>
          </div>
        </div>
        <button class="btn-close" @click="emit('close')">✕</button>
      </div>

      <!-- Body -->
      <div class="cropper-body">
        <div v-if="errorMessage" class="cropper-alert">{{ errorMessage }}</div>

        <!-- Aspect Ratio Tabs -->
        <div class="aspect-tabs">
          <button
            type="button"
            class="aspect-btn"
            :class="{ active: activeAspect === '16:9' }"
            @click="activeAspect = '16:9'"
          >
            16:9 Banner
          </button>
          <button
            type="button"
            class="aspect-btn"
            :class="{ active: activeAspect === '4:3' }"
            @click="activeAspect = '4:3'"
          >
            4:3 Photo
          </button>
          <button
            type="button"
            class="aspect-btn"
            :class="{ active: activeAspect === '1:1' }"
            @click="activeAspect = '1:1'"
          >
            1:1 Square
          </button>
          <button
            type="button"
            class="aspect-btn"
            :class="{ active: activeAspect === 'free' }"
            @click="activeAspect = 'free'"
          >
            Original
          </button>
        </div>

        <!-- Canvas Background Selector (Transparent / White / Black) -->
        <div class="bg-mode-row">
          <span class="bg-mode-label">Background:</span>
          <div class="bg-mode-tabs">
            <button
              type="button"
              class="bg-mode-btn"
              :class="{ active: backgroundMode === 'transparent' }"
              @click="backgroundMode = 'transparent'"
              title="Preserve transparency (PNG output)"
            >
              <span class="checker-swatch"></span>
              <span>Transparent</span>
            </button>
            <button
              type="button"
              class="bg-mode-btn"
              :class="{ active: backgroundMode === 'white' }"
              @click="backgroundMode = 'white'"
              title="Solid white background"
            >
              <span class="color-swatch white-swatch"></span>
              <span>White</span>
            </button>
            <button
              type="button"
              class="bg-mode-btn"
              :class="{ active: backgroundMode === 'black' }"
              @click="backgroundMode = 'black'"
              title="Solid black background"
            >
              <span class="color-swatch black-swatch"></span>
              <span>Black</span>
            </button>
          </div>
        </div>

        <!-- Viewport Stage -->
        <div class="stage-container" @wheel="onWheel">
          <div
            ref="viewportRef"
            :class="['crop-viewport', `bg-${backgroundMode}`]"
            :style="{
              width: `${viewportDimensions.width}px`,
              height: `${viewportDimensions.height}px`
            }"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <img
              ref="imgRef"
              :src="imageSrc"
              alt="Crop target"
              class="viewport-img"
              :style="{
                width: `${baseDimensions.baseWidth}px`,
                height: `${baseDimensions.baseHeight}px`,
                transform: `translate(${panX}px, ${panY}px) scale(${scale}) rotate(${rotation}deg)`,
                cursor: isDragging ? 'grabbing' : 'grab'
              }"
              draggable="false"
            />

            <!-- Visual Rule-of-Thirds Grid Overlay -->
            <div class="crop-grid">
              <div class="grid-line grid-h1"></div>
              <div class="grid-line grid-h2"></div>
              <div class="grid-line grid-v1"></div>
              <div class="grid-line grid-v2"></div>
            </div>

            <div class="drag-hint" v-if="!isDragging && scale === 1 && panX === 0 && panY === 0">
              <span>✋ Drag to position & frame</span>
            </div>
          </div>
        </div>

        <!-- Position & Zoom Controls -->
        <div class="controls-card">
          <!-- Zoom Slider -->
          <div class="control-row">
            <span class="control-label">🔍 Zoom</span>
            <div class="zoom-controls">
              <button
                type="button"
                class="btn-step"
                :disabled="scale <= 1.0"
                @click="scale = Math.max(1.0, Number((scale - 0.1).toFixed(1)))"
              >
                −
              </button>
              <input
                v-model.number="scale"
                type="range"
                min="1.0"
                max="3.0"
                step="0.05"
                class="zoom-slider"
              />
              <button
                type="button"
                class="btn-step"
                :disabled="scale >= 3.0"
                @click="scale = Math.min(3.0, Number((scale + 0.1).toFixed(1)))"
              >
                +
              </button>
              <span class="zoom-val">{{ Math.round(scale * 100) }}%</span>
            </div>
          </div>

          <!-- Position Aligners & Rotate -->
          <div class="control-row">
            <span class="control-label">🎯 Position</span>
            <div class="pos-buttons">
              <button type="button" class="pos-btn" title="Center" @click="setPosition('center')">Center</button>
              <button type="button" class="pos-btn" title="Top" @click="setPosition('top')">Top</button>
              <button type="button" class="pos-btn" title="Bottom" @click="setPosition('bottom')">Bottom</button>
              <button type="button" class="pos-btn" title="Left" @click="setPosition('left')">Left</button>
              <button type="button" class="pos-btn" title="Right" @click="setPosition('right')">Right</button>
              <button type="button" class="pos-btn rotate-btn" title="Rotate 90 degrees" @click="rotateClockwise">
                🔄 90°
              </button>
              <button type="button" class="pos-btn reset-btn" title="Reset transforms" @click="resetTransform">
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="cropper-footer">
        <button type="button" class="btn-cancel" :disabled="isProcessing" @click="emit('close')">
          Cancel
        </button>
        <button
          type="button"
          class="btn-save-crop"
          :disabled="isProcessing || !isImageLoaded"
          @click="handleApplyCrop"
        >
          <span v-if="isProcessing">⏳ Processing...</span>
          <span v-else>✂️ Save & Crop</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cropper-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(6px);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.cropper-dialog {
  background: var(--bg-card, #17181c);
  border: 1px solid var(--border-strong, #2f333a);
  border-radius: 16px;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cropper-header {
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border, #262930);
}

.cropper-title-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cropper-icon {
  font-size: 20px;
}

.cropper-title-box h3 {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
  margin: 0;
}

.cropper-sub {
  font-size: 11.5px;
  color: var(--text-muted, #9ca3af);
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 18px;
  color: var(--text-muted, #9ca3af);
  cursor: pointer;
}

.cropper-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cropper-alert {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
}

.aspect-tabs {
  display: flex;
  gap: 6px;
  background: var(--bg-body, #0f1013);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--border, #262930);
}

.aspect-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-muted, #9ca3af);
  font-size: 12px;
  font-weight: 700;
  padding: 6px 4px;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.aspect-btn.active {
  background: var(--accent-red, #dc2626);
  color: #ffffff;
}

.bg-mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: var(--bg-body, #0f1013);
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid var(--border, #262930);
}

.bg-mode-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-muted, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.bg-mode-tabs {
  display: flex;
  gap: 6px;
}

.bg-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted, #9ca3af);
  font-size: 11.5px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bg-mode-btn:hover {
  color: var(--text-main, #ffffff);
  background: rgba(255, 255, 255, 0.05);
}

.bg-mode-btn.active {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  color: var(--accent-red, #dc2626);
}

.checker-swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background-color: #f1f5f9;
  background-image: repeating-conic-gradient(#94a3b8 0% 25%, #f1f5f9 0% 50%);
  background-size: 6px 6px;
}

.color-swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.color-swatch.white-swatch {
  background: #ffffff;
}

.color-swatch.black-swatch {
  background: #000000;
}

.stage-container {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #08080a;
  border-radius: 12px;
  border: 1px solid var(--border-strong, #2f333a);
  padding: 16px;
  min-height: 280px;
  overflow: hidden;
  user-select: none;
}

.crop-viewport {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65), 0 0 12px rgba(220, 38, 38, 0.4);
  border: 2px solid var(--accent-red, #dc2626);
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.crop-viewport.bg-transparent {
  background-color: #f1f5f9;
  background-image: repeating-conic-gradient(#cbd5e1 0% 25%, #f8fafc 0% 50%);
  background-size: 16px 16px;
}

.crop-viewport.bg-white {
  background: #ffffff !important;
}

.crop-viewport.bg-black {
  background: #000000 !important;
}

.viewport-img {
  position: absolute;
  object-fit: cover;
  transform-origin: center center;
  transition: transform 0.05s linear;
  max-width: none;
  max-height: none;
}

.crop-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.grid-line {
  position: absolute;
  background: rgba(255, 255, 255, 0.2);
}

.grid-h1 { top: 33.33%; left: 0; right: 0; height: 1px; }
.grid-h2 { top: 66.66%; left: 0; right: 0; height: 1px; }
.grid-v1 { left: 33.33%; top: 0; bottom: 0; width: 1px; }
.grid-v2 { left: 66.66%; top: 0; bottom: 0; width: 1px; }

.drag-hint {
  position: absolute;
  bottom: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #f3f4f6;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  pointer-events: none;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.controls-card {
  background: var(--bg-body, #0f1013);
  border: 1px solid var(--border, #262930);
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.control-label {
  font-size: 12px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
  min-width: 75px;
}

.zoom-controls {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-step {
  background: var(--bg-subtle, #1c1e24);
  border: 1px solid var(--border, #262930);
  color: var(--text-main, #f3f4f6);
  width: 26px;
  height: 26px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-step:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.zoom-slider {
  flex: 1;
  accent-color: var(--accent-red, #dc2626);
  cursor: pointer;
}

.zoom-val {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted, #9ca3af);
  min-width: 36px;
  text-align: right;
}

.pos-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  justify-content: flex-end;
}

.pos-btn {
  background: var(--bg-subtle, #1c1e24);
  border: 1px solid var(--border, #262930);
  color: var(--text-main, #f3f4f6);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pos-btn:hover {
  background: var(--bg-card-hover, #242730);
  border-color: var(--accent-red, #dc2626);
}

.rotate-btn {
  color: #38bdf8;
}

.reset-btn {
  color: #fbbf24;
}

.cropper-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border, #262930);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.footer-action-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-cancel {
  background: var(--bg-subtle, #1c1e24);
  border: 1px solid var(--border, #262930);
  color: var(--text-main, #f3f4f6);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.btn-save-crop {
  background: var(--accent-red, #dc2626);
  border: 1px solid rgba(220, 38, 38, 0.4);
  color: #ffffff;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-save-crop:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-save-crop:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 520px) {
  .cropper-footer {
    flex-direction: column-reverse;
    align-items: stretch;
  }
  .btn-save-crop,
  .btn-cancel {
    width: 100%;
    justify-content: center;
  }
}
</style>
