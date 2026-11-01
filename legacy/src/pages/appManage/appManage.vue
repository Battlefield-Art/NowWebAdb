<template>
  <section ref="pageRoot" class="page app-page" :class="{ 'is-compact': compact }">
    <header class="page-head">
      <div class="page-heading-copy">
        <p class="eyebrow">Packages / App Manager</p>
        <h1 class="page-title">应用管理</h1>
        <p class="page-sub">查看设备上的应用、读取名称与图标，导出安装包或执行启动、停用和卸载操作。</p>
      </div>
      <div class="page-actions">
        <el-button type="primary" :icon="Upload" :disabled="busy || loading" @click="fileInput?.click()">安装 APK / 拆分 APK</el-button>
        <input ref="fileInput" class="file-input" type="file" accept=".apk" multiple @change="chooseInstall" />
      </div>
    </header>

    <el-alert v-if="listError" :title="listError" type="error" show-icon :closable="false" />
    <el-alert v-if="metadataWarning" type="warning" show-icon :closable="false">
      <template #title>部分名称或图标不可用，仍可使用包名管理应用</template>
      <div>{{ metadataWarning }}</div>
      <el-button link type="primary" :disabled="metadataLoading || loading || busy" @click="loadMetadata">重试名称 / 图标</el-button>
    </el-alert>
    <div v-if="progress" class="progress" role="status">
      <span>{{ progress }}</span>
      <el-progress v-if="progressPercent !== null" :percentage="progressPercent" :show-text="false" />
    </div>

    <section class="app-table-card surface">
      <div class="app-toolbar">
        <div class="toolbar-filters">
          <el-input v-model="search" clearable placeholder="搜索应用名称或包名" aria-label="搜索应用" class="search">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <span class="toolbar-rule" aria-hidden="true"></span>
          <el-select v-model="scope" aria-label="应用类型" class="scope" :disabled="loading || busy" @change="refresh">
            <el-option label="第三方应用" value="thirdParty" />
            <el-option label="系统应用" value="system" />
            <el-option label="全部应用" value="all" />
          </el-select>
          <el-select v-model="enabled" aria-label="启用状态" class="status" :disabled="loading || busy" @change="refresh">
            <el-option label="全部状态" value="all" />
            <el-option label="已启用" value="enabled" />
            <el-option label="已停用" value="disabled" />
          </el-select>
          <el-tooltip content="刷新应用列表" placement="bottom" :show-after="300">
            <el-button class="refresh-button" text circle :icon="Refresh" aria-label="刷新应用列表" :loading="loading" :disabled="busy" @click="refresh" />
          </el-tooltip>
          <Transition name="chip-fade">
            <span v-if="metadataLoading" class="reading-chip" role="status" title="正在解析应用名称与图标" :aria-label="`正在读取名称与图标 ${metadataDone} / ${apps.length}`">
              <span class="reading-spinner" aria-hidden="true"></span>
              <span class="reading-label">读取中</span>
              <span class="mono reading-count"><b>{{ metadataDone }}</b> / {{ apps.length }}</span>
              <button type="button" class="reading-cancel" @click="cancelMetadata">取消</button>
            </span>
          </Transition>
        </div>
        <div class="toolbar-selection">
          <span class="selection-count">已选 <b class="mono">{{ selectedApps.length }}</b><span class="selection-total mono">/ {{ visibleApps.length }}</span></span>
          <span class="toolbar-rule" aria-hidden="true"></span>
          <div class="toolbar-actions">
            <el-button :disabled="busy || !selectedApps.length" @click="exportSelected">导出安装包</el-button>
            <el-button class="danger-action" :disabled="busy || !selectedApps.length" @click="uninstallSelected">卸载所选</el-button>
            <el-button :disabled="busy || selectedApps.length !== 1" @click="showDetails(selectedApps[0])">详细信息</el-button>
          </div>
        </div>
        <div v-if="metadataLoading" class="toolbar-progress" :style="{ width: `${metadataPercent}%` }" aria-hidden="true"></div>
      </div>

      <el-table v-loading="loading" :data="visibleApps" row-key="packageName" :row-class-name="rowClassName" max-height="650" empty-text="没有符合条件的应用">
        <el-table-column :width="tiny ? 44 : 48" class-name="pick-cell">
          <template #header>
            <el-tooltip content="选择当前筛选结果" placement="top" :show-after="300">
              <el-checkbox :model-value="allSelected" :indeterminate="someSelected && !allSelected" :disabled="busy || !visibleApps.length" aria-label="选择当前筛选结果" @change="toggleAll" />
            </el-tooltip>
          </template>
          <template #default="{ row }">
            <el-checkbox :model-value="selected.has(row.packageName)" :aria-label="`选择 ${row.appName}`" :disabled="busy" @change="value => toggle(row.packageName, value)" />
          </template>
        </el-table-column>
        <el-table-column :min-width="roomy ? 220 : tiny ? 166 : 190">
          <template #header>
            <button type="button" class="sort-toggle" :title="ascending ? '当前按名称升序，点击切换为降序' : '当前按名称降序，点击切换为升序'" @click="ascending = !ascending">
              应用
              <span class="sort-arrow mono" aria-hidden="true">{{ ascending ? '↑' : '↓' }}</span>
            </button>
          </template>
          <template #default="{ row }">
            <div class="app-identity">
              <span v-if="metadataLoading && !row.metadataLoaded" class="app-icon icon-skeleton" aria-hidden="true" />
              <el-image v-else :src="row.iconBase64 || androidPack" fit="contain" class="app-icon">
                <template #error><img :src="androidPack" alt="默认应用图标" class="app-icon" /></template>
              </el-image>
              <div class="app-labels">
                <strong class="app-name" :title="row.appName">{{ row.appName }}</strong>
                <div v-if="!roomy" class="package-name mono" :title="row.packageName">{{ row.packageName }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column v-if="roomy" label="包名" min-width="200">
          <template #default="{ row }"><span class="mono package-cell" :title="row.packageName">{{ row.packageName }}</span></template>
        </el-table-column>
        <el-table-column v-if="!tiny" label="版本" width="104">
          <template #default="{ row }"><span class="mono cell-meta" :title="row.versionName || row.versionCode || '—'">{{ row.versionName || row.versionCode || '—' }}</span></template>
        </el-table-column>
        <el-table-column v-if="!compact" label="安装来源" width="160">
          <template #default="{ row }"><span class="cell-meta" :title="row.installer || '未知 / 预装'">{{ row.installer || '未知 / 预装' }}</span></template>
        </el-table-column>
        <el-table-column v-if="!compact" label="UID" width="84" align="right">
          <template #default="{ row }"><span class="mono cell-meta">{{ row.uid }}</span></template>
        </el-table-column>
        <el-table-column :width="tiny ? 96 : 116" align="right" fixed="right">
          <template #header>操作</template>
          <template #default="{ row }">
            <div class="row-actions">
              <button type="button" class="row-action" :disabled="busy" @click="showDetails(row)">详情</button>
              <el-dropdown trigger="click" :disabled="busy" @command="action => rowAction(row, action)">
                <button type="button" class="row-action row-more" :disabled="busy" :aria-label="`${row.appName} 的更多操作`">···</button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="launch">在设备上启动</el-dropdown-item>
                    <el-dropdown-item command="stop">强制停止</el-dropdown-item>
                    <el-dropdown-item command="enable">启用</el-dropdown-item>
                    <el-dropdown-item command="disable">停用</el-dropdown-item>
                    <el-dropdown-item command="export" divided>导出全部 APK</el-dropdown-item>
                    <el-dropdown-item command="uninstall">卸载（删除数据）</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-foot">
        <span class="foot-count mono">{{ visibleApps.length }}<span class="foot-total"> / {{ apps.length }}</span> PACKAGES</span>
        <span class="foot-note">导出仅包含安装包，不包含应用数据。</span>
      </div>
    </section>

    <el-dialog v-model="detailsVisible" title="应用详细信息" width="min(900px, 94vw)">
      <template v-if="detailApp">
        <div class="dialog-meta">
          <span class="mono">{{ detailApp.packageName }}</span>
          <el-tag type="info">UID {{ detailApp.uid }}</el-tag>
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="名称">{{ detailApp.appName }}</el-descriptions-item>
          <el-descriptions-item label="包名">{{ detailApp.packageName }}</el-descriptions-item>
          <el-descriptions-item label="APK 路径">{{ detailApp.sourceDir || '未知' }}</el-descriptions-item>
          <el-descriptions-item label="版本码">{{ detailApp.versionCode ?? '未知' }}</el-descriptions-item>
          <el-descriptions-item label="安装器">{{ detailApp.installer || '未知' }}</el-descriptions-item>
        </el-descriptions>
        <p class="details-kicker">PackageManager / dumpsys</p>
        <pre class="details-output">{{ detailsText }}</pre>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Search, Upload } from '@element-plus/icons-vue';
