import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { ClerkProvider } from "@clerk/tanstack-react-start";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/tanstackstart-react";
import {
	CatchBoundary,
	createRootRouteWithContext,
	DefaultGlobalNotFound,
	HeadContent,
	Outlet,
	Scripts,
	useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import React from "react";

import { AutumnProviderComponent } from "@/components/autumn/autumn-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@clerk/tanstack-react-start/server";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { createServerFn } from "@tanstack/react-start";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import appCss from "../styles.css?url";

const fetchClerkAuth = createServerFn({ method: 'GET' }).handler(async () => {
	const authResult = await auth()

	if (!authResult.isAuthenticated || !authResult.userId) {
		return {
			userId: undefined,
			token: undefined,
		}
	}

	const token = await authResult.getToken({ template: 'convex' })

	return {
		userId: authResult.userId,
		token,
	}
})

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
	convexClient: ConvexReactClient;
	convexQueryClient: ConvexQueryClient;
}>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				name: "description",
				content:
					"Tired of that $299 ScreenStudio subscription? Try RecordDemos.com for free!",
			},
			{
				name: "title",
				content:
					"RecordDemos.com | Free In-Browser Screen Recording & Screen Capture",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				href: "/rd_logo.png",
				type: "image/png",
				sizes: "16x16",
			},
		],
	}),
	shellComponent: RootComponent,
	notFoundComponent: () => <DefaultGlobalNotFound />,
	beforeLoad: async (ctx) => {
		const authData = await fetchClerkAuth()
		const { userId, token } = authData

		// During SSR only (the only time serverHttpClient exists),
		// set the Clerk auth token to make HTTP queries with.
		if (token) {
			ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)
		}

		return {
			userId,
			token,
		}
	},
	errorComponent: (props) => {
		Sentry.captureException(props.error);
		return (
			<RootDocument>
				<CatchBoundary
					getResetKey={() => 'reset'}
					onCatch={(error) => console.error(error)}
				>
					<div>Error: {props.error.message}</div>
				</CatchBoundary>
			</RootDocument>
		)
	},
});

function RootComponent() {
	const context = useRouteContext({ from: Route.id })

	// Use the ConvexQueryClient's internal client, not the separate convexClient
	const convexClientForAuth = context.convexQueryClient.convexClient

	return (
		<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
			<ConvexProviderWithClerk client={convexClientForAuth} useAuth={useClerkAuth}>
				<AutumnProviderComponent>
					<RootDocument>
						<Outlet />
					</RootDocument>
				</AutumnProviderComponent>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	)
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<ThemeProvider defaultTheme="system">
					{/* <Navbar /> */}
					{children}
					<Toaster />
					<TanStackDevtools
						config={{
							position: "bottom-right",
							hideUntilHover: true,
							openHotkey: ["mod+shift+t"],
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
					<Scripts />
				</ThemeProvider>
			</body>
		</html>
	);
}
