# Players League VIP — Founding Player Platform Activation

The website code is deployed through Vercel, but the player database must be activated once in the existing Supabase project.

## 1. Apply the database migrations

Open Supabase Dashboard → SQL Editor and run these files in order:

1. `supabase/migrations/20260806090000_founding_player_platform.sql`
2. `supabase/migrations/20260806091000_player_score_function_fixes.sql`

The migrations create:

- secure player profiles and unique Founding Player numbers
- badges and badge awards
- community challenges and moderated submissions
- a non-monetary points ledger
- public player-directory, public-profile and leaderboard functions
- row-level security policies
- administrator moderation functions
- the first challenge: **The Game That Shaped Me**

## 2. Confirm Supabase Authentication settings

In Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://www.playersleague.vip`
- Add these redirect URLs:
  - `https://www.playersleague.vip/login`
  - `https://playersleague.vip/login`
  - `https://playersleague-vip.vercel.app/login`

Enable email authentication and email magic links.

## 3. Confirm Vercel variables

The existing variables used by the registration and administrator tools are reused:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Never expose a Supabase secret or service-role key in browser configuration.

## 4. Administrator access

The player moderation page is `/platform-admin`.

It uses the existing `current_user_is_admin()` database function and administrator records already used by `/admin`.

Administrator capabilities in the first beta:

- approve or suspend public player profiles
- approve or reject challenge submissions
- award challenge points automatically when a submission is approved
- award the First Challenge badge automatically

## 5. Public and private routes

Public:

- `/players`
- `/leaderboard`
- `/challenges`
- `/player/{username}`

Private player routes:

- `/login`
- `/onboarding`
- `/dashboard`

Private administrator route:

- `/platform-admin`

## 6. Important product rules

- No wallet or token purchase is required.
- League points are non-transferable, cannot be purchased and have no monetary value.
- Public profiles remain hidden until an administrator approves them.
- Players may disable public visibility at any time.
- No private keys, recovery phrases, passwords or payment details are requested.

## 7. Production acceptance test

After migration and deployment:

1. Request a magic link at `/login`.
2. Open the email link and create a profile at `/onboarding`.
3. Confirm the private dashboard loads the profile, Founding Player badge and 50 starting community points.
4. Sign in as an administrator and approve the profile at `/platform-admin`.
5. Confirm the profile appears at `/players`, `/leaderboard` and `/player/{username}`.
6. Submit the first challenge.
7. Approve the challenge as administrator.
8. Confirm the points and First Challenge badge appear in the player dashboard and public profile.
