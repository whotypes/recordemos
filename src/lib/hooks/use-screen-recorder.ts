import { useRef, useState } from "react";
import { toast } from "sonner";

export interface RecordedVideo {
	blob: Blob;
	fileName: string;
	durationMs: number;
}

export const useScreenRecorder = () => {
	const [isRecording, setIsRecording] = useState(false);
	const [recordedVideo, setRecordedVideo] = useState<RecordedVideo | null>(
		null,
	);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const chunksRef = useRef<BlobPart[]>([]);
	const recordingStartMsRef = useRef<number | null>(null);

	const startScreenRecord = async () => {
		try {
			if (!navigator.mediaDevices.getDisplayMedia) {
				alert("Your device does not support the Screen Capture API");
				return;
			}

			setIsRecording(true);
			chunksRef.current = [];
			recordingStartMsRef.current = performance.now();

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
				const startMs = recordingStartMsRef.current ?? performance.now();
				const durationMs = Math.max(0, Math.round(performance.now() - startMs));
				recordingStartMsRef.current = null;

				const blob = new Blob(chunksRef.current, { type: mimeType });
				chunksRef.current = [];
				mediaRecorderRef.current = null;

				if (streamRef.current) {
					streamRef.current.getTracks().forEach((track) => track.stop());
					streamRef.current = null;
				}

				setIsRecording(false);

				if (blob.size === 0) {
					console.error("Screen recording produced empty blob");
					toast.error("Recording failed — no video data was captured");
					return;
				}

				const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
				const fileName = `screen-recording-${timestamp}.webm`;
				setRecordedVideo({ blob, fileName, durationMs });
			};

			mediaRecorder.onerror = () => {
				recordingStartMsRef.current = null;
				setIsRecording(false);
			};

			// Timesliced capture so chunks are available even if stop races the final flush.
			mediaRecorder.start(250);

			stream.getVideoTracks()[0].onended = () => {
				if (mediaRecorder.state !== "inactive") {
					mediaRecorder.stop();
				}
			};
		} catch (err) {
			console.error("Screen capture error:", err);
			recordingStartMsRef.current = null;
			setIsRecording(false);
			mediaRecorderRef.current = null;
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop());
				streamRef.current = null;
			}
		}
	};

	const stopScreenRecord = () => {
		const recorder = mediaRecorderRef.current;
		if (!recorder || recorder.state === "inactive") {
			return;
		}
		try {
			const r = recorder as MediaRecorder & { requestData?: () => void };
			r.requestData?.();
		} catch {
			/* ignore */
		}
		recorder.stop();
		// Stream tracks are stopped in onstop after the final chunk is flushed.
	};

	const clearRecordedVideo = () => {
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
