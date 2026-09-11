import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const albumUrl = (query.url as string) || ''

  if (!albumUrl) {
    return { photos: [] }
  }

  try {
    const res = await fetch(albumUrl, { redirect: 'follow' })
    if (!res.ok) {
      return { photos: [] }
    }

    const html = await res.text()
    const matches = html.match(/https:\/\/lh3\.googleusercontent\.com\/pw\/[a-zA-Z0-9_\-]+/g) || []
    
    // Deduplicate and format
    const unique = Array.from(new Set(matches))
    const photos = unique.map(url => ({
      url,
      w: 1920,
      h: 1080
    }))

    return { photos }
  } catch (err) {
    console.error('[API Photos] Error fetching album:', err)
    return { photos: [] }
  }
})
