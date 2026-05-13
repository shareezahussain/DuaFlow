const IMGBB_KEY = import.meta.env.VITE_IMGBB_API_KEY ?? ''

export interface ImgbbResult {
  imageUrl: string  // direct image URL — use for Pinterest media parameter
  viewerUrl: string // HTML page with OG tags — use for Twitter card preview
}

/**
 * Upload a Blob to imgbb and return both the direct image URL and the
 * viewer page URL. The viewer URL has Open Graph tags so Twitter can
 * render a card preview instead of a plain link.
 */
export async function uploadToImgbb(blob: Blob): Promise<ImgbbResult> {
  const base64 = await new Promise<string>(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.readAsDataURL(blob)
  })
  const form = new FormData()
  form.append('key', IMGBB_KEY)
  form.append('image', base64)
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form })
  if (!res.ok) throw new Error('imgbb upload failed')
  const json = await res.json()
  const imageUrl = json.data.url as string
  const viewerUrl = (json.data.url_viewer ?? imageUrl) as string
  return { imageUrl, viewerUrl }
}

export function openTwitterShare(text: string, viewerUrl: string, target?: Window | null) {
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(viewerUrl)}`
  if (target) target.location.href = url
  else window.open(url, '_blank')
}

export function openPinterestShare(imageUrl: string, description: string, target?: Window | null) {
  // url parameter required — without it browsers download the image instead of opening Pinterest compose
  const url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(window.location.href)}&media=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(description)}`
  if (target) target.location.href = url
  else window.open(url, '_blank')
}
