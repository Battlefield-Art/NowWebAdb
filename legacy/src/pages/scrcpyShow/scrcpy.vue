<template>
  <section ref="root" class="scrcpy-page" :class="{ 'is-fullscreen': isFullscreen }" aria-label="设备投屏">
    <div class="screen-area">
      <div class="screen-column">
        <div ref="stage" class="stage">
          <div ref="renderContainer" class="video-surface" tabindex="0" :style="videoStyle"
               aria-label="设备屏幕，点击聚焦后可使用键盘，Escape 保留给浏览器"
               @pointerdown="handlePointerDown" @pointermove="pointerMove" @pointerup="handlePointerUp"
               @pointercancel="handlePointerUp" @lostpointercapture="handlePointerUp"
               @wheel="handleWheel" @contextmenu.prevent @keydown="handleKeyEvent" @keyup="handleKeyEvent"
               @paste="handlePaste" @blur="releaseInput" @pointerleave="position = undefined" />
          <div v-if="!ready" class="stage-overlay">
            <el-icon v-if="connectionStatus === 'connecting'" class="spinner" :size="22"><Loading /></el-icon>
            <span>{{ statusLabel }}</span>
          </div>
          <Transition name="coord-fade">
            <div v-if="showCoordinates" class="coord-readout mono" role="status">
              <span class="coord-absolute">{{ coordinateLabel.absolute }}</span>
              <span class="coord-relative">{{ coordinateLabel.relative }}</span>
            </div>
          </Transition>

          <Transition name="nav-fade">
            <nav v-if="showNavKeys" class="bottom-bar" aria-label="设备操作">
              <button class="icon-btn" :disabled="!ready" title="返回" @click="pressKey(null, 'AndroidBack')">
                <el-icon :size="18"><ArrowLeft /></el-icon>
              </button>
              <button class="icon-btn" :disabled="!ready" title="主页" @click="pressKey(null, 'AndroidHome')">
                <el-icon :size="18"><House /></el-icon>
              </button>
              <button class="icon-btn" :disabled="!ready" title="最近任务" @click="pressKey(null, 'AndroidAppSwitch')">
                <el-icon :size="18"><CopyDocument /></el-icon>
              </button>
            </nav>
          </Transition>
        </div>
      </div>

      <Teleport to="#device-tool-rail" :disabled="toolbarInline" defer>
        <aside class="side-toolbar" :class="{ 'is-docked': !toolbarInline }" aria-label="快捷操作">
          <button class="icon-btn" :disabled="connectionStatus === 'connecting'" title="重新连接" @click="start">
            <el-icon :size="18"><RefreshLeft /></el-icon>
          </button>
          <button class="icon-btn" :disabled="connectionStatus === 'idle'" title="停止投屏" @click="destroyClient">
            <el-icon :size="18"><CircleClose /></el-icon>
          </button>
        <span class="divider" />
        <el-popover placement="bottom-end" :width="280" trigger="click">
          <template #reference>
            <button class="icon-btn" title="画质与音频设置">
              <el-icon :size="18"><Setting /></el-icon>
            </button>
          </template>
          <div class="settings-popover">
            <p class="settings-title">画质与音频（重新连接后生效）</p>
            <div class="settings-grid">
              <label>最长边 / px <input v-model.number="settings.maxSize" type="number" min="0" max="8192" step="1" /></label>
              <label>帧率 / fps <input v-model.number="settings.maxFps" type="number" min="1" max="240" /></label>
              <label>码率 / Mbps <input v-model.number="bitrateMbps" type="number" min="0.1" max="100" step="0.1" /></label>
              <label>视频编码 <select v-model="settings.videoCodec"><option value="h264">H.264</option><option value="h265">H.265</option><option value="av1">AV1</option></select></label>
              <label class="check"><input v-model="settings.audio" type="checkbox" /> 转发音频（Android 11+ / AAC）</label>
            </div>
            <small>最长边为 0 时不缩放；编码支持取决于设备与浏览器。服务器版本：3.3.3。</small>
          </div>
        </el-popover>
        <button class="icon-btn" :disabled="!ready" title="截图" @click="screenshot">
          <el-icon :size="18"><Picture /></el-icon>
        </button>
        <button class="icon-btn" :disabled="!ready" title="旋转设备" @click="rotateDevice">
          <el-icon :size="18"><RefreshRight /></el-icon>
        </button>
        <button class="icon-btn" :disabled="!ready" title="通知栏" @click="expandNotifications">
          <el-icon :size="18"><Bell /></el-icon>
        </button>
        <button class="icon-btn" :disabled="!ready" title="设备熄屏" @click="setScreenPower(false)">
          <el-icon :size="18"><Monitor /></el-icon>
        </button>
        <button class="icon-btn" :disabled="!ready" title="设备亮屏" @click="setScreenPower(true)">
          <el-icon :size="18"><SwitchButton /></el-icon>
        </button>
        <button class="icon-btn" :class="{ active: showCoordinates }" :disabled="!ready" title="显示坐标" @click="showCoordinates = !showCoordinates">
          <el-icon :size="18"><Aim /></el-icon>
        </button>
        <button class="icon-btn" :class="{ active: openInput }" :disabled="!ready" title="键盘输入" @click="openKeyInput(openInput ? 'close' : 'open')">
          <el-icon :size="18"><EditPen /></el-icon>
        </button>
        <span class="divider" />
        <button class="icon-btn" :disabled="!ready" title="音量 −" @click="pressKey(null, 'VolumeDown')">
          <el-icon :size="18"><Minus /></el-icon>
        </button>
        <button class="icon-btn" :disabled="!ready" title="音量 +" @click="pressKey(null, 'VolumeUp')">
          <el-icon :size="18"><Plus /></el-icon>
        </button>
        <button class="icon-btn" :class="{ active: showNavKeys }" title="导航键" @click="showNavKeys = !showNavKeys">
          <el-icon :size="18"><Menu /></el-icon>
        </button>
        <span class="divider" />
        <el-popover placement="bottom-end" :width="320" trigger="click">
          <template #reference>
            <button class="icon-btn" title="剪贴板">
              <el-icon :size="18"><Document /></el-icon>
            </button>
          </template>
          <div class="tool-popover">
            <p class="popover-title">剪贴板</p>
            <textarea v-model="clipboardText" class="popover-input" rows="3" aria-label="发送到设备的文字"
                      placeholder="输入文字，支持中文和 Unicode" @keydown.enter.exact.prevent="sendClipboard(clipboardText)" />
            <div class="popover-actions">
              <el-button size="small" type="primary" :disabled="!ready || !clipboardText" @click="sendClipboard(clipboardText)">发送并粘贴</el-button>
              <el-button size="small" :disabled="!ready" @click="pasteHostClipboard">粘贴本机剪贴板</el-button>
            </div>
            <template v-if="deviceClipboard">
              <p class="popover-title popover-subtitle">设备剪贴板</p>
              <textarea :value="deviceClipboard" class="popover-input" rows="3" readonly aria-label="设备剪贴板内容" />
            </template>
          </div>
        </el-popover>
        <el-popover placement="bottom-end" :width="270" trigger="click">
          <template #reference>
            <button class="icon-btn" :class="{ active: settings.audio }" title="音频">
              <el-icon :size="18"><Headset /></el-icon>
            </button>
          </template>
          <div class="tool-popover">
            <p class="popover-title">音频</p>
            <p class="popover-audio-status">{{ audioStatus }}</p>
            <p v-if="!settings.audio" class="popover-hint">音频转发未开启，可在“画质与音频设置”中开启。</p>
            <button v-if="settings.audio" class="text-btn" :disabled="!ready" @click="resumeAudio">播放音频</button>
          </div>
        </el-popover>
          <button class="icon-btn" title="全屏" @click="toggleFullscreen">
            <el-icon :size="18"><FullScreen /></el-icon>
          </button>
        </aside>
      </Teleport>
    </div>

    <p v-if="connectionError" class="error" role="alert">{{ connectionError }}</p>
    <p v-if="controlError || uiError" class="error" role="alert">{{ controlError || uiError }}</p>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { Aim, ArrowLeft, Bell, CircleClose, CopyDocument, Document, EditPen, FullScreen, Headset, House, Loading, Menu, Minus, Monitor, Picture, Plus, RefreshLeft, RefreshRight, Setting, SwitchButton } from '@element-plus/icons-vue';
