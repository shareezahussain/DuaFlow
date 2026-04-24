/**
 * Downloads a video blob to the user's device.
 *
 * Mobile browsers (iOS Safari and Android Chrome) cannot reliably download
 * blob URLs via <a download> — iOS ignores it entirely, Android Chrome navigates
 * the page to the blob URL (video player), resetting app state on back-navigation.
 * Both mobile platforms support the Web Share API with files, so we use that.
 * Desktop browsers get a standard <a download> link.
 *
 * Returns an error message string if saving failed, or null on success.
 */
export async function downloadVideoFile(
  blob: Blob,
  filename: string,
  shareTitle: string
): Promise<string | null> {
  const isMobile = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent)

  if (isMobile) {
    const file = new File([blob], filename, { type: blob.type || 'video/mp4' })
    if (!navigator.canShare?.({ files: [file] })) {
      return 'To save on mobile, tap "More" and choose "Save to Files" / "Save to device".'
    }
    try {
      await navigator.share({ title: shareTitle, files: [file] })
      return null
    } catch (e) {
      if ((e as Error).name === 'AbortError') return null
      return 'Could not save — tap "More" and choose "Save to Files".'
    }
  }

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
