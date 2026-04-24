import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { useApp } from '../context/AppContext'
import { useQuranContent } from '../context/QuranContentContext'
import SharePanel, { type SharePlatform } from '../components/SharePanel'
import Footer from '../components/Footer'
import SignInModal from '../components/SignInModal'
import { addBookmark, removeBookmark } from '../services/bookmarksApi'
import { downloadVideoFile } from '../util/downloadVideo'

const LANG_LABELS = { en: 'English', ur: 'اردو', bn: 'বাংলা' } as const

const RECITERS = [
  { id: 'Alafasy',  name: 'Mishary Al Afasy' },
  { id: 'Shatri',   name: 'Abu Bakr Al Shatri' },
  { id: 'Sudais',   name: 'Abdul Rahman Al Sudais' },
  { id: 'Rifai',    name: 'Hani Ar Rifai' },
  { id: 'Shuraym',  name: 'Saood Al Shuraym' },
]

// Mapping from our reciter IDs to quran.com API recitation IDs (for word timestamps)
const RECITATION_ID_MAP: Record<string, number> = {
  Alafasy: 7,
  Shatri:  8,
  Shuraym: 9,
}

type WordTiming = { start: number; end: number }

function exactWordIndex(timings: WordTiming[], t: number): number {
  if (t <= 0) return -1
  for (let i = 0; i < timings.length; i++) {
    const nextStart = timings[i + 1]?.start ?? (timings[i].end + 1)
    if (t >= timings[i].start && t < nextStart) return i
  }
  return -1
}

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
  const { language, setLanguage, addToPrint,
          userToken, bookmarkMap, setBookmarkMap, isBookmarked } = useApp()
  const { duas, isLoading } = useQuranContent()

  const dua = duas.find(d => d.id === Number(id))
  const bookmarked = dua ? isBookmarked(dua.id) : false

  const [showSignIn,       setShowSignIn]       = useState(false)
  const [bookmarkLoading,  setBookmarkLoading]  = useState(false)

  async function handleToggleBookmark() {
    if (!dua) return
    if (!userToken) { setShowSignIn(true); return }
    setBookmarkLoading(true)
    const key = String(dua.id)
    try {
      if (bookmarked) {
        const bmId = bookmarkMap[key]
        if (bmId) await removeBookmark(userToken, bmId).catch(() => {})
        const updated = { ...bookmarkMap }
        delete updated[key]
        setBookmarkMap(updated)
      } else {
        try {
          const created = await addBookmark(userToken, dua.surah, dua.ayah)
          setBookmarkMap({ ...bookmarkMap, [key]: created.id })
        } catch {
          // API unavailable (e.g. bookmark scope not yet enabled) — save locally
          setBookmarkMap({ ...bookmarkMap, [key]: 'local' })
        }
      }
    } finally {
      setBookmarkLoading(false)
    }
  }

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [selectedReciter, setSelectedReciter] = useState(RECITERS[0].id)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [highlightedArabic, setHighlightedArabic] = useState(-1)
  const [highlightedTranslit, setHighlightedTranslit] = useState(-1)
  const [highlightedTranslation, setHighlightedTranslation] = useState(-1)
  const [speed, setSpeed] = useState(1)
  const [repeat, setRepeat] = useState(false)

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
  const [videoState, setVideoState] = useState<'idle' | 'recording' | 'done'>('idle')
  const videoBlobRef = useRef<{ blob: Blob; mimeType: string } | null>(null)

  // Share panel
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [pngLoading, setPngLoading] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  const supportsWebCodecs = typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined'

  // Word-level timestamps from quran.com API — null means use proportional fallback
  const wordTimingsRef = useRef<WordTiming[] | null>(null)

  useEffect(() => {
    if (!dua) return
    const recitationId = RECITATION_ID_MAP[selectedReciter]
    if (!recitationId) { wordTimingsRef.current = null; return }

    let cancelled = false
    fetch(`https://api.quran.com/api/v4/recitations/${recitationId}/by_ayah/${dua.surah}:${dua.ayah}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const segments: number[][] = data.audio_files?.[0]?.segments ?? []
        if (!segments.length) { wordTimingsRef.current = null; return }
        wordTimingsRef.current = segments
          .sort((a, b) => a[0] - b[0])
          .map(s => ({ start: s[1] / 1000, end: s[2] / 1000 }))
      })
      .catch(() => { wordTimingsRef.current = null })

    return () => { cancelled = true; wordTimingsRef.current = null }
  }, [dua?.id, selectedReciter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up audio on unmount or dua change
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [id])

  if (isLoading || !dua) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-navy border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading dua…</p>
        </div>
      </div>
    )
  }

  const arabicWords = dua.arabicText.split(' ').filter(w => w.trim())
  const translitWords = dua.transliteration.split(' ').filter(w => w.trim())
  const translationWords = dua.translations[language].split(' ').filter(w => w.trim())

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
      audio.playbackRate = speed
      audio.loop = repeat
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
        const timings = wordTimingsRef.current
        if (timings) {
          const idx = exactWordIndex(timings, t)
          setHighlightedArabic(idx)
          setHighlightedTranslit(idx)
        } else {
          setHighlightedArabic(wordIndexAt(arabicWords, t, dur))
          setHighlightedTranslit(wordIndexAt(translitWords, t, dur))
        }
        setHighlightedTranslation(wordIndexAt(translationWords, t, dur))
      }
      audio.onended = () => {
        setIsPlaying(false)
        setHighlightedArabic(-1)
        setHighlightedTranslit(-1)
        setHighlightedTranslation(-1)
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
    setHighlightedTranslation(-1)
  }

  const switchReciter = (reciterId: string) => {
    handleStop()
    setSelectedReciter(reciterId)
  }

  const changeSpeed = (s: number) => {
    setSpeed(s)
    if (audioRef.current) audioRef.current.playbackRate = s
  }

  const toggleRepeat = () => {
    const next = !repeat
    setRepeat(next)
    if (audioRef.current) audioRef.current.loop = next
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
      if (platform === 'share' && navigator.canShare?.({ files: [file] })) {
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
    const filename = `rabbana-dua-${dua.id}-karaoke.${ext}`

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${dua.topic} — Surah ${dua.surah}:${dua.ayah} 🤲 #Quran #Rabbana`)}`, '_blank')
      return
    }
    if (platform === 'share') {
      const file = new File([blob], filename, { type: mimeType })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ title: `${dua.topic} — DuaFlow`, files: [file] })
          return
        } catch (e) {
          if ((e as Error).name === 'AbortError') return
          // share failed — fall through to download
        }
      }
    }
    const err = await downloadVideoFile(blob, filename, `${dua.topic} — DuaFlow`)
    if (err) setShareError(err)
  }

  const generateKaraokeVideo = async () => {
    if (videoState === 'recording') return
    if (!supportsWebCodecs) {
      setShareError('Video generation requires Chrome on desktop or Android. Not supported on iOS Safari.')
      return
    }
    setShareError(null)
    setVideoState('recording')

    try {
      // ── 1. Load audio buffer ─────────────────────────────────────────────────
      const audioUrl = getAudioUrl(dua.surah, dua.ayah, selectedReciter)
      const audioArrayBuffer = await fetch(audioUrl).then(r => r.arrayBuffer())
      const audioCtx = new AudioContext()
      const audioBuffer = await audioCtx.decodeAudioData(audioArrayBuffer)
      const audioDuration = audioBuffer.duration

      // ── 2. Canvas setup — lower res on mobile to avoid tab eviction ──────────
      const isMobileDevice = /Android|iPad|iPhone|iPod/i.test(navigator.userAgent)
      const W = isMobileDevice ? 720 : 1080
      const H = W
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
      const trWords = dua.translations[language].split(' ').filter(w => w.trim())
      const videoTimings = wordTimingsRef.current

      // ── 5. Draw-frame helper ──────────────────────────────────────────────────
      const propIdx = (words: string[], t: number) =>
        t <= 0 || t >= audioDuration ? -1 : Math.min(Math.floor((t / audioDuration) * words.length), words.length - 1)

      const drawFrame = (t: number) => {
        const wordIdx = videoTimings ? exactWordIndex(videoTimings, t) : propIdx(aWords, t)
        const aIdx  = wordIdx
        const tIdx  = wordIdx
        const trIdx = propIdx(trWords, t)

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

        // Cap rows so transliteration + translation always fit on the 1080px canvas
        const MAX_A_ROWS = 4
        const displayedARows = aRows.slice(0, MAX_A_ROWS)

        let wordGlobalIdx = 0
        const aStartY = 230
        displayedARows.forEach((r, ri) => {
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

        const aBlockH = displayedARows.length * aLineH

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

        const MAX_T_ROWS = 3
        const displayedTRows = tRows.slice(0, MAX_T_ROWS)

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

        // ── Translation (word-by-word) ────────────────────────────────────────
        const trFontSize = 22
        ctx.font = `${trFontSize}px Amiri`
        ctx.direction = 'ltr'
        ctx.textAlign = 'left'
        const trLineH = trFontSize * 1.7
        const trMaxW = W - 120

        type TrRow = Array<{ word: string; idx: number }>
        const trRowsW: TrRow[] = []
        let trRowCur: TrRow = []
        let trRowW = 0
        trWords.forEach((w, wi) => {
          const ww = ctx.measureText(w + ' ').width
          if (trRowW + ww > trMaxW && trRowCur.length > 0) { trRowsW.push(trRowCur); trRowCur = []; trRowW = 0 }
          trRowCur.push({ word: w, idx: wi }); trRowW += ww
        })
        if (trRowCur.length) trRowsW.push(trRowCur)

        const trStartY = tStartY + displayedTRows.length * tLineH + 32
        ctx.font = 'bold 16px Amiri'
        ctx.fillStyle = '#6fa8c9'
        ctx.fillText('Translation', 60, trStartY)
        ctx.font = `${trFontSize}px Amiri`

        trRowsW.slice(0, 3).forEach((r, ri) => {
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
      const FPS = isMobileDevice ? 24 : 30
      const sampleRate = audioBuffer.sampleRate
      const numChannels = audioBuffer.numberOfChannels

      const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: { codec: 'avc', width: W, height: H },
        audio: { codec: 'aac', sampleRate, numberOfChannels: numChannels },
        fastStart: 'in-memory',
      })

      let encoderError: Error | null = null
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? {}),
        error: e => { encoderError = e },
      })
      videoEncoder.configure({
        codec: 'avc1.4d0028', // H.264 High Profile level 4.0
        width: W,
        height: H,
        bitrate: isMobileDevice ? 2_000_000 : 4_000_000,
        framerate: FPS,
      })

      const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta ?? {}),
        error: e => { encoderError = e },
      })

      // ── 7. Encode audio in 1024-sample AAC frames ────────────────────────────
      const audioConfig = { codec: 'mp4a.40.2' as const, sampleRate, numberOfChannels: numChannels, bitrate: 128_000 }
      const audioSupport = await AudioEncoder.isConfigSupported(audioConfig)
      if (!audioSupport.supported) throw new Error('AAC audio encoding not supported on this device')
      audioEncoder.configure(audioConfig)

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
        // Yield every 128 chunks so mobile encoder queue doesn't get overwhelmed
        if ((offset / CHUNK) % 128 === 127) await new Promise(res => setTimeout(res, 0))
        if (encoderError) throw encoderError
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
      if (encoderError) throw encoderError
      muxer.finalize()
      await audioCtx.close()

      const buffer = (muxer.target as ArrayBufferTarget).buffer
      const blob = new Blob([buffer], { type: 'video/mp4' })
      videoBlobRef.current = { blob, mimeType: 'video/mp4' }
      setVideoState('done')
    } catch (err) {
      console.error('Video generation failed', err)
      setShareError(`Could not generate video: ${(err as Error).message}`)
      setVideoState('idle')
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-navy sticky top-0 z-10 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-navy-muted hover:text-white text-sm font-medium">
            ← Back
          </button>
          <a href='/' aria-label='Home' className="text-xl inline-block w-[24px] h-24px] align-middle px-2 py-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              className="w-6 h-6 text-white hover:fill-white transition"
            >
              <path d="M3 10.5L12 3l9 7.5" />
              <path d="M5 10v10h14V10" />
            </svg>
          </a>
          <div className="flex-1 text-center">
            <p className="text-white font-bold">{dua.topic}</p>
            <p className="text-navy-muted text-xs">Surah {dua.surah}:{dua.ayah}</p>
          </div>
          <button
            onClick={handleToggleBookmark}
            disabled={bookmarkLoading}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this dua'}
            className={`text-xl px-2 py-1 rounded-full transition-colors disabled:opacity-50 ${
              bookmarked ? 'text-gold' : 'text-navy-muted hover:text-gold'
            }`}
          >
            {bookmarkLoading
              ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin align-middle" />
              : bookmarked ? '🔖' : '🏷'}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Topic badge */}
        <span className="inline-block bg-navy text-white text-xs font-semibold px-4 py-1.5 rounded-full">
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
                  highlightedArabic === i ? 'text-[#c0392b] bg-red-50' : 'text-navy-dark'
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
                  ? 'bg-navy border-navy text-white font-bold'
                  : 'border-navy text-navy hover:bg-navy hover:text-white'
              }`}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>

        {/* Translation karaoke */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Translation</p>
          <div className="flex flex-wrap gap-1">
            {translationWords.map((word, i) => (
              <span
                key={i}
                className={`text-base transition-colors px-0.5 rounded ${
                  highlightedTranslation === i ? 'text-red-500 bg-red-50' : 'text-gray-800'
                }`}
              >
                {word}
              </span>
            ))}
          </div>
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
                    ? 'bg-navy border-navy text-white font-semibold'
                    : 'border-gray-300 text-gray-500 hover:border-navy'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100 rounded-full mb-1 overflow-hidden">
            <div
              className="h-full bg-navy rounded-full transition-all"
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
              className="flex-[2] py-3 rounded-xl bg-gold hover:bg-gold-dark text-white font-bold text-sm transition-colors disabled:opacity-60"
            >
              {audioLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
          </div>

          {/* Speed & Repeat */}
          <div className="flex items-center justify-end gap-2 mt-3">
            <select
              value={speed}
              onChange={e => changeSpeed(Number(e.target.value))}
              className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-navy"
            >
              {SPEEDS.map(s => (
                <option key={s} value={s}>{s}×</option>
              ))}
            </select>
            <button
              onClick={toggleRepeat}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                repeat ? 'bg-navy border-navy text-white' : 'border-gray-200 text-gray-500 hover:border-navy'
              }`}
            >
              🔁 {repeat ? 'On' : 'Off'}
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
            className="flex-1 py-4 rounded-2xl bg-navy-dark hover:bg-navy text-white font-bold text-sm transition-colors"
          >
            🎨 Design &amp; Print
          </button>
          <button
            onClick={() => setShowSharePanel(p => !p)}
            className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-colors ${showSharePanel ? 'bg-navy text-white' : 'bg-gold hover:bg-gold-dark text-white'}`}
          >
            <svg className="inline-block w-5 h-5 mr-1.5 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Share
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

      </main>
      <Footer />
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </div>
  )
}
