export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
export const isMobileDevice = /Android|iPad|iPhone|iPod/i.test(navigator.userAgent)

// 9:16 portrait 1080p on all devices — hardware WebCodecs handles it fine,
// and text quality at 720p was unacceptably blurry due to H.264 compression
export const VIDEO_W = 1080
export const VIDEO_H = 1920
// Keep for backwards compatibility where only one dimension was used
export const VIDEO_CANVAS_SIZE = VIDEO_W
