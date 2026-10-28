<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Onboarding business rules live as pure functions in src/lib/onboarding/rules.ts; server functions in cases.functions.ts do all DB access with the server client (app has no sign-in, tables have RLS with no public policies) — keeps rules testable and data off the browser.
- Branded layout primitives (AppShell, Page, Panel, Notice, StatusPill) live in src/components/abl — reuse them for consistent ABL styling.
