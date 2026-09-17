<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SiteSponsor } from '../composables/useSiteSponsors'
import { uploadMediaFile } from '../utils/mediaUploader'
import ImageCropperModal from './ImageCropperModal.vue'

const props = defineProps<{
  isOpen: boolean
  sponsor: SiteSponsor | null
  isNew?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', sponsor: SiteSponsor): void
  (e: 'delete', id: string): void
  (e: 'toast', msg: string): void
}>()

const isUploading = ref(false)
const isCropperOpen = ref(false)

const openCropper = () => {
  if (!form.value.logoUrl) return
  isCropperOpen.value = true
}

const handleCroppedImage = (croppedUrl: string) => {
  form.value.logoUrl = croppedUrl
  if (croppedUrl.startsWith('/images/') || croppedUrl.startsWith('/logos/')) {
    emit('toast', `📁 Referencing ${croppedUrl} with zero DB storage! Remember to put the downloaded file into public/images/`)
  } else {
    emit('toast', '✂️ Sponsor logo cropped and repositioned successfully!')
  }
}

const form = ref<SiteSponsor>({
  id: '',
  name: '',
  logoUrl: '',
  websiteUrl: ''
})

watch(() => props.sponsor, (newVal) => {
  if (newVal) {
    form.value = { ...newVal }
  } else {
    form.value = {
      id: '',
      name: '',
      logoUrl: '',
      websiteUrl: ''
    }
  }
  isUploading.value = false
  isCropperOpen.value = false
}, { immediate: true })

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  isUploading.value = true
  try {
    const uploadedUrl = await uploadMediaFile(file, 'sponsors', form.value.id || 'sponsor')
    form.value.logoUrl = uploadedUrl
    openCropper()
    emit('toast', '🌟 Logo loaded! Adjust framing and position.')
  } catch (err: any) {
    emit('toast', `⚠️ ${err?.message || 'Could not process logo file.'}`)
  } finally {
    isUploading.value = false
    target.value = ''
  }
}

const handleSave = () => {
  if (!form.value.name.trim()) {
    emit('toast', '⚠️ Please enter sponsor name.')
    return
  }
  if (!form.value.logoUrl.trim()) {
    emit('toast', '⚠️ Please upload a logo or enter an image URL.')
    return
  }
  emit('save', { ...form.value })
  emit('close')
}

const handleDelete = () => {
  if (form.value.id) {
    emit('delete', form.value.id)
    emit('close')
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-dialog">
      <div class="modal-header">
        <div class="modal-title-row">
          <span class="modal-icon">🤝</span>
          <div>
            <h3>{{ isNew ? 'Add Team Sponsor' : 'Edit Team Sponsor' }}</h3>
            <span class="modal-sub">2026 Season Partner</span>
          </div>
        </div>
        <button type="button" class="btn-close" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <!-- Logo Preview & Upload -->
        <div class="photo-edit-row">
          <div class="preview-box">
            <img v-if="form.logoUrl" :src="form.logoUrl" alt="Preview" class="photo-preview-img" />
            <span v-else class="preview-empty">No Logo</span>
            <div v-if="form.logoUrl" class="preview-badge-overlay">
              <span v-if="form.logoUrl.startsWith('/images/') || form.logoUrl.startsWith('/logos/')" class="badge-source badge-images">
                📁 File
              </span>
              <span v-else-if="form.logoUrl.startsWith('data:')" class="badge-source badge-db">
                💾 DB
              </span>
            </div>
          </div>
          <div class="photo-upload-col">
            <label class="btn-upload-file" :class="{ disabled: isUploading }">
              <span>{{ isUploading ? '⏳ Uploading...' : '📷 Upload Logo to DB' }}</span>
              <input type="file" accept="image/*" class="sr-only" :disabled="isUploading" @change="handleFileUpload" />
            </label>
            <button
              v-if="form.logoUrl"
              type="button"
              class="btn-crop-logo"
              @click="openCropper"
            >
              ✂️ Crop & Reposition
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>Sponsor / Company Name</label>
          <input
            v-model="form.name"
            type="text"
            class="form-input"
            placeholder="e.g. Trek Bicycle Store, Coulee Bank..."
          />
        </div>

        <div class="form-group">
          <label>Logo Location in /images/ or URL</label>
          <input
            v-model="form.logoUrl"
            type="text"
            class="form-input"
            placeholder="/images/your-logo.png or https://..."
          />
        </div>

        <div class="form-group">
          <label>Website Link (Optional)</label>
          <input
            v-model="form.websiteUrl"
            type="url"
            class="form-input"
            placeholder="https://www.example.com"
          />
        </div>
      </div>

      <div class="modal-footer">
        <button
          v-if="!isNew"
          type="button"
          class="btn-delete"
          @click="handleDelete"
        >
          🗑️ Remove Sponsor
        </button>
        <div class="modal-footer-right">
          <button type="button" class="btn-cancel" @click="emit('close')">Cancel</button>
          <button type="button" class="btn-save" @click="handleSave">Save Sponsor</button>
        </div>
      </div>
    </div>

    <!-- Interactive Image Cropper Modal -->
    <ImageCropperModal
      :is-open="isCropperOpen"
      :image-src="form.logoUrl"
      aspect-ratio-preset="free"
      :title="`Crop Logo: ${form.name || 'Sponsor'}`"
      subtitle="Trim whitespace or center sponsor logo"
      @crop="handleCroppedImage"
      @close="isCropperOpen = false"
    />
  </div>
</template>

<style scoped>
.preview-badge-overlay {
  position: absolute;
  top: 6px;
  left: 6px;
}

.badge-source {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 5px;
  border-radius: 4px;
}

.badge-images {
  background: rgba(16, 185, 129, 0.4);
  color: #34d399;
}

.badge-db {
  background: rgba(59, 130, 246, 0.4);
  color: #93c5fd;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
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
  max-width: 500px;
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
  margin: 0;
}

.modal-sub {
  font-size: 12px;
  color: #3b82f6;
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
  gap: 14px;
}

.photo-edit-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.preview-box {
  width: 110px;
  height: 80px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  flex-shrink: 0;
}

.photo-preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.preview-empty {
  font-size: 11px;
  color: var(--text-muted);
}

.photo-upload-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.btn-upload-file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-strong);
  color: var(--text-main);
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}
.btn-upload-file:hover {
  background: var(--bg-card-hover);
}

.btn-crop-logo {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(220, 38, 38, 0.15);
  border: 1px solid rgba(220, 38, 38, 0.4);
  color: #fca5a5;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-crop-logo:hover {
  background: var(--accent-red);
  color: #ffffff;
  border-color: var(--accent-red);
}

.upload-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-main);
}

.form-input {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 13.5px;
  outline: none;
}
.form-input:focus {
  border-color: var(--accent-red);
}

.modal-footer {
  padding: 14px 20px;
  background: var(--bg-subtle);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.modal-footer-right {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.btn-save {
  background: var(--accent-red);
  color: #ffffff;
  border: none;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.btn-save:hover {
  background: var(--accent-red-hover);
}

.btn-delete {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.btn-delete:hover {
  background: rgba(239, 68, 68, 0.2);
}
</style>
