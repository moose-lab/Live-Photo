import { create } from 'zustand'

interface UploadState {
  progress: number
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  videoId: string | null
  errorMessage: string | null
  setProgress: (progress: number) => void
  setStatus: (status: UploadState['status']) => void
  setVideoId: (videoId: string | null) => void
  setError: (message: string) => void
  reset: () => void
}

export const useUploadStore = create<UploadState>((set) => ({
  progress: 0,
  status: 'idle',
  videoId: null,
  errorMessage: null,
  setProgress: (progress) => set({ progress }),
  setStatus: (status) => set({ status }),
  setVideoId: (videoId) => set({ videoId }),
  setError: (message) => set({ status: 'error', errorMessage: message }),
  reset: () =>
    set({
      progress: 0,
      status: 'idle',
      videoId: null,
      errorMessage: null,
    }),
}))
