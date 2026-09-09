import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
export const metadata: Metadata = { title: "Create account" };
export default function SignUpPage() { return <main className="auth-page"><a className="brand auth-brand" href="/"><span className="brand-mark"><span /></span><span>Nexus</span></a><section className="auth-card"><span className="kicker">Join Nexus</span><h1>Make the internet feel smaller.</h1><p>One account for thoughtful search, public rooms, and private conversations.</p><AuthForm mode="sign-up" /><small>Already have an account? <a href="/sign-in">Sign in</a></small></section></main>; }
