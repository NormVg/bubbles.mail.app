import { ref } from 'vue'
import { useSettings } from './useSettings'

export function useDictation(onResult: (text: string) => void) {
  const isRecording = ref(false)
  const isTranscribing = ref(false)
  const audioLevel = ref(0)
  
  let mediaRecorder: MediaRecorder | null = null
  let audioChunks: Blob[] = []
  
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let animationFrameId: number | null = null

  const startVoiceDictation = async () => {
    if (isRecording.value) {
      stopVoiceDictation()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder = new MediaRecorder(stream)
      audioChunks = []

      // Setup audio analyzer for reactive UI
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateVolume = () => {
        if (!analyser) return
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const average = sum / dataArray.length
        // Normalize to 0-1 range (max is roughly 100 in normal speech, clamp at 128)
        audioLevel.value = Math.min(average / 64, 1.5)
        animationFrameId = requestAnimationFrame(updateVolume)
      }
      updateVolume()

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks)
        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1]
          const { settings } = useSettings()
          
          isTranscribing.value = true
          try {
            const res = await window.electronAPI.invokeApi('/api/ai/transcribe', {
              method: 'POST',
              body: { 
                audioBase64: base64data,
                apiKey: settings.value.sarvamApiKey 
              }
            })
            if (res && res.text) {
              onResult(res.text)
            }
          } catch (err) {
            console.error('Sarvam transcription failed:', err)
          } finally {
            isTranscribing.value = false
          }
        }
      }

      mediaRecorder.start()
      isRecording.value = true
    } catch (err) {
      console.error('Failed to start dictation:', err)
    }
  }

  const stopVoiceDictation = () => {
    if (mediaRecorder && isRecording.value) {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach(t => t.stop())
      isRecording.value = false
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
      if (audioContext) {
        audioContext.close()
        audioContext = null
      }
      audioLevel.value = 0
    }
  }

  return {
    isRecording,
    isTranscribing,
    audioLevel,
    startVoiceDictation,
    stopVoiceDictation
  }
}
