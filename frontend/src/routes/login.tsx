import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import axios from "axios";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Margin" },
      {
        name: "description",
        content: "Log in with your university email.",
      },
      { property: "og:title", content: "Log in — Margin" },
      {
        property: "og:description",
        content: "Access verified course notes.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();

  const [forgot, setForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      setLoading(true);

      // if (forgot) {
      //   // Password reset request
      //   const response = await axios.post(
      //     "http://localhost:8000/accounts/password-reset/",
      //     { email },
      //     {
      //       headers: {
      //         "Content-Type": "application/json",
      //         Accept: "application/json",
      //       },
      //     }
      //   );

      //   setSuccess(
      //     response.data.message ||
      //       "If an account exists for this email, password reset instructions will be sent."
      //   );

      //   return;
      // }

      // CSRF token request (if your Django backend uses CSRF protection)
      const csrfResponse = await axios.get("http://localhost:8000/accounts/csrf/", {
        withCredentials: true,
      });


      // Login request
      const response = await axios.post(
        "http://localhost:8000/accounts/login/",
        {
          email,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CSRFToken": csrfResponse.data.csrfToken, // Include CSRF token if needed
          },
          // Keep this if your Django backend uses session authentication.
          withCredentials: true,
        }
      );

      // Save a token if your backend uses token authentication.
      // Adjust "access" to match your Django response field.
      if (response.data.access) {
        localStorage.setItem("access_token", response.data.access);
      }

      setSuccess("Login successful!");

      // Redirect after successful login.
      await nav({ to: "/" });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data;

        setError(
          responseData?.error ||
            responseData?.detail ||
            responseData?.message ||
            "Login failed. Please check your email and password."
        );
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <h1 className="text-3xl">
        {forgot ? "Reset password" : "Welcome back"}
      </h1>

      <p className="mt-1 text-sm text-muted-foreground">
        {forgot
          ? "We'll email you a reset link."
          : "Use your university email."}
      </p>

      <form
        className="paper-card mt-6 space-y-4 p-6"
        onSubmit={handleLogin}
      >
        <div>
          <label htmlFor="email" className="label-sm">
            Email
          </label>

          <input
            id="email"
            name="email"
            className="field w-full"
            type="email"
            placeholder="you@university.edu"
            autoComplete="email"
            required
          />
        </div>

        {!forgot && (
          <div>
            <label htmlFor="password" className="label-sm">
              Password
            </label>

            <input
              id="password"
              name="password"
              className="field w-full"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
        )}

        {error && (
          <div
            className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="rounded-md border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-600"
            role="status"
          >
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Please wait..."
            : forgot
              ? "Send reset link"
              : "Log in"}
        </button>

        <button
          type="button"
          onClick={() => {
            setForgot(!forgot);
            setError("");
            setSuccess("");
          }}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {forgot ? "Back to log in" : "Forgot password?"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        New here?{" "}
        <Link to="/signup" className="font-semibold text-primary">
          Create an account
        </Link>
      </p>
    </div>
  );
}