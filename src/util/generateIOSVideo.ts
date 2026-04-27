import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { toErrorMessage } from './errorMessage'

let ffmpegInstance: FFmpeg | null = null

async function getFFmpeg(onProgress: (stage: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance

  ffmpegInstance = null

  onProgress('Loading FFmpeg…')
  const ffmpeg = new FFmpeg()

  try {
    // toBlobURL fetches from same-origin /ffmpeg/ and wraps in a blob URL with
    // the correct MIME type — this is required for iOS Safari's Worker loader
    // which rejects direct path URLs for module scripts.
    // coreURL must be a blob URL so the module Worker can import() it.
    // wasmURL is passed separately so @ffmpeg/ffmpeg overrides locateFile —
    // blob URLs lose their relative path context so the WASM can't be
    // resolved automatically from import.meta.url inside the blob.
    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
      toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
    ])
    await ffmpeg.load({ coreURL, wasmURL })
  } catch (err) {
    throw new Error(`Failed to load FFmpeg: ${toErrorMessage(err)}`)
  }

  ffmpegInstance = ffmpeg
  return ffmpeg
}

export async function generateIOSVideo(
  frameBlob: Blob,
  audioUrl: string,
  onProgress: (stage: string) => void,
): Promise<Blob> {
  if (frameBlob.size === 0) throw new Error('Dua card image is empty — cannot generate video.')

  const ffmpeg = await getFFmpeg(onProgress)

  onProgress('Fetching audio…')
  let audioData: Uint8Array
  let frameData: Uint8Array
  try {
    audioData = await fetchFile(audioUrl)
    frameData = await fetchFile(frameBlob)
  } catch (err) {
    throw new Error(`Could not fetch files: ${toErrorMessage(err)}`)
  }

  if (audioData.byteLength === 0) throw new Error('Audio file is empty.')

  onProgress('Writing files…')
  await ffmpeg.writeFile('card.png', frameData)
  await ffmpeg.writeFile('audio.mp3', audioData)

  // Remove any stale progress listener before adding a fresh one
  ffmpeg.off('progress', () => {})
  ffmpeg.on('progress', ({ progress }) => {
    if (progress > 0) onProgress(`Generating video… ${Math.round(progress * 100)}%`)
  })

  onProgress('Generating video…')
  let exitCode: number
  try {
    exitCode = await ffmpeg.exec([
      '-loop', '1',
      '-i', 'card.png',
      '-i', 'audio.mp3',
      '-c:v', 'libx264',
      '-tune', 'stillimage',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-pix_fmt', 'yuv420p',
      '-vf', 'scale=480:480',
      '-shortest',
      'output.mp4',
    ])
  } catch (err) {
    throw new Error(`FFmpeg encoding failed: ${toErrorMessage(err)}`)
  }

  if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode} — encoding failed.`)

  const data = await ffmpeg.readFile('output.mp4')

  // Clean up virtual filesystem for next run
  await Promise.allSettled([
    ffmpeg.deleteFile('card.png'),
    ffmpeg.deleteFile('audio.mp3'),
    ffmpeg.deleteFile('output.mp4'),
  ])

  return new Blob([data as Uint8Array<ArrayBuffer>], { type: 'video/mp4' })
}
