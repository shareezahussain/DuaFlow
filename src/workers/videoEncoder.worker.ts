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
  const GREEN      = '#1d4c4e'
  const GREEN_PILL = '#e0eeee'
  const BLACK      = '#0d0d0d'
  const GRAY       = '#4a5568'
  const GRAY_MID   = '#718096'
  const TRACK      = '#e2e8f0'

  // ── Pre-compute layout once (not per frame) ───────────────────────────────
  const s      = W / 1080
  const pad    = Math.round(64 * s)
  const barH   = Math.round(88 * s)
  const headerH = Math.round(160 * s)
  const availableH = H - barH - headerH

  // Auto-scale: shrink fonts in 5% steps until content fits, down to 60% of base
  let cs = 1.0 // content scale
  let aFontSize: number, tFontSize: number, trFontSize: number
  let aLineH: number, tLineH: number, trLineH: number
  let aRows: Row[], tRows: Row[], trRows: TrRow[]
  let aBlockH: number, tBlockH: number, trBlockH: number, gapAT: number, gapTTr: number, totalContentH: number

  do {
    aFontSize  = Math.max(Math.round(52 * s * cs), 18)
    tFontSize  = Math.max(Math.round(26 * s * cs), 11)
    trFontSize = Math.max(Math.round(24 * s * cs), 10)
    aLineH  = aFontSize * 1.9
    tLineH  = tFontSize * 1.8
    trLineH = trFontSize * 1.7

    ctx.font = `${aFontSize}px Georgia, serif`
    aRows = buildRows(aWords, ctx, W - pad * 2, 14).slice(0, 6)
    ctx.font = `italic ${tFontSize}px Georgia, serif`
    tRows = buildRows(tWords, ctx, W - pad * 2, 10).slice(0, 5)
    ctx.font = `${trFontSize}px Georgia, serif`
    trRows = buildTrRows(trWords, ctx, W - pad * 2).slice(0, 5)

    aBlockH  = aRows.length * aLineH
    tBlockH  = tRows.length * tLineH
    const trLabelH = Math.max(Math.round(20 * s * cs), 10)
    trBlockH = trRows.length * trLineH + trLabelH
    gapAT    = Math.max(Math.round(30 * s * cs), 16)
    gapTTr   = Math.max(Math.round(18 * s * cs), 10)
    totalContentH = aBlockH + gapAT + tBlockH + gapTTr + trBlockH

    if (totalContentH <= availableH * 0.92) break
    cs -= 0.05
  } while (cs >= 0.6)

  const aStartY = headerH + Math.round(Math.max(aFontSize * 1.5, (availableH - totalContentH) / 2))

  return (t: number) => {
    const wordIdx = wordTimings ? exactWordIndex(wordTimings, t) : propIdx(aWords, t, audioDuration)
    const aIdx = wordIdx, tIdx = wordIdx
    const trIdx = propIdx(trWords, t, audioDuration)

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    // Dark green header band
    ctx.fillStyle = GREEN
    ctx.fillRect(0, 0, W, headerH)

    // Bismillah — white, inside header
    ctx.font = `${Math.round(44 * s)}px Georgia, serif`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.direction = 'rtl'
    ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', W / 2, Math.round(76 * s))

    // Topic + surah — white, slightly dimmed
    ctx.font = `bold ${Math.round(22 * s)}px Georgia, serif`
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.textAlign = 'center'
    ctx.direction = 'ltr'
    ctx.fillText(`${topic}  •  Surah ${surah}:${ayah}`, W / 2, Math.round(130 * s))

    // Light gray content area
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, headerH, W, H - headerH)

    // ── Arabic ──────────────────────────────────────────────────────────────
    ctx.font = `${aFontSize}px Georgia, serif`
    ctx.direction = 'rtl'

    let wordGlobalIdx = 0
    aRows.forEach((r, ri) => {
      let xCursor = W - pad
      const positions: Array<{ word: string; x: number; idx: number }> = []
      for (const w of r) {
        const ww = ctx.measureText(w).width + 14
        positions.push({ word: w, x: xCursor, idx: wordGlobalIdx++ })
        xCursor -= ww
      }
      positions.forEach(({ word, x, idx }) => {
        if (idx === aIdx) {
          const ww = ctx.measureText(word).width + 14
          ctx.fillStyle = GREEN_PILL
          ctx.beginPath()
          ctx.roundRect(x - ww, aStartY + ri * aLineH - aFontSize * 0.85, ww, aFontSize * 1.1, 6)
          ctx.fill()
          ctx.fillStyle = GREEN
        } else {
          ctx.fillStyle = BLACK
        }
        ctx.textAlign = 'right'
        ctx.fillText(word, x, aStartY + ri * aLineH)
      })
    })

    // ── Transliteration ─────────────────────────────────────────────────────
    ctx.font = `italic ${tFontSize}px Georgia, serif`
    ctx.direction = 'ltr'
    ctx.textAlign = 'left'
    const tStartY = aStartY + aBlockH + gapAT

    let tGlobalIdx = 0
    tRows.forEach((r, ri) => {
      let xCursor = pad
      r.forEach(w => {
        const ww = ctx.measureText(w).width + 10
        if (tGlobalIdx === tIdx) {
          ctx.fillStyle = GREEN_PILL
          ctx.beginPath()
          ctx.roundRect(xCursor - 4, tStartY + ri * tLineH - tFontSize * 0.85, ww, tFontSize * 1.1, 4)
          ctx.fill()
          ctx.fillStyle = GREEN
        } else {
          ctx.fillStyle = GRAY
        }
        ctx.fillText(w, xCursor, tStartY + ri * tLineH)
        xCursor += ww
        tGlobalIdx++
      })
    })

    // ── Translation ──────────────────────────────────────────────────────────
    ctx.font = `${trFontSize}px Georgia, serif`
    ctx.direction = 'ltr'
    ctx.textAlign = 'left'
    const trStartY = tStartY + tBlockH + gapTTr

    ctx.font = `bold ${Math.max(Math.round(14 * s), 10)}px Georgia, serif`
    ctx.fillStyle = GRAY_MID
    ctx.fillText('TRANSLATION', pad, trStartY)
    ctx.font = `${trFontSize}px Georgia, serif`

    trRows.forEach((r, ri) => {
      let xCursor = pad
      r.forEach(({ word, idx }) => {
        const ww = ctx.measureText(word + ' ').width
        if (idx === trIdx) {
          ctx.fillStyle = GREEN_PILL
          ctx.beginPath()
          ctx.roundRect(xCursor - 2, trStartY + (ri + 1) * trLineH - trFontSize * 0.85, ww, trFontSize * 1.1, 4)
          ctx.fill()
          ctx.fillStyle = GREEN
        } else {
          ctx.fillStyle = '#333333'
        }
        ctx.fillText(word, xCursor, trStartY + (ri + 1) * trLineH)
        xCursor += ww
      })
    })

    // ── Progress bar ─────────────────────────────────────────────────────────
    const prog = audioDuration > 0 ? t / audioDuration : 0
    const barY = H - barH + Math.round(12 * s)
    ctx.fillStyle = TRACK
    ctx.beginPath(); ctx.roundRect(pad, barY, W - pad * 2, Math.round(6 * s), 3); ctx.fill()
    if (prog > 0) {
      ctx.fillStyle = GREEN
      ctx.beginPath(); ctx.roundRect(pad, barY, (W - pad * 2) * prog, Math.round(6 * s), 3); ctx.fill()
      ctx.beginPath(); ctx.arc(pad + (W - pad * 2) * prog, barY + Math.round(3 * s), Math.round(7 * s), 0, Math.PI * 2); ctx.fill()
    }
    ctx.font = `${Math.round(18 * s)}px Georgia, serif`; ctx.fillStyle = GRAY_MID; ctx.direction = 'ltr'
    ctx.textAlign = 'left'; ctx.fillText(fmt(t), pad, barY + Math.round(30 * s))
    ctx.textAlign = 'right'; ctx.fillText(fmt(audioDuration), W - pad, barY + Math.round(30 * s))

    // Branding + bottom bar
    ctx.font = `bold ${Math.round(15 * s)}px Georgia, serif`; ctx.fillStyle = GREEN; ctx.textAlign = 'center'
    ctx.fillText('DuaFlow — Quranic Supplications', W / 2, H - Math.round(20 * s))
    ctx.fillStyle = GREEN; ctx.fillRect(0, H - Math.round(7 * s), W, Math.round(7 * s))
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

    // Scale all hardcoded pixel values relative to the 1080px reference size
    const s = W / 1080

    const pad       = Math.round(60 * s)   // horizontal padding
    const barH      = Math.round(90 * s)   // height reserved for progress bar at bottom
    const coverH    = Math.round(172 * s)  // top cover band (accent + topic + surah)
    const bismH     = showBismillah ? Math.round(68 * s) : 0

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    // Top accent bar + cover band
    ctx.fillStyle = accent.v
    ctx.fillRect(0, 0, W, Math.round(12 * s))
    ctx.fillRect(0, Math.round(12 * s), W, coverH - Math.round(12 * s))

    ctx.font = `bold ${Math.round(32 * s)}px ${fontFamily}`
    ctx.fillStyle = accent.t
    ctx.textAlign = 'center'
    ctx.direction = 'ltr'
    ctx.fillText(topic, W / 2, Math.round(80 * s))
    ctx.font = `${Math.round(22 * s)}px ${fontFamily}`
    ctx.globalAlpha = 0.8
    ctx.fillText(`Surah ${surah}:${ayah}`, W / 2, Math.round(118 * s))
    ctx.globalAlpha = 1

    if (showBismillah) {
      ctx.font = `${Math.round(48 * s)}px Georgia, serif`
      ctx.fillStyle = accent.v
      ctx.textAlign = 'center'
      ctx.direction = 'rtl'
      ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', W / 2, coverH + Math.round(50 * s))
    }

    const contentTop  = coverH + bismH
    const blockHeight = H - contentTop - barH - Math.round(40 * s)

    ctx.fillStyle = blockBg
    ctx.beginPath()
    ctx.roundRect(pad, contentTop, W - pad * 2, blockHeight, borderRadius)
    ctx.fill()

    if (borderStyle !== 'none' && blockAccent !== 'none') {
      if (blockAccent === 'left-bar') {
        ctx.fillStyle = borderColor
        ctx.fillRect(pad, contentTop, borderWidth * 2, blockHeight)
      } else if (blockAccent === 'top-bar') {
        ctx.fillStyle = borderColor
        ctx.fillRect(pad, contentTop, W - pad * 2, borderWidth * 2)
      } else if (blockAccent === 'full-border') {
        ctx.strokeStyle = borderColor
        ctx.lineWidth = borderWidth
        if (borderStyle === 'dashed') ctx.setLineDash([borderWidth * 5, borderWidth * 3])
        else if (borderStyle === 'dotted') ctx.setLineDash([borderWidth * 2, borderWidth * 2])
        else ctx.setLineDash([])
        ctx.beginPath()
        ctx.roundRect(pad, contentTop, W - pad * 2, blockHeight, borderRadius)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    const aFontSize = Math.round((fontSize + 20) * s)
    ctx.font = `${fontWeight} ${aFontSize}px Georgia, serif`
    ctx.direction = 'rtl'
    const aLineH = aFontSize * 1.9
    const innerPad = Math.round(90 * s)
    const aMaxW = W - innerPad * 2
    const aStartY = contentTop + Math.round(60 * s)
    const aRows = buildRows(aWords, ctx, aMaxW, 14)

    if (showArabic) {
      let aGlobalIdx = 0
      aRows.forEach((r, ri) => {
        let xCursor = W - innerPad
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

    const tFontSize = Math.round((fontSize - 2) * s)
    ctx.font = `italic ${tFontSize}px ${fontFamily}`
    ctx.direction = 'ltr'; ctx.textAlign = 'left'
    const tLineH = tFontSize * 1.8
    const tRows = buildRows(tWords, ctx, W - innerPad * 2, 10)
    const tStartY = aStartY + aBlockH + (showArabic ? Math.round(16 * s) : 0)

    if (showTranslit) {
      let tGlobalIdx = 0
      tRows.forEach((r, ri) => {
        let xCursor = innerPad
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
      const trFontSize = Math.round(fontSize * s)
      ctx.font = `${fontWeight} ${trFontSize}px ${fontFamily}`
      ctx.textAlign = 'left'; ctx.direction = 'ltr'
      const trRows = buildTrRows(trWords, ctx, W - innerPad * 2)
      const trLineH = trFontSize * 1.6
      let trY = tStartY + tBlockH + (showTranslit ? Math.round(20 * s) : 0)
      trRows.forEach(r => {
        let xCursor = innerPad
        r.forEach(({ word, idx }) => {
          const ww = ctx.measureText(word + ' ').width
          if (idx === trIdx) {
            ctx.fillStyle = accent.v + '22'
            ctx.beginPath(); ctx.roundRect(xCursor - 2, trY - trFontSize * 0.85, ww, trFontSize * 1.1, 3); ctx.fill()
            ctx.fillStyle = accent.v
          } else { ctx.fillStyle = translationColor }
          ctx.fillText(word, xCursor, trY)
          xCursor += ww
        })
        trY += trLineH
      })
    }

    const prog = audioDuration > 0 ? t / audioDuration : 0
    const barY = H - barH + Math.round(10 * s)
    const barDot = Math.round(8 * s)
    ctx.fillStyle = '#e5e7eb'
    ctx.beginPath(); ctx.roundRect(pad, barY, W - pad * 2, Math.round(10 * s), 5); ctx.fill()
    if (prog > 0) {
      ctx.fillStyle = accent.v
      ctx.beginPath(); ctx.roundRect(pad, barY, (W - pad * 2) * prog, Math.round(10 * s), 5); ctx.fill()
      ctx.beginPath(); ctx.arc(pad + (W - pad * 2) * prog, barY + Math.round(5 * s), barDot, 0, Math.PI * 2); ctx.fill()
    }
    ctx.font = `${Math.round(22 * s)}px ${fontFamily}`; ctx.fillStyle = '#9ca3af'; ctx.direction = 'ltr'
    ctx.textAlign = 'left'; ctx.fillText(fmt(t), pad, barY + Math.round(36 * s))
    ctx.textAlign = 'right'; ctx.fillText(fmt(audioDuration), W - pad, barY + Math.round(36 * s))

    ctx.font = `bold ${Math.round(18 * s)}px ${fontFamily}`; ctx.fillStyle = accent.v; ctx.textAlign = 'center'
    ctx.fillText('DuaFlow — Quranic Supplications', W / 2, H - Math.round(28 * s))
    ctx.fillStyle = accent.v; ctx.fillRect(0, H - Math.round(8 * s), W, Math.round(8 * s))

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
  videoEncoder.configure({ codec: 'avc1.4d0028', width: W, height: H, bitrate: 4_000_000, framerate: FPS })

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

    post({ type: 'progress', stage: 'Preparing…' })
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
