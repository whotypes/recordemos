import { InlineEdit } from "@/components/ui/inline-edit"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { useScreenRecorder } from "@/lib/hooks/use-screen-recorder"
import { useVideoUpload } from "@/lib/hooks/use-video-upload"
import { useTimelineBlocksStore } from "@/lib/timeline-blocks-store"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import type { Id } from "convex/_generated/dataModel"
import { Plus, RotateCcw, Upload, Video as VideoIcon, Trash2, Loader2 } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { useMutation } from "convex/react"
import { api } from "convex/_generated/api"

interface VideoPanelProps {
  projectId?: string
  onExport: () => void
}

export default function VideoPanel({ projectId, onExport }: VideoPanelProps) {
  const { startScreenRecord, stopScreenRecord, isRecording, recordedVideo, clearRecordedVideo } = useScreenRecorder()
  const { uploadVideoFile, projectVerification } = useVideoUpload(projectId as Id<"projects"> | undefined)
  const videoSrc = useVideoPlayerStore((state) => state.videoSrc)
  const videoFileName = useVideoPlayerStore((state) => state.videoFileName)
  const videoFileSize = useVideoPlayerStore((state) => state.videoFileSize)
  const videoFileFormat = useVideoPlayerStore((state) => state.videoFileFormat)
  const cloudUploadEnabled = useVideoPlayerStore((state) => state.cloudUploadEnabled)
  const currentClipAssetId = useVideoPlayerStore((state) => state.currentClipAssetId)
  const setVideoFileName = useVideoPlayerStore((state) => state.setVideoFileName)
  const setVideoFileFormat = useVideoPlayerStore((state) => state.setVideoFileFormat)
  const setCurrentClipAssetId = useVideoPlayerStore((state) => state.setCurrentClipAssetId)
  const resetVideoPlayer = useVideoPlayerStore((state) => state.reset)
  const resetVideoOptions = useVideoOptionsStore((state) => state.reset)
  const resetTransforms = useVideoOptionsStore((state) => state.resetTransforms)
  const setBackgroundColor = useVideoOptionsStore((state) => state.setBackgroundColor)
  const setBackgroundType = useVideoOptionsStore((state) => state.setBackgroundType)
  const setGradientAngle = useVideoOptionsStore((state) => state.setGradientAngle)
  // Removed setBlocks - timeline blocks are managed by Convex
  const uploadRef = useRef<HTMLInputElement>(null)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const deleteAsset = useMutation(api.assets.deleteAsset)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file")
      return
    }

    if (!cloudUploadEnabled || !projectId) {
      // just preview locally without uploading
      await uploadVideoFile(file)
      if (!cloudUploadEnabled) {
        toast.info("Video loaded for local editing only. Enable cloud upload to save to project.")
      } else {
        toast.info("Video loaded for preview only. Create a project to save your work.")
      }
    } else {
      // check if project verification failed
      if (projectVerification && !projectVerification.valid) {
        toast.error(projectVerification.error || "Cannot upload to this project")
        e.target.value = ""
        return
      }

      // upload to R2 and create asset
      await uploadVideoFile(file, {
        projectId: projectId as Id<"projects">,
        onUploadComplete: (assetId) => {
          setCurrentClipAssetId(assetId)
        },
      })
    }

    e.target.value = ""
  }

  const handleAddRecordingToProject = async () => {
    if (!recordedVideo) {
      toast.error("No recording available")
      return
    }

    if (!cloudUploadEnabled) {
      toast.error("Cloud upload is disabled. Enable it in the navbar to upload recordings.")
      return
    }

    if (!projectId) {
      toast.error("Please create or select a project first to save your recording")
      return
    }

    // check if project verification failed
    if (projectVerification && !projectVerification.valid) {
      toast.error(projectVerification.error || "Cannot upload to this project")
      return
    }

    const file = new File([recordedVideo.blob], recordedVideo.fileName, {
      type: "video/webm",
    })

    await uploadVideoFile(file, {
      projectId: projectId as Id<"projects">,
      onUploadComplete: (assetId) => {
        setCurrentClipAssetId(assetId)
        clearRecordedVideo()
      },
    })
  }

  const handleReset = () => {
    if (isRecording) {
      stopScreenRecord()
    }

    const currentSrc = useVideoPlayerStore.getState().videoSrc
    if (currentSrc && currentSrc.startsWith("blob:")) {
      URL.revokeObjectURL(currentSrc)
    }

    clearRecordedVideo()
    resetVideoPlayer()
    resetVideoOptions()
    resetTransforms()
    setBackgroundColor("#1a1a1a")
    setBackgroundType("gradient")
    setGradientAngle(170)
    // Timeline blocks cleared automatically when video deleted
  }

  const handleDeleteVideo = async () => {
    if (!currentClipAssetId) {
      toast.error("No video to delete")
      return
    }

    try {
      setIsDeleting(true)

      await deleteAsset({ assetId: currentClipAssetId })

      // clean up local state
      const currentSrc = useVideoPlayerStore.getState().videoSrc
      if (currentSrc && currentSrc.startsWith("blob:")) {
        URL.revokeObjectURL(currentSrc)
      }

      clearRecordedVideo()
      resetVideoPlayer()
      resetVideoOptions()
      resetTransforms()
      setBackgroundColor("#1a1a1a")
      setBackgroundType("gradient")
      setGradientAngle(170)
      // Timeline blocks cleared automatically when video deleted

      toast.success("Video deleted successfully")
      setShowDeleteDialog(false)
    } catch (error) {
      console.error("Delete error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete video")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      <h3 className="text-xs font-medium uppercase text-dark/70">Video</h3>

      <div className="mb-3 flex h-[4rem] gap-4 px-1 text-sm">
        {!videoSrc && !isRecording && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex h-full flex-col rounded-xl border-2 border-primary/30 p-1 px-6 hover:border-primary/60">
                    <label
                      htmlFor="video-upload"
                      className="group flex h-full w-full cursor-pointer items-center justify-center rounded-xl"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          uploadRef.current?.click()
                        }
                      }}
                    >
                      <div className='flex gap-1 items-center justify-center'>
                        <Plus
                          className="cursor-pointer text-primary/50 focus:ring-1 group-hover:text-primary/80"
                          size={16}
                        />
                        <p className='text-muted-foreground'>Upload</p>
                      </div>
                    </label>
                    <input
                      id="video-upload"
                      ref={uploadRef}
                      name="video-upload"
                      type="file"
                      onChange={handleFileUpload}
                      accept="video/*"
                      className="sr-only"
                      tabIndex={-1}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side={"top"}>
                  <span>Select a video file to upload</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="relative flex gap-2 h-full w-full cursor-pointer items-center justify-center rounded-xl border-2 border-primary/30 p-1 hover:border-primary/60"
                    onClick={startScreenRecord}
                  >
                    <div className='flex gap-1 items-center justify-center'>
                      <VideoIcon className="cursor-pointer text-primary/50 focus:ring-1 group-hover:text-primary/80" size={16} />
                      <p className='text-muted-foreground'>Record</p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side={"top"}>
                  <span>Start screen recording</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}

        {isRecording && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="relative flex gap-2 h-full w-full cursor-pointer items-center justify-center rounded-xl border-2 border-destructive/30 p-1 hover:border-destructive/60"
                  onClick={stopScreenRecord}
                >
                  <div className='flex gap-1 items-center justify-center'>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <p className='text-muted-foreground'>Stop</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side={"top"}>
                <span>Stop recording</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {videoSrc && !isRecording && (
          <>
            {recordedVideo && projectId && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="relative flex gap-2 h-full w-full cursor-pointer items-center justify-center rounded-xl border-2 border-primary/30 p-1 hover:border-primary/60"
                      onClick={handleAddRecordingToProject}
                    >
                      <div className='flex gap-1 items-center justify-center'>
                        <Upload className="cursor-pointer text-primary/50 focus:ring-1 group-hover:text-primary/80" size={16} />
                        <p className='text-muted-foreground'>Add to Project</p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side={"top"}>
                    <span>Upload recording to project</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="relative flex gap-2 h-full w-full cursor-pointer items-center justify-center rounded-xl border-2 border-primary/30 p-1 hover:border-primary/60"
                    onClick={onExport}
                  >
                    <div className='flex gap-1 items-center justify-center'>
                      <VideoIcon className="cursor-pointer text-primary/50 focus:ring-1 group-hover:text-primary/80" size={16} />
                      <p className='text-muted-foreground'>Export</p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side={"top"}>
                  <span>Export your video</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="relative flex gap-2 h-full w-full cursor-pointer items-center justify-center rounded-xl border-2 border-primary/30 p-1 hover:border-primary/60"
                    onClick={handleReset}
                  >
                    <div className='flex gap-1 items-center justify-center'>
                      <RotateCcw className="cursor-pointer text-primary/50 focus:ring-1 group-hover:text-primary/80" size={16} />
                      <p className='text-muted-foreground'>Reset</p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side={"top"}>
                  <span>Reset all video state and return to upload screen</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {currentClipAssetId && projectId && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="relative flex gap-2 h-full w-full cursor-pointer items-center justify-center rounded-xl border-2 border-destructive/30 p-1 hover:border-destructive/60"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <div className='flex gap-1 items-center justify-center'>
                        <Trash2 className="cursor-pointer text-destructive/50 focus:ring-1 group-hover:text-destructive/80" size={16} />
                        <p className='text-muted-foreground'>Delete</p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side={"top"}>
                    <span>Permanently delete video from project</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </>
        )}
      </div>

      {videoSrc && !isRecording && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">File Name</label>
            <InlineEdit
              value={videoFileName || ""}
              placeholder="No file name"
              onSave={(value) => {
                setVideoFileName(value || null)
              }}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">File Size</label>
            <div className="min-h-9 px-3 py-1 text-sm text-foreground flex items-center">
              {videoFileSize ? `${(videoFileSize / (1024 * 1024)).toFixed(2)} MB` : "No file size"}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Format</label>
            <Select
              value={videoFileFormat || ""}
              onValueChange={(value) => {
                setVideoFileFormat(value || null)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4</SelectItem>
                <SelectItem value="webm">WebM</SelectItem>
                <SelectItem value="mov">MOV</SelectItem>
                <SelectItem value="avi">AVI</SelectItem>
                <SelectItem value="mkv">MKV</SelectItem>
                <SelectItem value="m4v">M4V</SelectItem>
                <SelectItem value="flv">FLV</SelectItem>
                <SelectItem value="wmv">WMV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Are you sure you want to permanently delete this video? This action cannot be undone and will remove:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>The video file from cloud storage</li>
                  <li>All timeline blocks and edits</li>
                  <li>All project data associated with this video</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVideo}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
