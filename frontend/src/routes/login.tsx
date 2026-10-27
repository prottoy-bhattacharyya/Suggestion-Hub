import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Margin" },
      { name: "description", content: "Log in with your university email." },
      { property: "og:title", content: "Log in — Margin" },
      { property: "og:description", content: "Access verified course notes." },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [forgot, setForgot] = useState(false);
  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <h1 className="text-3xl">{forgot ? "Reset password" : "Welcome back"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{forgot ? "We'll email you a reset link." : "Use your university email."}</p>
      <form className="paper-card mt-6 space-y-4 p-6" onSubmit={(e) => { e.preventDefault(); if (!forgot) nav({ to: "/feed" }); }}>
        <div><label className="label-sm">Email</label><input className="field" type="email" placeholder="you@university.edu" required /></div>
        {!forgot && <div><label className="label-sm">Password</label><input className="field" type="password" required /></div>}
        <button className="btn-primary w-full">{forgot ? "Send reset link" : "Log in"}</button>
        <button type="button" onClick={() => setForgot(!forgot)} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
          {forgot ? "Back to log in" : "Forgot password?"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm">New here? <Link to="/signup" className="font-semibold text-primary">Create an account</Link></p>
    </div>
  );
}
