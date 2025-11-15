# Complete Project State Persistence

## Overview
**ALL** project settings from **EVERY** panel are now automatically saved to the database and restored when you return to a project.

## What Gets Persisted

### 🎬 Video Panel Settings
- **Video Source**: Primary video asset from R2 (4-day signed URL)
- **Duration & Metadata**: Duration, filename, file size, format
- **Transform Settings**:
  - Scale (zoom)
  - Translate X/Y (position)
  - Rotate X/Y/Z (3D rotation)
  - Perspective

### 🎨 Background Panel Settings
- **Background Color**: Solid colors, hex values
- **Background Type**: solid | gradient | mesh | image
- **Gradient Angle**: 0-360 degrees

### 📐 Frame Panel Settings
- **Aspect Ratio**: 16:9, 9:16, 1:1, 4:3, Custom
- **Zoom Level**: Canvas zoom (0-200%)
- **Hide Toolbars**: Show/hide UI chrome

### 🖥️ Browser Panel Settings
- **Frame Type**: Arc, MacOS Dark, MacOS Light, Shadow, None
- **Frame Height**: small, medium, large
- **Frame Roundness**: 0-1 (corner radius)
- **Search Bar**: Show/hide + custom text
- **Window Buttons**: Show/hide + color toggle
- **Frame Stroke**: Show/hide border
- **Colors**:
  - MacOS Dark theme color
  - MacOS Light theme color
  - Arc dark mode toggle

### 📦 Timeline Data (Already Implemented)
- Timeline blocks (video, zoom, pan, text, image)
- Block positions, durations, transforms
- Track configuration
- Edit history

## Technical Implementation

### Database Schema

**`convex/schema.ts`** - `project_settings` table includes:
```typescript
{
  // Frame/Canvas
  aspectRatio: string
  zoomLevel: number
  hideToolbars: boolean

  // Background
  backgroundColor: string
  backgroundType: string
  gradientAngle: number

  // Video Transforms
  scale: number
  translateX: number
  translateY: number
  rotateX: number
  rotateY: number
  rotateZ: number
  perspective: number

  // Browser Frame
  frameHeight: string
  showSearchBar: boolean
  showStroke: boolean
  macOsDarkColor: string
  macOsLightColor: string
  arcDarkMode: boolean
  hideButtons: boolean
  hasButtonColor: boolean
  selectedFrame: string
  frameRoundness: number
  searchBarText: string
}
```

### Backend (Convex)

**`convex/project_settings.ts`**
- `get`: Query to fetch all project settings
- `initialize`: Create default settings for new projects
- `update`: Update any combination of settings (all optional)

**`convex/assets.ts`**
- `getPrimaryVideoAsset`: Fetch first video + generate R2 URL

### Frontend Hooks

**`src/lib/hooks/use-project-restore.ts`** ✨
- Runs once per project on load
- Fetches settings + video from database/R2
- Applies to all relevant stores:
  - `useVideoOptionsStore`
  - `useFrameOptionsStore`
  - `useVideoPlayerStore`
- Resets playback position to 0

**`src/lib/hooks/use-project-settings-sync.ts`** ✨
- Monitors ALL settings across both stores
- Debounces changes (500ms) to avoid excessive writes
- Skips initial mount to avoid overwriting restored values
- Only syncs syncable backgrounds (solid/gradient, not custom images)

### Integration Point

**`src/routes/studio.tsx`**
```typescript
// Restore state on project load
useProjectRestore(projectId)

// Sync changes to database
useProjectSettingsSync(projectId)
```

## How It Works

### On Project Load:
1. User navigates to `/studio?projectId=xyz`
2. `useProjectRestore` activates:
   - Queries `project_settings` table
   - Queries `getPrimaryVideoAsset`
3. Applies all settings to stores:
   - Video options (transforms, background, frame)
   - Frame options (browser appearance)
   - Video player (source, duration, metadata)
4. UI instantly reflects saved state

### On Settings Change:
1. User modifies any setting (aspect ratio, color, scale, etc.)
2. Local Zustand store updates **instantly** → no lag
3. `useProjectSettingsSync` detects change
4. After 500ms debounce → persists to database
5. Ready for next session

### On Video Upload:
1. Video uploaded to R2
2. Asset row created in database
3. Timeline initialized with video block
4. **Project settings initialized** with defaults
5. Settings ready to be customized

## Benefits

✅ **Complete Persistence** - Every setting saved, nothing lost
✅ **Instant UI** - Local stores update immediately
✅ **Efficient Sync** - 500ms debounce prevents excessive writes
✅ **Fast Restore** - Single query loads all settings
✅ **Clean Separation** - Settings vs timeline data
✅ **Type-Safe** - Full TypeScript types throughout
✅ **Handles Edge Cases** - Projects without videos, missing settings

## Settings That DON'T Persist (By Design)

- **Playback State**: currentTime, isPlaying (reset on load)
- **Active Tab Index**: Which panel is open (always starts on Video)
- **Custom Background Images**: Only references, not file data
- **Temporary Blob URLs**: Regenerated from R2 on load
- **Selected Block**: Timeline selection (reset on load)

## Future Enhancements

- 🎯 Restore playback position (currentTime)
- 🎯 Restore active tab index
- 🎯 Restore selected block state
- 🎯 Export/import project presets
- 🎯 Project templates with preset settings
- 🎯 Undo/redo for settings changes
- 🎯 Settings version history

## Migration Notes

**Existing Projects**: Will get settings initialized on first load with defaults. All future changes will be saved.

**Database Cleanup**: The old `zoomPanMode` field is optional for backward compatibility but no longer used.

## Usage

No changes needed in your code! The hooks are automatically active in the Studio component. Just:

1. Open a project
2. Customize settings in any panel
3. Close/navigate away
4. Return to project → everything restored ✨
