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
  // use getState for setters to avoid unnecessary subscriptions
  const setVideoSrc = useVideoPlayerStore((state) => state.setVideoSrc);
  const setVideoFileName = useVideoPlayerStore((state) => state.setVideoFileName);
  const setVideoFileSize = useVideoPlayerStore((state) => state.setVideoFileSize);
  const setVideoFileFormat = useVideoPlayerStore((state) => state.setVideoFileFormat);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startScreenRecord = async () => {
    try {
      if (!navigator.mediaDevices.getDisplayMedia) {
        alert("Your device does not support the Screen Capture API");
        return;
      }

      setIsRecording(true);
      // clear previous chunks
      chunksRef.current = [];

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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const currentSrc = useVideoPlayerStore.getState().videoSrc;
        if (currentSrc && currentSrc.startsWith("blob:")) {
          URL.revokeObjectURL(currentSrc);
        }

        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);

        setVideoSrc(url);
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

        chunksRef.current = [];
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
