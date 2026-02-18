# LVL3 Portal

A client portal built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Getting Started

### 1. Clone & Install

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.local` and fill in your Supabase credentials (see below).

### 3. Set Up the Database

Run the migration files in order against your Supabase project:

```bash
# Using the Supabase CLI (recommended)
supabase db push

# Or manually copy/paste each file in supabase/migrations/ into the
# Supabase SQL Editor in order (lowest timestamp first)
```

### 4. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

All variables live in `.env.local`. **Never commit this file to version control.**

| Variable | Description | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project's base URL | Supabase Dashboard → Project Settings → API → **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key — safe to expose in the browser. Used for all client-side Supabase calls. RLS policies control what data users can access. | Supabase Dashboard → Project Settings → API → Project API Keys → **anon public** |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** service role key that bypasses Row Level Security. Only used in server-side code (Server Actions, Route Handlers). Never import this in client components. | Supabase Dashboard → Project Settings → API → Project API Keys → **service_role** |

---

## Project Structure

```
lvl3-portal/
├── app/
│   ├── (auth)/
│   │   └── login/          # Magic link login page
│   ├── (dashboard)/        # Protected portal pages
│   │   ├── layout.tsx      # Sidebar layout
│   │   ├── page.tsx        # Home
│   │   ├── projects/
│   │   ├── dashboard/
│   │   ├── deliverables/
│   │   ├── insights/
│   │   ├── services/
│   │   └── admin/          # Admin-only section
│   ├── auth/
│   │   └── callback/       # Supabase auth callback handler
│   └── layout.tsx
├── components/
│   └── sidebar.tsx         # Persistent sidebar nav
├── lib/
│   └── supabase/
│       ├── client.ts       # Browser Supabase client
│       └── server.ts       # Server Supabase client
├── supabase/
│   └── migrations/         # SQL migration files (run in order)
└── middleware.ts            # Session refresh middleware
```

---

## Auth Flow

1. User visits any protected route → redirected to `/login`
2. User enters email → magic link sent via Supabase Auth
3. User clicks link in email → redirected to `/auth/callback`
4. Callback exchanges code for session → redirected to `/`
5. Middleware keeps session fresh on every request

---

## Database Schema

| Table | Purpose |
|---|---|
| `clients` | Client companies — each has a unique slug, optional Google Sheet & Looker embed |
| `users` | Portal users — linked to `auth.users`, role is `admin` or `client` |
| `deliverables` | Files/links shared with a client (pdf, slides, sheets, link) |
| `comments` | Threaded comments on deliverables with resolve/unresolve |
| `posts` | Insights/updates — can be global or targeted to a specific client |
| `services` | Agency services shown to clients — can be targeted to specific client IDs |

All tables have Row Level Security enabled. Clients can only read their own data. Admins have full access.
