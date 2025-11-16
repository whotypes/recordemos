import type { Id } from "convex/_generated/dataModel";
import { create } from "zustand";
import { useLocalTimelineStore } from "./local-timeline-store";

let clearFileStatusesRef: (() => void) | null = null;

export const setClearFileStatusesRef = (fn: (() => void) | null) => {
  clearFileStatusesRef = fn;
};

interface VideoPlayerState {
  // video metadata
  videoDuration: number;
  setVideoDuration: (duration: number) => void;
  loop: boolean;
  setLoop: (loop: boolean) => void;
  muted: boolean;
  setMuted: (muted: boolean) => void;

  // current clip reference
  currentClipAssetId: Id<"assets"> | null;
  setCurrentClipAssetId: (assetId: Id<"assets"> | null) => void;

  // local blob URL for playback (not persisted)
  videoSrc: string | null;
  setVideoSrc: (src: string | null) => void;

  // temporary file metadata (for display purposes only)
  videoFileName: string | null;
  setVideoFileName: (name: string | null) => void;
  videoFileSize: number | null;
  setVideoFileSize: (size: number | null) => void;
  videoFileFormat: string | null;
  setVideoFileFormat: (format: string | null) => void;

  // cloud upload preference
  cloudUploadEnabled: boolean;
  setCloudUploadEnabled: (enabled: boolean) => void;

  // upload progress tracking
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
  uploadProgress: number;
  setUploadProgress: (progress: number) => void;
  uploadStatus: string | null;
  setUploadStatus: (status: string | null) => void;

  // helper functions
  reset: () => void;
}

export const useVideoPlayerStore = create<VideoPlayerState>((set) => ({
  // video metadata
  videoDuration: 0,
  setVideoDuration: (duration) => set({ videoDuration: duration }),
  loop: false,
  setLoop: (loop) => set({ loop }),
  muted: false,
  setMuted: (muted) => set({ muted }),

  // current clip reference
  currentClipAssetId: null,
  setCurrentClipAssetId: (assetId) => set({ currentClipAssetId: assetId }),

  // local blob URL
  videoSrc: null,
  setVideoSrc: (src) => set({ videoSrc: src }),

  // temporary file metadata
  videoFileName: null,
  setVideoFileName: (name) => set({ videoFileName: name }),
  videoFileSize: null,
  setVideoFileSize: (size) => set({ videoFileSize: size }),
  videoFileFormat: null,
  setVideoFileFormat: (format) => set({ videoFileFormat: format }),

  // cloud upload preference
  cloudUploadEnabled: false,
  setCloudUploadEnabled: (enabled) => set({ cloudUploadEnabled: enabled }),

  // upload progress tracking
  isUploading: false,
  setIsUploading: (uploading) => set({ isUploading: uploading }),
  uploadProgress: 0,
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  uploadStatus: null,
  setUploadStatus: (status) => set({ uploadStatus: status }),

  reset: () => {
    clearFileStatusesRef?.();
    // clear local timeline when resetting
    useLocalTimelineStore.getState().clearLocalTimeline();
    set({
      videoDuration: 0,
      videoSrc: null,
      videoFileName: null,
      videoFileSize: null,
      videoFileFormat: null,
      loop: false,
      muted: false,
      currentClipAssetId: null,
      isUploading: false,
      uploadProgress: 0,
      uploadStatus: null,
    });
  },
}));
