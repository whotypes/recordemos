import { create } from "zustand"

interface SubscriptionState {
  isPremium: boolean
  setPremium: (premium: boolean) => void
  showPremiumModal: boolean
  setShowPremiumModal: (show: boolean) => void
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  isPremium: false,
  setPremium: (premium: boolean) => set({ isPremium: premium }),
  showPremiumModal: false,
  setShowPremiumModal: (show: boolean) => set({ showPremiumModal: show }),
}))