import { DEFAULT_SETTINGS } from '@/utils/scrcpySettings.js';
import { useScrcpy } from './ScrcpyLogic.js';

const emit = defineEmits(['column-width']);
const root = ref();
const stage = ref();
const renderContainer = ref();
const settings = reactive({ ...DEFAULT_SETTINGS });
const bitrateMbps = ref(DEFAULT_SETTINGS.videoBitRate / 1000000);
const clipboardText = ref('');
const uiError = ref('');
const isFullscreen = ref(false);
const narrowQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)') : null;
const isNarrow = ref(Boolean(narrowQuery?.matches));
// Below 900px the layout stacks and the external rail is hidden, and in
// fullscreen only the fullscreen root is visible — keep the toolbar inline then.
const toolbarInline = computed(() => isFullscreen.value || isNarrow.value);
const showCoordinates = ref(false);
const showNavKeys = ref(false);
const position = ref();
let observer;
let resizeTimer;
let lastColumnWidth = 0;
let lastStageHeight = 0;

const {
  width, height, contentRect, openInput, ready, connectionStatus, connectionError, controlError, audioStatus,
  deviceClipboard, scrcpyStart, destroyClient, pressKey, sendClipboard, rotateDevice,
  expandNotifications, setScreenPower, handleKeyEvent, handlePaste, openKeyInput, releaseInput,
  handlePointerDown, handlePointerMove, handlePointerUp, handleWheel, clientPositionToDevicePosition,
  screenshot, resumeAudio,
} = useScrcpy();

