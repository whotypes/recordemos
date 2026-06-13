"use client";

import { Download, HardDrive, Loader2, X } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useVideoExportComposed as useVideoExport } from "@/lib/hooks/use-video-export-composed";
import { useVideoPlayerStore } from "@/lib/video-player-store";
import { Progress } from "@/components/ui/progress";

interface ExportModuleProps {
	aspectRatio: string;
	onClose: () => void;
}

export default function ExportModule({
	aspectRatio,
	onClose,
}: ExportModuleProps) {
	const { exportVideo, cancelExport, isExporting, exportProgress } =
		useVideoExport();
	const { videoSrc, videoFileName, videoFileFormat } = useVideoPlayerStore();

	const handleExport = async () => {
		if (!videoSrc) {
			return;
		}

		await exportVideo({
			aspectRatio,
			videoSrc,
			fileName: videoFileName
				? videoFileName.replace(/\.[^/.]+$/, "-4k.mp4")
				: undefined,
			sourceFileName: videoFileName ?? undefined,
			videoFormat: videoFileFormat || undefined,
		});
	};

	const handleClose = () => {
		if (isExporting) {
			cancelExport();
		}
		onClose();
	};

	const footer = isExporting ? null : (
		<div className="flex gap-2">
			<button
				onClick={handleClose}
				className="flex-1 px-3 py-2 rounded border border-border/50 text-foreground hover:bg-accent transition-colors text-xs font-medium"
			>
				Cancel
			</button>
			<button
				onClick={handleExport}
				disabled={!videoSrc || isExporting}
				className="flex-1 px-3 py-2 rounded bg-accent text-accent-foreground hover:bg-accent/90 transition-colors text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<Download size={14} />
				Export
			</button>
		</div>
	);

	return (
		<Modal
			isOpen={true}
			onClose={handleClose}
			title={isExporting ? "Exporting Video" : "Export Video"}
			footer={footer}
			maxWidth="max-w-sm"
		>
			<div className="space-y-4">
				{isExporting ? (
					<div className="space-y-4 py-6">
						<div className="flex items-center justify-center">
							<Loader2 className="w-8 h-8 text-accent animate-spin" />
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground capitalize">
									{exportProgress.stage}
								</span>
								<span className="text-foreground font-medium">
									{exportProgress.progress}%
								</span>
							</div>
							<Progress value={exportProgress.progress} className="h-2" />
							<p className="text-xs text-muted-foreground text-center">
								{exportProgress.message}
							</p>
						</div>

						{exportProgress.stage !== "complete" && (
							<div className="flex justify-center pt-4">
								<button
									onClick={cancelExport}
									className="px-3 py-1.5 rounded text-xs border border-border/50 text-foreground hover:bg-accent transition-colors flex items-center gap-1.5"
								>
									<X size={12} />
									Cancel Export
								</button>
							</div>
						)}
					</div>
				) : (
					<>
						{/* Local Rendering */}
						<div className="bg-muted border border-accent/20 rounded p-3 flex gap-2">
							<HardDrive className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
							<div>
								<p className="text-xs font-medium text-foreground">
									100% Local Rendering
								</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									Your video never leaves your browser.
								</p>
							</div>
						</div>

						<div>
							<label className="text-xs font-medium text-foreground mb-1 block">
								Output resolution
							</label>
							<div className="px-3 py-2 bg-muted rounded text-xs text-foreground border border-border/30">
								4K UHD (short edge 2160px, varies by aspect ratio)
							</div>
						</div>

						{/* Aspect Ratio */}
						<div>
							<label className="text-xs font-medium text-foreground mb-1 block">
								Aspect Ratio
							</label>
							<div className="px-3 py-2 bg-muted rounded text-xs text-muted-foreground border border-border/30">
								{aspectRatio}
							</div>
						</div>

						{/* Export Info */}
						<div className="bg-muted/50 border border-border/30 rounded p-3">
							<p className="text-xs text-muted-foreground">
								<span className="font-medium text-foreground">Note:</span>{" "}
								Export runs entirely in your browser as MP4 (WebCodecs when
								available, with FFmpeg fallback). Nothing is uploaded. Long or
								high-resolution clips can use significant CPU and RAM; you can
								cancel an in-progress export.
							</p>
						</div>
					</>
				)}
			</div>
		</Modal>
	);
}
