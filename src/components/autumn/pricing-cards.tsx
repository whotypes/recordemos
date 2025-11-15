import { CheckoutDialog } from "@/components/autumn/checkout-dialog";
import {
	Badge,
	Body,
	Card,
	Description,
	Header,
	List,
	ListItem,
	MainPrice,
	Period,
	Plan,
	PlanName,
	Price,
	Separator,
} from "@/components/autumn/pricing-card";
import { Button } from "@/components/ui/button";
import { getPricingTableContent } from "@/lib/autumn/pricing-table-content";
import { cn } from "@/lib/utils";
import type { Product } from "autumn-js";
import {
	type ProductDetails,
	useCustomer,
	usePricingTable,
} from "autumn-js/react";
import { CheckCircle2, Loader2, Users, XCircleIcon } from "lucide-react";

interface PricingCardsProps {
	productDetails?: ProductDetails[];
}

export function FreePricingCards({ productDetails }: PricingCardsProps) {
	const { customer, checkout } = useCustomer({ errorOnNotFound: false });
	const { products, isLoading, error } = usePricingTable({ productDetails });

	if (isLoading) {
		return (
			<div className="w-full h-full flex justify-center items-center min-h-[300px]">
				<Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
			</div>
		);
	}

	if (error) {
		return <div>Something went wrong...</div>;
	}

	if (!products || products.length === 0) {
		return null;
	}

	const filteredProducts = products.filter((p) => {
		return p.properties?.interval_group === 'month' || !p.properties?.interval_group;
	});

	const basicPlan = filteredProducts[0];
	const proPlan = filteredProducts[1];

	if (!basicPlan) {
		return null;
	}

	return (
		<CombinedPricingCard
			basicPlan={basicPlan}
			proPlan={proPlan}
			customer={customer}
			checkout={checkout}
		/>
	);
}

export function ProPricingCards({ productDetails }: PricingCardsProps) {
	const { customer, checkout } = useCustomer({ errorOnNotFound: false });
	const { products, isLoading, error } = usePricingTable({ productDetails });

	if (isLoading) {
		return (
			<div className="w-full h-full flex justify-center items-center min-h-[300px]">
				<Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
			</div>
		);
	}

	if (error) {
		return <div>Something went wrong...</div>;
	}

	if (!products || products.length === 0) {
		return null;
	}

	const filteredProducts = products.filter((p) => {
		return p.properties?.interval_group === 'month' || !p.properties?.interval_group;
	});

	const basicPlan = filteredProducts[0];
	const proPlan = filteredProducts[1];

	if (!basicPlan || !proPlan) {
		return null;
	}

	return (
		<ProPricingCard
			basicPlan={basicPlan}
			proPlan={proPlan}
			customer={customer}
			checkout={checkout}
		/>
	);
}

interface CombinedPricingCardProps {
	basicPlan: Product;
	proPlan?: Product;
	customer: ReturnType<typeof useCustomer>['customer'];
	checkout: ReturnType<typeof useCustomer>['checkout'];
}

function CombinedPricingCard({ basicPlan, proPlan, customer, checkout }: CombinedPricingCardProps) {
	const { name, display: productDisplay } = basicPlan;
	const { buttonText } = getPricingTableContent(basicPlan, customer);

	const isRecommended = productDisplay?.recommend_text ? true : false;
	const mainPriceDisplay = basicPlan.properties?.is_free
		? {
				primary_text: 'Free',
			}
		: basicPlan.items[0]?.display;

	const basicFeatureItems = basicPlan.properties?.is_free
		? basicPlan.items
		: basicPlan.items.slice(1);

	const proFeatureItems = proPlan
		? (proPlan.properties?.is_free
				? proPlan.items
				: proPlan.items.slice(1))
		: [];

	const priceText = mainPriceDisplay?.primary_text || '';
	const periodText = mainPriceDisplay?.secondary_text || '';

	const handleClick = async () => {
		console.log('handleClick', basicPlan.id, customer);
		if (basicPlan.id && customer) {
			const result = await checkout({
				productId: basicPlan.id,
				dialog: CheckoutDialog,
				successUrl: window.location.origin + '/studio',
			});

			if (result?.data?.url && !basicPlan.properties?.is_free) {
				window.location.href = result.data.url;
			}
		} else if (basicPlan.display?.button_url) {
			window.open(basicPlan.display?.button_url, '_blank');
		}
	};

	const isDisabled =
		(basicPlan.scenario === 'active' && !basicPlan.properties.updateable) ||
		basicPlan.scenario === 'scheduled';

	return (
		<Card className={cn(isRecommended && 'ring-2 ring-primary')}>
			<Header>
				<Plan>
					<PlanName>
						<Users aria-hidden="true" />
						<span className="text-muted-foreground">
							{productDisplay?.name || name}
						</span>
					</PlanName>
					{productDisplay?.recommend_text && (
						<Badge>{productDisplay.recommend_text}</Badge>
					)}
				</Plan>
				{productDisplay?.description && (
					<Description className="mb-4">{productDisplay.description}</Description>
				)}
				<Price>
					<MainPrice>{priceText}</MainPrice>
					{periodText && <Period>{periodText}</Period>}
				</Price>
				<Button
					className={cn(
						'w-full font-semibold text-white',
						isRecommended
							? 'bg-gradient-to-b from-orange-500 to-orange-600 shadow-[0_10px_25px_rgba(255,115,0,0.3)]'
							: '',
					)}
					onClick={handleClick}
					disabled={isDisabled}
				>
					{productDisplay?.button_text || buttonText || 'Get Started'}
				</Button>
			</Header>
			<Body>
				{basicFeatureItems.length > 0 && (
					<List>
						{basicFeatureItems.map((item) => {
							const primaryText = item.display?.primary_text || '';
							const secondaryText = item.display?.secondary_text || '';

							return (
								<ListItem key={crypto.randomUUID()}>
									<span className="mt-0.5">
										<CheckCircle2
											className="h-4 w-4 text-green-500"
											aria-hidden="true"
										/>
									</span>
									<span>
										{primaryText}{" "}
										{secondaryText && (
											<span className="text-muted-foreground text-xs">
												{secondaryText}
											</span>
										)}
									</span>
								</ListItem>
							);
						})}
					</List>
				)}
				{proPlan && proFeatureItems.length > 0 && (
					<>
						<Separator>Pro features</Separator>
						<List>
							{proFeatureItems.map((item) => {
								const primaryText = item.display?.primary_text || '';
								const secondaryText = item.display?.secondary_text || '';

								return (
									<ListItem key={crypto.randomUUID()} className="opacity-75">
										<span className="mt-0.5">
											<XCircleIcon
												className="text-destructive h-4 w-4"
												aria-hidden="true"
											/>
										</span>
										<span>
											{primaryText}{" "}
											{secondaryText && (
												<span className="text-muted-foreground text-xs">
													{secondaryText}
												</span>
											)}
										</span>
									</ListItem>
								);
							})}
						</List>
					</>
				)}
			</Body>
		</Card>
	);
}

