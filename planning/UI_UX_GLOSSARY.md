# UI/UX Glossary and Guidance

Reference vocabulary for discussing and briefing UI/UX work on this project. Use these terms when describing a screen, filing a design request, or reviewing a mockup, so "improve the UX" turns into something specific and actionable.

## 1. The Page Skeleton (Layout & Structure)

The big containers that hold everything else.

| Term | Plain meaning | Example |
| --- | --- | --- |
| Header / Top bar | The strip at the very top of the page. | Page title + primary action button. |
| Sidebar / Nav rail | The vertical menu on the left. | Dashboard, Rights, Menus, Users… |
| Main content area | The big central space where the work happens. | The table or form in the page body. |
| Footer | The strip at the bottom (often legal links, version). | Not always present. |
| Panel / Card | A bordered box grouping related information. | A KPI box, a list row's detail panel. |
| Modal / Dialog | A box that pops over the page and dims the background. | A confirm-delete screen. |
| Drawer / Sheet | A panel that slides in from the side. | Often used for item details. |
| Toast / Snackbar | A small temporary message that appears and fades. | "Saved — undo." |
| Tooltip | A tiny label that appears when you hover over something. | Hovering a collapsed sidebar icon to see its label. |

## 2. Navigation & Wayfinding

How users know where they are and how to get elsewhere.

| Term | Plain meaning | Example |
| --- | --- | --- |
| Navigation / Nav | The menu system. | Sidebar links. |
| Breadcrumb | A trail showing where you are in the hierarchy. | `Employees / Marketing / Aisha Rahman` |
| Tabs | Horizontal switches between views of the same thing. | Overview · Documents · Compensation |
| Active state | The visual highlight showing "you are here." | The accent bar beside the current sidebar link. |
| Pagination | Splitting a long list into pages (1, 2, 3…). | Common in employee lists. |
| Search | A box to find things by typing. | Global search (Cmd-K) is a common pattern. |
| Filter | Narrowing a list by criteria. | "Team: Engineering" dropdown. |
| Sort | Reordering a list (e.g., oldest first). | "Showing 5 of 9 · oldest first." |

## 3. Actions & Controls (Inputs)

The things users click, type into, or toggle.

| Term | Plain meaning | Example |
| --- | --- | --- |
| Button | A clickable action. | "Approve," "Decline," "+ New menu item." |
| Primary button | The main action on a screen (usually filled/coloured). | "Save." |
| Secondary / Ghost button | A less important action (outlined or plain). | "Cancel." |
| Destructive button | An action that deletes or rejects. | "Delete," "Reject." |
| Link | Text that navigates somewhere. | Candidate names, document names. |
| Input field / Text box | Where you type. | "Name," "Page address." |
| Dropdown / Select | A menu that opens to pick one option. | Parent selector, Team filter. |
| Checkbox | A square you tick for yes/no or multi-select. | "Main menu," "Active." |
| Radio button | A circle for choosing one of several options. | Reason for leaving. |
| Toggle / Switch | An on/off slider. | "Enable notifications." |
| Date picker | A calendar pop-up to choose a date. | Last working day. |
| Slider | A draggable handle to pick a value on a range. | Rare in HR, common in filters. |
| File upload | A control to attach a document. | "Upload renewed work permit." |
| Stepper | A numbered sequence of steps. | Offboarding: Submitted → Manager sign-off → HR review… |

## 4. Displaying Data (Content Components)

How information is shown without asking the user to do anything.

| Term | Plain meaning | Example |
| --- | --- | --- |
| Table | Rows and columns of data. | "Interviews this week," "Documents and compliance." |
| List | A simple vertical set of items. | Pending approvals, new hires. |
| Card | A compact box summarising one item. | Each candidate card. |
| KPI card / Stat card | A box showing one big number. | "In pipeline 43." |
| Badge / Pill / Chip | A small coloured label. | "Referral," "Match 82%," "New." |
| Tag | Same as badge — a label for categorising. | Source labels: LinkedIn, Agency. |
| Avatar | A small circle with initials or a photo. | "SA" for Sofia Alvarez. |
| Progress bar | A bar showing % complete. | Onboarding 38% done. |
| Timeline | A vertical list of dated events. | Employment timeline on a profile. |
| Accordion | Collapsible sections that expand on click. | "Before day one," "Day one," "First 30 days." |
| Empty state | What shows when there's no data. | "No candidates in this stage yet." |
| Skeleton / Shimmer | Grey placeholder shapes while data loads. | Common on slow-loading tables. |

