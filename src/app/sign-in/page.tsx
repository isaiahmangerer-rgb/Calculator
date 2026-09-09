import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
export const metadata: Metadata = { title: "Sign in" };
export default function SignInPage() { return <main className="auth-page"><a className="brand auth-brand" href="/"><span className="brand-mark"><span /></span><span>Nexus</span></a><section className="auth-card"><span className="kicker">Welcome back</span><h1>Return to your people.</h1><p>Sign in to continue your conversations and see what you missed.</p><AuthForm mode="sign-in" /><small>New to Nexus? <a href="/sign-up">Create an account</a></small></section></main>; }
