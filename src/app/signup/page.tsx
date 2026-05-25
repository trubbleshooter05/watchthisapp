import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Join the MoviesLike watchlist waitlist",
  description: "Get notified when MoviesLike personalized watchlists launch.",
  alternates: { canonical: `${getSiteUrl()}/signup` },
  robots: { index: false, follow: true },
};

export default function SignupPage() {
  return (
    <SignupForm />
  );
}
