import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useScreenRecorder } from "@/lib/hooks/use-screen-recorder"
import { useVideoUpload } from "@/lib/hooks/use-video-upload"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { Plus, Video as VideoIcon } from "lucide-react"
import { useRef } from "react"

interface VideoPanelProps {
  onExport: () => void
}

export default function VideoPanel({ onExport }: VideoPanelProps) {
  const { startScreenRecord, stopScreenRecord, isRecording } = useScreenRecorder()
  const { handleVideoUpload } = useVideoUpload()
  const videoSrc = useVideoPlayerStore((state) => state.videoSrc)
  const uploadRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleVideoUpload(e)
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
        )}
      </div>
    </div>
  )
}
