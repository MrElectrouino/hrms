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
