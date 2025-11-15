import { AuthenticateWithRedirectCallback } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sign-in/sso-callback')({
    component: Page,
});

function Page() {
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
