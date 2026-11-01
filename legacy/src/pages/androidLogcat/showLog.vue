<template>
  <section class="page log-page">
    <header class="page-head">
      <div class="page-heading-copy">
        <p class="eyebrow">Telemetry / Logcat</p>
        <h1 class="page-title">设备日志</h1>
        <p class="page-sub">实时读取设备 Logcat 输出，按级别、标签或关键字过滤，点击条目可展开完整消息。</p>
      </div>
      <div class="page-actions">
        <el-button :type="isRunning ? 'danger' : 'primary'" @click="toggleLogcat">
          <el-icon><VideoPlay v-if="!isRunning" /><VideoPause v-else /></el-icon>
          {{ isRunning ? '停止采集' : '开始采集' }}
        </el-button>
        <el-button :icon="Delete" @click="clearLogs">清除</el-button>
        <el-button :icon="Download" :disabled="filteredLogs.length === 0" @click="exportLogs">导出</el-button>
      </div>
    </header>

    <div class="log-toolbar surface">
      <div class="filter-group">
        <el-select v-model="selectedPriority" placeholder="日志级别" class="level-select">
          <el-option v-for="item in priorityOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-input v-model="tagFilter" placeholder="标签过滤" class="tag-filter" />
        <el-input v-model="searchQuery" placeholder="搜索日志内容" class="search-input">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
      </div>
      <div class="log-status">
        <span class="live-dot" :class="{ 'is-live': isRunning }"></span>
        <span class="mono">{{ isRunning ? 'LIVE' : 'IDLE' }}</span>
        <span class="mono log-count">{{ filteredLogs.length }} LINES</span>
      </div>
    </div>

    <section class="log-console">
      <div class="log-console-head">
        <div class="log-cell time">时间</div>
        <div class="log-cell priority">级别</div>
        <div class="log-cell tag">标签</div>
        <div class="log-cell message">消息</div>
      </div>
      <div class="log-container">
        <el-scrollbar ref="scrollbarRef" height="100%" @scroll="handleScroll">
          <div v-if="filteredLogs.length > 0" class="log-entries">
            <div class="virtual-padding-top" :style="{ height: `${topPadding}px` }"></div>
            <div
              v-for="item in visibleLogs"
              :key="item.id"
              :class="[
                'log-entry',
                `priority-${AndroidLogPriorityToCharacter[item.priority]?.toLowerCase()}`
              ]"
              @click="toggleRowExpansion(item.id)"
            >
              <div class="log-cell time">{{ formatTime(item) }}</div>
              <div class="log-cell priority">
                <span class="level-badge">{{ AndroidLogPriorityToCharacter[item.priority] }}</span>
              </div>
              <div class="log-cell tag">{{ item.tag }}</div>
              <div class="log-cell message" :class="{ expanded: expandedRowId === item.id }">
                {{ item.message }}
              </div>
            </div>
            <div class="virtual-padding-bottom" :style="{ height: `${bottomPadding}px` }"></div>
          </div>
          <div v-else class="no-logs-message">
            <span class="empty-mark">LOG</span>
            <span>{{ isRunning ? '正在等待日志输出…' : '没有日志可显示' }}</span>
          </div>
        </el-scrollbar>
        <div v-if="!isNearBottom && isRunning" class="auto-scroll-indicator">
          <button class="jump-bottom" aria-label="滚动到底部" @click="scrollToBottom">
            <el-icon><ArrowDown /></el-icon>
          </button>
        </div>
      </div>
      <footer class="log-foot">
        <span class="mono">adb logcat · stream</span>
        <span>点击行展开 · 自动滚动仅在底部时启用</span>
      </footer>
    </section>
  </section>
</template>

<script setup>
import { ref, onUnmounted, shallowRef, computed, nextTick, onMounted, watch } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { ElMessage } from 'element-plus'
import { getAdbInstance } from '@/utils/adbManager'
import { Delete, Download, VideoPlay, VideoPause, ArrowDown, Search } from '@element-plus/icons-vue'
import { Logcat, AndroidLogPriority, AndroidLogPriorityToCharacter } from '@yume-chan/android-bin'

// 状态变量
const deviceStore = useDeviceStore()
const isRunning = ref(false)
const logs = shallowRef([])
const selectedPriority = ref(AndroidLogPriority.Verbose)
const tagFilter = ref('')
const searchQuery = ref('')
const scrollbarRef = ref(null)
const isNearBottom = ref(true)
const expandedRowId = ref(null)

// 虚拟滚动相关变量
const itemHeight = 46 // 每个日志项的高度
const bufferSize = 20 // 增加上下缓冲区大小以避免空白
const visibleLogs = ref([]) // 可见日志
const topPadding = ref(0) // 顶部填充高度
const bottomPadding = ref(0) // 底部填充高度
const scrollTop = ref(0) // 滚动位置

