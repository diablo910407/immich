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

## Photos 页面排序（列表模式）

在 `routes/(user)/photos/[[assetId=id]]/+page.svelte` 的列表模式下，新增“按不同维度排序”按钮，位于视图切换按钮同排位置：

- 排序维度：`综合 / 颜值 / 身材 / 内容`；
- 默认排序：综合分 `overall` 从高到低（并在分数相同情况下按 `looks` 从高到低）；
- 当选择 `颜值/身材/内容` 时，以该维度从高到低排序，遇到相同分数时按综合分 `overall` 从高到低再排；
- 网格模式保持时间线展示，不提供维度排序按钮；
- 相关文件：
  - 组件：`src/lib/components/photos-page/sort-dimension-buttons.svelte`
  - 列表视图：`src/lib/components/assets/person-grouped-list-view.svelte`
  - 排序工具：`src/lib/utils/person-group-sort-by.ts`

## People 页面排序

在 `routes/(user)/people/+page.svelte` 顶部工具栏增加同样的排序按钮，规则与 Photos 页一致：

- 排序维度：`综合 / 颜值 / 身材 / 内容`；
- 默认排序：综合分 `overall` 从高到低（分数相同按 `looks` 从高到低）；
- 当选择 `颜值/身材/内容` 时，以该维度从高到低排序，遇到相同分数时按综合分 `overall` 再排；
- 无限滚动：仍按当前排序维度视图呈现，不影响分页加载；
- 相关文件：
  - 页面：`src/routes/(user)/people/+page.svelte`
  - 按钮组件：`src/lib/components/photos-page/sort-dimension-buttons.svelte`
  - 排序工具：`src/lib/utils/person-group-sort-by.ts`
