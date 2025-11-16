import { useVideoPlayerStore } from "@/lib/video-player-store";
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
  } = useVideoPlayerStore();

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
  ): Promise<{ blobUrl: string; assetId?: Id<"assets"> }> => {
    // clean up previous blob URL if it exists
    const currentSrc = useVideoPlayerStore.getState().videoSrc;
    if (currentSrc && currentSrc.startsWith("blob:")) {
      URL.revokeObjectURL(currentSrc);
    }

    // create blob URL for instant playback
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

    // if no projectId provided, just return blob URL for local playback
    if (!options?.projectId) {
      return { blobUrl };
    }

    // extract duration and upload
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
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload video";

      if (errorMessage.includes("Project not found")) {
        toast.error("Project not found. Please select a valid project.");
      } else if (errorMessage.includes("Not authorized")) {
        toast.error("You don't have permission to upload to this project.");
      } else {
        toast.error("Failed to upload video");
      }

      // reset upload state on error
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus(null);

      return { blobUrl };
    }
  };

  return {
    handleVideoUpload,
    uploadVideoFile,
    projectVerification,
  };
};
