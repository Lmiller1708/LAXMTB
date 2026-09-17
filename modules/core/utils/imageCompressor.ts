/**
 * Client-side image compression utility.
 * Resizes large image files using HTML Canvas and converts them to
 * Web-optimized JPEG/PNG data URLs (typically 50KB–150KB), ensuring
 * they fit comfortably within Firestore document limits and load instantly.
 */
const MAX_TARGET_BYTES = 600 * 1024 // 600KB ceiling (safely within Firestore's 1MB per-doc limit)

export function compressImage(
  fileOrDataUrl: File | string,
  maxWidth = 1400,
  maxHeight = 1400,
  initialQuality = 0.85,
  forceJpeg = true
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : 'data:image/jpeg;base64,mock')
      return
    }

    const img = new Image()
    let objectUrl: string | null = null
    let timeoutId: any = null

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (objectUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        try {
          URL.revokeObjectURL(objectUrl)
        } catch {
          // ignore
        }
        objectUrl = null
      }
    }

    // Safety timeout: Never hang forever on corrupted or non-renderable images
    timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('Image processing timed out. Please try another file.'))
    }, 10000)

    img.onload = () => {
      cleanup()
      let curMaxWidth = maxWidth
      let curMaxHeight = maxHeight
      let curQuality = initialQuality

      const render = (wLimit: number, hLimit: number, q: number, asJpeg = forceJpeg): string => {
        let width = img.naturalWidth || img.width
        let height = img.naturalHeight || img.height

        if (!width || !height) {
          return ''
        }

        if (width > wLimit || height > hLimit) {
          if (width / height > wLimit / hLimit) {
            height = Math.round((height * wLimit) / width)
            width = wLimit
          } else {
            width = Math.round((width * hLimit) / height)
            height = hLimit
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return ''

        const isInputPng = (typeof fileOrDataUrl !== 'string' && fileOrDataUrl.type === 'image/png') ||
                           (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:image/png'))
        const isPng = !asJpeg && isInputPng

        if (!isPng) {
          // Fill with solid white before drawing so transparent areas don't convert to black in JPEG
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, width, height)
        }

        ctx.drawImage(img, 0, 0, width, height)

        const mime = isPng ? 'image/png' : 'image/jpeg'
        return canvas.toDataURL(mime, isPng ? undefined : q)
      }

      let result = render(curMaxWidth, curMaxHeight, curQuality)

      // Progressive reduction if result is above target ceiling (600KB)
      let attempts = 0
      while (result.length > MAX_TARGET_BYTES && attempts < 8) {
        attempts++
        curQuality = Math.max(0.70, curQuality - 0.05)
        curMaxWidth = Math.round(curMaxWidth * 0.82)
        curMaxHeight = Math.round(curMaxHeight * 0.82)
        result = render(curMaxWidth, curMaxHeight, curQuality)
      }

      // If still oversized after dimension reduction (e.g. huge lossless PNG), force JPEG format
      if (result.length > MAX_TARGET_BYTES) {
        result = render(Math.min(curMaxWidth, 1200), Math.min(curMaxHeight, 1200), 0.78, true)
      }

      resolve(result)
    }

    img.onerror = (err) => {
      cleanup()
      reject(new Error('Failed to load image. The file format may be unsupported or corrupted.'))
    }

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl
    } else if (typeof URL !== 'undefined' && URL.createObjectURL) {
      try {
        objectUrl = URL.createObjectURL(fileOrDataUrl)
        img.src = objectUrl
      } catch {
        // Fallback to FileReader if createObjectURL fails
        const reader = new FileReader()
        reader.onload = () => {
          img.src = reader.result as string
        }
        reader.onerror = (err) => {
          cleanup()
          reject(err)
        }
        reader.readAsDataURL(fileOrDataUrl)
      }
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        img.src = reader.result as string
      }
      reader.onerror = (err) => {
        cleanup()
        reject(err)
      }
      reader.readAsDataURL(fileOrDataUrl)
    }
  })
}
