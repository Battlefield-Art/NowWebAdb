<template>
  <div v-if="connectionState.adb" class="app-shell">
    <header class="app-rail">
      <div class="brand" aria-label="NowWebAdb">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="2.8" y="4.2" width="12.4" height="15.6" rx="2.6" stroke="currentColor" stroke-width="1.5" />
            <path d="M6.4 8.4h5.2M6.4 11.4h3.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <rect x="13.6" y="7.2" width="7.6" height="12.4" rx="2" fill="currentColor" />
            <circle cx="17.4" cy="16.7" r="0.9" fill="#fffdf8" />
          </svg>
        </span>
        <span class="brand-copy">
          <span class="brand-name">NowWebAdb</span>
          <span class="brand-sub">Device Console</span>
        </span>
      </div>
      <DeviceStatusBar @disconnect="disconnect" />
    </header>
    <div class="app-body">
      <aside class="screen-container" :style="screenWidth ? { '--screen-width': `${screenWidth}px` } : undefined">
        <Scrcpy @column-width="screenWidth = $event" />
      </aside>
      <div id="device-tool-rail" class="device-tool-rail"></div>
      <main class="content-wrapper">
        <el-tabs v-model="activeTab" class="feature-tabs">
          <el-tab-pane label="基础信息" name="overview" lazy><Overview v-if="activeTab === 'overview'" /></el-tab-pane>
          <el-tab-pane label="文件管理" name="files" lazy><FileManage /></el-tab-pane>
          <el-tab-pane label="应用管理" name="apps" lazy><AppManage /></el-tab-pane>
          <el-tab-pane label="日志查看" name="logcat" lazy><Logcat v-if="activeTab === 'logcat'" /></el-tab-pane>
          <el-tab-pane label="命令终端" name="terminal" lazy><Terminal v-if="activeTab === 'terminal'" /></el-tab-pane>
          <el-tab-pane label="性能数据" name="performance" lazy><PerformancePage v-if="activeTab === 'performance'" /></el-tab-pane>
          <el-tab-pane label="连接管理" name="connection" lazy><ConnectionPanel /></el-tab-pane>
          <el-tab-pane label="AI 助手" name="ai" lazy><AiAssistant /></el-tab-pane>
        </el-tabs>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import Scrcpy from '@/pages/scrcpyShow/scrcpy.vue';
import DeviceStatusBar from '@/components/DeviceStatusBar.vue';
import { connectionState, disconnectDevice } from '@/utils/adbManager.js';
import { useDeviceStore } from '@/stores/device.js';
const Overview = defineAsyncComponent(() => import('@/pages/overview/overview.vue'));
const FileManage = defineAsyncComponent(() => import('@/pages/fileManage/fileManage.vue'));
const AppManage = defineAsyncComponent(() => import('@/pages/appManage/appManage.vue'));
const Logcat = defineAsyncComponent(() => import('@/pages/androidLogcat/logcat.vue'));
const Terminal = defineAsyncComponent(() => import('@/pages/terminal/Terminal.vue'));
const PerformancePage = defineAsyncComponent(() => import('@/pages/performance/PerformancePage.vue'));
const ConnectionPanel = defineAsyncComponent(() => import('@/components/ConnectionPanel.vue'));
const AiAssistant = defineAsyncComponent(() => import('@/pages/ai/AiAssistant.vue'));
const activeTab = ref('overview');
const screenWidth = ref(0);
const router = useRouter();
const store = useDeviceStore();
watch(() => connectionState.adb, adb => {
    if (!adb) { store.reset(); router.replace('/'); }
});
const disconnect = async () => {
    try { await disconnectDevice(); }
    catch (error) { ElMessage.warning(`设备连接已释放：${error.message}`); }
};
</script>

<style scoped>
.app-shell {
  height: 100dvh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}

.app-rail {
  flex: none;
  display: flex;
  align-items: center;
  gap: 22px;
  min-height: 58px;
  padding: 0 18px;
  background: rgba(255, 253, 248, 0.94);
  border-bottom: 1px solid var(--line);
}

.brand {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 18px;
  border-right: 1px solid var(--line-soft);
}

.brand-mark {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  color: var(--surface);
  background: var(--ink);
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.brand-mark svg {
  width: 19px;
  height: 19px;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.brand-name {
  font-size: 14px;
  font-weight: 760;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.brand-sub {
  margin-top: 3px;
  font-family: var(--mono);
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted-2);
}

.app-body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.screen-container {
  flex: 0 0 auto;
  width: var(--screen-width, 390px);
  max-width: 48vw;
  min-width: 0;
  height: auto;
  margin: 14px 0 14px 14px;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: transparent;
  border-radius: 16px;
  box-shadow: var(--shadow-2);
  container-type: inline-size;
  overflow: hidden;
}

.screen-container :deep(.scrcpy-page) {
  flex: 1;
  min-height: 0;
}

.device-tool-rail {
  flex: none;
  width: 54px;
  margin: 14px 0;
  padding-left: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-wrapper {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 14px;
  display: flex;
  flex-direction: column;
}

.feature-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  --el-tabs-header-height: 36px;
}

.feature-tabs :deep(.el-tabs__header) {
  flex: none;
  padding: 0 8px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: var(--shadow-1);
}

.feature-tabs :deep(.el-tabs__item) {
  height: 36px;
  line-height: 36px;
  padding: 0 16px;
  font-size: 13.5px;
}

.feature-tabs :deep(.el-tabs__header .el-tabs__nav-wrap) {
  padding: 0 2px;
}

.feature-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-top: 10px;
}

/* Let panes that size against the viewport (log, terminal) see a definite
   height instead of collapsing to their content. */
.feature-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.feature-tabs :deep(.el-tabs__header .el-tabs__nav-next),
.feature-tabs :deep(.el-tabs__header .el-tabs__nav-prev) {
  line-height: 36px;
  color: var(--muted);
}

.feature-tabs :deep(> .el-tabs__header .el-tabs__nav-next),
.feature-tabs :deep(> .el-tabs__header .el-tabs__nav-prev) {
  line-height: 36px;
  color: var(--muted);
}

@media (max-width: 1180px) {
  .app-rail {
    gap: 14px;
    padding: 0 14px;
  }

  .brand {
    padding-right: 12px;
  }

  .brand-sub {
    display: none;
  }
}

@media (max-width: 900px) {
  .app-shell {
    height: auto;
    min-height: 100dvh;
    overflow: visible;
  }

  .app-rail {
    flex-wrap: wrap;
    min-height: 0;
    padding: 10px 12px;
    gap: 10px;
  }

  .brand {
    border-right: 0;
    padding-right: 0;
  }

  .app-body {
    flex-direction: column;
  }

  .screen-container {
    width: auto;
    max-width: none;
    margin: 12px 12px 0;
    height: auto;
    min-height: 0;
  }

  .device-tool-rail {
    display: none;
  }

  .content-wrapper {
    height: auto;
    padding: 12px;
  }

  .feature-tabs :deep(> .el-tabs__content) {
    overflow: visible;
  }
}
</style>
