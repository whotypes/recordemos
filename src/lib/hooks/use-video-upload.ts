import { useLocalTimelineStore } from "@/lib/local-timeline-store";
import { usePlayheadStore } from "@/lib/playhead-store";
import { useVideoPlayerStore } from "@/lib/video-player-store";
import { useUploadFile } from "@convex-dev/r2/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery as useConvexQuery, useMutation } from "convex/react";
import { toast } from "sonner";

interface UploadOptions {
  projectId: Id<"projects">;
  onUploadComplete?: (assetId: Id<"assets">) => void;
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

const extractVideoMetadata = (file: File): Promise<VideoMetadata> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    let blobUrl: string | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let resolved = false;

    const cleanup = () => {
      // remove all event listeners
      video.onloadedmetadata = null;
      video.oncanplay = null;
      video.onerror = null;

      // clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // revoke blob URL
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }

      // clear video element
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    };

    const checkAndResolve = () => {
      if (resolved) return;

      const duration = video.duration;

      // validate duration is finite and positive
      if (duration && isFinite(duration) && !isNaN(duration) && duration > 0) {
        resolved = true;
        const metadata = {
          duration,
          width: video.videoWidth,
          height: video.videoHeight,
        };
        cleanup();
        resolve(metadata);
      }
    };

    video.onloadedmetadata = () => {
      checkAndResolve();

      if (!resolved) {
        console.warn('Duration invalid after loadedmetadata, waiting for canplay...');
      }
    };

    video.oncanplay = () => {
      checkAndResolve();

      // if still invalid and duration is Infinity, try seeking
      if (!resolved && video.duration === Infinity) {
        console.warn('Duration is Infinity, attempting to seek...');
        video.currentTime = Number.MAX_SAFE_INTEGER;
        setTimeout(() => {
          video.currentTime = 0;
          checkAndResolve();

          if (!resolved) {
            cleanup();
            reject(new Error(`Invalid video duration: ${video.duration}`));
          }
        }, 100);
      }
    };

    video.onerror = () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error("Failed to load video metadata"));
      }
    };

    // timeout after 10 seconds
    timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error(`Video metadata extraction timeout. Duration: ${video.duration}`));
      }
    }, 10000);

    blobUrl = URL.createObjectURL(file);
    video.src = blobUrl;
    video.load();
  });
};

export const useVideoUpload = (projectId?: Id<"projects">) => {
  const {
    setVideoSrc,
    setVideoDuration,
    setVideoFileName,
    setVideoFileSize,
    setVideoFileFormat,
    setIsUploading,
    setUploadProgress,
    setUploadStatus,
    cloudUploadEnabled,
  } = useVideoPlayerStore();

  const { setPlayheadMs } = usePlayheadStore();
  const { initializeLocalTimeline } = useLocalTimelineStore();

  const uploadFile = useUploadFile(api.assets);
  const insertAssetRow = useMutation(api.assets.insertAssetRow);
  const initializeTimeline = useMutation(api.timeline_helpers.initializeProjectTimeline);
  const initializeSettings = useMutation(api.project_settings.initialize);

  // verify project exists before we even try to upload
  const projectVerification = useConvexQuery(
    api.assets.verifyProjectAccess,
    projectId ? { projectId } : "skip"
  );

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    uploadVideoFile(file);
    e.target.value = "";
  };

  const uploadVideoFile = async (
    file: File,
    options?: UploadOptions
  ): Promise<{ blobUrl: string; assetId?: Id<"assets">; uploadFailed?: boolean }> => {
    let blobUrl: string | null = null;
    try {
      // clean up previous blob URL if it exists
      const currentSrc = useVideoPlayerStore.getState().videoSrc;
      if (currentSrc && currentSrc.startsWith("blob:")) {
        // delay revocation to avoid revoking while video is loading
        setTimeout(() => URL.revokeObjectURL(currentSrc), 500);
      }

      // create blob URL for instant playback - this always works locally
      blobUrl = URL.createObjectURL(file);
      setVideoSrc(blobUrl);
      setPlayheadMs(0, "init");
      setVideoDuration(0); // will be set by metadata handler

      // save file metadata
      setVideoFileName(file.name);
      setVideoFileSize(file.size);
      const format =
        file.type.split("/")[1] || file.name.split(".").pop() || "unknown";
      setVideoFileFormat(format);

      // if cloud upload is disabled, initialize local timeline and return blob URL
      if (!cloudUploadEnabled) {
        try {
          const metadata = await extractVideoMetadata(file);
          setVideoDuration(metadata.duration);
          initializeLocalTimeline(metadata.duration);
          toast.success("Video loaded locally");
        } catch (error) {
          console.error("Failed to extract metadata:", error);
          toast.warning("Video loaded but timeline initialization failed");
        }
        return { blobUrl: blobUrl! };
      }

      // if no projectId provided, initialize local timeline and return blob URL
      if (!options?.projectId) {
        try {
          const metadata = await extractVideoMetadata(file);
          setVideoDuration(metadata.duration);
          initializeLocalTimeline(metadata.duration);
          toast.success("Video loaded locally");
        } catch (error) {
          console.error("Failed to extract metadata:", error);
          toast.warning("Video loaded but timeline initialization failed");
        }
        return { blobUrl: blobUrl! };
      }

      // extract duration and upload to cloud
      setIsUploading(true);
      setUploadProgress(10);
      setUploadStatus("Analyzing video...");

      const metadata = await extractVideoMetadata(file);

      setUploadProgress(30);
      setUploadStatus("Uploading to cloud storage...");

      // start R2 upload in background
      const objectKey = await uploadFile(file);

      setUploadProgress(70);
      setUploadStatus("Creating asset record...");

      // determine asset type
      const type = file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
          ? "audio"
          : "image";

      // create asset row
      const assetId = await insertAssetRow({
        projectId: options.projectId,
        type,
        objectKey,
        originalFileName: file.name,
        sizeBytes: file.size,
        durationMs: metadata.duration * 1000,
      });

      setUploadProgress(85);
      setUploadStatus("Initializing timeline...");

      // initialize timeline with base video block
      if (type === "video") {
        await initializeTimeline({
          projectId: options.projectId,
          assetId,
          durationMs: metadata.duration * 1000,
        });

        // initialize project settings if not exists
        await initializeSettings({
          projectId: options.projectId,
        });
      }

      setUploadProgress(100);
      setUploadStatus("Complete!");

      toast.success("Video uploaded successfully");
      options.onUploadComplete?.(assetId);

      // clear upload state after a brief delay
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus(null);
      }, 1000);

      return { blobUrl: blobUrl!, assetId };
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to process video";

      // provide specific error messages but emphasize local functionality still works
      if (errorMessage.includes("Project not found")) {
        toast.error("Cloud upload failed: Project not found. Video available for local editing only.");
      } else if (errorMessage.includes("Not authorized")) {
        toast.error("Cloud upload failed: Not authorized. Video available for local editing only.");
      } else if (errorMessage.includes("metadata")) {
        toast.error("Failed to analyze video. Please try a different file.");
      } else {
        toast.error("Failed to process video. Please try again.");
      }

      // reset upload state on error
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus(null);

      // on catastrophic error (metadata extraction failed), revoke blob and clear state
      if (errorMessage.includes("metadata") || errorMessage.includes("timeout")) {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
        setVideoSrc(null);
        throw error;
      }

      // for cloud upload failures, keep the local blob URL so video still works
      if (blobUrl) {
        return { blobUrl, uploadFailed: true };
      }
      throw error;
    }
  };

  return {
    handleVideoUpload,
    uploadVideoFile,
    projectVerification,
  };
};
