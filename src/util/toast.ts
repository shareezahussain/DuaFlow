type Listener = (msg: string) => void

let _listener: Listener | null = null

export function toast(msg: string) {
  _listener?.(msg)
}

export function _setToastListener(fn: Listener | null) {
  _listener = fn
}
