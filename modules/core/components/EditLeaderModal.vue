<script setup lang="ts">
import { ref, watch } from 'vue'
import type { LeaderMember } from '../composables/useSiteLeadership'
import { uploadMediaFile } from '../utils/mediaUploader'
import ImageCropperModal from './ImageCropperModal.vue'

const props = defineProps<{
  isOpen: boolean
  leader: LeaderMember | null
  isNew?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', leader: LeaderMember): void
  (e: 'delete', id: string): void
  (e: 'toast', msg: string): void
}>()

const isUploading = ref(false)
const isCropperOpen = ref(false)

const openCropper = () => {
  if (!form.value.image) return
  isCropperOpen.value = true
}

const handleCroppedImage = (croppedUrl: string) => {
  form.value.image = croppedUrl
  if (croppedUrl.startsWith('/images/')) {
    emit('toast', `📁 Referencing ${croppedUrl} with zero DB storage! Remember to put the downloaded file into public/images/`)
  } else {
    emit('toast', '✂️ Portrait cropped and repositioned successfully!')
  }
}

const form = ref<LeaderMember>({
  id: '',
  name: '',
  role: '',
  image: '',
  desc: ''
})

watch(() => props.leader, (newVal) => {
  if (newVal) {
    form.value = { ...newVal }
  } else {
    form.value = {
      id: '',
      name: '',
      role: '',
      image: '',
      desc: ''
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
    const uploadedUrl = await uploadMediaFile(file, 'leadership', form.value.id || 'leader')
    form.value.image = uploadedUrl
    openCropper()
    emit('toast', '📷 Photo loaded! Adjust framing and position.')
  } catch (err: any) {
    emit('toast', `⚠️ ${err?.message || 'Could not process image.'}`)
  } finally {
    isUploading.value = false
    target.value = ''
  }
}

const handleSave = () => {
  if (!form.value.name.trim()) {
    emit('toast', "⚠️ Please enter the leader's name.")
    return
  }
  if (!form.value.role.trim()) {
    emit('toast', "⚠️ Please enter the leader's role.")
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
          <span class="modal-icon">{{ isNew ? '➕' : '✏️' }}</span>
          <div>
            <h3>{{ isNew ? 'Add Leadership Member' : 'Edit Leadership Member' }}</h3>
            <span class="modal-sub">{{ form.name || 'Staff Member' }}</span>
          </div>
        </div>
        <button type="button" class="btn-close" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <!-- Photo Preview & Upload -->
        <div class="photo-edit-row">
          <div class="preview-box">
            <img v-if="form.image" :src="form.image" alt="Preview" class="photo-preview-img" />
            <div v-else class="preview-empty">No Photo</div>
            <div v-if="form.image" class="preview-badge-overlay">
              <span v-if="form.image.startsWith('/images/')" class="badge-source badge-images">
                📁 /images
              </span>
              <span v-else-if="form.image.startsWith('data:')" class="badge-source badge-db">
                💾 DB
              </span>
            </div>
          </div>
          <div class="photo-upload-col">
            <label class="btn-upload-file" :class="{ disabled: isUploading }">
              <span>{{ isUploading ? '⏳ Uploading...' : '📷 Upload Photo to DB' }}</span>
              <input type="file" accept="image/*" class="sr-only" :disabled="isUploading" @change="handleFileUpload" />
            </label>
            <button
              v-if="form.image"
              type="button"
              class="btn-crop-portrait"
              @click="openCropper"
            >
              ✂️ Crop & Reposition
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>Full Name</label>
          <input
            v-model="form.name"
            type="text"
            class="form-input"
            placeholder="e.g. Ben Wilde"
          />
        </div>

        <div class="form-group">
          <label>Role / Title</label>
          <input
            v-model="form.role"
            type="text"
            class="form-input"
            placeholder="e.g. Head Coach or Team Director"
          />
        </div>

        <div class="form-group">
          <label>Image Location in /images/ or URL</label>
          <input
            v-model="form.image"
            type="text"
            class="form-input"
            placeholder="/images/ben-wilde.jpg or https://..."
          />
        </div>

        <div class="form-group">
          <label>Short Bio & Qualifications</label>
          <textarea
            v-model="form.desc"
            rows="3"
            class="form-input text-area"
            placeholder="Brief bio describing responsibilities..."
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button
          v-if="!isNew"
          type="button"
          class="btn-delete"
          @click="handleDelete"
        >
          🗑️ Remove Member
        </button>
        <div class="modal-footer-right">
          <button type="button" class="btn-cancel" @click="emit('close')">Cancel</button>
          <button type="button" class="btn-save" @click="handleSave">Save Changes</button>
        </div>
      </div>
    </div>

    <!-- Interactive Image Cropper Modal -->
    <ImageCropperModal
      :is-open="isCropperOpen"
      :image-src="form.image"
      aspect-ratio-preset="1:1"
      :title="`Crop Portrait: ${form.name || 'Team Leader'}`"
      subtitle="Frame face centered in 1:1 or 4:3 portrait format"
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
  background: rgba(16, 185, 129, 0.3);
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
  max-width: 520px;
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
  gap: 14px;
  max-height: 75vh;
  overflow-y: auto;
}

.photo-edit-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.preview-box {
  width: 90px;
  height: 100px;
  background: #000;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-empty {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
}

.photo-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
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

.btn-crop-portrait {
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
.btn-crop-portrait:hover {
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

.text-area {
  resize: vertical;
  line-height: 1.5;
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