import { getAdbInstance } from '@/utils/adbManager.js';
import androidPack from '@/assets/img/androidPack.png';
import { acquireAppMetadata, exportAppApks, installApks, listInstalledApps, performAppAction, uninstallApp } from '@/utils/appManager.js';

const apps = ref([]);
const search = ref('');
const scope = ref('thirdParty');
const enabled = ref('all');
const ascending = ref(true);
const selected = ref(new Set());
const loading = ref(false);
const busy = ref(false);
const listError = ref('');
const metadataWarning = ref('');
const metadataLoading = ref(false);
const metadataDone = ref(0);
const fileInput = ref();
const progress = ref('');
const progressPercent = ref(null);
const detailsVisible = ref(false);
const detailApp = ref(null);
const detailsText = ref('');
const compact = ref(false);
const tiny = ref(false);
const roomy = ref(false);
const pageRoot = ref();
let compactObserver;
const lifecycle = new AbortController();
let metadataAbort;
let refreshId = 0;
let listAdb;

const visibleApps = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return apps.value.filter(app => `${app.appName} ${app.packageName}`.toLocaleLowerCase().includes(query))
    .sort((a, b) => (a.appName.localeCompare(b.appName, 'zh-CN') || a.packageName.localeCompare(b.packageName)) * (ascending.value ? 1 : -1));
});
const selectedApps = computed(() => apps.value.filter(app => selected.value.has(app.packageName)));
const allSelected = computed(() => visibleApps.value.length > 0 && visibleApps.value.every(app => selected.value.has(app.packageName)));
const someSelected = computed(() => visibleApps.value.some(app => selected.value.has(app.packageName)));
const metadataPercent = computed(() => (apps.value.length ? Math.min(100, Math.round(metadataDone.value / apps.value.length * 100)) : 0));
const rowClassName = ({ row }) => (selected.value.has(row.packageName) ? 'is-picked' : '');
function toggle(packageName, value) {
  const next = new Set(selected.value);
  if (value) next.add(packageName); else next.delete(packageName);
  selected.value = next;
}
function toggleAll(value) { visibleApps.value.forEach(app => toggle(app.packageName, value)); }
function requireAdb() {
  const adb = getAdbInstance();
  if (!adb) throw new Error('请先连接 Android 设备');
  if (listAdb && listAdb !== adb) throw new Error('设备已切换，请先刷新应用列表');
  return adb;
}
function cancelMetadata() {
  metadataAbort?.abort();
  if (metadataLoading.value) metadataWarning.value = '已取消名称 / 图标加载，可点击重试。';
}
async function loadMetadata() {
  metadataAbort?.abort();
  const controller = new AbortController();
  metadataAbort = controller;
  metadataWarning.value = '';
  const pending = apps.value.filter(app => !app.metadataLoaded);
  metadataDone.value = apps.value.length - pending.length;
  if (!pending.length) { metadataLoading.value = false; return; }
  metadataLoading.value = true;
  let lease;
  try {
    const adb = requireAdb();
    lease = await acquireAppMetadata(adb, { signal: controller.signal });
    let failures = 0;
    let lastError = '';
    // The metadata client keeps a small worker pool; issuing every request at
    // once lets it fill all slots instead of paying one APK round-trip at a time.
    await Promise.all(pending.map(async app => {
      try {
        if (controller.signal.aborted || getAdbInstance() !== adb) return;
        const info = await lease.request(app, controller.signal);
        if (controller.signal.aborted || getAdbInstance() !== adb) return;
        // Keep trusted listing identity/source/version code; metadata cannot replace them.
        app.appName = info.appName && info.appName !== 'null' ? info.appName : app.packageName;
        app.versionName = info.versionName;
        app.iconBase64 = /^data:image\/(?:png|webp|jpeg|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/.test(info.iconBase64) ? info.iconBase64 : '';
        app.metadataLoaded = true;
        metadataDone.value++;
      } catch (error) {
        if (controller.signal.aborted) return;
        failures++;
        lastError = error.message;
      }
    }));
    if (!controller.signal.aborted && failures) {
      metadataWarning.value = `${failures} 项加载失败：${lastError}。可重试未完成项目。`;
    }
  } catch (error) {
    if (!controller.signal.aborted) metadataWarning.value = error.message;
  } finally {
    await lease?.release();
    if (metadataAbort === controller) metadataLoading.value = false;
  }
}
async function refresh() {
  const id = ++refreshId;
  cancelMetadata();
  apps.value = [];
  selected.value = new Set();
  listError.value = '';
  metadataWarning.value = '';
  progress.value = '';
  progressPercent.value = null;
  loading.value = true;
  try {
    const adb = getAdbInstance();
    if (!adb) throw new Error('请先连接 Android 设备');
    listAdb = adb;
    const result = await listInstalledApps(adb, { scope: scope.value, enabled: enabled.value, signal: lifecycle.signal });
    if (id !== refreshId || lifecycle.signal.aborted) return;
    if (getAdbInstance() !== adb) throw new Error('设备已切换，请重新刷新');
    apps.value = result;
    if (result.length) void loadMetadata();
  } catch (error) {
    if (!lifecycle.signal.aborted && id === refreshId) listError.value = `应用列表加载失败：${error.message}`;
  } finally { if (id === refreshId) loading.value = false; }
}
async function confirm(message) {
  try { await ElMessageBox.confirm(message, '请确认应用操作', { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }); return true; }
  catch { return false; }
}
async function operation(work) {
  if (busy.value || lifecycle.signal.aborted) return;
  busy.value = true;
  progress.value = '';
  progressPercent.value = null;
  try { await work(requireAdb()); }
  catch (error) { if (!lifecycle.signal.aborted) ElMessage.error(error.message || '操作失败'); }
  finally { busy.value = false; }
}
async function chooseInstall(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) return;
  if (!await confirm(`安装 ${files.length} 个 APK 文件。所有选中的 APK 必须是同一应用的 base + splits（单 APK 应用只选一个）。设备将校验包名与签名；安装可能覆盖已有版本。是否继续？`)) return;
  await operation(async adb => {
    await installApks(adb, files, { signal: lifecycle.signal, onProgress: state => {
      progress.value = `${state.phase} ${state.file || ''}`;
      progressPercent.value = Math.min(state.phase === '安装完成' ? 100 : 99, Math.round(state.loaded / state.total * 100));
    } });
    ElMessage.success('安装成功');
    await refresh();
  });
}
async function exportRows(rows) {
  await operation(async adb => {
    for (const app of rows) {
      const { blob, filename } = await exportAppApks(adb, app.packageName, { signal: lifecycle.signal, onProgress: state => {
        progress.value = `导出 ${app.packageName}：${state.index}/${state.count} 个 APK，已读取 ${(state.loaded / 1024 / 1024).toFixed(1)} MB`;
      } });
      lifecycle.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    progress.value = '安装包导出完成（不包含应用数据）。若浏览器拦截多个下载，请允许下载或逐个导出。';
    ElMessage.success('已生成安装包下载');
  });
}
const exportSelected = () => exportRows([...selectedApps.value]);
async function uninstallRows(rows) {
  if (!await confirm(`卸载以下 ${rows.length} 个应用并删除其应用数据（不可恢复）：\n${rows.map(app => app.packageName).join('\n')}\n系统应用可能无法卸载，或影响设备功能。是否继续？`)) return;
  await operation(async adb => {
    const failures = [];
    let completed = 0;
    for (const app of rows) {
      lifecycle.signal.throwIfAborted();
      try { await uninstallApp(adb, app.packageName); completed++; }
      catch (error) { failures.push(`${app.packageName}: ${error.message}`); }
    }
    await refresh();
    if (completed) ElMessage.success(`已卸载 ${completed} 个应用`);
    if (failures.length) throw new Error(failures.join('\n'));
  });
}
const uninstallSelected = () => uninstallRows([...selectedApps.value]);
async function showDetails(app) {
  if (!app) return;
  await operation(async adb => {
    detailApp.value = app;
    detailsText.value = '正在读取…';
    detailsVisible.value = true;
    try { detailsText.value = await performAppAction(adb, app.packageName, 'details', { signal: lifecycle.signal }); }
    catch (error) { detailsText.value = `读取失败：${error.message}`; throw error; }
  });
}
async function rowAction(app, action) {
  if (action === 'export') return exportRows([app]);
  if (action === 'uninstall') return uninstallRows([app]);
  const labels = { launch: '启动', stop: '强制停止', enable: '启用', disable: '停用' };
  if (!await confirm(`${labels[action]} ${app.packageName}？强制停止会中断运行任务；停用会使应用不可用。对系统应用操作可能影响设备功能。`)) return;
  await operation(async adb => {
    await performAppAction(adb, app.packageName, action, { signal: lifecycle.signal });
    ElMessage.success(`${labels[action]}成功`);
    if (action === 'enable' || action === 'disable') await refresh();
  });
}
onMounted(() => {
  compactObserver = new ResizeObserver(([entry]) => {
    const width = entry?.contentRect.width || 0;
    compact.value = width > 0 && width < 720;
    tiny.value = width > 0 && width < 500;
    roomy.value = width > 0 && width >= 950;
  });
  if (pageRoot.value) compactObserver.observe(pageRoot.value);
  refresh();
});
onBeforeUnmount(() => {
  compactObserver?.disconnect();
  refreshId++;
  lifecycle.abort();
  metadataAbort?.abort();
});
</script>

<style scoped>
.app-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.app-page :deep(.el-alert) {
  margin: 0;
}

.progress {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
  box-shadow: var(--shadow-1);
  font-size: 12px;
  color: var(--muted);
}

.progress :deep(.el-progress) {
  flex: 1;
}

.app-table-card {
  overflow: hidden;
}

/* Toolbar */
.app-toolbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px 20px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-bottom: 1px solid var(--line-soft);
  background: var(--surface-2);
}