## 5. Status & Feedback

How the app tells you what's happening.

| Term | Plain meaning | Example |
| --- | --- | --- |
| Status indicator | A coloured dot or label showing state. | Green "Active," amber "Expiring soon." |
| Semantic colour | Colours with fixed meaning. | Green = good, amber = warning, red = danger. |
| Loading spinner | A rotating icon while something loads. | Saving a form. |
| Error message | Red text explaining what went wrong. | "Date cannot be earlier than today." |
| Success message | Confirmation something worked. | "Menu item saved." |
| Validation | Checking input before accepting it. | Date picker enforcing a notice period. |
| Confirmation dialog | "Are you sure?" pop-up before a risky action. | Before submitting a resignation. |

## 6. Patterns (Recurring Solutions to Common Problems)

Named "recipes" UX designers reuse.

| Pattern | What it solves | Example |
| --- | --- | --- |
| Dashboard | A landing page summarising key numbers. | A KPI strip at the top of a page. |
| Kanban board | Columns of cards you move between stages. | A recruitment pipeline (Applied → Screening → Interview…). |
| Master–detail | A list on the left, details on the right. | The Menus page: tree list + edit form. |
| Wizard / Multi-step form | Breaking a long form into steps. | Offboarding sequence. |
| Bulk actions | Acting on many items at once. | A floating "3 selected" action bar. |
| Inline editing | Editing directly on the page without a separate form. | Changing a status by clicking it. |
| Progressive disclosure | Hiding advanced options until needed. | An optional "Comments" field collapsed by default. |
| Onboarding tour | A guided walkthrough for new users. | Highlighting the sidebar on first login. |
| Notifications centre | A bell icon with a list of alerts. | A bell icon on the header. |

## 7. Design System Vocabulary

The shared rules that keep the app consistent.

| Term | Plain meaning |
| --- | --- |
| Design system | A library of reusable components + rules. |
| Component | A reusable UI piece (button, card, badge). |
| Design token | A named value like `--coral: #FF6B5A` used everywhere. |
| Grid | The invisible column structure that aligns content. |
| Spacing scale | A fixed set of gaps (4px, 8px, 16px…) for consistency. |
| Typography scale | Fixed font sizes for headings, body, captions. |
| Contrast ratio | A measure of text readability (WCAG AA/AAA). |
| Responsive | Layouts that adapt to screen size. |
| Accessibility (a11y) | Making the app usable by everyone, including screen-reader users. |
| Dark mode | An alternate colour scheme for low light. |

## 8. The Mental Model to Hold

When someone says "let's improve the UX," they usually mean one of four things:

1. **Structure** — Is the page laid out logically? (Layout, navigation.)
2. **Clarity** — Can a user tell what to do next? (Hierarchy, primary buttons, status.)
3. **Feedback** — Does the app respond clearly? (Toasts, validation, loading.)
4. **Consistency** — Do similar things look and behave the same? (Design system, patterns.)

If you can point at a screen and say "this is a master–detail view with a tree list, status badges, and a sticky edit panel," you already have the vocabulary to brief a designer or developer precisely.

## 9. Current Project UI Rules and Palette

Register: **(current)** = what the Next.js frontend uses today. **(proposed)** = design choices for new screens that are not yet in the code.

Sources: `frontend/tailwind.config.js` (default Tailwind theme, no custom colors), `frontend/styles/globals.css` (`bg-gray-50`, `text-gray-900` on `body`), `frontend/components/Layout.tsx` (sidebar and header), `frontend/pages/index.tsx` (dashboard cards and hero).

### 9.1 Color tokens (Tailwind classes used in the code)

