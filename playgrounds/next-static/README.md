This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

It mirrors the `next-latest` playground but targets Next.js static export (`output: 'export'` in `next.config.ts`). Because static export has no request-time server, it uses `@localess/react/ssr` — `getLocalessClient`, `localessInit`, `LocalessServerDocument` — instead of `@localess/react/rsc`, which requires a live server and is not compatible with static export (see that package's `SKILL.md`/`docs/react.md` "Export Variants"). `LocalessServerComponent`/`LocalessServerDocument` render without Visual Editor sync attributes, since live editing has no meaning once the HTML is pre-baked.

The locale switcher mirrors `next-latest`'s path-segment pattern (`/en`, `/fr`, …), but since static export has no request-time server, every locale is pre-rendered at build time via `generateStaticParams` in `app/[[...locale]]/page.tsx` — one static HTML file per locale, plus `/` for the default.

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
