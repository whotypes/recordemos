import { create } from "zustand"

export type FrameTypes =
  | 'Arc'
  | 'MacOS Dark'
  | 'MacOS Light'
  | 'Shadow'
  | 'None'

interface FrameOptionsState {
  frameHeight: 'small' | 'medium' | 'large'
  setFrameHeight: (height: 'small' | 'medium' | 'large') => void

  showSearchBar: boolean
  setShowSearchBar: (searchBar: boolean) => void

  showStroke: boolean
  setShowStroke: (showStroke: boolean) => void

  macOsDarkColor: string
  setMacOsDarkColor: (color: string) => void

  macOsLightColor: string
  setMacOsLightColor: (color: string) => void

  arcDarkMode: boolean
  setArcDarkMode: (darkMode: boolean) => void

  hideButtons: boolean
  setHideButtons: (hideButtons: boolean) => void

  hasButtonColor: boolean
  setHasButtonColor: (hasButtonColor: boolean) => void

  selectedFrame: FrameTypes
  setSelectedFrame: (frame: FrameTypes) => void

  frameRoundness: number
  setFrameRoundness: (roundness: number) => void

  searchBarText: string
  setSearchBarText: (text: string) => void
}

export const useFrameOptionsStore = create<FrameOptionsState>((set) => ({
  frameHeight: 'small',
  setFrameHeight: (frameHeight) => set({ frameHeight }),

  showSearchBar: false,
  setShowSearchBar: (searchBar) => set({ showSearchBar: searchBar }),

  showStroke: true,
  setShowStroke: (showStroke) => set({ showStroke }),

  macOsDarkColor: '#1a1a1a',
  setMacOsDarkColor: (color) => set({ macOsDarkColor: color }),

  macOsLightColor: '#f4f4f4',
  setMacOsLightColor: (color) => set({ macOsLightColor: color }),

  arcDarkMode: false,
  setArcDarkMode: (darkMode) => set({ arcDarkMode: darkMode }),

  hideButtons: false,
  setHideButtons: (hideButtons) => set({ hideButtons }),

  hasButtonColor: true,
  setHasButtonColor: (hasButtonColor) => set({ hasButtonColor }),

  selectedFrame: 'None',
  setSelectedFrame: (frame) => set({ selectedFrame: frame }),

  frameRoundness: 0.4,
  setFrameRoundness: (roundness) => set({ frameRoundness: roundness }),

  searchBarText: '',
  setSearchBarText: (text) => set({ searchBarText: text }),
}))
