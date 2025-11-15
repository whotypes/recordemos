import { useVideoPlayerStore } from "@/lib/video-player-store";
import { useRef, useState } from "react";

interface RecordedVideo {
  blob: Blob;
  blobUrl: string;
  fileName: string;
  fileSize: number;
  fileFormat: string;
}

export const useScreenRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<RecordedVideo | null>(
    null
  );
  const {
    setVideoSrc,
    setCurrentTime,
    setVideoDuration,
    setVideoFileName,
    setVideoFileSize,
    setVideoFileFormat,
  } = useVideoPlayerStore();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startScreenRecord = async () => {
    try {
      if (!navigator.mediaDevices.getDisplayMedia) {
        alert("Your device does not support the Screen Capture API");
        return;
      }

      setIsRecording(true);

      // request high-quality video with optimal constraints
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
          // use ideal constraints to request the best quality
          width: { ideal: window.screen.width * window.devicePixelRatio },
          height: { ideal: window.screen.height * window.devicePixelRatio },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // get the actual track settings to check screenPixelRatio
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      // @ts-expect-error https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings/screenPixelRatio
      const screenPixelRatio = settings.screenPixelRatio ?? window.devicePixelRatio;

      // if we have screenPixelRatio, we can optimize the recording
      // the browser may have captured at logical resolution, so we can
      // request constraints to match the physical resolution
      if (screenPixelRatio && screenPixelRatio > 1) {
        const capabilities = videoTrack.getCapabilities();

        // try to apply optimal constraints based on screenPixelRatio
        if (
          capabilities.width &&
          capabilities.height &&
          typeof capabilities.width === "object" &&
          typeof capabilities.height === "object"
        ) {
          const maxWidth =
            "max" in capabilities.width ? capabilities.width.max : undefined;
          const maxHeight =
            "max" in capabilities.height ? capabilities.height.max : undefined;

          const optimalWidth = Math.min(
            maxWidth ?? window.screen.width * screenPixelRatio,
            window.screen.width * screenPixelRatio
          );
          const optimalHeight = Math.min(
            maxHeight ?? window.screen.height * screenPixelRatio,
            window.screen.height * screenPixelRatio
          );

          await videoTrack.applyConstraints({
            width: { ideal: optimalWidth },
            height: { ideal: optimalHeight },
            frameRate: { ideal: 60 },
          });
        }
      }

      // use better quality settings for MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: "video/webm",
      };

      // try to use VP9 codec for better quality if available
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        options.mimeType = "video/webm;codecs=vp9";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
        options.mimeType = "video/webm;codecs=vp8";
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // clean up previous blob URL if it exists
        const currentSrc = useVideoPlayerStore.getState().videoSrc;
        if (currentSrc && currentSrc.startsWith("blob:")) {
          URL.revokeObjectURL(currentSrc);
        }

        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        // set video for preview
        setVideoSrc(url);
        setIsRecording(false);
        setCurrentTime(0);
        setVideoDuration(0); // will be set by metadata handler

        // set file metadata for recorded video
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `screen-recording-${timestamp}.webm`;
        setVideoFileName(fileName);
        setVideoFileSize(blob.size);
        setVideoFileFormat("webm");

        // store recorded video data for later upload
        setRecordedVideo({
          blob,
          blobUrl: url,
          fileName,
          fileSize: blob.size,
          fileFormat: "webm",
        });

        // clean up refs
        mediaRecorderRef.current = null;
        streamRef.current = null;
      };

      mediaRecorder.start();

      // stop when user stops sharing
      videoTrack.onended = () => {
        mediaRecorder.stop();
      };
    } catch (err) {
      console.error("Screen capture error:", err);
      setIsRecording(false);
      mediaRecorderRef.current = null;
      streamRef.current = null;
    }
  };

  const stopScreenRecord = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const clearRecordedVideo = () => {
    if (recordedVideo?.blobUrl) {
      URL.revokeObjectURL(recordedVideo.blobUrl);
    }
    setRecordedVideo(null);
  };

  return {
    startScreenRecord,
    stopScreenRecord,
    isRecording,
    recordedVideo,
    clearRecordedVideo,
  };
};
