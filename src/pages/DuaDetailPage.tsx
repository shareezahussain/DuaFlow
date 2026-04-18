import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { useApp } from '../context/AppContext'
import { useQuranContent } from '../context/QuranContentContext'
import SharePanel, { type SharePlatform } from '../components/SharePanel'
import Footer from '../components/Footer'

const LANG_LABELS = { en: 'English', ur: 'اردو', bn: 'বাংলা' } as const

const RECITERS = [
  { id: 'Alafasy',  name: 'Mishary Al Afasy' },
  { id: 'Shatri',   name: 'Abu Bakr Al Shatri' },
  { id: 'Sudais',   name: 'Abdul Rahman Al Sudais' },
  { id: 'Rifai',    name: 'Hani Ar Rifai' },
  { id: 'Shuraym',  name: 'Saood Al Shuraym' },
]

function pad(n: number, len = 3) {
  return String(n).padStart(len, '0')
}

function getAudioUrl(surah: number, ayah: number, reciterId: string) {
  return `https://verses.quran.com/${reciterId}/mp3/${pad(surah)}${pad(ayah)}.mp3`
}

function buildPrintHtml(d: { id: number; surah: number; ayah: number; topic: string; arabicText: string; transliteration: string; translations: { en: string; ur: string; bn: string } }, lang: 'en' | 'ur' | 'bn') {
  const translation = d.translations[lang]
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Amiri',Georgia,serif; padding:40px; background:#fff; }
  .cover { background:#1a5276; color:#fff; padding:28px 20px; border-radius:12px; text-align:center; margin-bottom:28px; }
  .cover h1 { font-size:26px; } .cover h2 { font-size:14px; opacity:.8; margin-top:6px; }
  .ref { font-size:11px; color:#1a5276; font-weight:700; text-transform:uppercase; letter-spacing:.5px; margin-bottom:10px; }
  .arabic { font-size:30px; color:#1a2749; line-height:2; text-align:right; direction:rtl; margin-bottom:10px; }
  .translit { font-size:14px; color:#555; font-style:italic; margin-bottom:8px; }
  .translation { font-size:16px; color:#2c3e50; line-height:1.8; }
  .block { border-left:4px solid #1a5276; padding:16px 20px; background:#fafafa; border-radius:0 8px 8px 0; }
  .bismillah { text-align:center; font-size:26px; color:#1a5276; margin-bottom:20px; direction:rtl; }
  .footer { text-align:center; color:#aaa; font-size:11px; margin-top:32px; border-top:1px solid #eee; padding-top:12px; }
</style></head><body>
<div class="cover"><h1>${d.topic}</h1><h2>Surah ${d.surah}:${d.ayah}</h2></div>
<div class="bismillah">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>
<div class="block">
  <div class="ref">Surah ${d.surah}:${d.ayah} — ${d.topic}</div>
  <div class="arabic">${d.arabicText}</div>
  <div class="translit">${d.transliteration}</div>
  <div class="translation">${translation}</div>
</div>
<div class="footer">DuaFlow — Quranic Supplications</div>
</body></html>`
}

export default function DuaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { language, setLanguage, addToPrint, removeFromPrint, isInPrint } = useApp()
  const { duas, isLoading } = useQuranContent()

  const dua = duas.find(d => d.id === Number(id))
  const inPrint = dua ? isInPrint(dua.id) : false

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [selectedReciter, setSelectedReciter] = useState(RECITERS[0].id)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [highlightedArabic, setHighlightedArabic] = useState(-1)
  const [highlightedTranslit, setHighlightedTranslit] = useState(-1)
  const [videoState, setVideoState] = useState<'idle' | 'recording' | 'done'>('idle')
  const videoBlobRef = useRef<{ blob: Blob; mimeType: string } | null>(null)

  // Share panel
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [pngLoading, setPngLoading] = useState(false)
  const shareError = null

  // Clean up audio on unmount or dua change
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [id])

  if (isLoading || !dua) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#1a5276] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading dua…</p>
        </div>
      </div>
    )
  }

  const arabicWords = dua.arabicText.split(' ').filter(w => w.trim())
  const translitWords = dua.transliteration.split(' ').filter(w => w.trim())

  // Compute highlighted index for any word list based on playback progress
  const wordIndexAt = (words: string[], t: number, dur: number) => {
    if (!dur || t <= 0) return -1
    if (t >= dur) return -1
    return Math.min(Math.floor((t / dur) * words.length), words.length - 1)
  }

  const handlePlay = () => {
    if (!audioRef.current) {
      const url = getAudioUrl(dua.surah, dua.ayah, selectedReciter)
      const audio = new Audio(url)
      audioRef.current = audio
      setAudioLoading(true)

      audio.onloadedmetadata = () => {
        setDuration(audio.duration)
        setAudioLoading(false)
      }
      audio.ontimeupdate = () => {
        const t = audio.currentTime
        const dur = audio.duration
        setPosition(t)
        setHighlightedArabic(wordIndexAt(arabicWords, t, dur))
        setHighlightedTranslit(wordIndexAt(translitWords, t, dur))
      }
      audio.onended = () => {
        setIsPlaying(false)
        setHighlightedArabic(-1)
        setHighlightedTranslit(-1)
      }
      audio.onerror = () => {
        setAudioLoading(false)
        setIsPlaying(false)
      }

      audio.play().then(() => {
        setIsPlaying(true)
      }).catch(() => setAudioLoading(false))
      return
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setIsPlaying(false)
    setPosition(0)
    setHighlightedArabic(-1)
    setHighlightedTranslit(-1)
  }

  const switchReciter = (reciterId: string) => {
    handleStop()
    setSelectedReciter(reciterId)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  const progress = duration > 0 ? position / duration : 0

  const handleSharePng = async (platform: SharePlatform) => {
    setPngLoading(true)
    try {
      const h2c = (await import('html2canvas')).default
      const div = document.createElement('div')
      div.style.cssText = 'position:fixed;left:-9999px;top:0;width:700px;background:#fff;'
      div.innerHTML = buildPrintHtml(dua, language)
      document.body.appendChild(div)
      const canvas = await h2c(div, { scale: 2, useCORS: true, backgroundColor: '#fff', width: 700 })
      document.body.removeChild(div)
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/png', 1)
      )
      const file = new File([blob], `rabbana-dua-${dua.id}.png`, { type: 'image/png' })
      if (platform !== 'download' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${dua.topic} — DuaFlow`, files: [file] })
      } else if (platform === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${dua.topic} — Surah ${dua.surah}:${dua.ayah} 🤲 #Quran #Rabbana`)}`, '_blank')
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `rabbana-dua-${dua.id}.png`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } finally {
      setPngLoading(false)
    }
  }

  const handleShareVideo = async (platform: SharePlatform) => {
    if (!videoBlobRef.current) return
    const { blob, mimeType } = videoBlobRef.current
    const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
    const file = new File([blob], `rabbana-karaoke.${ext}`, { type: mimeType })
    if (platform !== 'download' && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: `${dua.topic} — DuaFlow`, files: [file] })
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${dua.topic} — Surah ${dua.surah}:${dua.ayah} 🤲 #Quran #Rabbana`)}`, '_blank')
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `rabbana-dua-${dua.id}-karaoke.${ext}`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    }
  }

  const generateKaraokeVideo = async () => {
    if (videoState === 'recording') return
    setVideoState('recording')

    try {
      // ── 1. Load audio buffer ─────────────────────────────────────────────────
      const audioUrl = getAudioUrl(dua.surah, dua.ayah, selectedReciter)
      const audioArrayBuffer = await fetch(audioUrl).then(r => r.arrayBuffer())
      const audioCtx = new AudioContext()
      const audioBuffer = await audioCtx.decodeAudioData(audioArrayBuffer)
      const audioDuration = audioBuffer.duration

      // ── 2. Canvas setup ──────────────────────────────────────────────────────
      const W = 1080, H = 1080
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!

      // ── 3. Load Amiri font ───────────────────────────────────────────────────
      const font = new FontFace('Amiri', 'url(https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHpUrtLMA7w.woff2)')
      await font.load()
      ;(document.fonts as FontFaceSet).add(font)

      // ── 4. Pre-split words ────────────────────────────────────────────────────
      const aWords = dua.arabicText.split(' ').filter(w => w.trim())
      const tWords = dua.transliteration.split(' ').filter(w => w.trim())

      // ── 5. Draw-frame helper ──────────────────────────────────────────────────
      const drawFrame = (t: number) => {
        const aIdx = t <= 0 || t >= audioDuration ? -1 : Math.min(Math.floor((t / audioDuration) * aWords.length), aWords.length - 1)
        const tIdx = t <= 0 || t >= audioDuration ? -1 : Math.min(Math.floor((t / audioDuration) * tWords.length), tWords.length - 1)

        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, 0, H)
        grad.addColorStop(0, '#0d1b2a')
        grad.addColorStop(1, '#1a3a5c')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, W, H)

        // Decorative top bar
        ctx.fillStyle = '#f39c12'
        ctx.fillRect(0, 0, W, 8)

        // Bismillah
        ctx.font = '52px Amiri'
        ctx.fillStyle = '#f39c12'
        ctx.textAlign = 'center'
        ctx.direction = 'rtl'
        ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', W / 2, 90)

        // Topic badge
        ctx.font = 'bold 26px Amiri'
        ctx.fillStyle = '#a9cce3'
        ctx.textAlign = 'center'
        ctx.direction = 'ltr'
        ctx.fillText(`${dua.topic}  •  Surah ${dua.surah}:${dua.ayah}`, W / 2, 148)

        // Divider
        ctx.strokeStyle = '#2e86c1'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(80, 168)
        ctx.lineTo(W - 80, 168)
        ctx.stroke()

        // ── Arabic words (RTL, word-wrap rows) ──────────────────────────────
        const aFontSize = 54
        ctx.font = `${aFontSize}px Amiri`
        ctx.direction = 'rtl'
        const aLineH = aFontSize * 1.9

        // Build rows RTL by measuring
        type Row = string[]
        const aRows: Row[] = []
        let row: string[] = []
        let rowW = 0
        const aMaxW = W - 120
        for (const w of aWords) {
          const ww = ctx.measureText(w).width + 14
          if (rowW + ww > aMaxW && row.length > 0) { aRows.push(row); row = []; rowW = 0 }
          row.push(w); rowW += ww
        }
        if (row.length) aRows.push(row)

        let wordGlobalIdx = 0
        const aStartY = 230
        aRows.forEach((r, ri) => {
          // Calculate x positions RTL: start from right
          let xCursor = W - 60
          const positions: Array<{ word: string; x: number; idx: number }> = []
          for (const w of r) {
            const ww = ctx.measureText(w).width + 14
            positions.push({ word: w, x: xCursor, idx: wordGlobalIdx++ })
            xCursor -= ww
          }
          positions.forEach(({ word, x, idx }) => {
            if (idx === aIdx) {
              // Highlight pill
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

        const aBlockH = aRows.length * aLineH

        // ── Transliteration (LTR) ─────────────────────────────────────────────
        const tFontSize = 28
        ctx.font = `italic ${tFontSize}px Amiri`
        ctx.direction = 'ltr'
        ctx.textAlign = 'left'
        const tLineH = tFontSize * 1.8
        const tMaxW = W - 120

        const tRows: Row[] = []
        let tRow: string[] = []
        let tRowW = 0
        for (const w of tWords) {
          const ww = ctx.measureText(w).width + 10
          if (tRowW + ww > tMaxW && tRow.length > 0) { tRows.push(tRow); tRow = []; tRowW = 0 }
          tRow.push(w); tRowW += ww
        }
        if (tRow.length) tRows.push(tRow)

        let tGlobalIdx = 0
        const tStartY = aStartY + aBlockH + 28
        tRows.forEach((r, ri) => {
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

        // ── Progress bar ──────────────────────────────────────────────────────
        const prog = audioDuration > 0 ? t / audioDuration : 0
        const barY = H - 90
        ctx.fillStyle = '#1e3a5f'
        ctx.beginPath()
        ctx.roundRect(60, barY, W - 120, 10, 5)
        ctx.fill()
        if (prog > 0) {
          ctx.fillStyle = '#f39c12'
          ctx.beginPath()
          ctx.roundRect(60, barY, (W - 120) * prog, 10, 5)
          ctx.fill()
          // dot
          ctx.beginPath()
          ctx.arc(60 + (W - 120) * prog, barY + 5, 8, 0, Math.PI * 2)
          ctx.fill()
        }

        // Time
        const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
        ctx.font = '24px Amiri'
        ctx.fillStyle = '#a9cce3'
        ctx.direction = 'ltr'
        ctx.textAlign = 'left'
        ctx.fillText(fmt(t), 60, barY + 38)
        ctx.textAlign = 'right'
        ctx.fillText(fmt(audioDuration), W - 60, barY + 38)

        // Branding
        ctx.font = 'bold 20px Amiri'
        ctx.fillStyle = '#2e86c1'
        ctx.textAlign = 'center'
        ctx.fillText('DuaFlow — Quranic Supplications', W / 2, H - 28)

        // Bottom bar
        ctx.fillStyle = '#f39c12'
        ctx.fillRect(0, H - 8, W, 8)
      }

      // ── 6. Set up mp4-muxer + WebCodecs encoders ────────────────────────────
      const FPS = 30
      const sampleRate = audioBuffer.sampleRate
      const numChannels = audioBuffer.numberOfChannels

      const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: { codec: 'avc', width: W, height: H },
        audio: { codec: 'aac', sampleRate, numberOfChannels: numChannels },
        fastStart: 'in-memory',
      })

      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? {}),
        error: e => { throw e },
      })
      videoEncoder.configure({
        codec: 'avc1.4d0028', // H.264 High Profile level 4.0
        width: W,
        height: H,
        bitrate: 4_000_000,
        framerate: FPS,
      })

      const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta ?? {}),
        error: e => { throw e },
      })
      audioEncoder.configure({
        codec: 'mp4a.40.2', // AAC-LC
        sampleRate,
        numberOfChannels: numChannels,
        bitrate: 128_000,
      })

      // ── 7. Encode audio in 1024-sample AAC frames ────────────────────────────
      const CHUNK = 1024
      const totalSamples = audioBuffer.length
      const channelData: Float32Array[] = []
      for (let c = 0; c < numChannels; c++) channelData.push(audioBuffer.getChannelData(c))

      for (let offset = 0; offset < totalSamples; offset += CHUNK) {
        const frameCount = Math.min(CHUNK, totalSamples - offset)
        const timestamp = Math.round((offset / sampleRate) * 1_000_000)
        const data = new Float32Array(numChannels * frameCount)
        for (let c = 0; c < numChannels; c++) {
          data.set(channelData[c].subarray(offset, offset + frameCount), c * frameCount)
        }
        const ad = new AudioData({ format: 'f32-planar', sampleRate, numberOfFrames: frameCount, numberOfChannels: numChannels, timestamp, data })
        audioEncoder.encode(ad)
        ad.close()
      }

      // ── 8. Encode video frames (faster than real-time) ───────────────────────
      const totalFrames = Math.ceil(audioDuration * FPS)
      for (let i = 0; i <= totalFrames; i++) {
        const t = i / FPS
        drawFrame(Math.min(t, audioDuration))
        const timestamp = Math.round(t * 1_000_000)
        const vf = new VideoFrame(canvas, { timestamp, duration: Math.round(1_000_000 / FPS) })
        videoEncoder.encode(vf, { keyFrame: i % (FPS * 2) === 0 })
        vf.close()
        // Yield every 60 frames so the UI stays responsive
        if (i % 60 === 0) await new Promise(res => setTimeout(res, 0))
      }

      // ── 9. Flush, finalize, download ─────────────────────────────────────────
      await videoEncoder.flush()
      await audioEncoder.flush()
      muxer.finalize()
      await audioCtx.close()

      const buffer = (muxer.target as ArrayBufferTarget).buffer
      const blob = new Blob([buffer], { type: 'video/mp4' })
      videoBlobRef.current = { blob, mimeType: 'video/mp4' }
      setVideoState('done')
    } catch (err) {
      console.error('Video generation failed', err)
      setVideoState('idle')
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      {/* Header */}
      <header className="bg-[#1a5276] sticky top-0 z-10 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-[#a9cce3] hover:text-white text-sm font-medium">
            ← Back
          </button>
          <div className="flex-1 text-center">
            <p className="text-white font-bold">{dua.topic}</p>
            <p className="text-[#a9cce3] text-xs">Surah {dua.surah}:{dua.ayah}</p>
          </div>
          <button
            onClick={() => inPrint ? removeFromPrint(dua.id) : addToPrint(dua)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              inPrint ? 'bg-[#f39c12] border-[#f39c12] text-white' : 'border-[#f39c12] text-[#f39c12] hover:bg-[#f39c12] hover:text-white'
            }`}
          >
            {inPrint ? '✓ Saved' : '🖨 Save'}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Topic badge */}
        <span className="inline-block bg-[#1a5276] text-white text-xs font-semibold px-4 py-1.5 rounded-full">
          {dua.topic}
        </span>

        {/* Arabic karaoke */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Arabic</p>
          <p dir="rtl" className="arabic text-2xl leading-loose text-right">
            {arabicWords.map((word, i) => (
              <span
                key={i}
                className={`inline transition-colors px-1 rounded ${
                  highlightedArabic === i ? 'text-[#c0392b] bg-red-50' : 'text-[#1a1a2e]'
                }`}
              >
                {word}{' '}
              </span>
            ))}
          </p>
        </div>

        {/* Transliteration karaoke */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Transliteration</p>
          <div className="flex flex-wrap gap-1">
            {translitWords.map((word, i) => (
              <span
                key={i}
                className={`text-sm italic transition-colors px-0.5 rounded ${
                  highlightedTranslit === i ? 'text-red-500 bg-red-50' : 'text-gray-600'
                }`}
              >
                {word}
              </span>
            ))}
          </div>
        </div>

        {/* Language toggle */}
        <div className="flex gap-2">
          {(['en', 'ur', 'bn'] as const).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                language === lang
                  ? 'bg-[#1a5276] border-[#1a5276] text-white font-bold'
                  : 'border-[#1a5276] text-[#1a5276] hover:bg-[#1a5276] hover:text-white'
              }`}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>

        {/* Translation */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Translation</p>
          <p className="text-base text-gray-800 leading-relaxed">{dua.translations[language]}</p>
        </div>

        {/* Audio player */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Audio Recitation</p>

          {/* Reciters */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {RECITERS.map(r => (
              <button
                key={r.id}
                onClick={() => switchReciter(r.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  selectedReciter === r.id
                    ? 'bg-[#1a5276] border-[#1a5276] text-white font-semibold'
                    : 'border-gray-300 text-gray-500 hover:border-[#1a5276]'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100 rounded-full mb-1 overflow-hidden">
            <div
              className="h-full bg-[#1a5276] rounded-full transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mb-4">
            <span>{formatTime(position)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={handleStop}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50"
            >
              ■ Stop
            </button>
            <button
              onClick={handlePlay}
              disabled={audioLoading}
              className="flex-[2] py-3 rounded-xl bg-[#f39c12] hover:bg-[#e67e22] text-white font-bold text-sm transition-colors disabled:opacity-60"
            >
              {audioLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
          </div>

          {isPlaying && (
            <p className="mt-3 text-center text-xs text-amber-700 bg-amber-50 rounded-lg py-2">
              🎵 Sing Along — highlighted words follow the recitation
            </p>
          )}
        </div>

        {/* Action row */}
        <div className="flex gap-3">
          <button
            onClick={() => { addToPrint(dua); navigate('/print') }}
            className="flex-1 py-4 rounded-2xl bg-[#1a1a2e] hover:bg-[#1a5276] text-white font-bold text-sm transition-colors"
          >
            🎨 Design &amp; Print
          </button>
          <button
            onClick={() => setShowSharePanel(p => !p)}
            className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-colors ${showSharePanel ? 'bg-[#1a5276] text-white' : 'bg-[#f39c12] hover:bg-[#e67e22] text-white'}`}
          >
            📲 Share
          </button>
        </div>

        {/* Share panel */}
        {showSharePanel && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <SharePanel
              error={shareError}
              onShareImage={handleSharePng}
              imageLoading={pngLoading}
              videoState={videoState}
              onGenerateVideo={generateKaraokeVideo}
              onShareVideo={handleShareVideo}
              onResetVideo={() => { setVideoState('idle'); videoBlobRef.current = null }}
            />
          </div>
        )}

        {/* Prev / Next */}
        <div className="flex gap-3">
          {dua.id > 1 && (
            <Link
              to={`/dua/${dua.id - 1}`}
              className="flex-1 py-4 rounded-2xl bg-[#1a5276] hover:bg-[#2e86c1] text-white font-semibold text-sm text-center transition-colors"
            >
              ← Prev
            </Link>
          )}
          {dua.id < duas.length && (
            <Link
              to={`/dua/${dua.id + 1}`}
              className="flex-1 py-4 rounded-2xl bg-[#2e86c1] hover:bg-[#1a5276] text-white font-semibold text-sm text-center transition-colors"
            >
              Next →
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
