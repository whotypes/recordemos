import { useVideoPlayerStore } from "@/lib/video-player-store";
import { useLocalTimelineStore } from "@/lib/local-timeline-store";
import { useUploadFile } from "@convex-dev/r2/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery as useConvexQuery, useMutation } from "convex/react";
import { useState } from "react";
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

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to load video metadata"));
    };

    video.src = URL.createObjectURL(file);
  });
};

export const useVideoUpload = (projectId?: Id<"projects">) => {
  const {
    setVideoSrc,
    setCurrentTime,
    setVideoDuration,
    setVideoFileName,
    setVideoFileSize,
    setVideoFileFormat,
    setIsUploading,
    setUploadProgress,
    setUploadStatus,
    cloudUploadEnabled,
  } = useVideoPlayerStore();

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
    // clean up previous blob URL if it exists
    const currentSrc = useVideoPlayerStore.getState().videoSrc;
    if (currentSrc && currentSrc.startsWith("blob:")) {
      URL.revokeObjectURL(currentSrc);
    }

    // create blob URL for instant playback - this always works locally
    const blobUrl = URL.createObjectURL(file);
    setVideoSrc(blobUrl);
    setCurrentTime(0);
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
        toast.success("Video loaded for local editing only");
      } catch (error) {
        console.error("Failed to extract metadata:", error);
        toast.warning("Video loaded but timeline may not work correctly");
      }
      return { blobUrl };
    }

    // if no projectId provided, initialize local timeline and return blob URL
    if (!options?.projectId) {
      try {
        const metadata = await extractVideoMetadata(file);
        setVideoDuration(metadata.duration);
        initializeLocalTimeline(metadata.duration);
        toast.success("Video loaded for local editing");
      } catch (error) {
        console.error("Failed to extract metadata:", error);
        toast.warning("Video loaded but timeline may not work correctly");
      }
      return { blobUrl };
    }

    // extract duration and upload to cloud
    try {
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

      return { blobUrl, assetId };
    } catch (error) {
      console.error("Cloud upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload video";

      // provide specific error messages but emphasize local functionality still works
      if (errorMessage.includes("Project not found")) {
        toast.error("Cloud upload failed: Project not found. Video available for local editing only.");
      } else if (errorMessage.includes("Not authorized")) {
        toast.error("Cloud upload failed: Not authorized. Video available for local editing only.");
      } else {
        toast.error("Cloud upload failed. Video available for local editing only.");
      }

      // reset upload state on error
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus(null);

      // local blob URL still works even if cloud upload failed
      return { blobUrl, uploadFailed: true };
    }
  };

  return {
    handleVideoUpload,
    uploadVideoFile,
    projectVerification,
  };
};
