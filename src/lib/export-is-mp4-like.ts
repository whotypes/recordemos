/**
 * Whether the fetched file is likely MP4/MOV (ISO base media) so WebAV `MP4Clip` can try decoding.
 */
export function isMp4LikeBlob(
	blob: Blob | null,
	videoFormat?: string,
	sourceFileHint?: string,
): boolean {
	if (!blob) return false;
	const t = blob.type.toLowerCase();
	if (t.includes("mp4") || t.includes("m4v") || t === "video/quicktime") {
		return true;
	}
	const fmt = videoFormat?.toLowerCase() ?? "";
	if (
		fmt.includes("mp4") ||
		fmt.includes("m4v") ||
		fmt.includes("mov") ||
		fmt.includes("quicktime")
	) {
		return true;
	}
	const hint = sourceFileHint?.toLowerCase() ?? "";
	if (
		hint.endsWith(".mov") ||
		hint.endsWith(".mp4") ||
		hint.endsWith(".m4v") ||
		hint.includes(".mov") ||
		hint.includes(".mp4")
	) {
		return true;
	}
	if (t.includes("octet-stream")) {
		return hint.length > 0;
	}
	if (t === "") {
		return true;
	}
	return false;
}
