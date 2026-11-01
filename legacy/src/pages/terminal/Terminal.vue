<template>
  <div class="page terminal-page">
    <header class="page-head">
      <div class="page-heading-copy">
        <p class="eyebrow">Shell / ADB</p>
        <h1 class="page-title">设备终端</h1>
        <p class="page-sub">在设备上运行交互式 shell，命令直接生效。右键可复制、粘贴、全选或调整字号。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :disabled="!isDeviceConnected || isConnecting" @click="startTerminal">重启终端</el-button>
        <el-button :icon="Delete" :disabled="!isDeviceConnected" @click="clearTerminal">清屏</el-button>
        <el-button :icon="ZoomIn" @click="fontSizeDialogVisible = true">字体</el-button>
      </div>
    </header>

    <section class="terminal-shell">
      <header class="terminal-bar">
        <div class="shell-title">
          <el-icon><Monitor /></el-icon>
          <span class="mono">adb shell</span>
        </div>
        <div class="shell-meta">
          <span class="status-dot" :class="{ 'is-live': isDeviceConnected }"></span>
          <span class="mono">{{ isDeviceConnected ? 'CONNECTED' : 'OFFLINE' }}</span>
          <span class="mono shell-size">{{ fontSize }}PX</span>
        </div>
      </header>

      <!-- 终端内容区域 -->
      <div class="terminal-content">
        <div v-if="!isDeviceConnected" class="no-device">
          <span class="empty-mark">SHELL</span>
          <strong>设备未连接</strong>
          <p>连接设备后终端会自动启动。</p>
          <el-button type="primary" @click="checkDevice">检查设备连接</el-button>
        </div>
        <div
          v-else
          ref="terminalContainer"
          class="terminal-container"
          @contextmenu="handleContextMenu"
        ></div>
      </div>

      <footer class="terminal-foot">
        <span class="mono">xterm · shellProtocol</span>
        <span>右键打开命令菜单</span>
      </footer>
    </section>

    <!-- 右键菜单 -->
    <div 
      v-show="contextMenuVisible" 
      ref="contextMenuRef"
      class="context-menu"
      :style="contextMenuStyle"
      @click.stop
    >
      <div class="context-menu-item" @click="handleContextMenuCommand('restart')">
        <el-icon><Refresh /></el-icon>
        <span>重新启动终端</span>
      </div>
      <div class="context-menu-item" @click="handleContextMenuCommand('clear')">
        <el-icon><Delete /></el-icon>
        <span>清除终端内容</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="handleContextMenuCommand('copy')">
        <el-icon><CopyDocument /></el-icon>
        <span>复制选中内容</span>
      </div>
      <div class="context-menu-item" @click="handleContextMenuCommand('paste')">
        <el-icon><DocumentCopy /></el-icon>
        <span>粘贴</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="handleContextMenuCommand('selectAll')">
        <el-icon><Select /></el-icon>
        <span>全选</span>
      </div>
      <div class="context-menu-item" @click="handleContextMenuCommand('fontSize')">
        <el-icon><ZoomIn /></el-icon>
        <span>调整字体大小</span>
      </div>
    </div>

    <!-- 字体大小调整对话框 -->
    <el-dialog v-model="fontSizeDialogVisible" title="调整字体大小" width="300px">
      <div class="font-size-control">
        <el-slider
          v-model="fontSize"
          :min="8"
          :max="24"
          :step="1"
          show-input
          @change="updateFontSize"
        />
        <div class="font-size-preview">
          <span :style="{ fontSize: fontSize + 'px' }">
            预览文本 Preview Text
          </span>
        </div>
      </div>
      <template #footer>
        <el-button @click="fontSizeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="applyFontSize">应用</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { 
  Monitor, 
  Refresh, 
  Delete, 
  CopyDocument, 
  DocumentCopy, 
  Select, 
  ZoomIn 
} from '@element-plus/icons-vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { encodeUtf8 } from '@yume-chan/adb'
import { TextDecoderStream, WritableStream } from '@yume-chan/stream-extra'
import { getAdbInstance } from '@/utils/adbManager.js'

