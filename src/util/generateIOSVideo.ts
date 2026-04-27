import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

const FFMPEG_CDN = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'

let ffmpegInstance: FFmpeg | null = null

// Singleton — the 30MB WASM binary is loaded once and reused
async function getFFmpeg(onProgress: (stage: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance

  onProgress('Loading FFmpeg (one-time ~30MB download)…')
  const ffmpeg = new FFmpeg()
  await ffmpeg.load({
    coreURL: await toBlobURL(`${FFMPEG_CDN}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${FFMPEG_CDN}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  ffmpegInstance = ffmpeg
  return ffmpeg
}

export async function generateIOSVideo(
  frameBlob: Blob,
  audioUrl: string,
  onProgress: (stage: string) => void,
): Promise<Blob> {
  const ffmpeg = await getFFmpeg(onProgress)

  onProgress('Fetching audio…')
  const audioData = await fetchFile(audioUrl)
  const frameData = await fetchFile(frameBlob)

  onProgress('Writing files…')
  await ffmpeg.writeFile('card.png', frameData)
  await ffmpeg.writeFile('audio.mp3', audioData)

  ffmpeg.on('progress', ({ progress }) => {
    if (progress > 0) onProgress(`Generating video… ${Math.round(progress * 100)}%`)
  })

  onProgress('Generating video…')
  await ffmpeg.exec([
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

  const data = await ffmpeg.readFile('output.mp4')
  // Clean up virtual filesystem for next run
  await ffmpeg.deleteFile('card.png')
  await ffmpeg.deleteFile('audio.mp3')
  await ffmpeg.deleteFile('output.mp4')

  return new Blob([data], { type: 'video/mp4' })
}
