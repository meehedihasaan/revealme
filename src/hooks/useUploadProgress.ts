import { useState, useEffect, useCallback } from "react";

interface UploadState {
  isUploading: boolean;
  progress: number; // 0-100
  thumbnail: string | null;
  caption: string | null;
}

// Simple global event system for upload progress
const listeners = new Set<(state: UploadState) => void>();
let currentState: UploadState = { isUploading: false, progress: 0, thumbnail: null, caption: null };

export const uploadProgress = {
  start: (thumbnail: string | null, caption: string | null) => {
    currentState = { isUploading: true, progress: 0, thumbnail, caption };
    listeners.forEach(l => l(currentState));
  },
  update: (progress: number) => {
    currentState = { ...currentState, progress: Math.min(progress, 100) };
    listeners.forEach(l => l(currentState));
  },
  finish: () => {
    currentState = { isUploading: false, progress: 100, thumbnail: null, caption: null };
    listeners.forEach(l => l(currentState));
  },
  error: () => {
    currentState = { isUploading: false, progress: 0, thumbnail: null, caption: null };
    listeners.forEach(l => l(currentState));
  },
};

export const useUploadProgress = () => {
  const [state, setState] = useState<UploadState>(currentState);

  useEffect(() => {
    const handler = (s: UploadState) => setState({ ...s });
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  return state;
};
