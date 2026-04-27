import type { VideoWorkerInput } from '../workers/videoEncoder.worker'

type Callbacks = {
  workerRef: React.MutableRefObject<Worker | null>
  onDone: (buffer: ArrayBuffer) => void
  onError: (message: string) => void
  onProgress: (stage: string) => void
}

export function spawnVideoWorker(payload: VideoWorkerInput, transferables: Transferable[], cb: Callbacks) {
  let worker: Worker
  try {
    worker = new Worker(
      new URL('../workers/videoEncoder.worker.ts', import.meta.url),
      { type: 'module' },
    )
  } catch (err) {
    cb.onError(`Could not start video worker: ${(err as Error).message}`)
    return
  }
  cb.workerRef.current = worker

  worker.postMessage(payload, transferables)

  worker.onmessage = (e) => {
    const msg = e.data
    if (msg.type === 'done') {
      cb.onDone(msg.buffer)
      worker.terminate()
    } else if (msg.type === 'error') {
      console.error('Video worker error', msg.message)
      cb.onError(msg.message)
      worker.terminate()
    } else if (msg.type === 'progress') {
      cb.onProgress(msg.stage)
    }
  }

  worker.onerror = (e) => {
    cb.onError(`Worker error: ${e.message}`)
    worker.terminate()
  }
}
