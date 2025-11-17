import { NeonRGBTextEffect } from '@/components/neon-rgb';
import { useIsMobile } from '@/lib/hooks/use-mobile';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/manifesto')({
  component: RouteComponent,
})

function RouteComponent() {
    const navigate = useNavigate()
    const isMobile = useIsMobile()
    return (
        <div className="relative w-screen bg-[#181624] text-white">
            <div className="fixed inset-0">
                <img
                    src="/aura.png"
                    alt="Aura background"
                    className="mt-12 md:mt-6"
                />
                <div
                    className="absolute inset-0 bg-black transition-opacity"
                    style={{
                        opacity: isMobile ? 0.65 : 0.75
                    }}
                />
            </div>
            <div className="relative z-10">
                <article className="md:max-w-xl md:mx-auto mx-12 md:px-10 py-10">
                    <Link to="/" className="z-50 relative left-0 text-primary hover:text-primary/80 transition-colors flex items-center gap-1 hover:underline p-2 rounded w-fit">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7 7-7m4" />
                        </svg>
                        Back
                    </Link>
                    <div className="text-center">
                        <header className={`relative ${isMobile ? 'scale-125' : 'scale-[2]'} text-center md:mb-0 -translate-x-2`}>
                            <NeonRGBTextEffect text="Manifesto" isMobile={isMobile} />
                        </header>
                    </div>
                    <div className="text-white space-y-6 text-sm md:text-base leading-relaxed -translate-y-36 mt-4 md:mt-0">
                        <p>
                            Creation should not fade just because the tools do.
                        </p>

                        <p>
                            <a href="https://www.screenstudio.com/" target="_blank" rel="noopener noreferrer" className="underline text-primary">ScreenStudio</a> got too expensive.
                            <br />
                            <a href="https://www.loom.com/" target="_blank" rel="noopener noreferrer" className="underline text-primary">Loom</a> pivoted into corporate memory.
                            <br />
                            <a href="https://en.wikipedia.org/wiki/QuickTime" target="_blank" rel="noopener noreferrer" className="underline text-primary">QuickTime</a> stopped being enough the day it launched.
                        </p>

                        <p>Every time creators finally get speed and polish in one place,<br /> → features disappear, <br /> → paywalls tighten, <br /> → and the workflow breaks again.</p>

                        <p className="text-primary font-medium">RecordDemos is my refusal to let that cycle continue.</p>

                        <p>This is not a startup pitch.<br />This is a promise.</p>

                        <p>
                            To every engineer who needed one clean take at 2AM. <br /> To every designer who wanted to clip, trim, and share without waiting for export hell. <br /> To every hacker who just wanted their idea to look as smooth as it felt in their head.
                        </p>

                        <p>You deserve tools that stay out of your way.<br />You deserve an editor that loads instantly.<br />You deserve a workflow that does not punish you for wanting quality.</p>

                        <p>People say good screen recording is a solved problem. <br /> I say they stopped paying attention. <br /></p>

                        <p>So I built RecordDemos. Not to chase trends, <br /><br /> but to give creators a place where speed, clarity, and intention can live together.</p>

                        <p>If everything else becomes bloated or locked down,<br />this will remain simple, fast, and yours.</p>

                        <p className="italic text-primary text-xl font-medium mt-8 group">
                            so before you forget the idea you just had,<br />
                            before the inspiration slips,<br />
                            and before the window closes —
                            <span
                                className="relative inline-block ml-2"
                                style={{ marginLeft: "0.5em" }}
                            >
                                <span
                                    className="absolute inset-0 bg-primary rotate-3 translate-y-[1.0px] group-hover:rotate-0 transition-transform group-hover:bg-primary/80"
                                    style={{ zIndex: -1 }}
                                ></span>
                                <span
                                    onClick={async () => {
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                        await new Promise((resolve) => setTimeout(resolve, 1000));
                                        navigate({ to: "/" });
                                    }}
                                    title="Enter RecordDemos"
                                    className="hover:cursor-pointer relative z-10 text-white"
                                    style={{ marginLeft: "0.33em" }}
                                >
                                    press record.
                                </span>
                            </span>
                        </p>

                    </div>
                </article>
            </div>
        </div>
    )
}