const statusLabel = computed(() => ({
  idle: '已停止', connecting: '连接中…', connected: '已连接', error: '出错',
}[connectionStatus.value]));
const coordinateLabel = computed(() => {
  const pos = position.value;
  if (!pos || !width.value || !height.value) return { absolute: 'X — · Y —', relative: '指针移入屏幕读取坐标' };
  return {
    absolute: `X ${pos.x} · Y ${pos.y}`,
    relative: `相对 ${(pos.x / width.value * 100).toFixed(1)}% · ${(pos.y / height.value * 100).toFixed(1)}%`,
  };
});
const start = () => {
  uiError.value = '';
  position.value = undefined;
  return scrcpyStart(renderContainer.value, { ...settings, videoBitRate: Math.round(Number(bitrateMbps.value) * 1000000) });
};
const pointerMove = (event) => {
  if (showCoordinates.value) position.value = clientPositionToDevicePosition(event.clientX, event.clientY);
  handlePointerMove(event);
};
async function pasteHostClipboard() {
  try {
    uiError.value = '';
    const text = await navigator.clipboard.readText();
    await sendClipboard(text);
  } catch (error) {
    uiError.value = `无法读取剪贴板: ${error.message}。也可在文字框粘贴后发送。`;
  }
}
async function toggleFullscreen() {
  try {
    uiError.value = '';
    if (document.fullscreenElement === root.value) await document.exitFullscreen();
    else await root.value.requestFullscreen();
  } catch (error) {
    uiError.value = `无法切换全屏: ${error.message}`;
  }
}
// The column is exactly the video width; the panel adds no padding or border, so
// the screen fills it edge to edge and the toolbar lives outside.
const COLUMN_CHROME = 0;
const frameWidth = computed(() => contentRect.value?.width || width.value);
const frameHeight = computed(() => contentRect.value?.height || height.value);
// The stream is letterboxed by a few black rows inside the codec-aligned frame.
// Oversize and offset the canvas so only the real screen content is visible.
const videoStyle = computed(() => {
  const rect = contentRect.value;
  if (!rect || (!rect.top && !rect.bottom)) return undefined;
  const frame = rect.height + rect.top + rect.bottom;
  return {
    '--video-top': `${(-rect.top / rect.height) * 100}%`,
    '--video-height': `${(frame / rect.height) * 100}%`,
  };
});
function syncColumnWidth() {
  if (isFullscreen.value) return;
  void nextTick(() => {
    if (!stage.value || !width.value || !height.value) return;
    const { height: available } = stage.value.getBoundingClientRect();
    if (!available) return;
    const target = Math.round(available * (frameWidth.value / frameHeight.value)) + COLUMN_CHROME;
    const capped = Math.max(180, Math.min(target, Math.round(window.innerWidth * 0.48)));
    if (Math.abs(capped - lastColumnWidth) < 2) return;
    lastColumnWidth = capped;
    emit('column-width', capped);
  });
}
const fullscreenChanged = () => {
  isFullscreen.value = document.fullscreenElement === root.value;
  if (!isFullscreen.value) syncColumnWidth();
};
const narrowChanged = (event) => {
  isNarrow.value = event.matches;
  syncColumnWidth();
};
const visibilityChanged = () => { if (document.hidden) releaseInput(); };
const windowResized = () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(syncColumnWidth, 150);
};
watch([width, height, contentRect], syncColumnWidth);
watch(connectionStatus, (status) => {
  if (status === 'idle') {
    lastColumnWidth = 0;
    emit('column-width', 390);
  }
});

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    const nextHeight = Math.round(entry.contentRect.height);
    if (Math.abs(nextHeight - lastStageHeight) < 2) return;
    lastStageHeight = nextHeight;
    syncColumnWidth();
  });
  observer.observe(stage.value);
  narrowQuery?.addEventListener('change', narrowChanged);
  document.addEventListener('fullscreenchange', fullscreenChanged);
  document.addEventListener('visibilitychange', visibilityChanged);
  window.addEventListener('blur', releaseInput);
  window.addEventListener('resize', windowResized);
  void start();
});
onBeforeUnmount(() => {
  clearTimeout(resizeTimer);
  observer?.disconnect();
  narrowQuery?.removeEventListener('change', narrowChanged);
  document.removeEventListener('fullscreenchange', fullscreenChanged);
  document.removeEventListener('visibilitychange', visibilityChanged);
  window.removeEventListener('blur', releaseInput);
  window.removeEventListener('resize', windowResized);
  void destroyClient();
});
defineExpose({ pressKey, openKeyInput });
</script>

