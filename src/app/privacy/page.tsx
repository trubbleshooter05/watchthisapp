import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for MoviesLike.app — how we collect, use, and protect your information.",
  alternates: { canonical: `${getSiteUrl()}/privacy` },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-[#6B7280] mb-10">Last updated: March 2026</p>

      <div className="space-y-10 text-[#D1D5DB] leading-relaxed">

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">1. Who We Are</h2>
          <p>
            MoviesLike.app (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is a movie recommendation tool operated
            at <strong>https://www.movieslike.app</strong>. For privacy inquiries, contact us at{" "}
            <a href="mailto:privacy@movieslike.app" className="text-amber-500 hover:underline">
              privacy@movieslike.app
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">2. Information We Collect</h2>
          <p>We do not require account registration and do not collect your name, email, or payment information to use the site.</p>
          <p>We may automatically collect the following data when you visit:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Browser type, operating system, and device type</li>
            <li>Pages visited, referral URLs, and time spent on pages</li>
            <li>IP address (anonymized where possible)</li>
            <li>Cookies and similar tracking technologies (see Section 4)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>To operate and improve the site</li>
            <li>To analyze traffic and usage patterns via Google Analytics</li>
            <li>To serve relevant advertising via Google AdSense</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">4. Cookies &amp; Tracking</h2>
          <p>
            We use cookies and similar technologies to operate the site and deliver advertising. This includes
            first-party cookies set by MoviesLike.app and third-party cookies set by services such as:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <strong>Google Analytics</strong> — measures site traffic and usage behavior. See{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">
                Google&apos;s Privacy Policy
              </a>.
            </li>
            <li>
              <strong>Google AdSense</strong> — serves interest-based ads. Google may use cookies to show
              you ads based on your browsing history across other sites. You can opt out at{" "}
              <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">
                Google Ad Settings
              </a>.
            </li>
          </ul>
          <p>
            You can manage or disable cookies through your browser settings. Note that disabling cookies may
            affect site functionality.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">5. Advertising</h2>
          <p>
            We use or may use Google AdSense to display advertisements on this site. Google and its partners
            use cookies to serve ads based on your prior visits to this and other websites. You may opt out of
            personalized advertising by visiting{" "}
            <a href="https://www.aboutads.info/choices" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">
              aboutads.info/choices
            </a>{" "}
            or{" "}
            <a href="https://www.networkadvertising.org/choices/" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">
              networkadvertising.org/choices
            </a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">6. Affiliate Links</h2>
          <p>
            Some links on this site are affiliate links to streaming services. We may earn a commission if
            you click through and make a purchase or subscribe, at no additional cost to you. See our{" "}
            <a href="/terms" className="text-amber-500 hover:underline">Terms of Service</a> for full disclosure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">7. Third-Party Services</h2>
          <p>
            This product uses the TMDB API for movie metadata, posters, and streaming availability. TMDB is
            not affiliated with or endorsing MoviesLike.app. See{" "}
            <a href="https://www.themoviedb.org/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">
              TMDB&apos;s Privacy Policy
            </a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">8. Data Retention &amp; Security</h2>
          <p>
            We retain analytics data in aggregate form. We do not sell your personal information to third
            parties. We implement reasonable technical measures to protect the information we collect, though
            no method of internet transmission is 100% secure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">9. GDPR (European Users)</h2>
          <p>
            If you are located in the European Economic Area (EEA), you have the right to access, correct,
            or delete your personal data. You also have the right to object to or restrict certain processing
            and the right to data portability. To exercise these rights, contact us at{" "}
            <a href="mailto:privacy@movieslike.app" className="text-amber-500 hover:underline">
              privacy@movieslike.app
            </a>.
          </p>
          <p>
            Our legal basis for processing data is our legitimate interest in operating and improving the
            site, and your consent where required (e.g. for advertising cookies).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">10. CCPA (California Residents)</h2>
          <p>
            California residents have the right to know what personal information is collected, to request
            deletion of their personal information, and to opt out of the sale of personal information. We do
            not sell personal information. To submit a request, contact{" "}
            <a href="mailto:privacy@movieslike.app" className="text-amber-500 hover:underline">
              privacy@movieslike.app
            </a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">11. Children&apos;s Privacy</h2>
          <p>
            This site is not directed to children under 13. We do not knowingly collect personal information
            from children under 13. If you believe we have inadvertently collected such information, contact
            us and we will delete it promptly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an
            updated date. Continued use of the site after changes constitutes acceptance.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">13. Contact</h2>
          <p>
            Questions about this Privacy Policy?{" "}
            <a href="mailto:privacy@movieslike.app" className="text-amber-500 hover:underline">
              privacy@movieslike.app
            </a>
          </p>
        </section>

      </div>
    </main>
  );
}
