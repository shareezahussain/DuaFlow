/**
 * Downloads a video blob to the user's device.
 *
 * iOS Safari doesn't support <a download> for blob URLs, so we use the
 * Web Share API there instead (opens "Save to Files" in the share sheet).
 * All other platforms get a direct download.
 *
 * Returns an error message string if saving failed, or null on success.
 */
export async function downloadVideoFile(
  blob: Blob,
  filename: string,
  shareTitle: string
): Promise<string | null> {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  if (isIOS) {
    const file = new File([blob], filename, { type: 'video/mp4' })
    if (!navigator.canShare?.({ files: [file] })) {
      return 'To save on iOS, tap "More" and choose "Save to Files".'
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
