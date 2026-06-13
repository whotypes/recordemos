import { fetchFile } from "@ffmpeg/util";
import {
	extractVideoMetadata,
	isValidDuration,
	type VideoMetadata,
} from "@/lib/video-metadata";
import { loadFFmpeg } from "./ffmpeg-loader";

function isWebmFile(file: File | Blob, container?: string): boolean {
	if (container === "webm") return true;
	if (file.type.includes("webm")) return true;
	if (file instanceof File && file.name.toLowerCase().endsWith(".webm")) {
		return true;
	}
	return false;
}

export function needsDurationRepair(
	metadata: VideoMetadata,
	_file: File | Blob,
): boolean {
	return !isValidDuration(metadata.durationSec);
}

function toFile(input: File | Blob): File {
	if (input instanceof File) return input;
	return new File([input], "video.webm", {
		type: input.type || "video/webm",
	});
}

function getInputExtension(file: File): string {
	const ext = file.name.split(".").pop()?.toLowerCase();
	if (ext) return ext;
	if (file.type.includes("webm")) return "webm";
	if (file.type.includes("quicktime") || file.type.includes("mov")) {
		return "mov";
	}
	return "mp4";
}

async function shouldAttemptRepair(file: File): Promise<boolean> {
	if (isWebmFile(file)) return true;

	try {
		const metadata = await extractVideoMetadata(file);
		return !isValidDuration(metadata.durationSec);
	} catch {
		return true;
	}
}

export async function repairWebmOrRemuxToMp4(
	input: File | Blob,
	opts?: { onProgress?: (msg: string) => void },
): Promise<File> {
	const file = toFile(input);

	if (!(await shouldAttemptRepair(file))) {
		return file;
	}

	try {
		opts?.onProgress?.("Preparing video...");
		const ffmpeg = await loadFFmpeg(opts?.onProgress);

		const inputExt = getInputExtension(file);
		const inputFileName = `input.${inputExt}`;
		const outputFileName = "output.mp4";

		await ffmpeg.writeFile(inputFileName, await fetchFile(file));

		opts?.onProgress?.("Remuxing to MP4...");
		const exitCode = await ffmpeg.exec([
			"-i",
			inputFileName,
			"-c",
			"copy",
			"-movflags",
			"+faststart",
			outputFileName,
		]);

		if (exitCode !== 0) {
			console.warn("[FFmpeg remux] Non-zero exit code:", exitCode);
			await ffmpeg.deleteFile(inputFileName).catch(() => {});
			return file;
		}

		const data = await ffmpeg.readFile(outputFileName);
		await ffmpeg.deleteFile(inputFileName).catch(() => {});
		await ffmpeg.deleteFile(outputFileName).catch(() => {});

		if (!(data instanceof Uint8Array) || data.byteLength === 0) {
			return file;
		}

		const arrayBuffer = data.buffer.slice(
			data.byteOffset,
			data.byteOffset + data.byteLength,
		);
		const baseName = file.name.replace(/\.[^/.]+$/, "") || "video";
		return new File([arrayBuffer as ArrayBuffer], `${baseName}.mp4`, {
			type: "video/mp4",
		});
	} catch (error) {
		console.warn("[FFmpeg remux] Failed, using original file:", error);
		return file;
	}
}
