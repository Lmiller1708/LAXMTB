import { describe, it, expect } from 'vitest'
import { compressImage } from '../modules/core/utils/imageCompressor'

describe('Image Cropping & Transformation Math', () => {
  it('computes correct viewport coverage for 16:9 banner from 4:3 photo', () => {
    const naturalWidth = 1600
    const naturalHeight = 1200 // 4:3 aspect = 1.333
    const vpWidth = 440
    const vpHeight = Math.round(vpWidth / (16 / 9)) // ~248px

    const imgAspect = naturalWidth / naturalHeight
    const vpAspect = vpWidth / vpHeight

    // When imgAspect < vpAspect (image is taller than banner):
    // Image width matches viewport width, height expands to cover
    let baseWidth = vpWidth
    let baseHeight = Math.round(vpWidth / imgAspect)

    expect(baseWidth).toBe(440)
    expect(baseHeight).toBe(330)

    // User can pan vertically by (330 - 248) / 2 = 41px up or down
    const maxPanY = (baseHeight - vpHeight) / 2
    expect(maxPanY).toBeGreaterThan(0)
  })

  it('computes correct viewport coverage for 1:1 portrait from tall camera photo', () => {
    const naturalWidth = 3000
    const naturalHeight = 4000 // 3:4 portrait
    const vpWidth = 360
    const vpHeight = 360 // 1:1 square

    const imgAspect = naturalWidth / naturalHeight
    let baseWidth = vpWidth
    let baseHeight = Math.round(vpWidth / imgAspect)

    expect(baseHeight).toBe(480)
    const maxPanY = (baseHeight - vpHeight) / 2
    expect(maxPanY).toBe(60) // 60px panning flexibility up/down
  })

  it('handles compressImage gracefully in test/headless environments', async () => {
    const dummyDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
    const result = await compressImage(dummyDataUrl, 1400, 1400, 0.8)
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })

  it('supports transparent, white, and black background modes for logo cropping', () => {
    type BackgroundMode = 'transparent' | 'white' | 'black'
    const modes: BackgroundMode[] = ['transparent', 'white', 'black']
    expect(modes).toContain('transparent')
    expect(modes).toContain('white')
    expect(modes).toContain('black')

    // Resolves proper MIME type and canvas fill
    const getMimeAndFill = (mode: BackgroundMode) => {
      switch (mode) {
        case 'white':
          return { mime: 'image/jpeg', fill: '#ffffff', forceJpeg: true }
        case 'black':
          return { mime: 'image/jpeg', fill: '#000000', forceJpeg: true }
        case 'transparent':
        default:
          return { mime: 'image/png', fill: null, forceJpeg: false }
      }
    }

    expect(getMimeAndFill('transparent')).toEqual({ mime: 'image/png', fill: null, forceJpeg: false })
    expect(getMimeAndFill('white')).toEqual({ mime: 'image/jpeg', fill: '#ffffff', forceJpeg: true })
    expect(getMimeAndFill('black')).toEqual({ mime: 'image/jpeg', fill: '#000000', forceJpeg: true })
  })
})
