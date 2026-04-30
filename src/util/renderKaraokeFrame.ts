/**
 * Renders a single static karaoke-style frame (green header / white body)
 * onto a main-thread canvas. Used by the iOS path to generate a cover image
 * for the FFmpeg static-card video — same visual style as the animated worker.
 */

type Ctx = CanvasRenderingContext2D

const GREEN    = '#1d4c4e'
const BLACK    = '#0d0d0d'
const GRAY     = '#4a5568'
const GRAY_MID = '#718096'

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

  const aWords  = dua.arabicText.split(' ').filter(w => w.trim())
  const tWords  = dua.transliteration.split(' ').filter(w => w.trim())
  const trWords = dua.translation.split(' ').filter(w => w.trim())

  const availableH = H - barH - headerH

  // Auto-scale: shrink fonts in 5% steps until content fits, down to 60% of base
  let cs = 1.0
  let aFontSize: number, tFontSize: number, trFontSize: number
  let aLineH: number, tLineH: number, trLineH: number
  let aRows: string[][], tRows: string[][], trRows: string[][]
  let aBlockH: number, tBlockH: number, trBlockH: number, gapAT: number, gapTTr: number, totalH: number

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
    trRows = buildRows(trWords, ctx, W - pad * 2, 8).slice(0, 5)

    aBlockH  = aRows.length * aLineH
    tBlockH  = tRows.length * tLineH
    const trLabelH = Math.max(Math.round(20 * s * cs), 10)
    trBlockH = trRows.length * trLineH + trLabelH
    gapAT    = Math.max(Math.round(30 * s * cs), 16)
    gapTTr   = Math.max(Math.round(18 * s * cs), 10)
    totalH   = aBlockH + gapAT + tBlockH + gapTTr + trBlockH

    if (totalH <= availableH * 0.92) break
    cs -= 0.05
  } while (cs >= 0.6)

  const aStartY = headerH + Math.round(Math.max(aFontSize! * 1.5, (availableH - totalH!) / 2))

  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // Header
  ctx.fillStyle = GREEN
  ctx.fillRect(0, 0, W, headerH)

  ctx.font = `${Math.round(44 * s)}px Georgia, serif`
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.direction = 'rtl'
  ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', W / 2, Math.round(76 * s))

  ctx.font = `bold ${Math.round(22 * s)}px Georgia, serif`
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.textAlign = 'center'
  ctx.direction = 'ltr'
  ctx.fillText(`${dua.topic}  •  Surah ${dua.surah}:${dua.ayah}`, W / 2, Math.round(130 * s))

  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, headerH, W, H - headerH)

  // ── Arabic (no highlight — static frame) ─────────────────────────────────
  ctx.font = `${aFontSize}px Georgia, serif`
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

  // ── Transliteration ───────────────────────────────────────────────────────
  const tStartY = aStartY + aBlockH + gapAT
  ctx.font = `italic ${tFontSize}px Georgia, serif`
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
  ctx.font = `bold ${Math.max(Math.round(14 * s), 10)}px Georgia, serif`
  ctx.fillStyle = GRAY_MID
  ctx.fillText('TRANSLATION', pad, trStartY)

  ctx.font = `${trFontSize}px Georgia, serif`
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

  ctx.font = `${Math.round(18 * s)}px Georgia, serif`; ctx.fillStyle = GRAY_MID; ctx.direction = 'ltr'
  ctx.textAlign = 'left'; ctx.fillText('0:00', pad, barY + Math.round(30 * s))
  ctx.textAlign = 'right'; ctx.fillText(fmt(audioDuration), W - pad, barY + Math.round(30 * s))

  // Branding
  ctx.font = `bold ${Math.round(15 * s)}px Georgia, serif`; ctx.fillStyle = GREEN; ctx.textAlign = 'center'
  ctx.fillText('DuaFlow — Quranic Supplications', W / 2, H - Math.round(20 * s))
  ctx.fillStyle = GREEN; ctx.fillRect(0, H - Math.round(7 * s), W, Math.round(7 * s))

}
