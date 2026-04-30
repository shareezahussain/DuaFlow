export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
export const isMobileDevice = /Android|iPad|iPhone|iPod/i.test(navigator.userAgent)

// 9:16 portrait — more vertical space for long duas, correct format for mobile sharing platforms
export const VIDEO_W = isMobileDevice ? 480 : 1080
export const VIDEO_H = isMobileDevice ? 854 : 1920
// Keep for backwards compatibility where only one dimension was used
export const VIDEO_CANVAS_SIZE = VIDEO_W
