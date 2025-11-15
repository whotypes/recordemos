import { FreePricingCards, ProPricingCards } from "@/components/autumn/pricing-cards";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { ProductDetails } from "autumn-js/react";

interface UpgradeModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	productDetails?: ProductDetails[];
}

export function UpgradeModal({
	open,
	onOpenChange,
	productDetails,
}: UpgradeModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				overlayClassName="bg-black/80 backdrop-blur-sm"
				className="max-w-5xl w-full p-0 gap-0 bg-background/95 backdrop-blur-sm"
			>
				<DialogHeader className="px-6 pt-6 pb-4 border-b">
					<DialogTitle className="text-2xl font-bold">Upgrade Your Plan</DialogTitle>
					<DialogDescription className="text-base mt-2">
						Choose the plan that works best for you
					</DialogDescription>
				</DialogHeader>
				<div className="px-6 pb-6 pt-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
						<div className="flex flex-col justify-start">
							<FreePricingCards productDetails={productDetails} />
						</div>
						<div className="flex flex-col justify-start">
							<ProPricingCards productDetails={productDetails} />
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