.toolbar-filters,
.toolbar-selection {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-filters {
  flex: 1 1 auto;
  min-width: 0;
}

.toolbar-filters .search {
  flex: 1 1 225px;
  min-width: 180px;
  max-width: 320px;
}

.toolbar-filters .search :deep(.el-input__wrapper) {
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line-soft);
  transition: box-shadow 0.16s ease, background-color 0.16s ease;
}

.toolbar-filters .search :deep(.el-input__wrapper:hover) {
  box-shadow: inset 0 0 0 1px var(--line-strong);
}

.toolbar-filters .search :deep(.el-input__wrapper.is-focus) {
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--accent), 0 0 0 3px var(--accent-soft);
}

.toolbar-filters .search :deep(.el-input__prefix) {
  margin-right: 6px;
  color: var(--muted-2);
  font-size: 13px;
}

.toolbar-filters .search :deep(.el-input__inner) {
  font-size: 12.5px;
}

.toolbar-filters .search :deep(.el-input__inner::placeholder) {
  color: var(--muted-2);
}

.toolbar-filters .el-select.scope {
  width: 116px;
}

.toolbar-filters .el-select.status {
  width: 102px;
}

.toolbar-filters .el-select :deep(.el-select__wrapper) {
  min-height: 32px;
  padding: 0 26px 0 9px;
  border-radius: 8px;
  background: transparent;
  box-shadow: none;
  transition: background-color 0.16s ease, box-shadow 0.16s ease;
}