// 响应式数据
const terminalContainer = ref(null)
const isConnecting = ref(false)
const isDeviceConnected = ref(false)

// 右键菜单相关
const contextMenuRef = ref(null)
const contextMenuVisible = ref(false)
const contextMenuStyle = ref({})
const fontSizeDialogVisible = ref(false)
const fontSize = ref(14)

// 终端相关变量
let terminal = null
let fitAddon = null
let shellProcess = null
let writer = null

// 生命周期钩子
onMounted(async () => {
  try {
    await checkDevice()
    if (isDeviceConnected.value) {
      await startTerminal()
    }
  } catch (error) {
    console.error('初始化终端时出错:', error)
    ElMessage.error('终端初始化失败')
  }
})

onUnmounted(() => {
  cleanup()
})

onBeforeRouteLeave(async () => {
  await cleanup()
})

// 检查设备连接状态
const checkDevice = async () => {
  const adbInstance = getAdbInstance()
  console.log('检查设备连接状态:', adbInstance)
  isDeviceConnected.value = !!(adbInstance)
  
  if (!isDeviceConnected.value) {
    ElMessage.warning('请先连接设备')
  } else {
    console.log('设备已连接，ADB实例:', adbInstance)
  }
  
  return isDeviceConnected.value
}

// 启动终端
const startTerminal = async () => {
  if (isConnecting.value) return
  isConnecting.value = true

  await cleanup() // 先清理旧实例

  try {
    const adb = await getAdbInstance()
    if (!adb) {
      isDeviceConnected.value = false
      ElMessage.error('无法获取ADB实例，请确保设备已连接')
      return
    }
    isDeviceConnected.value = true

    terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: 'JetBrains Mono, Cascadia Mono, Consolas, monospace',
      fontSize: fontSize.value,
      lineHeight: 1.25,
      allowTransparency: true,
      theme: {
        background: '#101216',
        foreground: '#e9e6dd',
        cursor: '#ff6a3d',
        black: '#101216',
        red: '#e0614f',
        green: '#4fb18c',
        yellow: '#d09a3c',
        blue: '#6f8fbf',
        magenta: '#a97fb5',
        cyan: '#57a9a3',
        white: '#e9e6dd',
        brightBlack: '#5d616b',
        brightRed: '#ff7a5e',
        brightGreen: '#6ecfaa',
        brightYellow: '#e8b45a',
        brightBlue: '#8aa9d6',
        brightMagenta: '#c195cc',
        brightCyan: '#74c4be',
        brightWhite: '#fffdf8'
      }
    });

    fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(terminalContainer.value)
    fitAddon.fit()

    // 根据支持情况选择协议
    if (adb.subprocess.shellProtocol?.isSupported) {
      // PTY 模式
      shellProcess = await adb.subprocess.shellProtocol.pty({
        terminalType: 'xterm-256color',
      });
      // PTY creation doesn't take the initial size, so send it before the shell draws.
      await shellProcess.resize(terminal.rows, terminal.cols);

      shellProcess.output
        .pipeThrough(new TextDecoderStream())
        .pipeTo(new WritableStream({
          write(chunk) { if (terminal) terminal.write(chunk) }
        }))
        .catch(e => console.error("PTY Shell streams failed", e));
      
      writer = shellProcess.input.getWriter();

      terminal.onResize(({ cols, rows }) => {
        if (shellProcess?.resize) {
           shellProcess.resize(rows, cols);
        }
      });
    } else {
      // 普通模式 (无 PTY)：none 协议将 stdout 和 stderr 合并为 output。
      shellProcess = await adb.subprocess.noneProtocol.spawn('sh', ['-i']);
      
      const termWriter = new WritableStream({
        write(chunk) { if (terminal) terminal.write(chunk) }
      });

      shellProcess.output.pipeThrough(new TextDecoderStream()).pipeTo(termWriter, { preventClose: true }).catch(e => {
        if (!shellProcess) return; // Already cleaned up
        console.error("Non-PTY Shell stream failed", e);
      });
      
      writer = shellProcess.stdin.getWriter();
    }
    
    terminal.onData(async (data) => {
      if (writer) {
        try {
          await writer.write(encodeUtf8(data));
        } catch (e) {
          console.error('写入终端数据失败:', e);
          await cleanup();
        }
      }
    });

    window.addEventListener('resize', handleResize);
    
  } catch (error) {
    console.error('启动终端时出错:', error);
    ElMessage.error(`启动终端失败: ${error.message}`);
    await cleanup();
  } finally {
    isConnecting.value = false;
  }
}

