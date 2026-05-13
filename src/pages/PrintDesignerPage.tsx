import { useState, useMemo, useEffect, useRef } from 'react'
import HomeButton from '../components/HomeButton'
import { useApp, DEFAULT_DESIGN, MAX_PRINT_DUAS, type Language, type EmojiOverlay } from '../context/AppContext'
import { useQuranContent } from '../context/QuranContentContext'
import SharePanel, { type SharePlatform } from '../components/SharePanel'
import ConfirmModal from '../components/ConfirmModal'
import { sanitizeDuaFields, sanitizeSearchInput } from '../util/searchUtils'
import { LANG_LABELS } from '../util/constants'
import { uploadToImgbb, openTwitterShare, openPinterestShare } from '../util/imgbb'

const EMOJI_SIZE = 36

// ── Option data ───────────────────────────────────────────────────────────────

const FONT_SIZES = [{ l: 'S', v: 14 }, { l: 'M', v: 18 }, { l: 'L', v: 22 }]
const FONT_WEIGHTS = [{ l: 'Normal', v: '400' }, { l: 'Bold', v: '700' }]
const FONT_FAMILIES = [
  { l: 'Serif', v: "'Amiri', Georgia, serif" },
  { l: 'Sans', v: 'Arial, Helvetica, sans-serif' },
  { l: 'Mono', v: "'Courier New', Courier, monospace" },
]
const ACCENT_COLORS = [
  { l: 'green', v: '#1a5276', t: '#fff' },
  { l: 'Green', v: '#1e8449', t: '#fff' },
  { l: 'Purple', v: '#6c3483', t: '#fff' },
  { l: 'Gold', v: '#b7950b', t: '#fff' },
  { l: 'Maroon', v: '#78281f', t: '#fff' },
  { l: 'Teal', v: '#117a65', t: '#fff' },
]
const TEXT_COLORS = ['#111111', '#1a2749', '#145a32', '#4a235a', '#555555', '#7b241c']
const BORDER_STYLES = [{ l: 'None', v: 'none' }, { l: 'Solid', v: 'solid' }, { l: 'Dashed', v: 'dashed' }, { l: 'Dotted', v: 'dotted' }]
const BORDER_WIDTHS = [{ l: '1', v: 1 }, { l: '2', v: 2 }, { l: '3', v: 3 }, { l: '4', v: 4 }]
const BORDER_RADII = [{ l: 'Sharp', v: 0 }, { l: 'Round', v: 8 }, { l: 'Pill', v: 20 }]
const BLOCK_ACCENTS = [{ l: 'Left bar', v: 'left-bar' }, { l: 'Top bar', v: 'top-bar' }, { l: 'Full border', v: 'full-border' }, { l: 'None', v: 'none' }]
const ORIENTATION_OPTIONS = [{ l: '📄 Portrait', v: 'portrait' }, { l: '🖼 Landscape', v: 'landscape' }]
const SPACING_OPTIONS = [{ l: 'Compact', v: 'compact' }, { l: 'Normal', v: 'normal' }, { l: 'Spacious', v: 'spacious' }]
const BLOCK_BG_COLORS = ['#ffffff', '#fafafa', '#f5f5f5', '#eef2f7', '#fdf6ec', '#fffde7']

const COLOR_NAMES: Record<string, string> = {
  '#111111': 'Near Black',
  '#1a2749': 'Dark Navy',
  '#145a32': 'Dark Green',
  '#4a235a': 'Dark Purple',
  '#555555': 'Gray',
  '#7b241c': 'Dark Red',
  '#ffffff': 'White',
  '#fafafa': 'Off White',
  '#f5f5f5': 'Light Gray',
  '#eef2f7': 'Cool Gray',
  '#fdf6ec': 'Cream',
  '#fffde7': 'Soft Yellow',
}

// ── Topic-based emoji suggestions (objects only, no faces) ────────────────────

