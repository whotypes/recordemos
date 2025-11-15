import { AuthenticateWithRedirectCallback, useAuth } from '@clerk/tanstack-react-start';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/sign-in/sso-callback')({
    component: Page,
});

function Page() {
    const { isLoaded, isSignedIn } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            // If user is not authenticated, redirect to app's hosted sign-in page
            navigate({ to: '/sign-in/$' });
        }
    }, [isLoaded, isSignedIn, navigate]);

    // Don't render the callback component if user is not authenticated
    if (!isLoaded || !isSignedIn) {
        return null;
    }

    return (
        <div className="main min-h-screen bg-background">
            <div className="up">
                <div className="loaders">
                    <div className="loader"></div>
                    <div className="loader"></div>
                    <div className="loader"></div>
                    <div className="loader"></div>
                    <div className="loader"></div>
                    <div className="loader"></div>
                    <div className="loader"></div>
                    <div className="loader"></div>
                    <div className="loader"></div>
                    <div className="loader"></div>
                </div>
                <div className="loadersB">
                    <div className="loaderA">
                        <div className="ball0"></div>
                    </div>
                    <div className="loaderA">
                        <div className="ball1"></div>
                    </div>
                    <div className="loaderA">
                        <div className="ball2"></div>
                    </div>
                    <div className="loaderA">
                        <div className="ball3"></div>
                    </div>
                    <div className="loaderA">
                        <div className="ball4"></div>
                    </div>
                    <div className="loaderA">
                        <div className="ball5"></div>
                    </div>
                    <div className="loaderA">
                        <div className="ball6"></div>
                    </div>
                    <div className="loaderA">
                        <div className="ball7"></div>
                    </div>
                    <div className="loaderA">
                        <div className="ball8"></div>
                    </div>
                </div>
            </div>
            <AuthenticateWithRedirectCallback />
            <div id="clerk-captcha" />
        </div>
    );
}
