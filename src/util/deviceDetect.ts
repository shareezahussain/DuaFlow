export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
export const isMobileDevice = /Android|iPad|iPhone|iPod/i.test(navigator.userAgent)

// 9:16 portrait 720p on mobile, 1080p on desktop
export const VIDEO_W = isMobileDevice ? 720 : 1080
export const VIDEO_H = isMobileDevice ? 1280 : 1920
// Keep for backwards compatibility where only one dimension was used
export const VIDEO_CANVAS_SIZE = VIDEO_W