const TOPIC_EMOJIS: Record<string, string[]> = {
  'Acceptance of Deeds': ['🕌', '📿', '✨', '⭐', '🌟'],
  'Submission & Repentance': ['🕋', '💧', '🌙', '📿', '🌊'],
  'Goodness in Both Worlds': ['⭐', '🌿', '⚖️', '🌟', '💎'],
  'Patience & Victory': ['🏔️', '🛡️', '⚔️', '🌊', '⭐'],
  'Steadfastness in Faith': ['🏔️', '⭐', '🌱', '📿', '💎'],
  'Day of Judgment': ['⚖️', '🌅', '📜', '🌟', '⭐'],
  'Forgiveness': ['🌸', '💧', '🕊️', '🌿', '✨'],
  'Forgiveness & Victory': ['🕊️', '⚔️', '🛡️', '🌸', '✨'],
  'Reflection & Protection': ['🌙', '⭐', '🏔️', '💎', '🌊'],
  'Fear of Hellfire': ['🛡️', '🔥', '💎', '🌊', '⭐'],
  'Forgiveness & Righteous Death': ['🕊️', '🌸', '📿', '🌿', '💧'],
  'Fulfillment of Promise': ['📜', '⭐', '🌟', '💎', '🏆'],
  'Repentance & Mercy': ['💧', '🌿', '🕌', '🌱', '🌸'],
  'Justice & Truth': ['⚖️', '⚔️', '📜', '🌟', '💎'],
  'Protection from Oppressors': ['🛡️', '⚔️', '🏔️', '⭐', '💪'],
  "Allah's Knowledge": ['📖', '⭐', '🌟', '🔭', '💡'],
  'Prayer & Acceptance of Dua': ['🕌', '📿', '🌙', '⭐', '✨'],
  'Forgiveness for Parents & Believers': ['🌸', '💧', '🌿', '📿', '🕊️'],
  'Truthful Entry & Exit': ['🚪', '🌟', '⭐', '📜', '✨'],
  'Mercy & Guidance': ['🌿', '💧', '🕊️', '⭐', '🌱'],
  'Increase in Knowledge': ['📖', '🌟', '💡', '⭐', '📚'],
  'Protection from Shaytan': ['🛡️', '🔒', '🏔️', '⭐', '💎'],
  'Faith & Mercy': ['🌸', '💧', '🌿', '📿', '🕊️'],
  'Protection from Hellfire': ['🛡️', '🔥', '🌊', '💎', '⭐'],
  'Righteous Family': ['🌿', '🌸', '🌱', '⭐', '💎'],
  'Wisdom & Righteousness': ['📖', '⭐', '💡', '🌟', '⚖️'],
  'Gratitude & Righteousness': ['🌿', '🌸', '⭐', '💫', '✨'],
  'Seeking Forgiveness': ['💧', '🌿', '🕊️', '🌸', '📿'],
  'Help Against Corruptors': ['🛡️', '⚔️', '🏔️', '⭐', '💪'],
  'Mercy & Forgiveness': ['🌿', '💧', '🕊️', '🌸', '✨'],
  'Entry into Paradise': ['🌟', '⭐', '🌿', '💎', '🚪'],
  'Protection from Sin': ['🛡️', '🔒', '📿', '⭐', '💎'],
  'Gratitude & Righteous Offspring': ['🌿', '🌸', '🌱', '⭐', '💎'],
  'Forgiveness for All Believers': ['💧', '🌸', '🕊️', '🌿', '✨'],
  'Trust in Allah': ['🏔️', '⭐', '🌟', '📿', '💎'],
  'Protection from Fitnah': ['🛡️', '🔒', '🏔️', '⭐', '⚔️'],
  'Light & Forgiveness': ['✨', '💡', '🌟', '🕊️', '⭐'],
  'Ease & Forgiveness': ['💧', '🌸', '🌿', '✨', '🕊️'],
  'Pardon & Victory': ['⚔️', '🛡️', '🕊️', '🌟', '✨'],
  'Righteous Children': ['🌱', '🌸', '🌿', '⭐', '💎'],
}

function getTopicEmojis(topics: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  topics.forEach(topic => {
    const emojis = TOPIC_EMOJIS[topic] ?? ['✨', '⭐', '🌿']
    emojis.forEach(e => { if (!seen.has(e)) { seen.add(e); result.push(e) } })
  })
  return result
}

// ── Chip component ────────────────────────────────────────────────────────────

