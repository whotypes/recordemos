"use client"

import { Check } from "lucide-react"
import Modal from "@/components/ui/modal"

export default function PremiumUpsellModal() {
  // This component is deprecated since we now use Autumn's checkout flow
  // Keeping it for backwards compatibility but it should not be used
  const showPremiumModal = false
  const setShowPremiumModal = () => {}

  const handleUpgrade = () => {
    setShowPremiumModal(false)
  }

  const footer = (
    <div className="flex gap-3">
      <button
        onClick={() => setShowPremiumModal(false)}
        className="flex-1 px-4 py-2.5 rounded text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
      >
        Maybe Later
      </button>
      <button
        onClick={handleUpgrade}
        className="flex-1 px-4 py-2.5 rounded text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
      >
        Start Free Trial
      </button>
    </div>
  )

  return (
    <Modal
      isOpen={showPremiumModal}
      onClose={() => setShowPremiumModal(false)}
      title="Unlock Premium Features"
      footer={footer}
      maxWidth="max-w-2xl"
    >
      <div>
        <div className="mb-8">
          <h3 className="text-xl font-bold text-foreground mb-2">Upgrade to Premium</h3>
          <p className="text-sm text-muted-foreground">Get access to advanced backgrounds and more creative tools.</p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="flex gap-3">
            <Check size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Gradient Backgrounds</p>
              <p className="text-xs text-muted-foreground mt-1">10+ premium gradients for stunning visuals</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Check size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Advanced Animations</p>
              <p className="text-xs text-muted-foreground mt-1">Smooth transitions and effects</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Check size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">4K Export</p>
              <p className="text-xs text-muted-foreground mt-1">Export your demos in 4K quality</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Check size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Priority Support</p>
              <p className="text-xs text-muted-foreground mt-1">Get help when you need it most</p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-muted rounded-lg p-4 mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-foreground">$9</span>
            <span className="text-sm text-muted-foreground">/month</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Cancel anytime. No credit card required for trial.</p>
        </div>
      </div>
    </Modal>
  )
}