<style scoped>
.scrcpy-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  color: var(--bay-text, #e9e6dd);
}

.coord-readout {
  position: absolute;
  top: 9px;
  left: 9px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 9px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 7px;
  background: rgba(9, 10, 13, 0.82);
  line-height: 1.35;
  pointer-events: none;
}

.coord-absolute {
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: 0.04em;
  color: #e9e6dd;
}

.coord-relative {
  font-size: 9px;
  letter-spacing: 0.03em;
  color: #9a9ca2;
}

.coord-fade-enter-active,
.coord-fade-leave-active { transition: opacity 0.14s ease; }
.coord-fade-enter-from,
.coord-fade-leave-to { opacity: 0; }

.settings-popover { font-size: 12.5px; color: var(--ink); }
.settings-title { margin: 0 0 8px; font-weight: 680; }
.settings-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
.settings-grid label { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.settings-grid .check { justify-content: flex-start; }
.settings-grid input[type=number] { width: 90px; }
small { color: var(--muted); line-height: 1.5; }

.screen-area { flex: 1; min-height: 180px; display: flex; align-items: stretch; gap: 8px; }
.screen-column { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 8px; }
.stage {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #08090b;
}
/* Pinned to the stage instead of flex-sized: a fractional stage height would
   otherwise leave a 1px black seam above and below the canvas. */
.video-surface {
  position: absolute;
  inset: 0;
  line-height: 0;
  overflow: hidden;
  background: #000;
  touch-action: none;
}
.video-surface :deep(canvas) {
  position: absolute;
  top: var(--video-top, 0);
  left: 0;
  display: block;
  width: 100% !important;
  height: var(--video-height, 100%) !important;
  object-fit: fill;
}
.video-surface:focus-visible { outline: 2px solid var(--bay-accent, #ff6a3d); outline-offset: 3px; }
.stage-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: #9a9ca2; font-size: 12.5px; pointer-events: none; padding: 20px; text-align: center; }
.spinner { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.side-toolbar {
  flex: none;
  width: 42px;
  align-self: center;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 5px;
  overflow-y: auto;
  scrollbar-width: none;
  background: var(--bay-2, #171a1f);
  border: 1px solid var(--bay-line, #2a2d34);
  border-radius: 11px;
  box-shadow: 0 16px 36px -26px rgba(0, 0, 0, 0.9);
}
.side-toolbar::-webkit-scrollbar { display: none; }
.side-toolbar .divider { width: 18px; height: 1px; margin: 3px 0; background: var(--bay-line, #2a2d34); }
/* Docked outside the dark panel: match the paper surface instead of the bay. */
.side-toolbar.is-docked {
  background: var(--surface, #fffdf8);
  border-color: var(--line-strong, #d0c8b7);
  box-shadow: 0 14px 30px -24px rgba(22, 24, 28, 0.55);
}
.side-toolbar.is-docked .divider { background: var(--line-strong, #d0c8b7); }
.side-toolbar.is-docked .icon-btn { color: var(--muted, #7a7468); }
.side-toolbar.is-docked .icon-btn:hover:not(:disabled) { background: var(--surface-3, #f3f0e8); color: var(--ink, #16181c); }
.side-toolbar.is-docked .icon-btn.active { background: var(--accent-soft, #fbece5); color: var(--accent-ink, #b4411f); }
.icon-btn {
  width: 32px;
  height: 32px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #b6b1a7;
  cursor: pointer;
  transition: background-color .16s, color .16s;
}
.icon-btn:hover:not(:disabled) { background: #262a31; color: #fff; }
.icon-btn.active { background: rgba(255, 106, 61, 0.16); color: #ff8a63; }
.icon-btn:disabled { opacity: .3; cursor: not-allowed; }
.icon-btn:focus-visible { outline: 2px solid var(--bay-accent, #ff6a3d); outline-offset: 1px; }

.error {
  margin: 0 10px 10px;
  padding: 8px 10px;
  border-radius: 7px;
  background: rgba(191, 58, 44, 0.14);
  border: 1px solid rgba(191, 58, 44, 0.32);
  color: #ff9d90;
  font-size: 11.5px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 96px;
  overflow: auto;
}

.bottom-bar {
  position: absolute;
  left: 50%;
  bottom: 12px;
  z-index: 5;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2px;
  max-width: calc(100% - 20px);
  padding: 5px 6px;
  background: rgba(23, 26, 31, 0.92);
  border: 1px solid var(--bay-line, #2a2d34);
  border-radius: 10px;
  box-shadow: 0 14px 30px -18px rgba(0, 0, 0, 0.85);
  transform: translateX(-50%);
}
.bottom-bar .icon-btn { width: 40px; height: 32px; }
.nav-fade-enter-active,
.nav-fade-leave-active { transition: opacity .16s ease; }
.nav-fade-enter-from,
.nav-fade-leave-to { opacity: 0; }
.divider { width: 1px; height: 18px; margin: 0 5px; background: var(--bay-line, #2a2d34); }

.tool-popover { display: flex; flex-direction: column; gap: 8px; font-size: 12.5px; color: var(--ink); }
.popover-title { margin: 0; font-weight: 680; }
.popover-subtitle { margin-top: 4px; padding-top: 8px; border-top: 1px solid var(--line-soft); }
.popover-input { width: 100%; box-sizing: border-box; resize: vertical; min-height: 58px; font: inherit; font-size: 12.5px; color: var(--ink); background: var(--surface); border: 1px solid var(--line-strong); border-radius: 7px; padding: 7px 9px; }
.popover-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(228, 87, 46, .12); }
.popover-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.popover-audio-status { margin: 0; color: var(--muted); font-size: 11.5px; overflow-wrap: anywhere; }
.popover-hint { margin: 0; color: var(--muted); font-size: 11.5px; line-height: 1.55; }
.text-btn { border: 0; background: none; color: var(--accent-ink); cursor: pointer; font-size: 12px; padding: 0; align-self: flex-start; }
.text-btn:disabled { color: var(--muted-2); cursor: not-allowed; }
textarea, select, input[type=number] { font: inherit; font-size: 12.5px; color: var(--ink); background: var(--surface); border: 1px solid var(--line-strong); border-radius: 6px; padding: 4px 6px; }

.is-fullscreen { height: 100dvh; padding: 8px; gap: 8px; background: var(--bay); color: var(--bay-text); }
.is-fullscreen .stage { border-radius: 0; background: #000; box-shadow: none; }
/* Fullscreen has no synced column, so keep the frame instead of stretching it. */
.is-fullscreen .video-surface :deep(canvas) { top: 0; height: 100% !important; object-fit: contain; }
.is-fullscreen .side-toolbar { background: var(--bay-2); border-color: var(--bay-line); }
.is-fullscreen .bottom-bar { background: var(--bay-2); border-color: var(--bay-line); }
.is-fullscreen .icon-btn { color: #d6d2c8; }
.is-fullscreen .icon-btn:hover:not(:disabled) { background: rgba(255, 255, 255, .1); color: #fff; }
.is-fullscreen .icon-btn.active { background: rgba(255, 106, 61, .22); color: #ff9b7a; }
.is-fullscreen .divider { background: rgba(255, 255, 255, .16); }
/* Keep the full toolbar visible without scrolling on shorter viewports. */
@media (max-height: 800px) and (min-width: 801px) {
  .side-toolbar { gap: 0; padding: 4px; }
  .side-toolbar .icon-btn { width: 30px; height: 28px; }
  .side-toolbar .divider { margin: 2px 0; }
}
@media (max-width: 800px) {
  .scrcpy-page { height: auto; }
  .screen-area { flex: none; height: min(58dvh, 620px); min-height: 280px; }
  .side-toolbar { width: 38px; padding: 4px; }
  .icon-btn { width: 30px; height: 30px; }
  .bottom-bar .icon-btn { width: 36px; height: 30px; }
}
</style>
