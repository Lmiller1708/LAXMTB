<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSiteMedia, type SiteMediaConfig } from '../composables/useSiteMedia'
import { uploadMediaFile } from '../utils/mediaUploader'
import ImageCropperModal from './ImageCropperModal.vue'

const props = defineProps<{
  isOpen: boolean
  photoKey: keyof SiteMediaConfig | null
  photoLabel: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'toast', msg: string): void
}>()

const { media, updateMediaItem } = useSiteMedia()

const inputUrl = ref('')
const isSaving = ref(false)
const isUploading = ref(false)
const errorMsg = ref('')

const isCropperOpen = ref(false)

const openCropper = () => {
  if (!inputUrl.value) return
  isCropperOpen.value = true
}

const handleCroppedImage = (croppedUrl: string) => {
  inputUrl.value = croppedUrl
  emit('toast', '✂️ Photo cropped and updated!')
}

watch(() => props.isOpen, (open) => {
  if (open && props.photoKey) {
    inputUrl.value = media.value[props.photoKey] || ''
    errorMsg.value = ''
    isUploading.value = false
    isCropperOpen.value = false
  }
})

// Upload file directly to database (base64 compressed)
const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  isUploading.value = true
  errorMsg.value = ''

  try {
    const uploadedUrl = await uploadMediaFile(file, 'site-media', props.photoKey || 'photo')
    inputUrl.value = uploadedUrl
    openCropper()
    emit('toast', '🌟 Photo loaded! Adjust framing and position.')
  } catch (err: any) {
    errorMsg.value = err?.message || 'Failed to process image. Please try another file.'
  } finally {
    isUploading.value = false
    target.value = ''
  }
}

const handleSave = async () => {
  if (!props.photoKey) return
  if (!inputUrl.value.trim()) {
    errorMsg.value = 'Please provide a valid image URL or choose a file.'
    return
  }

  isSaving.value = true
  errorMsg.value = ''

  try {
    await updateMediaItem(props.photoKey, inputUrl.value.trim())
    emit('toast', `✅ Updated photo for ${props.photoLabel}`)
    emit('close')
  } catch (err: any) {
    errorMsg.value = err?.message || 'Failed to update photo in Firestore.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-dialog">
      <div class="modal-header">
        <div class="modal-title-row">
          <span class="modal-icon">📷</span>
          <div>
            <h3>Change Photo</h3>
            <span class="modal-sub">{{ photoLabel }}</span>
          </div>
        </div>
        <button class="btn-close" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <div v-if="errorMsg" class="modal-error-alert">{{ errorMsg }}</div>

        <!-- Live Preview with Mode Badges -->
        <div class="preview-box">
          <img
            v-if="inputUrl"
            :src="inputUrl"
            alt="Preview"
            class="photo-preview-img"
            onerror="this.style.display='none'"
          />
          <div v-else class="preview-empty">No image specified</div>

          <!-- Mode Badge -->
          <div v-if="inputUrl" class="preview-badge-overlay">
            <span v-if="inputUrl.startsWith('/images/')" class="badge-source badge-images">
              📁 /images Folder (Lossless • 0 DB Size)
            </span>
            <span v-else-if="inputUrl.startsWith('data:')" class="badge-source badge-db">
              💾 Stored in DB (Base64)
            </span>
            <span v-else class="badge-source badge-link">
              🔗 Web URL
            </span>
          </div>

          <button
            v-if="inputUrl"
            type="button"
            class="btn-overlay-crop"
            title="Crop, zoom, and reposition this image"
            @click="openCropper"
          >
            ✂️ Crop & Reposition
          </button>
        </div>

        <!-- Upload Photo to Database -->
        <div class="form-group">
          <label class="file-upload-btn" :class="{ disabled: isUploading }">
            <span>{{ isUploading ? '⏳ Uploading & Optimizing...' : '📷 Upload Photo to DB' }}</span>
            <input type="file" accept="image/*" class="sr-only" :disabled="isUploading" @change="handleFileUpload" />
          </label>
        </div>

        <!-- Direct Path in /images/ or URL -->
        <div class="form-group">
          <label>Image Location in /images/ or URL</label>
          <input
            v-model="inputUrl"
            type="text"
            class="form-input"
            placeholder="/images/team-2026.jpg or https://..."
          />
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" :disabled="isSaving || isUploading" @click="emit('close')">Cancel</button>
        <button
          type="button"
          class="btn-save"
          :disabled="isSaving || isUploading || !inputUrl"
          @click="handleSave"
        >
          {{ isSaving ? 'Saving...' : 'Save Photo' }}
        </button>
      </div>
    </div>

    <!-- Interactive Image Cropper & Repositioner Modal -->
    <ImageCropperModal
      :is-open="isCropperOpen"
      :image-src="inputUrl"
      :aspect-ratio-preset="photoKey === 'teamPhoto' ? '4:3' : '16:9'"
      :title="`Crop & Reposition: ${photoLabel}`"
      @crop="handleCroppedImage"
      @close="isCropperOpen = false"
    />
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-dialog {
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-icon {
  font-size: 24px;
}

.modal-title-row h3 {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-main);
}

.modal-sub {
  font-size: 12px;
  color: var(--accent-red);
  font-weight: 700;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 18px;
  color: var(--text-muted);
  cursor: pointer;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-error-alert {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12.5px;
}

.preview-box {
  width: 100%;
  height: 180px;
  background: var(--bg-subtle);
  border: 1px dashed var(--border-strong);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.photo-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.preview-empty {
  font-size: 12px;
  color: var(--text-muted);
}

.btn-overlay-crop {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(15, 16, 19, 0.85);
  border: 1px solid var(--border-strong);
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  backdrop-filter: blur(4px);
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.btn-overlay-crop:hover {
  background: var(--accent-red);
  border-color: var(--accent-red);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-main);
}

.form-input {
  background: var(--bg-body);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13.5px;
  width: 100%;
}
.form-input:focus {
  outline: none;
  border-color: var(--accent-red);
}

.form-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.form-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px dashed var(--border);
  margin: 2px 0;
  position: relative;
}

.form-divider span {
  background: var(--bg-card);
  padding: 0 10px;
  font-size: 10px;
  font-weight: 800;
  color: var(--text-muted);
  position: relative;
  top: -7px;
}

.file-upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 8px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-main);
  text-align: center;
  transition: all 0.15s ease;
}
.file-upload-btn:hover {
  background: var(--bg-card-hover);
  border-color: var(--accent-red);
}

.preview-badge-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 6px;
}

.badge-source {
  font-size: 10px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 6px;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.badge-images {
  background: rgba(16, 185, 129, 0.25);
  border: 1px solid rgba(16, 185, 129, 0.5);
  color: #34d399;
}

.badge-db {
  background: rgba(59, 130, 246, 0.25);
  border: 1px solid rgba(59, 130, 246, 0.5);
  color: #93c5fd;
}

.badge-link {
  background: rgba(245, 158, 11, 0.25);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #fde68a;
}

.sr-only {
  display: none;
}

.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.btn-save {
  background: var(--accent-red);
  border: none;
  color: #ffffff;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.btn-save:hover {
  background: var(--accent-red-hover);
}
.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
