import { ref } from 'vue'

export function useDictation(onResult: (text: string) => void) {
  const isRecording = ref(false)
  const dictationTimer = ref(0)
  let dictationInterval: ReturnType<typeof setInterval> | null = null

  const startVoiceDictation = () => {
    if (isRecording.value) {
      stopVoiceDictation()
      return
    }

    isRecording.value = true
    dictationTimer.value = 0

    dictationInterval = setInterval(() => {
      dictationTimer.value += 1
      if (dictationTimer.value >= 30) {
        stopVoiceDictation()
      }
    }, 100)
  }

  const stopVoiceDictation = () => {
    if (dictationInterval) {
      clearInterval(dictationInterval)
      dictationInterval = null
    }
    isRecording.value = false
    
    // Simulate dictation result
    onResult("Show my highest priority tasks from today's intelligence summary.")
  }

  return {
    isRecording,
    startVoiceDictation,
    stopVoiceDictation
  }
}
