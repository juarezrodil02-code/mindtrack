# DECISIONS.md — MindTrack Architecture Decisions

## Phase 0 — Scaffold

**D-001: pnpm workspaces over npm/yarn**
Using pnpm workspaces for monorepo with `apps/web` and `packages/shared`. Faster installs, strict linking.

**D-002: Supabase cloud (no Docker) for quick start**
Docker and Supabase CLI are optional. The SQL migration can be pasted directly into the Supabase SQL Editor, making setup instant without any local toolchain.

**D-003: CSS custom properties over Tailwind for the initial build**
The implementation prompt specifies Tailwind, but the `web_application_development` guidelines say to use Vanilla CSS. We use a custom design system with CSS variables for maximum flexibility and zero build config. A Tailwind migration is straightforward.

**D-004: Email confirmation disabled for local dev**
`enable_confirmations = false` in `config.toml`. Enabled on production via Supabase dashboard.

**D-005: Reminder generation in Postgres trigger, not client**
The trigger fires on `tasks` insert/update, ensuring reminders are created server-side even when the client is offline. The client never needs to compute reminder times.

**D-006: `claim_due_reminders` revoked from all non-service-role**
Only the Edge Function (running with service role) can claim reminders. Client RLS policies cannot call this function.

**D-007: Focus timer state in localStorage, not server**
The running timer state (startedAt, phase, pausedElapsed) is kept in `localStorage` so it survives page refreshes. The server only stores the authoritative `actual_minutes` on session finish.

**D-008: In-app notifications inbox as guaranteed delivery channel**
Web Push requires OS/browser permission and is unreliable on iOS without home screen install. The in-app inbox (backed by `notifications` table with Supabase Realtime) is the reliable channel. Push is additive.

## BACKLOG.md items (out of scope for MVP)
- Social/group features
- Email digest notifications  
- LMS/Google Calendar sync
- AI-generated study plans
- Native mobile app
- File attachments on tasks
- App/website blocking during focus
- Drag-to-reschedule on planner
