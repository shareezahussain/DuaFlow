import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { toErrorMessage } from '../util/errorMessage'

// ── Types ─────────────────────────────────────────────────────────────────────

type WordTiming = { start: number; end: number }

type KaraokeInput = {
  mode: 'karaoke'
  arabicText: string
  transliteration: string
  translation: string
  topic: string
  surah: number
  ayah: number
  wordTimings: WordTiming[] | null
}

type DesignerInput = {
  mode: 'designer'
  arabicText: string
  transliteration: string
  translation: string
  topic: string
  surah: number
  ayah: number
  fontFamily: string
  fontSize: number
  fontWeight: string
  arabicColor: string
  translitColor: string
  translationColor: string
  blockBg: string
  accent: { v: string; t: string }
  showBismillah: boolean
  showArabic: boolean
  showTranslit: boolean
  showTranslation: boolean
  borderStyle: string
  borderWidth: number
  borderColor: string
  borderRadius: number
  blockAccent: string
  emojiOverlays: Array<{ emoji: string; x: number; y: number }>
}

// Audio is decoded on the main thread (Web Audio API is unavailable in workers)
// and passed as raw PCM channel arrays which can be transferred zero-copy.
export type VideoWorkerInput = {
  canvas: OffscreenCanvas
  channelData: Float32Array[]
  sampleRate: number
  numberOfChannels: number
  audioDuration: number
  isMobile: boolean
} & (KaraokeInput | DesignerInput)

