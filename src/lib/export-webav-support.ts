/**
 * Whether WebAV's {@link Combinator} pipeline can run in this browser.
 *
 * WebAV's `Combinator.isSupported({ width, height, bitrate })` delegates to
 * `VideoEncoder.isConfigSupported` with those exact dimensions. Some browsers
 * return `supported: false` for some output sizes while still supporting others.
 * We probe with fixed "safe" dimensions that match WebAV's own defaults (see
 * `Combinator.isSupported` in @webav/av-cliper), then encode at the actual 4K
 * export dimensions.
 */
export async function isWebAvExportEnvironmentSupported(): Promise<boolean> {
	if (typeof self === "undefined") return false;

	const g = self as unknown as {
		OffscreenCanvas?: unknown;
		VideoEncoder?: typeof VideoEncoder;
		VideoDecoder?: typeof VideoDecoder;
		VideoFrame?: unknown;
		AudioEncoder?: typeof AudioEncoder;
		AudioDecoder?: typeof AudioDecoder;
		AudioData?: unknown;
	};

	if (
		g.OffscreenCanvas == null ||
		g.VideoEncoder == null ||
		g.VideoDecoder == null ||
		g.VideoFrame == null ||
		g.AudioEncoder == null ||
		g.AudioDecoder == null ||
		g.AudioData == null
	) {
		return false;
	}

	// Defaults from WebAV Combinator.isSupported (av-cliper 1.2.x)
	const videoCodec = "avc1.42E032";
	const probeWidth = 1920;
	const probeHeight = 1080;
	const probeBitrate = 7_000_000;

	const video = await g.VideoEncoder.isConfigSupported({
		codec: videoCodec,
		width: probeWidth,
		height: probeHeight,
		bitrate: probeBitrate,
	});
	if (!(video.supported ?? false)) return false;

	// Same audio defaults as WebAV (`mp4a.40.2`, 48 kHz stereo)
	const audio = await g.AudioEncoder.isConfigSupported({
		codec: "mp4a.40.2",
		sampleRate: 48_000,
		numberOfChannels: 2,
	});
	return audio.supported ?? false;
}
