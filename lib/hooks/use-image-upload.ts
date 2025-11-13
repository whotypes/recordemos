import { useVideoOptionsStore } from "@/lib/video-options-store"

export const useImageUpload = () => {
  const { setBackgroundColor, setBackgroundType } = useVideoOptionsStore()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if it's an image file
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }

    // Clean up previous blob URL if it exists
    const currentColor = useVideoOptionsStore.getState().backgroundColor
    if (currentColor && currentColor.startsWith("blob:")) {
      URL.revokeObjectURL(currentColor)
    }

    // Create a blob URL from the file
    const url = URL.createObjectURL(file)
    setBackgroundColor(url)
    setBackgroundType('image')

    // Clean up the input
    e.target.value = ""
  }

  return {
    handleImageUpload
  }
}