// Logcat 实例
let logcat = null
let logStream = null
let abortController = null
let reader = null
let shouldStopLogcat = false

// 日志队列和处理相关变量
const MAX_LOGS = 10000 // 最大日志数量
const logQueue = []
let isProcessingQueue = false
let lastUpdateTime = 0
const UPDATE_INTERVAL = 200 // 更新间隔
let logIdCounter = 0 // 用于生成唯一ID

// 优先级选项
const priorityOptions = [
  { label: '详细 (V)', value: AndroidLogPriority.Verbose },
  { label: '调试 (D)', value: AndroidLogPriority.Debug },
  { label: '信息 (I)', value: AndroidLogPriority.Info },
  { label: '警告 (W)', value: AndroidLogPriority.Warn },
  { label: '错误 (E)', value: AndroidLogPriority.Error },
  { label: '致命 (F)', value: AndroidLogPriority.Fatal }
]

// 使用计算属性来过滤日志
const filteredLogs = computed(() => {
  const priority = selectedPriority.value
  const tag = tagFilter.value.toLowerCase()
  const query = searchQuery.value.toLowerCase()

  return logs.value.filter((log) => {
    if (log.priority < priority) return false
    if (tag && !log.tag.toLowerCase().includes(tag)) return false
    if (query && !log.message.toLowerCase().includes(query)) return false
    return true
  })
})

// 监听过滤条件变化，当条件变化时重置滚动位置
watch([selectedPriority, tagFilter, searchQuery], () => {
  nextTick(() => {
    if (scrollbarRef.value) {
      scrollbarRef.value.setScrollTop(0)
      updateVisibleLogs(0)
    }
  })
})

// 监听filteredLogs变化，更新虚拟滚动
watch(filteredLogs, () => {
  updateVisibleLogs(scrollTop.value)
})

// 更新可见日志 - 修复虚拟滚动计算
const updateVisibleLogs = (scrollPosition) => {
  if (!scrollbarRef.value || !scrollbarRef.value.wrapRef) return

  const containerHeight = scrollbarRef.value.wrapRef.clientHeight
  const totalItems = filteredLogs.value.length
  
  // 计算可见项的起始索引和结束索引
  const startIndex = Math.max(0, Math.floor(scrollPosition / itemHeight) - bufferSize)
  const visibleCount = Math.ceil(containerHeight / itemHeight) + bufferSize * 2
  const endIndex = Math.min(totalItems, startIndex + visibleCount)
  
  // 更新可见日志
  visibleLogs.value = filteredLogs.value.slice(startIndex, endIndex)
  
  // 更新顶部和底部填充
  topPadding.value = startIndex * itemHeight
  bottomPadding.value = (totalItems - endIndex) * itemHeight
}

// 切换 Logcat 状态
const toggleLogcat = async () => {
  if (isRunning.value) {
    await stopLogcat()
  } else {
    await startLogcat()
  }
}

// 启动 Logcat
const startLogcat = async () => {
  try {
    const adb = getAdbInstance()
    if (!adb) {
      ElMessage.error('请先连接设备')
      return
    }
    
    isRunning.value = true
    shouldStopLogcat = false
    logs.value = []
    logIdCounter = 0
    
    // 创建 Logcat 实例
    logcat = new Logcat(adb)
    abortController = new AbortController()
    
    try {
      // 清除现有日志缓冲区
      await logcat.clear()
      
      // 获取二进制日志流
      logStream = logcat.binary()
      reader = logStream.getReader()
      
      // 读取日志
      while (!shouldStopLogcat) {
        try {
          const { done, value } = await reader.read()
          if (done) break
          
          // 为日志添加唯一ID
          value.id = logIdCounter++
          
          // 将日志条目添加到队列
          logQueue.push(value)
          
          if (!isProcessingQueue) {
            processLogQueue()
          }
        } catch (err) {
          if (!shouldStopLogcat) {
            console.error('读取 logcat 输出时出错:', err)
          }
          break
        }
      }
    } catch (error) {
      console.error('启动 Logcat 流时出错:', error)
      ElMessage.error('启动 Logcat 失败，请检查设备连接状态')
      isRunning.value = false
    }
  } catch (error) {
    console.error('创建 Logcat 实例时出错:', error)
    ElMessage.error('启动 Logcat 失败，请检查设备连接状态')
    isRunning.value = false
  }
}

