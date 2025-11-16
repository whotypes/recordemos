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

      // expert-level constraints for maximum quality and smoothness
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
          width: { ideal: 3840, max: 3840 }, // support up to 4K
          height: { ideal: 2160, max: 2160 },
          frameRate: { ideal: 60, min: 30 }, // 60fps with 30fps fallback
          // advanced constraints for better quality
          aspectRatio: { ideal: 16/9 },
        },
        audio: false,
        // @ts-expect-error - advanced display media options
        preferCurrentTab: false,
        // @ts-expect-error - prevent surface switching for consistent recording
        surfaceSwitching: "exclude",
        // @ts-expect-error - allow self browser surface for better performance
        selfBrowserSurface: "include",
      });

      streamRef.current = stream;

      // get the actual track settings and optimize
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      const capabilities = videoTrack.getCapabilities();

      console.log("Video track settings:", settings);
      console.log("Video track capabilities:", capabilities);

      // apply optimal constraints based on capabilities
      if (capabilities.frameRate && typeof capabilities.frameRate === "object") {
        const maxFrameRate = "max" in capabilities.frameRate ? capabilities.frameRate.max : 60;
        const targetFrameRate = Math.min(60, maxFrameRate);

        try {
          await videoTrack.applyConstraints({
            frameRate: { exact: targetFrameRate },
            width: { ideal: settings.width },
            height: { ideal: settings.height },
          });
          console.log(`Applied ${targetFrameRate}fps constraint`);
        } catch (e) {
          console.warn("Could not apply exact frameRate, using ideal:", e);
          await videoTrack.applyConstraints({
            frameRate: { ideal: 60 },
          });
        }
      }

      // determine optimal codec and bitrate based on resolution
      const resolution = (settings.width || 1920) * (settings.height || 1080);
      const is4K = resolution >= 3840 * 2160 * 0.8; // ~4K
      const is1440p = resolution >= 2560 * 1440 * 0.8; // ~1440p
      const is1080p = resolution >= 1920 * 1080 * 0.8; // ~1080p

      let videoBitrate = 5000000; // 5 Mbps default for 720p
      if (is4K) {
        videoBitrate = 20000000; // 20 Mbps for 4K
      } else if (is1440p) {
        videoBitrate = 12000000; // 12 Mbps for 1440p
      } else if (is1080p) {
        videoBitrate = 8000000; // 8 Mbps for 1080p
      }

      // try codecs in order of preference: VP9 > VP8 > H264
      const codecOptions = [
        { mimeType: "video/webm;codecs=vp9", bitrate: videoBitrate },
        { mimeType: "video/webm;codecs=vp8", bitrate: Math.floor(videoBitrate * 1.2) }, // VP8 needs more bitrate
        { mimeType: "video/webm;codecs=h264", bitrate: videoBitrate },
        { mimeType: "video/webm", bitrate: videoBitrate },
      ];

      let selectedOptions: MediaRecorderOptions | null = null;
      for (const option of codecOptions) {
        if (MediaRecorder.isTypeSupported(option.mimeType)) {
          selectedOptions = {
            mimeType: option.mimeType,
            videoBitsPerSecond: option.bitrate,
          };
          console.log(`Using codec: ${option.mimeType} at ${option.bitrate / 1000000}Mbps`);
          break;
        }
      }

      if (!selectedOptions) {
        throw new Error("No supported video codec found");
      }

      const mediaRecorder = new MediaRecorder(stream, selectedOptions);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      // use timeslice for smoother recording (100ms chunks)
      // this prevents memory buildup and enables real-time processing
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

        const blob = new Blob(chunks, { type: selectedOptions!.mimeType });
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

        console.log(`Recording complete: ${blob.size / 1024 / 1024}MB`);
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setIsRecording(false);
      };

      // start recording with 100ms timeslice for smooth capture
      mediaRecorder.start(100);

      // stop when user stops sharing
      videoTrack.onended = () => {
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
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
