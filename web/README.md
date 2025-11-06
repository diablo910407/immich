# Immich web project

This project uses the [SvelteKit](https://kit.svelte.dev/) web framework. Please refer to [the SvelteKit docs](https://kit.svelte.dev/docs) for information on getting started as a contributor to this project. In particular, it will help you navigate the project's code if you understand the basics of [SvelteKit routing](https://kit.svelte.dev/docs/routing).

When developing locally, you will run a SvelteKit Node.js server. When this project is deployed to production, it is built as a SPA and deployed as part of [the server project](../server).

## Person rating UI

This repository adds a lightweight, local-only person rating UI to the People page:

- New store at `src/lib/stores/person-rating.store.ts` persists ratings per person in `localStorage`.
- New component `src/lib/elements/fractional-stars.svelte` renders read-only fractional star values for overall score.
- New component `src/lib/components/faces-page/person-rating.svelte` shows three interactive lines (looks/body/content) and a computed overall.
- Integrated on `routes/(user)/people/+page.svelte` below each `PeopleCard`.

Notes:
- Ratings are stored client-side only and do not modify external library metadata.
- Dev server runs on `http://localhost:3000/` when using the development Docker compose.
