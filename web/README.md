# Immich web project

This project uses the [SvelteKit](https://kit.svelte.dev/) web framework. Please refer to [the SvelteKit docs](https://kit.svelte.dev/docs) for information on getting started as a contributor to this project. In particular, it will help you navigate the project's code if you understand the basics of [SvelteKit routing](https://kit.svelte.dev/docs/routing).

When developing locally, you will run a SvelteKit Node.js server. When this project is deployed to production, it is built as a SPA and deployed as part of [the server project](../server).

## Person rating UI

本仓库在 People 页面增加了轻量评分功能，并与后端同步：

- 评分存储：在 `src/lib/stores/person-rating.store.ts` 本地维护每个人的评分（`looks/body/content`），并计算只读 `overall` 值，持久化到 `localStorage`。
- 组件展示：`src/lib/elements/fractional-stars.svelte` 用于显示综合的只读小数星星；`src/lib/components/faces-page/person-rating.svelte` 提供交互星级并在变更后调用后端接口写入 `person.rate`（`jsonb`）。
- 组件展示：`src/lib/elements/fractional-stars.svelte` 用于显示综合的只读小数星星；`src/lib/elements/HalfStarRating.svelte` 支持 0.5 步进的半星交互（将鼠标移动到第 n 颗星左半为 `n-0.5`，右半为 `n`）；`src/lib/components/faces-page/person-rating.svelte` 集成上述组件并在变更后调用后端接口写入 `person.rate`（`jsonb`）。
- 页面集成：在 `routes/(user)/people/+page.svelte` 中，初次加载与无限滚动时将后端返回的 `person.rate` 种子到本地评分 store；排序逻辑依赖评分 store，评分变化后列表会随之更新。

重要说明：
- 外部库的元数据为只读，不做任何修改。评分写入后端的 `person.rate` 字段（`jsonb`），而非修改外部库中的 EXIF 等元数据。
- 使用开发 Docker compose 时，Web 开发服务端口为 `http://localhost:3000/`。
