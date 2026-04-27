/**
 * SharePanel — shared between DuaDetailPage (listen view) and PrintDesignerPage (design view).
 *
 * Tabs:
 *   📸 Image  — PNG capture + platform share
 *   🎬 Sing-Along — MP4 karaoke video generation + share
 *
 * The parent controls positioning/container styling; this component renders the inner content only.
 * Pass `onClose` to show the "Share dua" title bar with a close button (used in design view).
 */

import { useState } from 'react'

export type SharePlatform = 'download' | 'share' | 'twitter' | 'pinterest'
export type VideoState    = 'idle' | 'recording' | 'done'

// ── Shared platform button definitions ────────────────────────────────────────

const PLATFORMS: Array<{
  key:   SharePlatform
  label: string
  bg:    string
  icon:  (size: 'sm' | 'lg') => React.ReactNode
}> = [
  {
    key:   'download',
    label: 'Download',
    bg:    'bg-gray-100 hover:bg-gray-200',
    icon:  () => (
      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-3.5-3.5M12 16l3.5-3.5" />
      </svg>
    ),
  },
  {
    key:   'twitter',
    label: 'X / Twitter',
    bg:    'bg-black hover:bg-gray-900',
    icon:  () => (
      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    key:   'pinterest',
    label: 'Pinterest',
    bg:    'bg-[#e60023] hover:bg-[#cc001f]',
    icon:  () => (
      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
      </svg>
    ),
  },
  {
    key:   'share',
    label: 'More',
    bg:    'bg-navy hover:bg-navy-dark',
    icon:  () => (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    ),
  },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface SharePanelProps {
  /** If provided, renders a "Share dua" title bar with a close button (design view). */
  onClose?: () => void
  /** Error message shown above the active tab content (e.g. imgBB upload failure). */
  error?: string | null
  /** Stage label forwarded from the video worker's progress messages. */
  encodeStage?: string
  /** True when the device is iOS — shows disclaimer and adjusts button label. */
  isIOS?: boolean

  // Image tab
  onShareImage: (platform: SharePlatform) => void
  imageLoading?: boolean

  // Sing-Along tab
  videoState: VideoState
  onGenerateVideo: () => void
  onShareVideo: (platform: SharePlatform) => void
  onResetVideo: () => void
  /** Optional slot rendered at the top of the Sing-Along tab (e.g. dua picker). */
  videoPicker?: React.ReactNode
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SharePanel({
  onClose,
  error,
  encodeStage = 'Encoding…',
  isIOS = false,
  onShareImage,
  imageLoading = false,
  videoState,
  onGenerateVideo,
  onShareVideo,
  onResetVideo,
  videoPicker,
}: SharePanelProps) {
  const [tab, setTab] = useState<'image' | 'video'>('image')

  return (
    <>
      {/* Optional title bar — shown in design view */}
      {onClose && (
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <p className="text-sm font-semibold text-gray-800">Share dua</p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors text-xs"
          >✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {(['image', 'video'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              tab === t
                ? 'text-navy border-b-2 border-navy'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t === 'image' ? '📸 Image' : '🎬 Video'}
          </button>
        ))}
      </div>

      <div className="px-5 py-4">
        {error && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        {/* ── Image tab ── */}
        {tab === 'image' && (
          <>
            <div className="flex items-start gap-5 justify-center">
              {PLATFORMS.map(({ key, label, bg, icon }) => (
                <button
                  key={key}
                  onClick={() => onShareImage(key)}
                  disabled={imageLoading}
                  className="flex flex-col items-center gap-2 group disabled:opacity-50"
                >
                  <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center shadow-sm transition-all group-hover:scale-105 group-hover:shadow-md`}>
                    {imageLoading
                      ? <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
                      : icon('lg')}
                  </div>
                  <span className="text-[11px] text-gray-500 font-medium group-hover:text-gray-800 transition-colors">{label}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-[10px] text-gray-300 mt-4">High-res PNG · 2× quality</p>
          </>
        )}

        {/* ── Sing-Along tab ── */}
        {tab === 'video' && (
          <>
            {videoPicker}

            {isIOS && videoState === 'idle' && (
              <div className="mb-3 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs text-amber-800 font-semibold mb-0.5">iOS limitation</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Your device will receive a <strong>static card + audio</strong> video — karaoke animation is not available on iOS Safari. For the full karaoke experience, open this page on a Mac or Android device.
                </p>
              </div>
            )}

            {videoState === 'idle' && (
              <button
                onClick={onGenerateVideo}
                className="w-full py-2.5 rounded-xl bg-navy hover:bg-navy-light text-white font-bold text-sm transition-colors"
              >
                {isIOS ? '🎬 Generate Video (Static)' : '🎬 Generate Video'}
              </button>
            )}

            {videoState === 'recording' && (
              <div className="flex flex-col items-center gap-2 py-3">
                <span className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500 font-medium">{encodeStage}</span>
                <span className="text-xs text-gray-400">May take longer on mobile</span>
              </div>
            )}

            {videoState === 'done' && (
              <>
                <div className="flex gap-4 justify-center mb-3">
                  {PLATFORMS.map(({ key, label, bg, icon }) => (
                    <button key={key} onClick={() => onShareVideo(key)} className="flex flex-col items-center gap-1.5 group">
                      <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center shadow-sm transition-all group-hover:scale-105`}>
                        {icon('lg')}
                      </div>
                      <span className="text-[11px] text-gray-500 font-medium">{label}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={onResetVideo}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 py-1"
                >
                  Generate new video
                </button>
              </>
            )}

            <p className="mt-3 text-center text-[10px] text-gray-300">
              Mobile: share sheet opens to save · Desktop: file downloads directly
            </p>
          </>
        )}
      </div>
    </>
  )
}
