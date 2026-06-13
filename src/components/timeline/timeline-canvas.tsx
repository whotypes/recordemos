import { TimelineBlock } from "@/lib/types/timeline";
import TimelineBlockComponent from "../timeline-block";

interface TimelineCanvasProps {
	blocks: TimelineBlock[];
	selectedBlock: string | null;
	setSelectedBlock: (id: string | null) => void;
	timelineDuration: number;
	currentTime: number;
	pixelsPerSecond: number;
	onBlockClick: (blockId: string, timeInBlock: number) => void;
	onSeek?: (time: number) => void;
	onBlockDragPreview?: (blockId: string, newStart: number) => void;
	onBlockDragEnd: (blockId: string, newStart: number) => void;
	onBlockResizeStart: (blockId: string, side: "left" | "right") => void;
	onBlockResizeEnd: (
		blockId: string,
		newStart: number,
		newDuration: number,
	) => void;
	onBlockResizePreview?: (
		blockId: string,
		newStart: number,
		newDuration: number,
	) => void;
	onBlockDelete: (blockId: string) => void;
	onBlockDuplicate: (blockId: string) => void;
	onBlockTrimStart?: (blockId: string, side: "left" | "right") => void;
	onBlockTrimPreview?: (
		blockId: string,
		trimStartMs: number,
		trimEndMs: number,
		newStartMs?: number,
		newDurationMs?: number,
	) => void;
	onBlockTrimEnd?: (
		blockId: string,
		trimStartMs: number,
		trimEndMs: number,
		newStartMs?: number,
		newDurationMs?: number,
	) => void;
	onBlockUpdateMetadata?: (
		blockId: string,
		metadata: {
			cropX?: number;
			cropY?: number;
			cropW?: number;
			cropH?: number;
			zoomLevel?: number;
		},
		persist?: boolean,
	) => void;
}

export default function TimelineCanvas({
	blocks,
	selectedBlock,
	setSelectedBlock,
	timelineDuration,
	currentTime,
	pixelsPerSecond,
	onBlockClick,
	onSeek,
	onBlockDragPreview,
	onBlockDragEnd,
	onBlockResizeStart,
	onBlockResizeEnd,
	onBlockResizePreview,
	onBlockDelete,
	onBlockDuplicate,
	onBlockTrimStart,
	onBlockTrimPreview,
	onBlockTrimEnd,
	onBlockUpdateMetadata,
}: TimelineCanvasProps) {
	const hasVideo = blocks.length > 0;
	const videoBlocks = blocks.filter((b) => b.type === "video");
	const overlayBlocks = blocks.filter((b) => b.type !== "video");

	const selectedBlockData = blocks.find((b) => b.id === selectedBlock);

	const blockTypeToTrack: Record<string, number> = {
		zoom: 1,
		pan: 2,
		trim: 3,
	};

	const maxTrackIndex = overlayBlocks.reduce((max, block) => {
		const track = blockTypeToTrack[block.type] ?? 1;
		return Math.max(max, track);
	}, 0);

	const playheadPercent =
		timelineDuration > 0
			? Math.max(0, Math.min(100, (currentTime / timelineDuration) * 100))
			: 0;

	const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget) {
			setSelectedBlock(null);
		}
	};

	const handleTrackSeek = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!onSeek || timelineDuration <= 0) return;
		if (e.target !== e.currentTarget) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		onSeek(ratio * timelineDuration);
	};

	return (
		<div>
			<div
				onClick={(e) => {
					handleTimelineClick(e);
					handleTrackSeek(e);
				}}
				className="relative bg-muted/30 rounded-lg border border-border/50 overflow-visible"
				style={{
					height: `${hasVideo ? 68 + maxTrackIndex * 64 : 0}px`,
					minHeight: hasVideo ? "68px" : "0px",
				}}
			>
				{selectedBlockData && timelineDuration > 0 && (
					<div
						className="absolute top-0 bottom-0 pointer-events-none z-0"
						style={{
							left: `${(selectedBlockData.start / timelineDuration) * 100}%`,
							width: `${(selectedBlockData.duration / timelineDuration) * 100}%`,
							background:
								"repeating-linear-gradient(45deg, hsl(var(--muted)), hsl(var(--muted)) 10px, hsl(var(--muted) / 0.5) 10px, hsl(var(--muted) / 0.5) 20px)",
						}}
					/>
				)}

				<div className="relative w-full h-full">
					{videoBlocks.map((block) => {
						const blocksOnSameTrack = videoBlocks
							.filter((b) => b.id !== block.id && b.track === block.track)
							.map((b) => ({ id: b.id, start: b.start, duration: b.duration }));

						return (
							<TimelineBlockComponent
								key={block.id}
								block={block}
								isSelected={selectedBlock === block.id}
								onSelect={() => setSelectedBlock(block.id)}
								onBlockClick={(blockId, timeInBlock) =>
									onBlockClick(blockId, timeInBlock)
								}
								onDragPreview={onBlockDragPreview}
								onDragEnd={onBlockDragEnd}
								onResizeStart={onBlockResizeStart}
								onResizePreview={onBlockResizePreview}
								onResizeEnd={onBlockResizeEnd}
								onDelete={onBlockDelete}
								onDuplicate={onBlockDuplicate}
								onTrimStart={onBlockTrimStart}
								onTrimPreview={onBlockTrimPreview}
								onTrimEnd={onBlockTrimEnd}
								totalDuration={timelineDuration}
								pixelsPerSecond={pixelsPerSecond}
								blocksOnSameTrack={blocksOnSameTrack}
							/>
						);
					})}

					{overlayBlocks.map((block) => {
						const trackNumber = blockTypeToTrack[block.type] ?? 1;
						const blocksOnSameTrack = overlayBlocks
							.filter(
								(b) =>
									b.id !== block.id && blockTypeToTrack[b.type] === trackNumber,
							)
							.map((b) => ({ id: b.id, start: b.start, duration: b.duration }));

						return (
							<TimelineBlockComponent
								key={block.id}
								block={{ ...block, track: trackNumber }}
								isSelected={selectedBlock === block.id}
								onSelect={() => setSelectedBlock(block.id)}
								onBlockClick={(blockId, timeInBlock) =>
									onBlockClick(blockId, timeInBlock)
								}
								onDragPreview={onBlockDragPreview}
								onDragEnd={onBlockDragEnd}
								onResizeStart={onBlockResizeStart}
								onResizePreview={onBlockResizePreview}
								onResizeEnd={onBlockResizeEnd}
								onDelete={onBlockDelete}
								onDuplicate={onBlockDuplicate}
								onTrimStart={onBlockTrimStart}
								onTrimPreview={onBlockTrimPreview}
								onTrimEnd={onBlockTrimEnd}
								onUpdateMetadata={onBlockUpdateMetadata}
								totalDuration={timelineDuration}
								pixelsPerSecond={pixelsPerSecond}
								blocksOnSameTrack={blocksOnSameTrack}
							/>
						);
					})}
				</div>

				{hasVideo && timelineDuration > 0 && (
					<div
						className="absolute top-0 bottom-0 w-0.5 bg-secondary pointer-events-none z-50"
						style={{
							left: `${playheadPercent}%`,
							boxShadow: "0 0 8px hsl(var(--secondary) / 0.5)",
						}}
					>
						<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full">
							<div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-secondary" />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