export type VideoWorkerOutput =
  | { type: 'progress'; stage: string }
  | { type: 'done'; buffer: ArrayBuffer }
  | { type: 'error'; message: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function exactWordIndex(timings: WordTiming[], t: number): number {
  if (t <= 0) return -1
  for (let i = 0; i < timings.length; i++) {
    const nextStart = timings[i + 1]?.start ?? (timings[i].end + 1)
    if (t >= timings[i].start && t < nextStart) return i
  }
  return -1
}

function propIdx(words: string[], t: number, dur: number): number {
  return t <= 0 || t >= dur ? -1 : Math.min(Math.floor((t / dur) * words.length), words.length - 1)
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

const post = (msg: VideoWorkerOutput) => self.postMessage(msg)

// ── Draw helpers (shared row layout types) ────────────────────────────────────

type Row = string[]
type TrRow = Array<{ word: string; idx: number }>

function buildRows(words: string[], ctx: OffscreenCanvasRenderingContext2D, maxW: number, gap: number): Row[] {
  const rows: Row[] = []
  let row: string[] = [], rowW = 0
  for (const w of words) {
    const ww = ctx.measureText(w).width + gap
    if (rowW + ww > maxW && row.length > 0) { rows.push(row); row = []; rowW = 0 }
    row.push(w); rowW += ww
  }
  if (row.length) rows.push(row)
  return rows
}

function buildTrRows(words: string[], ctx: OffscreenCanvasRenderingContext2D, maxW: number): TrRow[] {
  const rows: TrRow[] = []
  let row: TrRow = [], rowW = 0
  words.forEach((w, wi) => {
    const ww = ctx.measureText(w + ' ').width
    if (rowW + ww > maxW && row.length > 0) { rows.push(row); row = []; rowW = 0 }
    row.push({ word: w, idx: wi }); rowW += ww
  })
  if (row.length) rows.push(row)
  return rows
}

// ── Karaoke draw frame ────────────────────────────────────────────────────────

function makeKaraokeDraw(
  ctx: OffscreenCanvasRenderingContext2D,
  W: number, H: number,
  aWords: string[], tWords: string[], trWords: string[],
  audioDuration: number,
  topic: string, surah: number, ayah: number,
  wordTimings: WordTiming[] | null,
) {
  return (t: number) => {
    const wordIdx = wordTimings ? exactWordIndex(wordTimings, t) : propIdx(aWords, t, audioDuration)
    const aIdx = wordIdx, tIdx = wordIdx
    const trIdx = propIdx(trWords, t, audioDuration)

    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#0d1b2a')
    grad.addColorStop(1, '#1a3a5c')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = '#f39c12'
    ctx.fillRect(0, 0, W, 8)

    ctx.font = '52px Amiri'
    ctx.fillStyle = '#f39c12'
    ctx.textAlign = 'center'
    ctx.direction = 'rtl'
    ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', W / 2, 90)

    ctx.font = 'bold 26px Amiri'
    ctx.fillStyle = '#a9cce3'
    ctx.textAlign = 'center'
    ctx.direction = 'ltr'
    ctx.fillText(`${topic}  •  Surah ${surah}:${ayah}`, W / 2, 148)

    ctx.strokeStyle = '#2e86c1'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(80, 168)
    ctx.lineTo(W - 80, 168)
    ctx.stroke()

    // Arabic
    const aFontSize = 54
    ctx.font = `${aFontSize}px Amiri`
    ctx.direction = 'rtl'
    const aLineH = aFontSize * 1.9
    const aRows = buildRows(aWords, ctx, W - 120, 14)
    const displayedARows = aRows.slice(0, 4)

    let wordGlobalIdx = 0
    const aStartY = 230
    displayedARows.forEach((r, ri) => {
      let xCursor = W - 60
      const positions: Array<{ word: string; x: number; idx: number }> = []
      for (const w of r) {
        const ww = ctx.measureText(w).width + 14
        positions.push({ word: w, x: xCursor, idx: wordGlobalIdx++ })
        xCursor -= ww
      }
      positions.forEach(({ word, x, idx }) => {
        if (idx === aIdx) {
          const ww = ctx.measureText(word).width + 14
          ctx.fillStyle = 'rgba(243,156,18,0.25)'
          ctx.beginPath()
          ctx.roundRect(x - ww, aStartY + ri * aLineH - aFontSize * 0.85, ww, aFontSize * 1.1, 6)
          ctx.fill()
          ctx.fillStyle = '#f39c12'
        } else {
          ctx.fillStyle = '#ffffff'
        }
        ctx.textAlign = 'right'
        ctx.fillText(word, x, aStartY + ri * aLineH)
      })
    })

    const aBlockH = displayedARows.length * aLineH

    // Transliteration
    const tFontSize = 28
    ctx.font = `italic ${tFontSize}px Amiri`
    ctx.direction = 'ltr'
    ctx.textAlign = 'left'
    const tLineH = tFontSize * 1.8
    const tRows = buildRows(tWords, ctx, W - 120, 10)
    const displayedTRows = tRows.slice(0, 3)

    let tGlobalIdx = 0
    const tStartY = aStartY + aBlockH + 28
    displayedTRows.forEach((r, ri) => {
      let xCursor = 60
      r.forEach(w => {
        const ww = ctx.measureText(w).width + 10
        if (tGlobalIdx === tIdx) {
          ctx.fillStyle = 'rgba(243,156,18,0.2)'
          ctx.beginPath()
          ctx.roundRect(xCursor - 4, tStartY + ri * tLineH - tFontSize * 0.85, ww, tFontSize * 1.1, 4)
          ctx.fill()
          ctx.fillStyle = '#f39c12'
        } else {
          ctx.fillStyle = '#a9cce3'
        }
        ctx.fillText(w, xCursor, tStartY + ri * tLineH)
        xCursor += ww
        tGlobalIdx++
      })
    })

    // Translation
    const trFontSize = 22
    ctx.font = `${trFontSize}px Amiri`
    ctx.direction = 'ltr'
    ctx.textAlign = 'left'
    const trLineH = trFontSize * 1.7
    const trRows = buildTrRows(trWords, ctx, W - 120)
    const trStartY = tStartY + displayedTRows.length * tLineH + 32

    ctx.font = 'bold 16px Amiri'
    ctx.fillStyle = '#6fa8c9'
    ctx.fillText('Translation', 60, trStartY)
    ctx.font = `${trFontSize}px Amiri`

    trRows.slice(0, 3).forEach((r, ri) => {
      let xCursor = 60
      r.forEach(({ word, idx }) => {
        const ww = ctx.measureText(word + ' ').width
        if (idx === trIdx) {
          ctx.fillStyle = 'rgba(243,156,18,0.2)'
          ctx.beginPath()
          ctx.roundRect(xCursor - 2, trStartY + (ri + 1) * trLineH - trFontSize * 0.85, ww, trFontSize * 1.1, 4)
          ctx.fill()
          ctx.fillStyle = '#f39c12'
        } else {
          ctx.fillStyle = '#d0e8f5'
        }
        ctx.fillText(word, xCursor, trStartY + (ri + 1) * trLineH)
        xCursor += ww
      })
    })

    // Progress bar
    const prog = audioDuration > 0 ? t / audioDuration : 0
    const barY = H - 90
    ctx.fillStyle = '#1e3a5f'
    ctx.beginPath(); ctx.roundRect(60, barY, W - 120, 10, 5); ctx.fill()
    if (prog > 0) {
      ctx.fillStyle = '#f39c12'
      ctx.beginPath(); ctx.roundRect(60, barY, (W - 120) * prog, 10, 5); ctx.fill()
      ctx.beginPath(); ctx.arc(60 + (W - 120) * prog, barY + 5, 8, 0, Math.PI * 2); ctx.fill()
    }
    ctx.font = '24px Amiri'; ctx.fillStyle = '#a9cce3'; ctx.direction = 'ltr'
    ctx.textAlign = 'left'; ctx.fillText(fmt(t), 60, barY + 38)
    ctx.textAlign = 'right'; ctx.fillText(fmt(audioDuration), W - 60, barY + 38)

    ctx.font = 'bold 20px Amiri'; ctx.fillStyle = '#2e86c1'; ctx.textAlign = 'center'
    ctx.fillText('DuaFlow — Quranic Supplications', W / 2, H - 28)
    ctx.fillStyle = '#f39c12'; ctx.fillRect(0, H - 8, W, 8)
  }
}

// ── Designer draw frame ───────────────────────────────────────────────────────

function makeDesignerDraw(
  ctx: OffscreenCanvasRenderingContext2D,
  W: number, H: number,
  aWords: string[], tWords: string[], trWords: string[],
  audioDuration: number,
  p: DesignerInput,
) {
  return (t: number) => {
    const aIdx  = propIdx(aWords, t, audioDuration)
    const tIdx  = propIdx(tWords, t, audioDuration)
    const trIdx = propIdx(trWords, t, audioDuration)
    const { accent, fontFamily, fontSize, fontWeight, arabicColor, translitColor,
            translationColor, blockBg, showBismillah, showArabic, showTranslit,
            showTranslation, borderStyle, borderWidth, borderColor, borderRadius,
            blockAccent, emojiOverlays, topic, surah, ayah } = p

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = accent.v
    ctx.fillRect(0, 0, W, 12)
    ctx.fillRect(0, 12, W, 160)

    ctx.font = `bold 32px ${fontFamily}`
    ctx.fillStyle = accent.t
    ctx.textAlign = 'center'
    ctx.direction = 'ltr'
    ctx.fillText(topic, W / 2, 80)
    ctx.font = `22px ${fontFamily}`
    ctx.globalAlpha = 0.8
    ctx.fillText(`Surah ${surah}:${ayah}`, W / 2, 118)
    ctx.globalAlpha = 1

    if (showBismillah) {
      ctx.font = '48px Amiri'
      ctx.fillStyle = accent.v
      ctx.textAlign = 'center'
      ctx.direction = 'rtl'
      ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', W / 2, 240)
    }

    const contentTop = showBismillah ? 280 : 200

    ctx.fillStyle = blockBg
    ctx.beginPath()
    ctx.roundRect(60, contentTop, W - 120, 600, borderRadius)
    ctx.fill()

    if (borderStyle !== 'none' && blockAccent !== 'none') {
      if (blockAccent === 'left-bar') {
        ctx.fillStyle = borderColor
        ctx.fillRect(60, contentTop, borderWidth * 2, 600)
      } else if (blockAccent === 'top-bar') {
        ctx.fillStyle = borderColor
        ctx.fillRect(60, contentTop, W - 120, borderWidth * 2)
      } else if (blockAccent === 'full-border') {
        ctx.strokeStyle = borderColor
        ctx.lineWidth = borderWidth
        if (borderStyle === 'dashed') ctx.setLineDash([borderWidth * 5, borderWidth * 3])
        else if (borderStyle === 'dotted') ctx.setLineDash([borderWidth * 2, borderWidth * 2])
        else ctx.setLineDash([])
        ctx.beginPath()
        ctx.roundRect(60, contentTop, W - 120, 600, borderRadius)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    const aFontSize = fontSize + 20
    ctx.font = `${fontWeight} ${aFontSize}px Amiri`
    ctx.direction = 'rtl'
    const aLineH = aFontSize * 1.9
    const aMaxW = W - 180
    const aStartY = contentTop + 60
    const aRows = buildRows(aWords, ctx, aMaxW, 14)

    if (showArabic) {
      let aGlobalIdx = 0
      aRows.forEach((r, ri) => {
        let xCursor = W - 90
        const pos: Array<{ word: string; x: number; idx: number }> = []
        for (const w of r) {
          const ww = ctx.measureText(w).width + 14
          pos.push({ word: w, x: xCursor, idx: aGlobalIdx++ })
          xCursor -= ww
        }
        pos.forEach(({ word, x, idx }) => {
          if (idx === aIdx) {
            const ww = ctx.measureText(word).width + 14
            ctx.fillStyle = accent.v + '33'
            ctx.beginPath(); ctx.roundRect(x - ww, aStartY + ri * aLineH - aFontSize * 0.85, ww, aFontSize * 1.1, 6); ctx.fill()
            ctx.fillStyle = accent.v
          } else { ctx.fillStyle = arabicColor }
          ctx.textAlign = 'right'
          ctx.fillText(word, x, aStartY + ri * aLineH)
        })
      })
    }

    const aBlockH = showArabic ? aRows.length * aLineH : 0

    const tFontSize = fontSize - 2
    ctx.font = `italic ${tFontSize}px ${fontFamily}`
    ctx.direction = 'ltr'; ctx.textAlign = 'left'
    const tLineH = tFontSize * 1.8
    const tRows = buildRows(tWords, ctx, W - 180, 10)
    const tStartY = aStartY + aBlockH + (showArabic ? 16 : 0)

    if (showTranslit) {
      let tGlobalIdx = 0
      tRows.forEach((r, ri) => {
        let xCursor = 90
        r.forEach(w => {
          const ww = ctx.measureText(w).width + 10
          if (tGlobalIdx === tIdx) {
            ctx.fillStyle = accent.v + '22'
            ctx.beginPath(); ctx.roundRect(xCursor - 4, tStartY + ri * tLineH - tFontSize * 0.85, ww, tFontSize * 1.1, 4); ctx.fill()
            ctx.fillStyle = accent.v
          } else { ctx.fillStyle = translitColor }
          ctx.fillText(w, xCursor, tStartY + ri * tLineH)
          xCursor += ww; tGlobalIdx++
        })
      })
    }

    const tBlockH = showTranslit ? tRows.length * tLineH : 0

    if (showTranslation) {
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
      ctx.textAlign = 'left'; ctx.direction = 'ltr'
      const trRows = buildTrRows(trWords, ctx, W - 180)
      const trLineH = fontSize * 1.6
      let trY = tStartY + tBlockH + (showTranslit ? 20 : 0)
      trRows.forEach(r => {
        let xCursor = 90
        r.forEach(({ word, idx }) => {
          const ww = ctx.measureText(word + ' ').width
          if (idx === trIdx) {
            ctx.fillStyle = accent.v + '22'
            ctx.beginPath(); ctx.roundRect(xCursor - 2, trY - fontSize * 0.85, ww, fontSize * 1.1, 3); ctx.fill()
            ctx.fillStyle = accent.v
          } else { ctx.fillStyle = translationColor }
          ctx.fillText(word, xCursor, trY)
          xCursor += ww
        })
        trY += trLineH
      })
    }

    const prog = audioDuration > 0 ? t / audioDuration : 0
    const barY = H - 90
    ctx.fillStyle = '#e5e7eb'
    ctx.beginPath(); ctx.roundRect(60, barY, W - 120, 10, 5); ctx.fill()
    if (prog > 0) {
      ctx.fillStyle = accent.v
      ctx.beginPath(); ctx.roundRect(60, barY, (W - 120) * prog, 10, 5); ctx.fill()
      ctx.beginPath(); ctx.arc(60 + (W - 120) * prog, barY + 5, 8, 0, Math.PI * 2); ctx.fill()
    }
    ctx.font = `22px ${fontFamily}`; ctx.fillStyle = '#9ca3af'; ctx.direction = 'ltr'
    ctx.textAlign = 'left'; ctx.fillText(fmt(t), 60, barY + 36)
    ctx.textAlign = 'right'; ctx.fillText(fmt(audioDuration), W - 60, barY + 36)

    ctx.font = `bold 18px ${fontFamily}`; ctx.fillStyle = accent.v; ctx.textAlign = 'center'
    ctx.fillText('DuaFlow — Quranic Supplications', W / 2, H - 28)
    ctx.fillStyle = accent.v; ctx.fillRect(0, H - 8, W, 8)

    if (emojiOverlays.length > 0) {
      const emojiScale = W / 700
      ctx.font = `${Math.round(36 * emojiScale)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
      ctx.textAlign = 'left'; ctx.direction = 'ltr'; ctx.globalAlpha = 1
      for (const { emoji, x, y } of emojiOverlays) {
        ctx.fillText(emoji, (x / 100) * W, (y / 100) * H)
      }
    }
  }
}

// ── Encoding pipeline (shared) ────────────────────────────────────────────────

async function encode(
  canvas: OffscreenCanvas,
  drawFrame: (t: number) => void,
  channelData: Float32Array[],
  sampleRate: number,
  numChannels: number,
  audioDuration: number,
  isMobile: boolean,
) {
  const W = canvas.width, H = canvas.height
  const FPS = isMobile ? 15 : 30
  const encChannels = isMobile ? 1 : numChannels

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: W, height: H },
    audio: { codec: 'aac', sampleRate, numberOfChannels: encChannels },
    fastStart: 'in-memory',
  })

  let encoderError: Error | null = null
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? {}),
    error: e => { encoderError = e },
  })
  videoEncoder.configure({ codec: 'avc1.4d0028', width: W, height: H, bitrate: isMobile ? 1_500_000 : 4_000_000, framerate: FPS })

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta ?? {}),
    error: e => { encoderError = e },
  })
  const audioConfig = { codec: 'mp4a.40.2' as const, sampleRate, numberOfChannels: encChannels, bitrate: isMobile ? 96_000 : 128_000 }
  const audioSupport = await AudioEncoder.isConfigSupported(audioConfig)
  if (!audioSupport.supported) throw new Error('AAC audio encoding not supported on this device')
  audioEncoder.configure(audioConfig)

  // Audio
  post({ type: 'progress', stage: 'Encoding audio…' })
  const CHUNK = 1024
  const totalSamples = channelData[0].length

  for (let offset = 0; offset < totalSamples; offset += CHUNK) {
    const frameCount = Math.min(CHUNK, totalSamples - offset)
    const timestamp = Math.round((offset / sampleRate) * 1_000_000)
    let data: Float32Array
    if (isMobile) {
      data = new Float32Array(frameCount)
      for (let s = 0; s < frameCount; s++) {
        let sum = 0
        for (let c = 0; c < numChannels; c++) sum += channelData[c][offset + s]
        data[s] = sum / numChannels
      }
    } else {
      data = new Float32Array(numChannels * frameCount)
      for (let c = 0; c < numChannels; c++) {
        data.set(channelData[c].subarray(offset, offset + frameCount), c * frameCount)
      }
    }
    const ad = new AudioData({ format: isMobile ? 'f32' : 'f32-planar', sampleRate, numberOfFrames: frameCount, numberOfChannels: encChannels, timestamp, data: data as Float32Array<ArrayBuffer> })
    audioEncoder.encode(ad); ad.close()
    if ((offset / CHUNK) % (isMobile ? 16 : 128) === (isMobile ? 15 : 127)) await new Promise(res => setTimeout(res, 0))
    if (encoderError) throw encoderError
  }

  // Video
  const totalFrames = Math.ceil(audioDuration * FPS)
  for (let i = 0; i <= totalFrames; i++) {
    drawFrame(Math.min(i / FPS, audioDuration))
    const timestamp = Math.round((i / FPS) * 1_000_000)
    const vf = new VideoFrame(canvas, { timestamp, duration: Math.round(1_000_000 / FPS) })
    videoEncoder.encode(vf, { keyFrame: i % (FPS * 2) === 0 })
    vf.close()
    await new Promise(res => setTimeout(res, 0))
    if (i % 15 === 0) post({ type: 'progress', stage: `Encoding video… ${Math.round((i / totalFrames) * 100)}%` })
    if (encoderError) throw encoderError
  }

  await videoEncoder.flush()
  await audioEncoder.flush()
  if (encoderError) throw encoderError
  muxer.finalize()

  return (muxer.target as ArrayBufferTarget).buffer
}

// ── Entry point ───────────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent<VideoWorkerInput>) => {
  try {
    const { canvas, channelData, sampleRate, numberOfChannels, audioDuration, isMobile } = e.data

    post({ type: 'progress', stage: 'Loading font…' })
    const amiri = new FontFace('Amiri', 'url(https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHpUrtLMA7w.woff2)')
    await amiri.load()
    ;(self as unknown as { fonts: FontFaceSet }).fonts.add(amiri)

    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const d = e.data

    const aWords = d.arabicText.split(' ').filter(w => w.trim())
    const tWords = d.transliteration.split(' ').filter(w => w.trim())
    const trWords = d.translation.split(' ').filter(w => w.trim())

    const drawFrame = d.mode === 'karaoke'
      ? makeKaraokeDraw(ctx, W, H, aWords, tWords, trWords, audioDuration, d.topic, d.surah, d.ayah, d.wordTimings)
      : makeDesignerDraw(ctx, W, H, aWords, tWords, trWords, audioDuration, d)

    const buffer = await encode(canvas, drawFrame, channelData, sampleRate, numberOfChannels, audioDuration, isMobile)

    ;(self as unknown as { postMessage(msg: unknown, transfer: Transferable[]): void }).postMessage(
      { type: 'done', buffer } satisfies VideoWorkerOutput,
      [buffer],
    )
  } catch (err) {
    post({ type: 'error', message: toErrorMessage(err) })
  }
}
