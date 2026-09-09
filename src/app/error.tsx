"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) { return <main className="fatal-state"><div className="brand-mark"><span /></div><h1>That connection went quiet.</h1><p>Nexus couldn’t finish loading this view.</p><button className="primary-button" onClick={reset}>Try again</button></main>; }
