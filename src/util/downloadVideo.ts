/**
 * Downloads a video blob to the user's device.
 *
 * Strategy:
 *  1. Try Web Share API with files if the browser reports it can handle them.
 *     This is required on iOS (no blob-URL download) and preferred on Android
 *     (anchor-click navigates to a video player instead of downloading).
 *  2. Fall back to an <a download> anchor for desktop and Android browsers
 *     that don't support file sharing.
 *  3. On iOS only, if the share API is unavailable, surface a help message —
 *     there is no reliable anchor-download fallback on iOS Safari.
 *
 * Returns an error message string if saving failed, or null on success.
 */
export async function downloadVideoFile(
  blob: Blob,
  filename: string,
  shareTitle: string
): Promise<string | null> {
  const isIOS    = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)
  const isMobile = isIOS || isAndroid

  // On desktop, navigator.canShare() can return true (macOS share sheet / AirDrop)
  // but that produces a confusing UX — just do a direct anchor download instead.
  if (isMobile) {
    const file = new File([blob], filename, { type: blob.type || 'video/mp4' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: shareTitle, files: [file] })
        return null
      } catch (e) {
        if ((e as Error).name === 'AbortError') return null
        if (isIOS) return 'Could not save — tap "More" and choose "Save to Files".'
        // Android share failure: fall through to anchor download
      }
    } else if (isIOS) {
      return 'To save on iOS, tap "More" and choose "Save to Files".'
    }
  }

  // Desktop and Android fallback: standard file download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return null
}
