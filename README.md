This is a [Next.js](https://nextjs.org) project bootstrapped with ...[`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn devhj

# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database

The main flashcard app reads and writes decks and cards through Neon using the server-side `DATABASE_URL` environment variable. Configure it in Vercel for Production and in `.env.local` for local development; never commit the connection string.

The Neon database must already contain the `public.decks` and `public.flashcards` tables and the columns used by `supabase/schema.sql`. The app does not run schema changes on startup. Do not run `prisma db push` against an existing database unless you have reviewed the generated changes and backed up the data.

Supabase remains in use for authentication and auxiliary data such as playlists, study progress, and CBLE exam results.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