.toolbar-filters .el-select :deep(.el-select__wrapper:hover) {
  background: var(--surface-3);
}

.toolbar-filters .el-select :deep(.el-select__wrapper.is-focused) {
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--accent), 0 0 0 3px var(--accent-soft);
}

.toolbar-filters .el-select :deep(.el-select__selected-item) {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-soft);
}

.toolbar-filters .el-select :deep(.el-select__caret) {
  color: var(--muted-2);
  font-size: 12px;
}

.toolbar-rule {
  flex: 0 0 1px;
  width: 1px;
  height: 16px;
  background: var(--line);
}

.refresh-button {
  width: 30px;
  height: 30px;
  color: var(--muted);
}

.refresh-button:hover {
  color: var(--ink);
  background: var(--surface-3);
}

/* Metadata reading indicator */
.reading-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 4px 0 10px;
  border: 1px solid var(--line-soft);
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted);
  font-size: 11px;
  white-space: nowrap;
}

.reading-label {
  font-weight: 600;
  color: var(--ink-soft);
}

.reading-count {
  font-size: 10.5px;
  color: var(--muted-2);
  font-variant-numeric: tabular-nums;
}

.reading-count b {
  font-size: 11px;
  font-weight: 650;
  color: var(--ink-soft);
}

.reading-spinner {
  width: 11px;
  height: 11px;
  flex: 0 0 11px;
  border: 1.5px solid var(--line-strong);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: reading-spin 0.8s linear infinite;
}