| Role | Tailwind class | Hex | Used for |
| --- | --- | --- | --- |
| Page background | `bg-gray-50` | `#f9fafb` | Body and page background (current). |
| Primary text | `text-gray-900` | `#111827` | Headings and main text (current). |
| Body / secondary text | `text-gray-700`, `text-gray-600` | `#374151`, `#4b5563` | Table cells, labels (current). |
| Muted text | `text-gray-500`, `text-gray-400` | `#6b7280`, `#9ca3af` | Captions, placeholders, timestamps (current). |
| Borders | `border-gray-200`, `border-gray-300` | `#e5e7eb`, `#d1d5db` | Cards, inputs, dividers (current). |
| Primary action | `bg-blue-600`, hover `bg-blue-700` | `#2563eb`, `#1d4ed8` | Primary buttons, spinner, links (current). |
| Focus ring | `focus:ring-blue-500` | `#3b82f6` | Keyboard focus on inputs and buttons (current). |
| Accent text | `text-blue-600` | `#2563eb` | Links, "View All", active icons (current). |
| Sidebar background | `bg-slate-900` | `#0f172a` | Left navigation (current). |
| Sidebar active item | `bg-slate-800`, text `text-white`, icon `text-blue-400`, bar `bg-blue-500` | `#1e293b`, `#60a5fa`, `#3b82f6` | Current nav item (current). |
| Sidebar inactive | text `text-slate-400`, icon `text-slate-500`, hover `text-slate-300` | `#94a3b8`, `#64748b`, `#cbd5e1` | Other nav items (current). |
| Sidebar divider / user card | `border-slate-800` | `#1e293b` | Dividers and footer (current). |
| Sidebar tooltip | `bg-slate-800`, `text-white`, `shadow-lg` | `#1e293b` | Collapsed-rail labels (current). |
| Logo | `bg-gradient-to-br from-blue-500 to-blue-700` | `#3b82f6` to `#1d4ed8` | Square "H" mark (current). |
| Hero banner | `bg-gradient-to-r from-blue-600 to-indigo-600` | `#2563eb` to `#4f46e5` | Dashboard welcome banner, `rounded-2xl`, `shadow-lg` (current). |
| Success | `text-green-700`, `bg-green-50`, `border-green-200` | `#15803d`, `#f0fdf4`, `#bbf7d0` | Healthy and approved states (current). |
| Danger | `text-red-700`, `bg-red-50`, `border-red-200`, hover `bg-red-600` | `#b91c1c`, `#fef2f2`, `#fecaca`, `#dc2626` | Error banners, Logout hover (current). |
| Header | `bg-white`, `border-gray-200`, height `h-16` | `#ffffff` | Top bar (current). |

### 9.2 Component rules

| Component | Rule | Source |
| --- | --- | --- |
| Card / panel | `bg-white rounded-xl shadow-sm border border-gray-200 p-6`; hover `shadow-md border-blue-300` for clickable cards (current). | `pages/index.tsx` |
| Hero banner | `rounded-2xl p-6 lg:p-8 text-white shadow-lg`, gradient blue-600 to indigo-600 (current). | `pages/index.tsx` |
| Icon tile | `p-3 rounded-lg` or `rounded-xl` with a tinted background and matching icon color (current). | `pages/index.tsx` |
| Badge / pill | `text-xs px-2.5 py-1 rounded-full font-medium` with a semantic color pair (current). | `pages/index.tsx` |
| Error banner | `p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm` (current). | `pages/index.tsx` |
| Spinner | `animate-spin rounded-full border-b-2 border-blue-600` (current). | `components/Layout.tsx` |
| Corner radius | Cards `rounded-xl` (12px), controls `rounded-lg` (8px), pills `rounded-full`, hero `rounded-2xl` (16px) (current). | Classes above |
| Shadow | Resting `shadow-sm`, hover `shadow-md`, hero `shadow-lg` (current). | Classes above |
| Sidebar width | Expanded about 256px, collapsed about 80px (proposed, matches the dashboard mockup). | `ui-mockups/hrms-dashboard-v2.html` |
| Sidebar collapse | Round toggle at the top of the sidebar; when collapsed, icons stay visible and a dark label appears on hover (current, `Layout.tsx`). | `components/Layout.tsx` |
| Header height | `h-16` (64px) (current). | `Layout.tsx` |
| Responsive | Sidebar is fixed and overlays on small screens (`lg:` breakpoint); the layout uses `lg:static` above that (current). | `Layout.tsx` |

### 9.3 Typography and spacing

- Font: the Tailwind default sans stack (current). The mockup uses `Inter` with a system fallback (proposed).
- Section label in the sidebar: `text-[11px] font-semibold uppercase tracking-wider text-slate-500` (current).
- Header padding: `px-4 lg:px-8` (current, `Layout.tsx`). Page content padding is not fixed in the shared layout; the dashboard mockup uses 24px (proposed).
- Dashboard grid gap: 20px (proposed).

### 9.4 Open items for UI work

- The dashboard mockup (`ui-mockups/hrms-dashboard-v2.html`) was first built in a different palette (light blue with rounded 36px cards). It was restyled to the rules above. Keep new screens on these rules unless the owner approves a change (proposed).
- Dark mode: the frontend has none (current). The mockup's dark rules are not a project rule (open).
- The sidebar avatar, logo and brand text are placeholders until real assets are supplied (open).
