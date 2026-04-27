export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
export const isMobileDevice = /Android|iPad|iPhone|iPod/i.test(navigator.userAgent)
export const VIDEO_CANVAS_SIZE = isMobileDevice ? 480 : 1080