// 异步处理日志队列
const processLogQueue = async () => {
  isProcessingQueue = true
  while (logQueue.length > 0 && !shouldStopLogcat) {
    const now = Date.now()
    if (now - lastUpdateTime >= UPDATE_INTERVAL) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      
      // 增加批处理大小
      const batchSize = Math.min(500, logQueue.length)
      const batch = logQueue.splice(0, batchSize)
      
      // 使用不可变更新方式
      logs.value = [...logs.value, ...batch].slice(-MAX_LOGS)
      lastUpdateTime = now
      
      // 如果用户在底部，则自动滚动
      if (isNearBottom.value) {
        await nextTick()
        scrollToBottom()
      }
    } else {
      await new Promise((resolve) =>
        setTimeout(resolve, UPDATE_INTERVAL - (now - lastUpdateTime))
      )
    }
  }
  isProcessingQueue = false
}

// 停止 Logcat
const stopLogcat = async () => {
  shouldStopLogcat = true
  isRunning.value = false

  // 取消读取操作
  if (reader) {
    try {
      await reader.cancel()
    } catch (error) {
      console.error('取消 reader 时出错:', error)
    }
    
    try {
      reader.releaseLock()
    } catch (error) {
      console.error('释放 reader 锁时出错:', error)
    }
    reader = null
  }

  // 取消日志流
  if (logStream) {
    try {
      await logStream.cancel()
    } catch (error) {
      console.error('取消 logStream 时出错:', error)
    }
    logStream = null
  }

  // 中止控制器
  if (abortController) {
    try {
      abortController.abort()
    } catch (error) {
      console.error('中止控制器时出错:', error)
    }
    abortController = null
  }

  logcat = null
  logQueue.length = 0
}

// 清除日志
const clearLogs = async () => {
  try {
    if (logcat) {
      await logcat.clear()
    } else {
      const adb = getAdbInstance()
      if (adb) {
        const tempLogcat = new Logcat(adb)
        await tempLogcat.clear()
      }
    }
    
    logs.value = []
    logQueue.length = 0
    logIdCounter = 0
    ElMessage.success('日志已清除')
  } catch (error) {
    console.error('清除日志失败，请重试', error)
    ElMessage.error('清除日志失败，请重试')
  }
}

// 导出日志
const exportLogs = () => {
  const logText = filteredLogs.value
    .map((log) => `${formatTime(log)} ${log.tag} ${log.message}`)
    .join('\n')
  const blob = new Blob([logText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logcat_export_${new Date().toISOString().replace(/:/g, '-')}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('日志导出成功')
}

// 格式化时间
const formatTime = (log) => {
  const date = new Date(log.seconds * 1000 + log.nanoseconds / 1000000)
  return date.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + 
    String(Math.floor(log.nanoseconds / 1000000)).padStart(3, '0')
}

// 滚动到底部
const scrollToBottom = () => {
  if (!scrollbarRef.value) return;
  
  nextTick(() => {
    try {
      const scrollbar = scrollbarRef.value;
      if (scrollbar && scrollbar.wrapRef) {
        scrollbar.wrapRef.scrollTop = scrollbar.wrapRef.scrollHeight;
      }
    } catch (error) {
      console.error('滚动到底部时出错:', error);
    }
  });
}

// 处理滚动事件
const handleScroll = (event) => {
  if (!scrollbarRef.value || !scrollbarRef.value.wrapRef) return;
  
  const { scrollTop: newScrollTop, scrollHeight, clientHeight } = scrollbarRef.value.wrapRef;
  scrollTop.value = newScrollTop;
  
  // 当滚动条距离底部小于50px时，我们认为用户在底部
  isNearBottom.value = scrollHeight - newScrollTop - clientHeight < 50;
  
  // 更新可见日志
  updateVisibleLogs(newScrollTop);
}

// 点击行时展开/折叠
const toggleRowExpansion = (id) => {
  if (expandedRowId.value === id) {
    expandedRowId.value = null;
  } else {
    expandedRowId.value = id;
  }
}

// 组件卸载时清理资源
onUnmounted(() => {
  stopLogcat()
})

// 组件挂载时初始化
onMounted(() => {
  // 检查设备连接状态
  const adb = getAdbInstance()
  if (!adb) {
    ElMessage.warning('请先连接设备才能查看日志')
  }
  
  // 初始化虚拟滚动
  nextTick(() => {
    if (scrollbarRef.value && scrollbarRef.value.wrapRef) {
      updateVisibleLogs(0);
    }
    scrollToBottom();
  });
})
</script>

<style scoped>
.log-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.log-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding: 10px 14px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 240px;
  flex-wrap: wrap;
}

.level-select {
  width: 142px;
}

.tag-filter {
  width: 150px;
}

.search-input {
  flex: 1;
  min-width: 180px;
  max-width: 440px;
}

.log-status {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--muted-2);
  flex: none;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted-2);
}