// 清除终端内容
const clearTerminal = () => {
  if (terminal) {
    terminal.clear()
    ElMessage.success('终端已清除')
  } else {
    ElMessage.warning('终端未启动')
  }
}

// 处理右键菜单
const handleContextMenu = (event) => {
  event.preventDefault()
  
  // 设置菜单位置
  contextMenuStyle.value = {
    position: 'fixed',
    left: event.clientX + 'px',
    top: event.clientY + 'px',
    zIndex: 9999
  }
  
  contextMenuVisible.value = true
  
  // 点击其他地方关闭菜单
  nextTick(() => {
    document.addEventListener('click', hideContextMenu, { once: true })
  })
}

// 隐藏右键菜单
const hideContextMenu = () => {
  contextMenuVisible.value = false
}

// 处理右键菜单命令
const handleContextMenuCommand = (command) => {
  // 隐藏菜单
  contextMenuVisible.value = false
  
  switch (command) {
    case 'restart':
      startTerminal()
      break
    case 'clear':
      clearTerminal()
      break
    case 'copy':
      copySelectedText()
      break
    case 'paste':
      pasteText()
      break
    case 'selectAll':
      selectAllText()
      break
    case 'fontSize':
      fontSizeDialogVisible.value = true
      break
  }
}

// 复制选中文本
const copySelectedText = () => {
  if (terminal && terminal.hasSelection()) {
    const selectedText = terminal.getSelection()
    if (selectedText) {
      navigator.clipboard.writeText(selectedText).then(() => {
        ElMessage.success('已复制到剪贴板')
      }).catch(() => {
        ElMessage.error('复制失败')
      })
    }
  } else {
    ElMessage.warning('请先选择要复制的文本')
  }
}

// 粘贴文本
const pasteText = async () => {
  if (!terminal || !writer) {
    ElMessage.warning('终端未启动')
    return
  }
  
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      const buffer = encodeUtf8(text)
      await writer.write(buffer)
      ElMessage.success('已粘贴文本')
    }
  } catch (error) {
    ElMessage.error('粘贴失败，请检查剪贴板权限')
  }
}

// 全选文本
const selectAllText = () => {
  if (terminal) {
    terminal.selectAll()
    ElMessage.success('已全选文本')
  } else {
    ElMessage.warning('终端未启动')
  }
}

// 更新字体大小
const updateFontSize = (size) => {
  fontSize.value = size
}

// 应用字体大小
const applyFontSize = () => {
  if (terminal) {
    terminal.options.fontSize = fontSize.value
    if (fitAddon) {
      fitAddon.fit()
    }
    ElMessage.success('字体大小已更新')
  }
  fontSizeDialogVisible.value = false
}

// 处理窗口大小变化
const handleResize = () => {
  if (fitAddon && terminal) {
    setTimeout(() => {
      fitAddon.fit()
      // 如果是 PTY 模式，同步大小
      if (shellProcess && shellProcess.resize) {
        shellProcess.resize(terminal.rows, terminal.cols).catch((error) => {
          console.warn('调整PTY大小失败:', error)
        })
      }
    }, 100)
  }
}

