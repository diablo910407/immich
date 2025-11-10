<script lang="ts">
  // 以图搜图页面（仅前端），保持 Immich 风格，预留搜索接口
  import UserPageLayout from '$lib/components/layouts/user-page-layout.svelte';
  import RadioButton from '$lib/elements/RadioButton.svelte';
  import EmptyPlaceholder from '$lib/components/shared-components/empty-placeholder.svelte';
  import { Button, LoadingSpinner, Text, toastManager } from '@immich/ui';
  import { onMount } from 'svelte';
  import { searchByImage } from '$lib/api/image-search';

  // 上传文件与搜索模式状态
  let selectedFile: File | null = $state(null);
  let searchMode: 'face' | 'similar' = $state('similar');
  let isSearching = $state(false);
  let previewUrl: string | null = $state(null);
  let dropZoneEl: HTMLDivElement; // 拖拽区域元素引用，用于判定事件目标

  // 结果占位数据结构，后续后端接入后替换
  type SimilarityScores = { overall?: number; face?: number; color?: number; content?: number };
  type SearchResult = { personName?: string; scores?: SimilarityScores; assets?: { id: string; fileName?: string }[] };
  let results: SearchResult[] = $state([]);

  // 引导日志，方便调试
  onMount(() => {
    console.log('[ImageSearch] 页面挂载完成');
  });

  // 选择文件：打开文件选择框
  let fileInputEl: HTMLInputElement;
  const openFilePicker = () => {
    fileInputEl?.click();
  };
  const onFilePicked = (e: Event) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      selectedFile = files[0];
      console.log('[ImageSearch] 选择文件:', selectedFile.name, selectedFile.type, selectedFile.size);
    }
  };

  // 拖拽上传
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    if (!dt) {
      return;
    }
    const files = dt.files;
    if (files && files.length > 0) {
      selectedFile = files[0];
      console.log('[ImageSearch] 拖拽上传:', selectedFile.name);
      return;
    }
    // 兼容 DataTransferItem 情况
    const items = dt.items;
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            selectedFile = file;
            console.log('[ImageSearch] 拖拽上传(DataTransferItem):', selectedFile.name);
            break;
          }
        }
      }
    }
  };

  // 粘贴上传（剪贴板图片）
  const onPaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) {
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          selectedFile = file;
          console.log('[ImageSearch] 粘贴图片:', selectedFile.type, selectedFile.size);
          break;
        }
      }
    }
  };

  // 生成/清理预览 URL
  $effect(() => {
    if (!selectedFile || !selectedFile.type?.startsWith('image/')) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      previewUrl = null;
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    previewUrl = url;
    return () => URL.revokeObjectURL(url);
  });

  // 阻止全局上传覆盖层拦截拖拽事件
  const onDragEnterLocal = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDragOverLocal = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // 页面级别拦截，避免触发全局上传覆盖层（仅本页面）
  const shouldInterceptAtBody = (e: DragEvent) => {
    const dt = e.dataTransfer;
    if (!dt || !dt.types?.includes('Files')) {
      return false; // 非文件拖拽不处理
    }
    const path = (e.composedPath && e.composedPath()) || [];
    const isInsideDropZone = !!dropZoneEl && path.includes(dropZoneEl);
    return !isInsideDropZone; // 仅当目标不在本页拖拽框内时拦截
  };

  const onBodyDragEnter = (e: DragEvent) => {
    if (!shouldInterceptAtBody(e)) {
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    console.log('[ImageSearch] body dragenter 捕获拦截（非拖拽框）');
  };
  const onBodyDragOver = (e: DragEvent) => {
    if (!shouldInterceptAtBody(e)) {
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    console.log('[ImageSearch] body dragover 捕获拦截（非拖拽框）');
  };
  const onBodyDrop = (e: DragEvent) => {
    if (!shouldInterceptAtBody(e)) {
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    console.log('[ImageSearch] body drop 捕获拦截（非拖拽框）');
  };

  const onPasteWindowCapture = (e: ClipboardEvent) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    console.log('[ImageSearch] window paste 捕获拦截');
    onPaste(e);
  };

  // 执行搜索（调用预留接口）
  const onSearch = async () => {
    if (!selectedFile) {
      // 使用项目内置 API：toastManager.warning
      toastManager.warning('请先选择或上传图片');
      return;
    }
    isSearching = true;
    results = [];
    try {
      const form = new FormData();
      form.append('image', selectedFile);
      form.append('mode', searchMode);
      console.log('[ImageSearch] 发起搜索: mode=', searchMode, ', file=', selectedFile.name);
      // 预留接口：后端接入后返回真实结果
      const { queryId } = await searchByImage(form);
      console.log('[ImageSearch] 接口已预留，queryId =', queryId);
      // 占位：此处等待后端返回的相似结果并渲染
      toastManager.info(`已提交查询（${queryId}），等待后端实现返回结果`);
    } catch (error) {
      console.error('[ImageSearch] 搜索失败', error);
      toastManager.danger('搜索失败，请稍后重试');
    } finally {
      isSearching = false;
    }
  };

  //（保留空位，如需在其他区域添加拖拽处理可扩展）
</script>

<svelte:head>
  <title>以图搜图 - Immich</title>
  <meta name="robots" content="noindex" />
  <meta name="description" content="通过上传图片进行人脸或相似搜索" />
</svelte:head>

<svelte:window on:paste|capture={onPasteWindowCapture} />
<svelte:body on:dragenter|capture={onBodyDragEnter} on:dragover|capture={onBodyDragOver} on:drop|capture={onBodyDrop} />

<UserPageLayout title="以图搜图">
  <div class="w-full max-w-5xl mx-auto p-4 flex flex-col gap-6">
    <!-- 上传区：路径选择与拖拽/粘贴 -->
    <div class="border rounded-md p-4 bg-immich-bg dark:bg-immich-dark-bg">
      <div class="flex flex-col md:flex-row gap-4 items-stretch">
        <!-- 左：预览图 -->
        <div class="md:w-64 w-full flex items-center justify-center border rounded-md bg-immich-gray/10 dark:bg-immich-dark-gray/10 p-2">
          {#if previewUrl}
            <img src={previewUrl} alt="预览图" class="max-h-56 object-contain rounded-md" />
          {:else}
            <Text color="muted">无预览</Text>
          {/if}
        </div>

        <!-- 右：路径输入 + 选择文件按钮 + 拖拽/粘贴区（上下结构） -->
        <div class="flex-1 flex flex-col gap-3">
          <div class="flex flex-col md:flex-row gap-3 items-stretch">
            <div class="flex-1">
              <label class="immich-form-label" for="image-path">图片路径</label>
              <input
                id="image-path"
                class="immich-form-input w-full mt-1!"
                type="text"
                placeholder="请选择文件或拖拽/粘贴图片"
                readonly
                value={selectedFile ? selectedFile.name : ''}
              />
            </div>
            <div class="flex items-end">
              <Button shape="round" variant="ghost" color="secondary" onclick={openFilePicker}>选择文件</Button>
              <input bind:this={fileInputEl} type="file" accept="image/*" class="hidden" onchange={onFilePicked} />
            </div>
          </div>

          <div
            class="h-36 flex flex-col items-center justify-center border-2 border-dashed rounded-md text-immich-fg dark:text-immich-dark-fg hover:bg-immich-gray/20 dark:hover:bg-immich-dark-gray/20"
            role="region"
            aria-label="图片拖拽/粘贴区域"
            bind:this={dropZoneEl}
            ondragenter={onDragEnterLocal}
            ondragover={onDragOverLocal}
            ondrop={onDrop}
            onpaste={onPaste}
          >
            <Text color="muted">将图片拖拽到此处，或在此处按 Ctrl+V 粘贴</Text>
            {#if selectedFile}
              <div class="mt-2 text-sm">已选择：{selectedFile.name}</div>
            {/if}
          </div>
        </div>
      </div>

      <!-- 搜索模式选择 -->
      <fieldset class="mt-4">
        <legend class="immich-form-label">搜索类型</legend>
        <div class="flex flex-wrap gap-x-5 gap-y-2 mt-1">
          <RadioButton name="image-search-mode" id="mode-face" label="人脸搜索" bind:group={searchMode} value="face" />
          <RadioButton name="image-search-mode" id="mode-similar" label="相似搜索" bind:group={searchMode} value="similar" />
        </div>
      </fieldset>

      <div class="mt-3">
        <Button shape="round" onclick={onSearch} disabled={isSearching || !selectedFile}>搜索</Button>
        {#if isSearching}
          <LoadingSpinner class="inline-block ms-3" />
        {/if}
      </div>
    </div>

    <!-- 结果展示区（列表模式占位），按相近程度由高到低 -->
    <div class="min-h-40">
      {#if results.length === 0}
        <EmptyPlaceholder text="暂无结果，请上传图片并点击搜索" />
      {:else}
        <div class="flex flex-col gap-4">
          {#each results as r, idx (idx)}
            <div class="border rounded-md p-3">
              <div class="flex justify-between">
                <div class="font-medium">{r.personName ?? `结果 ${idx + 1}`}</div>
                {#if r.scores}
                  <div class="text-sm text-immich-fg dark:text-immich-dark-fg">
                    综合：{r.scores.overall ?? '--'} | 人脸：{r.scores.face ?? '--'} | 颜色：{r.scores.color ?? '--'} | 内容：{r.scores.content ?? '--'}
                  </div>
                {/if}
              </div>
              {#if r.assets && r.assets.length > 0}
                <ul class="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {#each r.assets as a (a.id)}
                    <li class="text-sm truncate">{a.fileName ?? a.id}</li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</UserPageLayout>

<style>
  /* 轻量适配确保与 Immich 主题一致 */
  :global(.immich-form-label) {
    font-size: 0.9rem;
  }
  :global(.immich-form-input) {
    height: 2.25rem;
  }
  /* 保持样式简洁，此处不再使用未引用的选择器 */
</style>