@keyframes reading-spin {
  to { transform: rotate(360deg); }
}

.reading-cancel {
  height: 20px;
  padding: 0 8px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--muted-2);
  font-size: 10.5px;
  cursor: pointer;
  transition: color 0.16s ease, background-color 0.16s ease;
}

.reading-cancel:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

.chip-fade-enter-active,
.chip-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.chip-fade-enter-from,
.chip-fade-leave-to {
  opacity: 0;
  transform: translateY(-2px) scale(0.98);
}

.toolbar-progress {
  position: absolute;
  left: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 0 2px 2px 0;
  background: var(--accent);
  opacity: 0.9;
  pointer-events: none;
  transition: width 0.3s ease;
}

/* Selection summary */
.toolbar-selection {
  margin-left: auto;
}

.selection-count {
  font-size: 10px;
  letter-spacing: 0.02em;
  color: var(--muted);
  white-space: nowrap;
}

.selection-count b {
  font-size: 11.5px;
  font-weight: 650;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.selection-total {
  font-size: 10.5px;
  color: var(--muted-2);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-actions :deep(.el-button) {
  height: 30px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  box-shadow: none;
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 600;
}

.toolbar-actions :deep(.el-button:hover:not(.is-disabled)) {
  background: var(--surface-3);
  color: var(--ink);
}

.toolbar-actions :deep(.el-button.is-disabled) {
  background: transparent;
  color: var(--muted-2);
}

.toolbar-actions :deep(.el-button.danger-action:hover:not(.is-disabled)) {
  background: var(--danger-soft);
  color: var(--danger);
}

/* Table */
.app-table-card :deep(.el-table) {
  --el-table-header-bg-color: transparent;
  --el-table-row-hover-bg-color: var(--surface-2);
  background: transparent;
}

.app-table-card :deep(.el-table th.el-table__cell) {
  padding: 9px 0;
  background: transparent;
  border-bottom: 1px solid var(--line-soft);
}

.app-table-card :deep(.el-table td.el-table__cell) {
  padding: 8px 0;
  border-bottom: 1px solid var(--line-soft);
}

.app-table-card :deep(.el-table__body tr:last-child > td.el-table__cell) {
  border-bottom: 0;
}

.app-table-card :deep(.el-table__body tr.is-picked > td.el-table__cell) {
  background: var(--accent-soft);
}

.app-table-card :deep(.el-table__body tr.is-picked:hover > td.el-table__cell) {
  background: #f8e2d7;
}

.app-table-card :deep(.el-table__header .el-checkbox) {
  margin-right: 0;
}

.sort-toggle {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: color 0.16s ease;
}

.sort-toggle:hover {
  color: var(--ink);
}

.sort-arrow {
  font-size: 10px;
  font-weight: 500;
  color: var(--muted-2);
  transition: color 0.16s ease;
}

.sort-toggle:hover .sort-arrow {
  color: var(--accent);
}

.app-identity {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.app-icon {
  display: block;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border: 1px solid var(--line-soft);
  border-radius: 10px;
  background: var(--surface);
  overflow: hidden;
}

.icon-skeleton {
  border-color: transparent;
  background: linear-gradient(100deg, var(--surface-3) 30%, var(--surface-2) 50%, var(--surface-3) 70%);
  background-size: 220% 100%;
  animation: icon-shimmer 1.4s ease-in-out infinite;
}

@keyframes icon-shimmer {
  from { background-position: 120% 0; }
  to { background-position: -120% 0; }
}

.app-labels {
  min-width: 0;
}

.app-name {
  display: block;
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 650;
  color: var(--ink);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.package-name {
  margin-top: 2px;
  overflow: hidden;
  font-size: 10.5px;
  color: var(--muted);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.package-cell {
  display: block;
  overflow: hidden;
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.cell-meta {
  display: block;
  overflow: hidden;
  font-size: 11.5px;
  color: var(--ink-soft);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}

.row-action {
  height: 24px;
  padding: 0 7px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.row-action:hover:not(:disabled) {
  background: var(--surface-3);
  color: var(--ink);
}

.row-action:disabled {
  color: var(--muted-2);
  cursor: not-allowed;
}

.row-more {
  padding: 0 6px;
  color: var(--muted-2);
  font-size: 13px;
  letter-spacing: 0.06em;
  line-height: 1;
}

.row-more:hover:not(:disabled) {
  color: var(--ink);
}

.table-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px 20px;
  flex-wrap: wrap;
  padding: 9px 16px;
  border-top: 1px solid var(--line-soft);
  background: var(--surface-2);
}

.foot-count {
  font-size: 9.5px;
  letter-spacing: 0.12em;
  color: var(--ink-soft);
}

.foot-total {
  color: var(--muted-2);
}

.foot-note {
  font-size: 11px;
  color: var(--muted);
}

.file-input {
  display: none;
}

/* Details dialog */
.dialog-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 11.5px;
  color: var(--muted);
  overflow-wrap: anywhere;
}

.details-kicker {
  margin: 16px 0 8px;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted-2);
}

.details-output {
  margin: 0;
  padding: 12px 14px;
  max-height: 46vh;
  overflow: auto;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--ink-soft);
  font-size: 11.5px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 900px) {
  .toolbar-filters .search {
    flex-basis: 220px;
  }
}

.app-page.is-compact .toolbar-filters,
.app-page.is-compact .toolbar-selection {
  width: 100%;
  margin-left: 0;
}

.app-page.is-compact .toolbar-filters .search {
  flex-basis: 100%;
  max-width: none;
}

.app-page.is-compact .toolbar-filters .el-select {
  flex: 1 1 0;
  width: auto;
  min-width: 118px;
  max-width: 168px;
}

.app-page.is-compact .reading-chip {
  gap: 6px;
  padding-left: 8px;
}

.app-page.is-compact .reading-label {
  display: none;
}

.app-page.is-compact .toolbar-filters .refresh-button {
  margin-left: auto;
}

.app-page.is-compact .toolbar-rule {
  display: none;
}

.app-page.is-compact .toolbar-selection {
  justify-content: space-between;
}

@media (prefers-reduced-motion: reduce) {
  .reading-spinner,
  .icon-skeleton {
    animation: none;
  }

  .chip-fade-enter-active,
  .chip-fade-leave-active,
  .toolbar-progress {
    transition: none;
  }
}
</style>
