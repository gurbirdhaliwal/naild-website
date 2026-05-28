const AUDIO_EXTENSION_BY_TYPE: Record<string, string> = {
  "audio/webm": "webm",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
}

export const getAudioUploadFilename = (audioBlob: Blob, basename: string) => {
  const contentType = audioBlob.type.split(';', 1)[0].trim().toLowerCase()
  const extension = AUDIO_EXTENSION_BY_TYPE[contentType] ?? 'webm'

  return `${basename}.${extension}`
}