function Chips<T extends string | number>({
  items, selected, onSelect,
}: {
  items: { l: string; v: T }[]
  selected: T
  onSelect: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <button
          key={String(item.v)}
          onClick={() => onSelect(item.v)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selected === item.v
              ? 'bg-green border-green text-white'
              : 'border-gray-300 text-gray-600 hover:border-green'
            }`}
        >
          {item.l}
        </button>
      ))}
    </div>
  )
}

// ── Color dots ────────────────────────────────────────────────────────────────

function ColorDots({ colors, selected, onSelect }: { colors: string[]; selected: string; onSelect: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {colors.map(c => {
        const name = COLOR_NAMES[c] ?? c
        const isSelected = selected === c
        return (
          <button
            key={c}
            onClick={() => onSelect(c)}
            role="radio"
            aria-checked={isSelected}
            aria-label={isSelected ? `${name} (selected)` : name}
            title={name}
            style={{ backgroundColor: c }}
            className={`w-6 h-6 rounded-full border transition-transform ${isSelected ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-gray-200' : 'border-gray-200 hover:scale-110'}`}
          />
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PrintDesignerPage() {
  const { printCollection, addToPrint, removeFromPrint, updatePrintItem, clearPrintCollection, language, setLanguage, design, setDesign, resetDesign } = useApp()
  const { duas } = useQuranContent()

  const [tab, setTab] = useState<'design' | 'preview'>('preview')
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const {
    showBismillah,
    orientation, blockSpacing, blockBg,
    fontSize, fontFamily, fontWeight,
    accent, arabicColor, translitColor, translationColor,
    borderStyle, borderWidth, borderRadius, borderColor, blockAccent,
    contentAlignH, contentAlignV,
    emojiOverlays,
  } = design

  const isLandscape = orientation === 'landscape'
  const pageW = isLandscape ? 1000 : 700
  const pageH = isLandscape ? 707 : 990

  // ── Emoji drag state (ephemeral — no need to persist) ─────────────────────
  const [isDragging, setIsDragging] = useState(false)
  const draggingRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const emojiAreaRef = useRef<HTMLDivElement>(null)

  // ── Scale-to-fit preview — canvas is always exactly pageW × pageH ────────────
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(1)
  const previewScaleRef = useRef(1)
  const [contentH, setContentH] = useState(pageH)

  useEffect(() => { previewScaleRef.current = previewScale }, [previewScale])

  useEffect(() => { setContentH(pageH) }, [pageH])

  useEffect(() => {
    const el = previewContainerRef.current
    if (!el) return
    const compute = () => {
      const availW = el.clientWidth
      if (availW > 0) setPreviewScale(Math.min(availW / pageW, 1))
    }
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    compute()
    return () => ro.disconnect()
  }, [pageW])

  function addEmoji(emoji: string) {
    // Pixel coords in the fixed pageW × pageH canvas (single source of truth)
    const item: EmojiOverlay = {
      id: `${emoji}-${Date.now()}`,
      emoji,
      x: Math.round(pageW * (0.4 + Math.random() * 0.2)),
      y: Math.round(pageH * (0.4 + Math.random() * 0.2)),
    }
    setDesign({ emojiOverlays: [...emojiOverlays, item] })
  }

  function startDrag(clientX: number, clientY: number, id: string) {
    const o = emojiOverlays.find(o => o.id === id)
    if (!o) return
    draggingRef.current = { id, startX: clientX, startY: clientY, origX: o.x, origY: o.y }
    setIsDragging(true)
  }

  function onEmojiMouseDown(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    startDrag(e.clientX, e.clientY, id)
  }

  function onEmojiTouchStart(e: React.TouchEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    const touch = e.touches[0]
    startDrag(touch.clientX, touch.clientY, id)
  }

  // Document-level drag — works for both mouse and touch
  useEffect(() => {
    if (!isDragging) return

    const move = (clientX: number, clientY: number) => {
      if (!draggingRef.current) return
      const scale = previewScaleRef.current
      const dx = (clientX - draggingRef.current.startX) / scale
      const dy = (clientY - draggingRef.current.startY) / scale
      const nx = Math.max(0, Math.min(pageW - EMOJI_SIZE, draggingRef.current.origX + dx))
      const ny = Math.max(0, Math.min(pageH - EMOJI_SIZE, draggingRef.current.origY + dy))
      const id = draggingRef.current.id
      // useApp.getState() reads current overlays directly — no stale closure
      setDesign({
        emojiOverlays: useApp.getState().design.emojiOverlays.map(o =>
          o.id === id ? { ...o, x: nx, y: ny } : o
        )
      })
    }

    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY) }
    const onUp = () => { draggingRef.current = null; setIsDragging(false) }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onUp)
    }
  }, [isDragging])

  // ── Share ──────────────────────────────────────────────────────────────────

  const [showSharePanel, setShowSharePanel] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const hostedUrlRef = useRef<{ imageUrl: string; viewerUrl: string } | null>(null)

  // Invalidate cached hosted URL whenever the design changes (set after printHtml useMemo below)

  async function captureAsBlob(): Promise<Blob> {
    const h2c = (await import('html2canvas')).default
    // Hidden iframe gives printHtml the same document context as the print window —
    // body selectors, @font-face and @media rules all apply correctly.
    const iframe = document.createElement('iframe')
    iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${pageW}px;height:${pageH}px;border:none;visibility:hidden;`
    document.body.appendChild(iframe)
    return new Promise<Blob>((resolve, reject) => {
      iframe.onload = async () => {
        try {
          const doc = iframe.contentDocument!
          // Wait for fonts to finish loading so layout matches the preview
          await doc.fonts?.ready
          const canvas = await h2c(doc.body, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#fff',
            width: pageW,
            height: pageH,
          })
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png', 1)
        } catch (e) {
          reject(e)
        } finally {
          document.body.removeChild(iframe)
        }
      }
      iframe.srcdoc = printHtml
    })
  }

  const handleShareImage = async (platform: SharePlatform) => {
    if (printCollection.length === 0) { setShareError('Add some duas first.'); return }
    // Open popup synchronously before any await — mobile browsers block window.open() after async gaps
    const popup = (platform === 'twitter' || platform === 'pinterest') ? window.open('', '_blank') : null
    setImageLoading(true)
    setShareError(null)
    try {
      if (platform === 'twitter' || platform === 'pinterest') {
        if (!hostedUrlRef.current) {
          hostedUrlRef.current = await uploadToImgbb(await captureAsBlob())
        }
        const { imageUrl, viewerUrl } = hostedUrlRef.current
        if (platform === 'twitter') openTwitterShare('Beautiful Quranic Supplication 🤲\n\n', viewerUrl, popup)
        else openPinterestShare(imageUrl, 'DuaFlow — Quranic Supplication', popup)
      } else {
        const blob = await captureAsBlob()
        const file = new File([blob], 'rabbana-dua.png', { type: 'image/png' })
        if (platform === 'share' && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'DuaFlow', text: 'Beautiful Quranic Supplication 🤲' })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url; a.download = 'rabbana-dua.png'; a.click()
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        }
      }
    } catch { setShareError('Failed to capture or upload image') }
    finally { setImageLoading(false) }
  }

  // ── HTML builder ───────────────────────────────────────────────────────────

  const buildHtml = (withFonts: boolean, withEmojis = false) => {
    const spacingGap = blockSpacing === 'compact' ? 12 : blockSpacing === 'spacious' ? 32 : 20
    const spacingPad = blockSpacing === 'compact' ? '10px 14px' : blockSpacing === 'spacious' ? '20px 24px 20px 28px' : '14px 18px 14px 22px'

    const blockCSS = (() => {
      if (borderStyle === 'none' || blockAccent === 'none') return ''
      const b = `${borderWidth}px ${borderStyle} ${borderColor}`
      if (blockAccent === 'left-bar') return `border-left: ${b};`
      if (blockAccent === 'top-bar') return `border-top: ${b};`
      if (blockAccent === 'full-border') return `border: ${b};`
      return ''
    })()

    const blockPad = blockAccent === 'full-border' ? '16px' : spacingPad

    const items = printCollection.map((item) => {
      const { dua } = item
      const trans = language === 'en' ? dua.translations.en : language === 'ur' ? dua.translations.ur : dua.translations.bn
      const parts: string[] = []
      if (item.includeReference) parts.push(`<div class="ref">Surah ${dua.surah}:${dua.ayah} — ${dua.topic}</div>`)
      if (item.includeArabic) parts.push(`<div class="arabic" dir="rtl">${dua.arabicText}</div>`)
      if (item.includeTransliteration) parts.push(`<div class="translit">${dua.transliteration}</div>`)
      if (item.includeTranslation) parts.push(`<div class="trans">${trans}</div>`)
      return `<div class="block">${parts.join('')}</div>`
    }).join('')

    const bodyItems = printCollection.length === 0
      ? `<p style="color:#999;text-align:center;padding:40px 0">Add duas from the list to see them here.</p>`
      : items

    // Emojis use pixel coords in the fixed pageW × pageH canvas — same coordinate space
    // as the preview overlay, so positions are identical between preview and print.
    const emojiLayerHtml = withEmojis && emojiOverlays.length > 0
      ? `<div style="position:absolute;inset:0;pointer-events:none;z-index:100;">${
          emojiOverlays.map(({ emoji, x, y }) =>
            `<span style="position:absolute;left:${Math.round(x)}px;top:${Math.round(y)}px;font-size:${EMOJI_SIZE}px;line-height:1;">${emoji}</span>`
          ).join('')
        }</div>`
      : ''

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title></title>
<base href="${window.location.origin}/">
<meta name="viewport" content="width=${pageW}, initial-scale=1"/>
<style>
${withFonts ? `@font-face{font-family:'Amiri';font-style:normal;font-weight:400;font-display:swap;src:url(/fonts/amiri-400-arabic.woff2) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFC}
@font-face{font-family:'Amiri';font-style:normal;font-weight:400;font-display:swap;src:url(/fonts/amiri-400-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+FEFF,U+FFFD}
@font-face{font-family:'Amiri';font-style:normal;font-weight:700;font-display:swap;src:url(/fonts/amiri-700-arabic.woff2) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFC}
@font-face{font-family:'Amiri';font-style:normal;font-weight:700;font-display:swap;src:url(/fonts/amiri-700-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+FEFF,U+FFFD}
@font-face{font-family:'Amiri';font-style:italic;font-weight:400;font-display:swap;src:url(/fonts/amiri-400i-arabic.woff2) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFC}
@font-face{font-family:'Amiri';font-style:italic;font-weight:400;font-display:swap;src:url(/fonts/amiri-400i-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+FEFF,U+FFFD}
@font-face{font-family:'Amiri';font-style:italic;font-weight:700;font-display:swap;src:url(/fonts/amiri-700i-arabic.woff2) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFC}
@font-face{font-family:'Amiri';font-style:italic;font-weight:700;font-display:swap;src:url(/fonts/amiri-700i-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+FEFF,U+FFFD}\n` : ''}
@page{size:${pageW}px ${pageH}px;margin:0}
*{margin:0;padding:0;box-sizing:border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact}
@media screen{html{min-height:100vh;background:#fff;display:flex;justify-content:center;padding:0;box-sizing:border-box}body{width:${pageW}px;min-height:${pageH}px;overflow:visible;flex-shrink:0;align-self:flex-start}}
@media print{html,body{width:100%;height:100%;overflow:visible;background:#fff;box-shadow:none}}
body{font-family:${fontFamily};background:#fff;color:${translationColor};font-size:${fontSize}px;font-weight:${fontWeight};position:relative;display:flex;align-items:${{ top: 'flex-start', center: 'center', bottom: 'flex-end' }[contentAlignV]};justify-content:${{ left: 'flex-start', center: 'center', right: 'flex-end' }[contentAlignH]};padding:36px;box-sizing:border-box}
.page{width:${pageW}px;padding:36px}
.bismillah{text-align:center;font-size:${fontSize + 6}px;color:${accent.v};margin-bottom:24px;direction:rtl;font-family:'Amiri',serif}
.block{${blockCSS}padding:${blockPad};margin-bottom:${spacingGap}px;background:${blockBg};border-radius:${borderRadius}px;page-break-inside:avoid}
.ref{font-size:${fontSize - 4}px;color:${accent.v};font-weight:bold;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px}
.arabic{font-family:'Amiri',Georgia,serif;font-size:${fontSize + 8}px;line-height:2;color:${arabicColor};margin-bottom:8px;text-align:right;font-weight:${fontWeight}}
.translit{font-size:${fontSize - 2}px;color:${translitColor};font-style:italic;font-weight:${fontWeight};margin-bottom:6px}
.trans{font-size:${fontSize}px;color:${translationColor};line-height:1.8;font-weight:${fontWeight}}
</style></head><body>
${emojiLayerHtml}
<div class="page">
${showBismillah ? `<div class="bismillah">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>` : ''}
${bodyItems}
</div></body></html>`
  }

  const designDeps = [printCollection, language, showBismillah, fontSize, fontFamily, fontWeight, accent, arabicColor, translitColor, translationColor, borderStyle, borderWidth, borderColor, borderRadius, blockAccent, contentAlignH, contentAlignV, orientation, blockSpacing, blockBg]
  const printDeps = [...designDeps, emojiOverlays]


  // Preview loads the same Amiri font as print so Arabic layout is identical.
  // Emojis are excluded — the overlay spans in the designer handle them visually.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const previewHtml = useMemo(() => buildHtml(true, false), designDeps)
  // Print / export HTML bakes emojis in at their final positions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const printHtml = useMemo(() => buildHtml(true, true), printDeps)

  // Invalidate cached hosted URL whenever the design changes
  useEffect(() => { hostedUrlRef.current = null }, [printHtml])

  const handlePrint = () => {
    if (printCollection.length === 0) return
    const win = window.open('', '_blank')
    if (win) { win.document.write(printHtml); win.document.close(); setTimeout(() => { win.focus(); win.print() }, 400) }
  }

  const searchTerm = sanitizeSearchInput(search);
  const printedIds = new Set(printCollection.map(p => p.dua.id));

  const filteredDuas = duas.filter(d => {
    if (printedIds.has(d.id)) return false;

    const { topic, translation, arabic } = sanitizeDuaFields(d);

    return (
      topic.includes(searchTerm) ||
      translation.includes(searchTerm) ||
      (search && arabic.includes(search))
    );
  });

  // ── Helpers (stable references, not inner components) ─────────────────────

  const sectionTitle = (title: string) => (
    <p className="text-xs font-extrabold text-green uppercase tracking-wider mb-3">{title}</p>
  )
  const subTitle = (title: string) => (
    <p className="text-xs text-gray-400 font-semibold mt-3 mb-1.5">{title}</p>
  )

  const isDefaultDesign = JSON.stringify({ ...design, emojiOverlays: [] }) === JSON.stringify({ ...DEFAULT_DESIGN, emojiOverlays: [] })

  const settingsJsx = (
    <div className="overflow-y-auto h-full p-3 space-y-3">

      {/* Document */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        {sectionTitle("Document")}
        <label className="flex items-center justify-between py-2 border-t border-gray-100">
          <span className="text-sm text-gray-700">Bismillah header</span>
          <input type="checkbox" checked={showBismillah} onChange={e => setDesign({ showBismillah: e.target.checked })} className="accent-green w-4 h-4" />
        </label>
      </div>

      {/* Layout */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        {sectionTitle("Layout")}
        {subTitle("Orientation")}
        <Chips items={ORIENTATION_OPTIONS} selected={orientation} onSelect={v => setDesign({ orientation: v as 'portrait' | 'landscape' })} />
        {subTitle("Block spacing")}
        <Chips items={SPACING_OPTIONS} selected={blockSpacing} onSelect={v => setDesign({ blockSpacing: v as string })} />
        {subTitle("Vertical align")}
        <Chips
          items={[{ l: '↑', v: 'top' }, { l: '↕', v: 'center' }, { l: '↓', v: 'bottom' }]}
          selected={contentAlignV}
          onSelect={v => setDesign({ contentAlignV: v as 'top' | 'center' | 'bottom' })}
        />
        {subTitle("Block background")}
        <ColorDots colors={BLOCK_BG_COLORS} selected={blockBg} onSelect={v => setDesign({ blockBg: v })} />
      </div>

      {/* Accent */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        {sectionTitle("Accent Colour")}
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map(a => (
            <button
              key={a.v}
              onClick={() => setDesign({ accent: a, borderColor: a.v })}
              style={{ backgroundColor: a.v }}
              className={`px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-transform ${accent.v === a.v ? 'scale-110 ring-2 ring-white ring-offset-1' : 'opacity-70'}`}
            >
              {a.l}
            </button>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        {sectionTitle("Typography")}
        {subTitle("Font Family")}
        <Chips items={FONT_FAMILIES.map(f => ({ l: f.l, v: f.v }))} selected={fontFamily} onSelect={v => setDesign({ fontFamily: v as string })} />
        {subTitle("Size")}
        <Chips items={FONT_SIZES.map(f => ({ l: f.l, v: f.v }))} selected={fontSize} onSelect={v => setDesign({ fontSize: v as number })} />
        {subTitle("Weight")}
        <Chips items={FONT_WEIGHTS.map(f => ({ l: f.l, v: f.v }))} selected={fontWeight} onSelect={v => setDesign({ fontWeight: v as string })} />
        {subTitle("Arabic colour")}
        <ColorDots colors={TEXT_COLORS} selected={arabicColor} onSelect={v => setDesign({ arabicColor: v })} />
        {subTitle("Transliteration colour")}
        <ColorDots colors={TEXT_COLORS} selected={translitColor} onSelect={v => setDesign({ translitColor: v })} />
        {subTitle("Translation colour")}
        <ColorDots colors={TEXT_COLORS} selected={translationColor} onSelect={v => setDesign({ translationColor: v })} />
      </div>

      {/* Border */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        {sectionTitle("Border & Frame")}
        {subTitle("Block accent")}
        <Chips items={BLOCK_ACCENTS} selected={blockAccent} onSelect={v => setDesign({ blockAccent: v as string })} />
        {subTitle("Border Style")}
        <Chips items={BORDER_STYLES} selected={borderStyle} onSelect={v => setDesign({ borderStyle: v as string })} />
        {subTitle("Border width")}
        <Chips items={BORDER_WIDTHS.map(b => ({ l: b.l, v: b.v }))} selected={borderWidth} onSelect={v => setDesign({ borderWidth: v as number })} />
        {subTitle("Border Corner Radius")}
        <Chips items={BORDER_RADII.map(b => ({ l: b.l, v: b.v }))} selected={borderRadius} onSelect={v => setDesign({ borderRadius: v as number })} />
        {subTitle("Border colour")}
        <ColorDots colors={ACCENT_COLORS.map(a => a.v)} selected={borderColor} onSelect={v => setDesign({ borderColor: v })} />
      </div>

      {/* Translation language */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        {sectionTitle("Translation")}
        <Chips
          items={(['en', 'ur', 'bn'] as Language[]).map(l => ({ l: LANG_LABELS[l], v: l }))}
          selected={language}
          onSelect={v => setLanguage(v as Language)}
        />
      </div>

      {/* Emoji picker */}
      {printCollection.length > 0 && (
        <div className="bg-white rounded-xl p-3 shadow-sm">
          {sectionTitle("Emojis")}
          <p className="text-xs text-gray-400 mb-3">Tap to add · Drag on preview (touch &amp; mouse) · Double-click to remove</p>
          <div className="flex flex-wrap gap-2">
            {getTopicEmojis(printCollection.map(i => i.dua.topic)).map(emoji => {
              const isActive = emojiOverlays.some(o => o.emoji === emoji)
              return (
                <button
                  key={emoji}
                  onClick={() => addEmoji(emoji)}
                  className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center hover:scale-110 transition-all active:scale-95 ${isActive
                      ? 'bg-gold/20 ring-2 ring-gold'
                      : 'hover:bg-gray-100'
                    }`}
                >
                  {emoji}
                </button>
              )
            })}
          </div>
          {emojiOverlays.length > 0 && (
            <button
              onClick={() => setDesign({ emojiOverlays: [] })}
              className="mt-3 text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-200 px-3 py-1 rounded-full transition-colors"
            >
              Remove all emojis
            </button>
          )}
        </div>
      )}

      {/* Duas list */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-extrabold text-green uppercase tracking-wider">
            Duas ({printCollection.length}/{2})
          </p>
          <div className="flex gap-2">
            {printCollection.length > 0 && (
              <button
                onClick={() => setConfirmModal({ title: 'Clear all duas?', message: 'This will remove all duas from your print collection.', onConfirm: clearPrintCollection })}
                className="text-xs text-green border border-green-200 px-2 py-1 rounded-full hover:bg-red-50"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setShowSearch(!showSearch)}
              disabled={printCollection.length >= (2)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                printCollection.length >= (2)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green text-white hover:bg-green-light'
              }`}
            >
              + Add
            </button>
          </div>
        </div>
        {printCollection.length >= (2) && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
            Page limit reached. Remove a dua to add another.
          </p>
        )}

        {showSearch && (
          <div className="mb-3">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search duas…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green mb-2"
            />
            {filteredDuas.slice(0, 6).map(dua => (
              <button
                key={dua.id}
                onClick={() => { if (printCollection.length < MAX_PRINT_DUAS) { addToPrint(dua); setSearch(''); setShowSearch(false) } }}
                className="w-full flex items-center gap-2 py-2 border-b border-gray-100 hover:bg-gray-50 text-left"
              >
                <span
                  className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                  style={{ backgroundColor: accent.v }}
                >
                  🤲
                </span>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-green truncate">{dua.topic}</p>
                  <p className="text-sm text-gray-600 truncate arabic">{dua.arabicText}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {printCollection.length === 0 ? (
          <p className="text-center text-gray-400 text-xs py-4">No duas added — tap "+ Add" above</p>
        ) : (
          <div className="space-y-2">
            {printCollection.map(item => (
              <div key={item.dua.id} className="border border-gray-200 rounded-lg p-2">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                    style={{ backgroundColor: accent.v }}
                  >
                    🤲
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-green truncate">{item.dua.topic}</p>
                    <p className="text-[10px] text-gray-400">Surah {item.dua.surah}:{item.dua.ayah}</p>
                  </div>
                  <button onClick={() => removeFromPrint(item.dua.id)} className="text-red-400 font-bold text-sm hover:text-red-600">✕</button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {([
                    { key: 'includeArabic', label: 'Arabic' },
                    { key: 'includeTransliteration', label: 'Translit' },
                    { key: 'includeTranslation', label: 'Trans' },
                    { key: 'includeReference', label: 'Ref' },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => updatePrintItem(item.dua.id, { [key]: !item[key] })}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${item[key]
                          ? 'bg-green border-green text-white'
                          : 'border-gray-300 text-gray-500'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset styles */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <button
          disabled={isDefaultDesign}
          onClick={() => setConfirmModal({ title: 'Reset styles?', message: 'All design settings will return to their defaults. Your duas will not be affected.', onConfirm: resetDesign })}
          className={`w-full py-2 rounded-lg text-xs font-semibold border transition-colors ${
            isDefaultDesign
              ? 'text-gray-300 border-gray-100 cursor-not-allowed'
              : 'text-green-dark border-green/30 hover:bg-green/5'
          }`}
        >
          Reset styles to default
        </button>
      </div>

      <div className="h-4" />
    </div>
  )

  // Canvas is always exactly pageW × pageH — the single source of truth for emoji coords
  const scaledW = Math.round(pageW * previewScale)
  const scaledH = Math.round(contentH * previewScale)

  const previewJsx = (
    <div className="flex flex-col h-full">
      {/* Preview toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white shrink-0">
        <p className="text-green text-xs font-bold uppercase tracking-wider">Live Preview</p>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{isLandscape ? 'A4 Landscape' : 'A4 Portrait'}</span>
          {previewScale < 0.99 && <span>{Math.round(previewScale * 100)}%</span>}
{emojiOverlays.length > 0 && (
            <span>{emojiOverlays.length} emoji{emojiOverlays.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Overflow warning — only shown when content spills past the page boundary */}
      {contentH > pageH && (
        <div className="mx-3 mb-1 shrink-0 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700">
          Overflow content will be cut off when printing or exporting — reduce font size or spacing to fit.
        </div>
      )}

      {/* Canvas area — fills the pane, no grey surround, vertical scroll only */}
      <div
        ref={previewContainerRef}
        className="flex-1 flex items-start justify-center"
        style={{ overflowY: 'auto', overflowX: 'hidden', background: '#fff', WebkitOverflowScrolling: 'touch' }}
      >
        <div style={{ width: scaledW, height: scaledH, position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
          {/* Inner canvas: full unscaled pageW × pageH, scaled uniformly.
              Emoji overlay shares this coordinate space exactly with the print HTML. */}
          <div
            style={{
              width: pageW,
              height: contentH,
              position: 'relative',
              transformOrigin: 'top left',
              transform: `scale(${previewScale})`,
            }}
          >
            <iframe
              srcDoc={previewHtml}
              title="Print Preview"
              onLoad={e => {
                const body = (e.currentTarget as HTMLIFrameElement).contentDocument?.body
                if (!body) return
                const measured = body.scrollHeight
                setContentH(measured > pageH + 10 ? measured : pageH)
              }}
              style={{
                width: pageW,
                height: contentH,
                border: 'none',
                display: 'block',
                position: 'absolute',
                inset: 0,
                pointerEvents: isDragging ? 'none' : 'auto',
              }}
            />
            {/* Emoji drag layer — pixel coords match print HTML exactly */}
            <div ref={emojiAreaRef} style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
              {emojiOverlays.map(item => (
                <span
                  key={item.id}
                  title="Drag to move · Double-click to remove"
                  style={{
                    position: 'absolute',
                    left: `${item.x}px`,
                    top: `${item.y}px`,
                    fontSize: `${EMOJI_SIZE}px`,
                    lineHeight: 1,
                    cursor: isDragging && draggingRef.current?.id === item.id ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
                  }}
                  onMouseDown={e => onEmojiMouseDown(e, item.id)}
                  onTouchStart={e => onEmojiTouchStart(e, item.id)}
                  onDoubleClick={() => setDesign({ emojiOverlays: emojiOverlays.filter(o => o.id !== item.id) })}
                >
                  {item.emoji}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* Header */}
      <header className="bg-green flex items-center px-4 py-3 shrink-0">
        <HomeButton />
        <h1 className="flex-1 text-white font-bold text-lg text-center">Print Designer</h1>
        <button
          onClick={handlePrint}
          className="bg-gold hover:bg-gold-dark text-white font-bold text-sm px-4 py-1.5 rounded-full"
        >
          🖨 Print
        </button>
      </header>

      {/* Mobile tab bar */}
      <div className="flex lg:hidden bg-green shrink-0">
        {(['preview', 'design'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === t ? 'border-gold text-white' : 'border-transparent text-green-muted'
              }`}
          >
            {t === 'preview' ? '👁 Preview' : '✏️ Design'}
          </button>
        ))}
      </div>

      {/* Body — single layout, responsive via Tailwind classes to avoid duplicate DOM nodes */}
      <div className="flex-1 overflow-hidden flex">
        <div className={`border-r border-gray-200 bg-[#f7f9fc] overflow-hidden flex-col lg:flex lg:w-80 ${tab === 'design' ? 'flex w-full' : 'hidden'}`}>
          {settingsJsx}
        </div>
        <div className={`overflow-hidden flex-col flex-1 lg:flex ${tab === 'preview' ? 'flex' : 'hidden'}`}>
          {previewJsx}
        </div>
      </div>

      {/* Share panel */}
      {showSharePanel && (
        <div className="bg-white border-t border-gray-100 shrink-0">
          <SharePanel
            onClose={() => { setShowSharePanel(false); setShareError(null) }}
            error={shareError}
            onShareImage={handleShareImage}
            imageLoading={imageLoading}
            hideVideo
          />
        </div>
      )}

      {/* Action bar */}
      <div className="fixed right-3 md:right-4 bottom-[12rem] md:-translate-y-1/2 flex flex-col items-center gap-2 bg-white border border-gray-200 shadow-md rounded-full px-2 py-2 z-50">

        {/* Print */}
        <button
          onClick={handlePrint}
          aria-label="Print"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
          title="Print"
        >
          🖨
        </button>

        {/* PDF */}
        <button
          onClick={() => {
            if (printCollection.length === 0) return;
            const win = window.open('', '_blank');
            if (win) {
              win.document.write(printHtml);
              win.document.close();
              setTimeout(() => {
                win.focus();
                win.print();
              }, 500);
            }
          }}
          aria-label="Save as PDF"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
          title="PDF"
        >
          ⬇
        </button>

        {/* Share */}
        <button
          onClick={() => {
            setShowSharePanel(p => !p);
            setShareError(null);
          }}
          aria-label="Share design"
          aria-expanded={showSharePanel}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition ${showSharePanel ? 'bg-green text-white' : 'hover:bg-gray-100'}`}
          title="Share"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>

      </div>

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel="Yes, proceed"
          onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(null) }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
}
