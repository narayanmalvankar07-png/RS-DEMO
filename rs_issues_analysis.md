# RightSignal (RS-DEMO) — Codebase Audit & Issues Register

This document lists all the critical technical bugs, layout defects, architectural flaws, and optimizations identified in the RightSignal codebase.

---

## 1. Architectural & Security Flaws

### 🔴 WebSocket Retry Loop Memory Leak & DoS Hazard
* **Symptom**: High CPU usage, memory leaks, or server crashes on the backend under heavy messaging loads.
* **Root Cause**: In [server.js](server.js), when a background database insert fails (e.g. database schema constraint block), the entire batch of messages is recursively appended to the end of the queue using `messageQueue.push(...batch)`. This creates an infinite retry loop that consumes memory and CPU.
* **Fix**: Restructure the background setInterval loop in [server.js](server.js) to process capped batches, track retry counts using a Map, and isolate persistent failures in a Dead-Letter Queue (DLQ).

### 🔴 Insecure Database Policies (Authorization Bypass)
* **Symptom**: Unauthorized users can view, edit, or delete any user's direct messages, transactions, and alignment records.
* **Root Cause**: The RLS tables in [supabase_messenger_setup.sql](supabase_messenger_setup.sql) utilize open, catch-all policy declarations (`using (true) with check (true)`).
* **Fix**: Secure RLS policies to evaluate the user's Supabase authenticated JWT ID against target fields using `auth.uid()::text`.

---

## 2. User Experience & Responsiveness Defects

### 🟡 Unlinked Post Share URLs
* **Symptom**: Copying a post URL and sharing it only opens the general landing page/feed rather than navigating directly to the targeted post.
* **Root Cause**: The application utilizes React state-based navigation (`view` in [App.jsx](src/App.jsx)) instead of URL-based routing. The sharing modal copies the static browser base URL (`window.location.href`).
* **Fix**:
  1. Modify [ShareModal.jsx](src/components/shared/ShareModal.jsx) and [PostCard.jsx](src/components/shared/PostCard.jsx) to build post URLs carrying query parameters: `${window.location.origin}?post=${post.id}`.
  2. Update [App.jsx](src/App.jsx) to read the `post` query param on startup and focus it in the feed.
  3. Update [FeedView.jsx](src/views/FeedView.jsx) to fetch the targeted post explicitly by ID if it falls outside the preloaded 80 latest posts.

### 🟡 Mobile Chat Layout Breaks
* **Symptom**: On mobile viewports (<768px), the Direct Message screen is squeezed, horizontally overflows, and lacks any navigation controls to toggle panels.
* **Root Cause**: [MessengerView.jsx](src/views/MessengerView.jsx) uses a hardcoded side-by-side grid `gridTemplateColumns: "300px 1fr"`.
* **Fix**: Pass `isMobile` as a prop to [MessengerView.jsx](src/views/MessengerView.jsx). If on mobile, display the conversation list and active chat panel as stacked, separate views. Prepend a `<ChevronLeft>` back button inside the mobile chat header that resets `activeId` to `null` to return to the inbox list.

---

## 3. Session & Authentication Defects

### 🟡 Quick Session Expirations
* **Symptom**: Users are forced to log in again almost every time they reopen the website or after 1 hour of activity.
* **Root Cause**: Direct REST POST actions in [supabase.js](src/services/supabase.js) bypass the standard client library to keep build bundles light. However, they lack a `refresh_token` handler. When the access token expires (1 hour), all subsequent REST queries fail, forcing logout.
* **Fix**: Write a standard Supabase token refresh endpoint (`grant_type=refresh_token`) inside [supabase.js](src/services/supabase.js) and call it inside [App.jsx](src/App.jsx)'s startup check `trySession` if an expired session contains a `refresh_token`.

---

## 4. Branding & Interventions

### 🟢 Native JavaScript Alerts
* **Symptom**: Basic, native browser alerts interrupt the user flow when posting, sending files, or reporting content.
* **Root Cause**: Legacy debug alert blocks `alert(...)` are still present in [Conversation.tsx](src/components/shared/Conversation.tsx) and [PostCard.jsx](src/components/shared/PostCard.jsx).
* **Fix**: Import `toast` from `sonner` in both files and replace native browser popups with beautiful, theme-adaptive toast notifications.

### 🟢 Logo Invisible on Desktop & Mobile Headers
* **Symptom**: Desktop topbar displays a search bar without branding or logo, and mobile topbar displays a custom CSS card carrying a text "R" instead of the standard RightSignal logo files.
* **Root Cause**: [RightSignalLogo.jsx](src/components/ui/RightSignalLogo.jsx) is not imported or rendered inside [App.jsx](src/App.jsx)'s top header template.
* **Fix**: Import and prepend `<RightSignalLogo>` in the top bar header for both desktop and mobile viewports.

---

## 5. Configuration & Code Quality

### 🟢 TypeScript Path Alias Alignment
* **Symptom**: Code editor highlights imports from `@/lib/utils` or UI components as errors.
* **Root Cause**: Vite handles path aliases correctly via [vite.config.ts](vite.config.ts), but [tsconfig.json](tsconfig.json) lacks `"paths"` mappings, breaking compiler validation.
* **Fix**: Configure `"baseUrl": "."` and `"paths": { "@/*": ["./src/*"] }` in [tsconfig.json](tsconfig.json).

### 🟢 Missing DevDependency
* **Symptom**: Clean deployments or automated builds fail with `sh: tsc: command not found`.
* **Root Cause**: `typescript` is not declared under `devDependencies` in [package.json](package.json), although typecheck scripts run `tsc`.
* **Fix**: Add `typescript` to [package.json](package.json) devDependencies.

### 🟢 Orphaned Code Clutter
* **Symptom**: Redundant files clutter the root directory and create import path confusion.
* **Root Cause**: Legacy versions of `Conversation.tsx` and `Messages.tsx` are still present in the root folder, even though active components reside in the `src/` hierarchy.
* **Fix**: Safely delete the redundant root files.

### 🟢 Alignment Graph Inconsistency
* **Symptom**: User peer lists and alignments drift out of sync, showing one user aligned while the other is misaligned.
* **Root Cause**: Misalign actions in [NetworkView.jsx](src/views/NetworkView.jsx) and [ProfileView.jsx](src/views/ProfileView.jsx) only delete the outgoing edge of the connection, leaving the reverse edge lingering.
* **Fix**: Adjust both files to delete both directions concurrently.

---

## 6. Search Engine Optimization (SEO) Gaps

### 🟢 Missing SEO Tags & Assets
* **Symptom**: Low search discoverability and no preview cards when sharing links on platforms like X, Slack, or WhatsApp.
* **Root Cause**: [index.html](index.html) contains no description tags, Open Graph graphics, or indexing configurations.
* **Fix**:
  1. Add full meta viewport tags, descriptions, Open Graph cards, and Twitter cards to [index.html](index.html).
  2. Implement standard Google Analytics scripts.
  3. Create standard `robots.txt` and `sitemap.xml` files inside `public/`.
