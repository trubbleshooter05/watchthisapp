This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Google Search Console (GSC) sync

Scripts such as `npm run data:gsc:sync` call the Search Console API using a Google **service account JSON** key.

- **Do not commit** that file. It is listed in `.gitignore` as `gsc-service-account.json`; keep it out of the repo and any shared branches.
- **Preferred setup:** point `GSC_SERVICE_ACCOUNT_FILE` at the JSON file’s absolute path (copy `.env.example` to `.env.local` and set variables there). The sync script also honors `GSC_CREDENTIALS_FILE` as an alias.
- **Repo-root fallback:** if no `--credentials` flag and no env path is set, the script looks for `gsc-service-account.json` at the **repository root**. That behavior is only for **local development** on your machine; do not rely on it in CI, production, or team workflows.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
