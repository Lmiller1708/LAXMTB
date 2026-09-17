import { ref, computed, onMounted } from 'vue'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import { compressImage } from '../utils/imageCompressor'

export interface SiteMediaConfig {
  teamPhoto: string
  coachesPhoto: string
  careyPhoto: string
  practiceDriveUrl: string
}

export const defaultSiteMedia: SiteMediaConfig = {
  teamPhoto: '/images/laxMTB2026COACH.jpg',
  coachesPhoto: '/images/laxMTB_onlyCoaches_2026.jpg',
  careyPhoto: '/images/team-member-default.jpg',
  practiceDriveUrl: 'https://drive.google.com'
}

const STORAGE_KEY = 'laxmtb_site_media'

export function useSiteMedia() {
  const db = useFirestore()
  const media = useState<SiteMediaConfig>('site_media_config', () => {
    if (import.meta.client) {
      try {
        const cached = localStorage.getItem(STORAGE_KEY)
        if (cached) return { ...defaultSiteMedia, ...JSON.parse(cached) }
      } catch (e) {}
    }
    return { ...defaultSiteMedia }
  })

  const isLoaded = ref(false)

  const MEDIA_KEYS: (keyof SiteMediaConfig)[] = [
    'teamPhoto',
    'coachesPhoto',
    'careyPhoto',
    'practiceDriveUrl'
  ]

  // Real-time Firestore sync
  if (import.meta.client && db) {
    onMounted(() => {
      try {
        // 1. Primary listener for settings/media
        const mediaDoc = doc(db, 'settings', 'media')
        onSnapshot(mediaDoc, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as Partial<SiteMediaConfig>
            media.value = { ...defaultSiteMedia, ...media.value, ...data }
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(media.value))
            } catch (e) {}
          }
          isLoaded.value = true
        }, (err) => {
          console.warn('[SiteMedia] Firestore listener warning:', err)
          isLoaded.value = true
        })

        // 2. Individual item doc listeners (e.g. settings/media_teamPhoto)
        // Overcomes single-document 1MB ceiling by allowing large items their own dedicated document
        MEDIA_KEYS.forEach((key) => {
          try {
            const itemDoc = doc(db, 'settings', `media_${key}`)
            onSnapshot(itemDoc, (snap) => {
              if (snap.exists()) {
                const itemData = snap.data()
                const val = itemData?.value || itemData?.[key]
                if (val) {
                  media.value[key] = val
                  try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(media.value))
                  } catch (e) {}
                }
              }
            }, () => {})
          } catch (e) {}
        })
      } catch (e) {
        console.warn('[SiteMedia] Setup error:', e)
      }
    })
  }

  const updateMediaItem = async (key: keyof SiteMediaConfig, value: string) => {
    // If incoming image is an oversized base64 payload (> 600KB), auto-recompress it
    if (value && typeof value === 'string' && value.startsWith('data:image') && value.length > 600 * 1024) {
      try {
        value = await compressImage(value, 1400, 1400, 0.82, true)
      } catch (compErr) {
        console.warn('[SiteMedia] Auto-recompression failed, attempting original write:', compErr)
      }
    }

    media.value[key] = value
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(media.value))
      } catch (e) {}
    }

    if (db) {
      let saved = false
      let lastError: any = null

      // Always save to dedicated individual document settings/media_${key}
      // This has its own dedicated 1MB quota and never competes with other photos
      try {
        const itemDoc = doc(db, 'settings', `media_${key}`)
        await Promise.race([
          setDoc(itemDoc, { key, value, updatedAt: Date.now() }, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Save to Firestore timed out after 10s')), 10000))
        ])
        saved = true
      } catch (itemErr: any) {
        lastError = itemErr
        console.error('[SiteMedia] Failed to write to dedicated media doc:', itemErr?.message || itemErr)
      }

      // Also attempt updating the aggregate settings/media doc if it's not bloated
      try {
        const mediaDoc = doc(db, 'settings', 'media')
        await Promise.race([
          setDoc(mediaDoc, { [key]: value }, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Save to aggregate doc timed out')), 5000))
        ])
        saved = true
      } catch (e: any) {
        console.warn('[SiteMedia] settings/media aggregate write skipped:', e?.message || e)
      }

      if (saved) return true
      throw new Error(lastError?.message || 'Could not persist photo to Firestore. Please verify image size.')
    }
    return false
  }

  const updateAllMedia = async (newConfig: Partial<SiteMediaConfig>) => {
    // Sanitize any oversized base64 values
    const sanitizedConfig = { ...newConfig }
    for (const [k, v] of Object.entries(sanitizedConfig)) {
      if (typeof v === 'string' && v.startsWith('data:image') && v.length > 600 * 1024) {
        try {
          (sanitizedConfig as any)[k] = await compressImage(v, 1400, 1400, 0.82, true)
        } catch {}
      }
    }

    media.value = { ...media.value, ...sanitizedConfig }
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(media.value))
      } catch (e) {}
    }

    if (db) {
      const promises: Promise<any>[] = []
      for (const [k, v] of Object.entries(sanitizedConfig)) {
        if (v) {
          const itemDoc = doc(db, 'settings', `media_${k}`)
          promises.push(
            Promise.race([
              setDoc(itemDoc, { key: k, value: v, updatedAt: Date.now() }, { merge: true }),
              new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout saving ${k}`)), 10000))
            ])
          )
        }
      }

      try {
        const mediaDoc = doc(db, 'settings', 'media')
        promises.push(
          Promise.race([
            setDoc(mediaDoc, sanitizedConfig, { merge: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout saving media doc')), 5000))
          ])
        )
      } catch (e) {}

      await Promise.allSettled(promises)
      return true
    }
    return false
  }

  return {
    media,
    isLoaded,
    updateMediaItem,
    updateAllMedia
  }
}
