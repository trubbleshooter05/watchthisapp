import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for MoviesLike.app.",
  alternates: { canonical: `${getSiteUrl()}/terms` },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-[#6B7280] mb-10">Last updated: March 2026</p>

      <div className="space-y-10 text-[#D1D5DB] leading-relaxed">

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">1. Acceptance of Terms</h2>
          <p>
            By accessing or using MoviesLike.app (&quot;the Site&quot;), you agree to be bound by these Terms
            of Service. If you do not agree, please do not use the Site. We reserve the right to update
            these terms at any time; continued use constitutes acceptance of any changes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">2. Description of Service</h2>
          <p>
            MoviesLike.app is a free web tool that provides AI-generated movie recommendations. The Site
            is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">3. AI-Generated Content Disclaimer</h2>
          <p>
            Recommendation blurbs, match percentages, and vibes on this Site are generated with the
            assistance of artificial intelligence and are <strong>subjective editorial opinions</strong>, not
            objective facts. They do not represent the views of film studios, cast, or crew.
          </p>
          <p>
            We make no guarantee that any recommendation will appeal to any individual user. Movie taste is
            personal — these recommendations are a starting point, not a guarantee.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">4. Streaming Availability Disclaimer</h2>
          <p>
            Streaming availability data is sourced from the TMDB API and reflects information available at
            the time the page was last updated. <strong>Streaming catalogs change frequently.</strong> We
            are not responsible for inaccuracies in streaming availability, pricing, or regional
            restrictions. Always verify availability on the provider&apos;s platform before subscribing or
            purchasing.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">5. Affiliate Disclosure</h2>
          <p>
            Some links on the Site are affiliate links. If you click a link and subscribe to or purchase a
            streaming service, we may receive a commission at no additional cost to you. This does not
            affect which movies or services we recommend — our editorial decisions are independent of
            affiliate relationships.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">6. TMDB Attribution</h2>
          <p>
            Movie metadata, poster images, ratings, and streaming availability data are provided by The
            Movie Database (TMDB). This product uses the TMDB API but is not endorsed or certified by TMDB.
            All TMDB data remains the property of its respective owners. TMDB terms of use apply.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">7. Advertising</h2>
          <p>
            This Site uses or may use Google AdSense and other advertising networks to display
            advertisements. Advertisements are clearly identified and are separate from editorial content.
            We are not responsible for the content of third-party advertisements.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">8. Intellectual Property</h2>
          <p>
            Original content on this Site — including recommendation copy, page structure, and UI — is
            owned by MoviesLike.app or licensed to us. Movie titles, posters, and metadata are the property
            of their respective studios and owners. You may not reproduce, distribute, or create derivative
            works from our original content without written permission.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">9. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, MoviesLike.app and its operators shall not be liable
            for any indirect, incidental, special, or consequential damages arising from your use of the
            Site, including but not limited to inaccurate streaming information, reliance on
            AI-generated content, or third-party service outages.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">10. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the United States. Any disputes shall be resolved in
            accordance with applicable U.S. law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">11. Contact</h2>
          <p>
            Questions about these Terms?{" "}
            <a href="mailto:privacy@movieslike.app" className="text-amber-500 hover:underline">
              privacy@movieslike.app
            </a>
          </p>
        </section>

      </div>
    </main>
  );
}
