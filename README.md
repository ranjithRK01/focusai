# FocusAI

A productivity companion SaaS app.

## Tech Stack

- Frontend: Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui
- Auth: Clerk
- Database: MongoDB with Mongoose
- Validation: Zod
- State Management: React Query, React Hook Form

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB (local or Atlas)
- Clerk account

### Installation

1. Clone the repo
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.local` and fill in your Clerk and MongoDB credentials:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
   MONGO_URI=mongodb+srv://...
   CLERK_WEBHOOK_SECRET=
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```

## Usage

- Visit `http://localhost:3000` to see the landing page
- Sign in or sign up with Clerk
- Access the dashboard at `/dashboard`

## Project Structure

```
focusai/
├── app/
│   ├── api/
│   │   ├── goals/
│   │   │   └── route.ts
│   │   ├── reviews/
│   │   │   └── route.ts
│   │   ├── watch/
│   │   │   └── route.ts
│   │   └── webhooks/
│   │       └── clerk/
│   │           └── route.ts
│   ├── about/
│   │   └── page.tsx
│   ├── dashboard/
│   │   ├── goals/
│   │   │   └── page.tsx
│   │   ├── history/
│   │   │   └── page.tsx
│   │   ├── reviews/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── pricing/
│   │   └── page.tsx
│   ├── sign-in/
│   │   └── [[...sign-in]]/
│   │       └── page.tsx
│   ├── sign-up/
│   │   └── [[...sign-up]]/
│   │       └── page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── lib/
│   ├── mongodb.ts
│   ├── server-helpers.ts
│   ├── api-helpers.ts
│   └── utils.ts
├── models/
│   └── User.ts
├── types/
│   └── user.ts
├── middleware.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

## License

MIT
