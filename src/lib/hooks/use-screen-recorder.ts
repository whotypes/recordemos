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
  const [recordedVideo, setRecordedVideo] = useState<RecordedVideo | null>(null);
  const {
    setVideoSrc,
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

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
          ? "video/webm;codecs=vp8"
          : "video/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const currentSrc = useVideoPlayerStore.getState().videoSrc;
        if (currentSrc && currentSrc.startsWith("blob:")) {
          URL.revokeObjectURL(currentSrc);
        }

        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);

        setVideoSrc(url);
        setVideoDuration(0);
        setIsRecording(false);

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `screen-recording-${timestamp}.webm`;
        setVideoFileName(fileName);
        setVideoFileSize(blob.size);
        setVideoFileFormat("webm");

        setRecordedVideo({
          blob,
          blobUrl: url,
          fileName,
          fileSize: blob.size,
          fileFormat: "webm",
        });

        mediaRecorderRef.current = null;
        streamRef.current = null;
      };

      mediaRecorder.onerror = () => {
        setIsRecording(false);
      };

      mediaRecorder.start();

      stream.getVideoTracks()[0].onended = () => {
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
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
