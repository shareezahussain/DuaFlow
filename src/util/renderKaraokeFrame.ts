/**
 * Renders a single static karaoke-style frame (green header / white body)
 * onto a main-thread canvas. Used by the iOS path to generate a cover image
 * for the FFmpeg static-card video — same visual style as the animated worker.
 */

type Ctx = CanvasRenderingContext2D

const GREEN      = '#1d4c4e'
const GREEN_PILL = '#e0eeee'
const BLACK      = '#0d0d0d'
const GRAY       = '#4a5568'
const GRAY_MID   = '#718096'

function buildRows(
  words: string[], ctx: Ctx, maxW: number, gap: number,
): string[][] {
  const rows: string[][] = []
  let row: string[] = [], rowW = 0
  for (const w of words) {
    const ww = ctx.measureText(w).width + gap
    if (rowW + ww > maxW && row.length > 0) { rows.push(row); row = []; rowW = 0 }
    row.push(w); rowW += ww
  }
  if (row.length) rows.push(row)
  return rows
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export function renderKaraokeFrame(
  canvas: HTMLCanvasElement,
  dua: { arabicText: string; transliteration: string; translation: string; topic: string; surah: number; ayah: number },
  audioDuration: number,
) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width
  const H = canvas.height
  const s = W / 1080

  const pad      = Math.round(64 * s)
  const barH     = Math.round(88 * s)
  const headerH  = Math.round(160 * s)

  const aFontSize  = Math.round(52 * s)
  const tFontSize  = Math.round(26 * s)
  const trFontSize = Math.round(20 * s)
  const aLineH     = aFontSize * 1.9
  const tLineH     = tFontSize * 1.8
  const trLineH    = trFontSize * 1.7

  const aWords  = dua.arabicText.split(' ').filter(w => w.trim())
  const tWords  = dua.transliteration.split(' ').filter(w => w.trim())
  const trWords = dua.translation.split(' ').filter(w => w.trim())

  // Pre-measure rows
  ctx.font = `${aFontSize}px Amiri`
  const aRows = buildRows(aWords, ctx, W - pad * 2, 14).slice(0, 4)
  ctx.font = `italic ${tFontSize}px Amiri`
  const tRows = buildRows(tWords, ctx, W - pad * 2, 10).slice(0, 3)
  ctx.font = `${trFontSize}px Amiri`
  const trRows = buildRows(
    trWords.map((w, i) => ({ word: w, idx: i })).map(o => o.word),
    ctx, W - pad * 2, 8,
  ).slice(0, 3)

  const aBlockH   = aRows.length * aLineH
  const tBlockH   = tRows.length * tLineH
  const trLabelH  = Math.round(20 * s)
  const trBlockH  = trRows.length * trLineH + trLabelH
  const gapAT     = Math.round(30 * s)
  const gapTTr    = Math.round(18 * s)
  const totalH    = aBlockH + gapAT + tBlockH + gapTTr + trBlockH
  const availableH = H - barH - headerH
  const aStartY   = headerH + Math.round(Math.max(aFontSize * 1.5, (availableH - totalH) / 2))

  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // Header
  ctx.fillStyle = GREEN
  ctx.fillRect(0, 0, W, headerH)

  ctx.font = `${Math.round(44 * s)}px Amiri`
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.direction = 'rtl'
  ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', W / 2, Math.round(76 * s))

  ctx.font = `bold ${Math.round(22 * s)}px Amiri`
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.textAlign = 'center'
  ctx.direction = 'ltr'
  ctx.fillText(`${dua.topic}  •  Surah ${dua.surah}:${dua.ayah}`, W / 2, Math.round(130 * s))

  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, headerH, W, H - headerH)

  // ── Arabic (no highlight — static frame) ─────────────────────────────────
  ctx.font = `${aFontSize}px Amiri`
  ctx.direction = 'rtl'
  aRows.forEach((r, ri) => {
    let xCursor = W - pad
    for (const w of r) {
      const ww = ctx.measureText(w).width + 14
      ctx.fillStyle = BLACK
      ctx.textAlign = 'right'
      ctx.fillText(w, xCursor, aStartY + ri * aLineH)
      xCursor -= ww
    }
  })

  // Divider
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad, aStartY + aBlockH + Math.round(12 * s))
  ctx.lineTo(W - pad, aStartY + aBlockH + Math.round(12 * s))
  ctx.stroke()

  // ── Transliteration ───────────────────────────────────────────────────────
  const tStartY = aStartY + aBlockH + gapAT
  ctx.font = `italic ${tFontSize}px Amiri`
  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  tRows.forEach((r, ri) => {
    let xCursor = pad
    r.forEach(w => {
      ctx.fillStyle = GRAY
      ctx.fillText(w, xCursor, tStartY + ri * tLineH)
      xCursor += ctx.measureText(w).width + 10
    })
  })

  // ── Translation ───────────────────────────────────────────────────────────
  const trStartY = tStartY + tBlockH + gapTTr
  ctx.font = `bold ${Math.round(12 * s)}px Amiri`
  ctx.fillStyle = GRAY_MID
  ctx.fillText('TRANSLATION', pad, trStartY)

  ctx.font = `${trFontSize}px Amiri`
  trRows.forEach((r, ri) => {
    let xCursor = pad
    r.forEach(w => {
      ctx.fillStyle = '#333333'
      ctx.fillText(w, xCursor, trStartY + (ri + 1) * trLineH)
      xCursor += ctx.measureText(w + ' ').width
    })
  })

  // ── Progress bar (static at 0) ────────────────────────────────────────────
  const barY = H - barH + Math.round(12 * s)
  ctx.fillStyle = '#e2e8f0'
  ctx.beginPath(); ctx.roundRect(pad, barY, W - pad * 2, Math.round(6 * s), 3); ctx.fill()

  ctx.font = `${Math.round(18 * s)}px Amiri`; ctx.fillStyle = GRAY_MID; ctx.direction = 'ltr'
  ctx.textAlign = 'left'; ctx.fillText('0:00', pad, barY + Math.round(30 * s))
  ctx.textAlign = 'right'; ctx.fillText(fmt(audioDuration), W - pad, barY + Math.round(30 * s))

  // Branding
  ctx.font = `bold ${Math.round(15 * s)}px Amiri`; ctx.fillStyle = GREEN; ctx.textAlign = 'center'
  ctx.fillText('DuaFlow — Quranic Supplications', W / 2, H - Math.round(20 * s))
  ctx.fillStyle = GREEN; ctx.fillRect(0, H - Math.round(7 * s), W, Math.round(7 * s))

  // Green pill on first Arabic word to hint it's a sing-along
  if (aRows[0]?.length) {
    ctx.font = `${aFontSize}px Amiri`
    ctx.direction = 'rtl'
    const firstWord = aRows[0][0]
    const ww = ctx.measureText(firstWord).width + 14
    const x = W - pad
    ctx.fillStyle = GREEN_PILL
    ctx.beginPath()
    ctx.roundRect(x - ww, aStartY - aFontSize * 0.85, ww, aFontSize * 1.1, 6)
    ctx.fill()
    ctx.fillStyle = GREEN
    ctx.textAlign = 'right'
    ctx.fillText(firstWord, x, aStartY)
  }
}