.live-dot.is-live {
  background: var(--success);
  box-shadow: 0 0 0 3px rgba(22, 122, 91, 0.15);
  animation: live-pulse 1.8s ease-in-out infinite;
}

.log-count {
  padding-left: 9px;
  border-left: 1px solid var(--line);
  color: var(--muted);
}

.log-console {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--bay-line);
  border-radius: var(--radius);
  background: var(--bay);
  box-shadow: var(--shadow-2);
}

.log-console-head {
  display: flex;
  align-items: center;
  height: 34px;
  padding: 0 12px;
  border-bottom: 1px solid var(--bay-line);
  background: var(--bay-2);
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--bay-muted);
  flex: none;
}

.log-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.log-entries {
  width: 100%;
  position: relative;
}

.log-entry {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 46px;
  padding: 6px 12px;
  border-bottom: 1px solid rgba(42, 45, 52, 0.6);
  border-left: 2px solid transparent;
  cursor: pointer;
  transition: background-color 0.14s ease;
}

.log-entry:hover {
  background: var(--bay-2);
}

.log-cell {
  min-width: 0;
  padding: 0 8px;
  font-family: var(--mono);
  font-size: 11.5px;
  line-height: 1.55;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-cell.time {
  flex: 0 0 112px;
  white-space: nowrap;
  color: var(--bay-muted);
  font-size: 11px;
}

.log-cell.priority {
  flex: 0 0 56px;
  display: flex;
  justify-content: center;
}

.log-cell.tag {
  flex: 0 0 168px;
  white-space: nowrap;
  color: #b8bcc6;
}

.log-cell.message {
  flex: 1;
  color: var(--bay-text);
  white-space: nowrap;
  transition: background-color 0.16s ease;
}

.log-cell.message.expanded {
  white-space: pre-wrap;
  word-break: break-word;
  overflow: visible;
  text-overflow: clip;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--bay-3);
  color: #f0ede4;
  position: relative;
  z-index: 2;
  box-shadow: 0 10px 26px -12px rgba(0, 0, 0, 0.7);
}

.level-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #0f1115;
}

.no-logs-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 260px;
  color: var(--bay-muted);
  font-size: 12.5px;
}

.empty-mark {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.4em;
  color: #4c505a;
}

.auto-scroll-indicator {
  position: absolute;
  bottom: 18px;
  right: 18px;
  z-index: 10;
}

.jump-bottom {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--bay-line);
  border-radius: 50%;
  background: var(--bay-3);
  color: var(--bay-text);
  cursor: pointer;
  box-shadow: 0 8px 20px -10px rgba(0, 0, 0, 0.8);
  transition: background-color 0.16s ease, border-color 0.16s ease;
}

.jump-bottom:hover {
  background: #2b2f37;
  border-color: #3a3e47;
}

.log-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  min-height: 32px;
  padding: 0 14px;
  border-top: 1px solid var(--bay-line);
  background: var(--bay-2);
  font-size: 10.5px;
  color: #5d616b;
}

.log-foot .mono {
  letter-spacing: 0.08em;
}

/* 优先级颜色 */
.priority-v { border-left-color: #4b4f59; }
.priority-d { border-left-color: #6283b5; }
.priority-i { border-left-color: #3e9f7d; }
.priority-w { border-left-color: #c08e3a; }
.priority-e,
.priority-f { border-left-color: #d0563f; }

.priority-v .level-badge { background: #4b4f59; color: #dfe2e8; }
.priority-d .level-badge { background: #6283b5; color: #0f1115; }
.priority-i .level-badge { background: #3e9f7d; color: #0f1115; }
.priority-w .level-badge { background: #d09a3c; color: #0f1115; }
.priority-e .level-badge { background: #d0563f; color: #fff; }
.priority-f .level-badge { background: #ff6a3d; color: #0f1115; }

.log-container :deep(.el-scrollbar__thumb) {
  background-color: #4a4e57;
}

.log-container :deep(.el-scrollbar__thumb:hover) {
  background-color: #61656f;
}

@keyframes live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

@media (max-width: 900px) {
  .log-page {
    height: auto;
  }

  .log-console {
    flex: none;
  }

  .log-container {
    flex: none;
    height: 62vh;
  }
}

@media (max-width: 760px) {
  .tag-filter {
    width: 120px;
  }

  .log-cell.time {
    flex-basis: 92px;
  }

  .log-cell.tag {
    flex-basis: 110px;
  }
}

@media (max-width: 560px) {
  .tag-filter {
    display: none;
  }

  .log-cell.tag {
    display: none;
  }

  .log-cell.time {
    flex-basis: 84px;
    font-size: 10px;
  }
}
</style> 