// 清理资源
const cleanup = async () => {
  // 移除事件监听器
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', hideContextMenu)
  
  // 隐藏右键菜单
  contextMenuVisible.value = false
  
  const p = shellProcess
  shellProcess = null // Prevent re-entry

  const w = writer
  writer = null

  // 优雅地终止进程
  if (p) {
    if (w) {
      // 关闭输入流会通知 shell 退出
      await w.close().catch(() => { /* ignore error if already closed */ })
    }
    // 等待进程真正退出
    if (p.result) {
      await p.result.catch(() => { /* ignore error on exit */ })
    }
  }
  
  // 销毁终端
  if (terminal) {
    terminal.dispose()
    terminal = null
  }
  
  fitAddon = null
}
</script>

<style scoped>
.terminal-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.terminal-shell {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 320px;
  overflow: hidden;
  border: 1px solid var(--bay-line);
  border-radius: var(--radius);
  background: var(--bay);
  box-shadow: var(--shadow-2);
}

.terminal-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 38px;
  padding: 0 14px;
  border-bottom: 1px solid var(--bay-line);
  background: var(--bay-2);
  flex: none;
}

.shell-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--bay-text);
  font-size: 10.5px;
  letter-spacing: 0.08em;
}

.shell-title .el-icon {
  color: var(--bay-accent);
  font-size: 14px;
}

.shell-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  letter-spacing: 0.1em;
  color: #6d717b;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4b4f59;
}

.status-dot.is-live {
  background: #4fb18c;
  box-shadow: 0 0 0 3px rgba(79, 177, 140, 0.14);
}

.shell-size {
  padding-left: 9px;
  border-left: 1px solid var(--bay-line);
  color: #565a64;
}

.terminal-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 10px 6px 6px 10px;
}

.no-device {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  color: var(--bay-muted);
}

.no-device strong {
  color: var(--bay-text);
  font-size: 15px;
  font-weight: 650;
}

.no-device p {
  margin: 0 0 8px;
  font-size: 12px;
}

.empty-mark {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.4em;
  color: #4c505a;
}

.terminal-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: transparent;
}

.terminal-container :deep(.xterm) {
  height: 100%;
  padding: 2px;
}

.terminal-container :deep(.xterm .xterm-viewport) {
  background-color: transparent !important;
  scrollbar-width: thin;
  scrollbar-color: #3a3e47 transparent;
}

.terminal-container :deep(.xterm .xterm-viewport::-webkit-scrollbar) {
  width: 10px !important;
}

.terminal-container :deep(.xterm .xterm-viewport::-webkit-scrollbar-track) {
  background: transparent !important;
}

.terminal-container :deep(.xterm .xterm-viewport::-webkit-scrollbar-thumb) {
  background-color: #3a3e47 !important;
  border-radius: 999px !important;
  border: 3px solid transparent !important;
  background-clip: content-box !important;
}

.terminal-container :deep(.xterm .xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background-color: #565a64 !important;
}

.terminal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 30px;
  padding: 0 14px;
  border-top: 1px solid var(--bay-line);
  background: var(--bay-2);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: #565a64;
  flex: none;
}

/* 右键菜单样式 */
.context-menu {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: var(--shadow-2);
  padding: 5px;
  min-width: 172px;
  font-size: 12.5px;
  color: var(--ink-soft);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.context-menu-item:hover {
  background: var(--accent-soft);
  color: var(--accent-ink);
}

.context-menu-item .el-icon {
  font-size: 14px;
  color: var(--muted);
}

.context-menu-item:hover .el-icon {
  color: var(--accent-ink);
}

.context-menu-divider {
  height: 1px;
  background: var(--line-soft);
  margin: 5px 6px;
}

/* 字体大小调整对话框样式 */
.font-size-control {
  padding: 8px 0 4px;
}

.font-size-preview {
  margin-top: 18px;
  padding: 14px;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  text-align: center;
  font-family: var(--mono);
  color: var(--ink-soft);
}

@media (max-width: 900px) {
  .terminal-page {
    height: auto;
  }

  .terminal-shell {
    flex: none;
    height: 64vh;
  }
}

@media (max-width: 768px) {
  .terminal-bar {
    padding: 0 10px;
  }
}
</style> 