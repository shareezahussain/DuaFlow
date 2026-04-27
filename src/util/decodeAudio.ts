export type DecodedAudio = {
  channelData: Float32Array[]
  sampleRate: number
  numberOfChannels: number
  audioDuration: number
}

export async function decodeAudio(audioUrl: string): Promise<DecodedAudio> {
  let response: Response
  try {
    response = await fetch(audioUrl, { mode: 'cors' })
  } catch {
    throw new Error(
      'Could not fetch audio — check your network connection. ' +
      'If the problem persists the recitation server may not allow this request.'
    )
  }

  if (!response.ok) {
    throw new Error(`Audio file not found (HTTP ${response.status}). The recitation may not be available for this verse.`)
  }

  const arrayBuffer = await response.arrayBuffer()
  if (arrayBuffer.byteLength === 0) {
    throw new Error('Audio file is empty.')
  }

  let audioBuffer: AudioBuffer
  try {
    const audioCtx = new AudioContext()
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    await audioCtx.close()
  } catch {
    throw new Error('Audio file could not be decoded — the file may be corrupted.')
  }

  if (audioBuffer.duration <= 0 || audioBuffer.numberOfChannels === 0) {
    throw new Error('Audio file appears to contain no audio data.')
  }

  return {
    channelData: Array.from({ length: audioBuffer.numberOfChannels }, (_, c) =>
      audioBuffer.getChannelData(c).slice()
    ),
    sampleRate: audioBuffer.sampleRate,
    numberOfChannels: audioBuffer.numberOfChannels,
    audioDuration: audioBuffer.duration,
  }
}