interface ProPricingCardProps {
	basicPlan: Product;
	proPlan: Product;
	customer: ReturnType<typeof useCustomer>['customer'];
	checkout: ReturnType<typeof useCustomer>['checkout'];
}

function ProPricingCard({ basicPlan, proPlan, customer, checkout }: ProPricingCardProps) {
	const { name, display: productDisplay } = proPlan;
	const { buttonText } = getPricingTableContent(proPlan, customer);

	const isRecommended = productDisplay?.recommend_text ? true : false;
	const mainPriceDisplay = proPlan.properties?.is_free
		? {
				primary_text: 'Free',
			}
		: proPlan.items[0]?.display;

	const basicFeatureItems = basicPlan.properties?.is_free
		? basicPlan.items
		: basicPlan.items.slice(1);

	const proFeatureItems = proPlan.properties?.is_free
		? proPlan.items
		: proPlan.items.slice(1);

	const priceText = mainPriceDisplay?.primary_text || '';
	const periodText = mainPriceDisplay?.secondary_text || '';

	const handleClick = async () => {
		console.log('handleClick', proPlan.id, customer);
		if (proPlan.id && customer) {
			const result = await checkout({
				productId: proPlan.id,
				dialog: CheckoutDialog,
				successUrl: window.location.origin + '/studio',
			});

			if (result?.data?.url && !proPlan.properties?.is_free) {
				window.location.href = result.data.url;
			}
		} else if (proPlan.display?.button_url) {
			window.open(proPlan.display?.button_url, '_blank');
		}
	};

	const isDisabled =
		(proPlan.scenario === 'active' && !proPlan.properties.updateable) ||
		proPlan.scenario === 'scheduled';

	return (
		<Card className={cn(isRecommended && 'ring-2 ring-primary')}>
			<Header>
				<Plan>
					<PlanName>
						<Users aria-hidden="true" />
						<span className="text-muted-foreground">
							{productDisplay?.name || name}
						</span>
					</PlanName>
					{productDisplay?.recommend_text && (
						<Badge>{productDisplay.recommend_text}</Badge>
					)}
				</Plan>
				{productDisplay?.description && (
					<Description className="mb-4">{productDisplay.description}</Description>
				)}
				<Price>
					<MainPrice>{priceText}</MainPrice>
					{periodText && <Period>{periodText}</Period>}
				</Price>
				<Button
					className={cn(
						'w-full font-semibold text-white',
						isRecommended
							? 'bg-gradient-to-b from-orange-500 to-orange-600 shadow-[0_10px_25px_rgba(255,115,0,0.3)]'
							: '',
					)}
					onClick={handleClick}
					disabled={isDisabled}
				>
					{productDisplay?.button_text || buttonText || 'Get Started'}
				</Button>
			</Header>
			<Body>
				{proFeatureItems.length > 0 && (
					<List>
						{proFeatureItems.map((item) => {
							const primaryText = item.display?.primary_text || '';
							const secondaryText = item.display?.secondary_text || '';

							return (
								<ListItem key={crypto.randomUUID()}>
									<span className="mt-0.5">
										<CheckCircle2
											className="h-4 w-4 text-green-500"
											aria-hidden="true"
										/>
									</span>
									<span>
										{primaryText}{" "}
										{secondaryText && (
											<span className="text-muted-foreground text-xs">
												{secondaryText}
											</span>
										)}
									</span>
								</ListItem>
							);
						})}
					</List>
				)}
				{basicFeatureItems.length > 0 && (
					<>
						<Separator>Pro features</Separator>
						<List>
							{basicFeatureItems.map((item) => {
								const primaryText = item.display?.primary_text || '';
								const secondaryText = item.display?.secondary_text || '';

								return (
									<ListItem key={crypto.randomUUID()} className="opacity-75">
										<span className="mt-0.5">
											<XCircleIcon
												className="text-destructive h-4 w-4"
												aria-hidden="true"
											/>
										</span>
										<span className="line-through">
											{primaryText}{" "}
											{secondaryText && (
												<span className="text-muted-foreground text-xs">
													{secondaryText}
												</span>
											)}
										</span>
									</ListItem>
								);
							})}
						</List>
					</>
				)}
			</Body>
		</Card>
	);
}
