export type DecodedAudio = {
  channelData: Float32Array[]
  sampleRate: number
  numberOfChannels: number
  audioDuration: number
}

export async function decodeAudio(audioUrl: string): Promise<DecodedAudio> {
  const audioArrayBuffer = await fetch(audioUrl).then(r => r.arrayBuffer())
  const audioCtx = new AudioContext()
  const audioBuffer = await audioCtx.decodeAudioData(audioArrayBuffer)
  await audioCtx.close()
  return {
    channelData: Array.from({ length: audioBuffer.numberOfChannels }, (_, c) =>
      audioBuffer.getChannelData(c).slice()
    ),
    sampleRate: audioBuffer.sampleRate,
    numberOfChannels: audioBuffer.numberOfChannels,
    audioDuration: audioBuffer.duration,
  }
}
