import { describe, it, expect, vi } from 'vitest'
import { uploadMediaFile, MAX_MEDIA_FILE_SIZE_BYTES } from '../modules/core/utils/mediaUploader'

describe('mediaUploader', () => {
  it('defines the 50MB size limit constant', () => {
    expect(MAX_MEDIA_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024)
  })

  it('rejects files larger than 50MB with a clear user message', async () => {
    const hugeFile = new File(['a'.repeat(100)], 'huge.jpg', { type: 'image/jpeg' })
    Object.defineProperty(hugeFile, 'size', { value: 52 * 1024 * 1024 })

    await expect(uploadMediaFile(hugeFile, 'site-media', 'teamPhoto')).rejects.toThrow(
      'The maximum allowed file size is 50MB'
    )
  })

  it('accepts files under 50MB without size error', async () => {
    const validFile = new File(['image-content'], 'photo.jpg', { type: 'image/jpeg' })
    Object.defineProperty(validFile, 'size', { value: 12 * 1024 * 1024 }) // 12MB file

    // When running in headless test without browser DOM canvas, should resolve or return data URL
    const result = await uploadMediaFile(validFile, 'site-media', 'teamPhoto')
    expect(result).toBeDefined()
  })
})
