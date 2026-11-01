<template>
  <div class="page performance-page">
    <header class="page-head">
      <div class="page-heading-copy">
        <p class="eyebrow">Performance / Monitor</p>
        <h1 class="page-title">性能监控</h1>
        <p class="page-sub">按应用采集 CPU、内存、帧率、网络与电池数据，监控结束后可导出完整 CSV 报告。</p>
      </div>
      <div class="page-actions">
        <el-button v-if="!isMonitoring" type="primary" :disabled="!selectedPackage || isLoading" @click="startMonitoring">
          <el-icon><VideoPlay /></el-icon>开始监控
        </el-button>
        <el-button v-else type="danger" @click="stopMonitoring">
          <el-icon><VideoPause /></el-icon>停止监控
        </el-button>
        <el-button :icon="Download" :disabled="performanceStore.timeStamps.length === 0 || isMonitoring" @click="exportData">导出报告</el-button>
      </div>
    </header>

    <section class="control-console surface">
      <div class="config-block">
        <p class="section-kicker">Configuration</p>
        <div class="setting-grid">
          <label class="field">
            <span class="field-label"><el-icon><Menu /></el-icon>监控应用</span>
            <el-select
              v-model="selectedPackage"
              placeholder="选择一个应用"
              :disabled="isMonitoring"
              filterable
              class="full-width"
              @change="onAppSelected"
            >
              <template #prefix><el-icon><Search /></el-icon></template>
              <el-option
                v-for="app in installedApps"
                :key="app.packageName"
                :label="app.appName"
                :value="app.packageName"
              >
                <span>{{ app.appName }}</span>
                <span class="option-pkg mono">{{ app.packageName }}</span>
              </el-option>
            </el-select>
          </label>

          <label class="field" v-if="processList.length > 0">
            <span class="field-label"><el-icon><Phone /></el-icon>选择进程</span>
            <el-select v-model="selectedPid" placeholder="选择应用进程" :disabled="isMonitoring" class="full-width">
              <el-option
                v-for="process in processList"
                :key="process.pid"
                :label="`PID: ${process.pid} | ${process.name}`"
                :value="process.pid"
              />
            </el-select>
          </label>

          <label class="field">
            <span class="field-label"><el-icon><Timer /></el-icon>采集间隔</span>
            <el-select v-model="collectionInterval" :disabled="isMonitoring">
              <el-option label="1 秒" value="1000" />
              <el-option label="2 秒" value="2000" />
              <el-option label="5 秒" value="5000" />
              <el-option label="10 秒" value="10000" />
            </el-select>
          </label>

          <label class="field">
            <span class="field-label">
              <span><el-icon><DataAnalysis /></el-icon>采集上限</span>
              <el-tooltip content="采集上限越大占用内存越大，不限制可能导致长时间监控时内存占用过高" placement="top">
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </span>
            <el-select v-model="localMaxDataPoints" :disabled="isMonitoring" @change="updateMaxDataPoints">
              <el-option label="300 条 (默认)" :value="300" />
              <el-option label="500 条" :value="500" />
              <el-option label="1000 条" :value="1000" />
              <el-option label="2000 条" :value="2000" />
              <el-option label="5000 条" :value="5000" />
              <el-option label="不限制" :value="0" />
            </el-select>
          </label>
        </div>
        <div class="config-actions">
          <el-button :icon="Refresh" :disabled="isLoading || isMonitoring" :loading="isLoading" @click="refreshAppList">刷新应用列表</el-button>
          <el-button :icon="Search" :disabled="isLoading" :loading="isGettingCurrentApp" @click="getCurrentApp">获取当前应用</el-button>
        </div>
      </div>

      <aside class="status-panel" :class="{ 'is-live': isMonitoring }">
        <div class="status-top">
          <span class="status-kicker mono">{{ isMonitoring ? 'RECORDING' : 'STANDBY' }}</span>
          <span class="status-dot"></span>
        </div>
        <div class="status-app">
          <el-icon v-if="isMonitoring" class="is-loading"><Loading /></el-icon>
          <span>{{ isMonitoring ? currentAppName : '尚未开始监控' }}</span>
        </div>
        <div class="status-duration mono">{{ isMonitoring ? monitoringDuration : '--:--:--' }}</div>
        <p class="status-hint">{{ isMonitoring ? '按设定间隔持续采样，图表实时更新' : '选择应用与进程后开始采集' }}</p>
      </aside>
    </section>

    <section v-if="isMonitoring" class="live-panel surface">
      <div class="live-metrics">
        <article class="metric">
          <span class="metric-label">CPU 使用率</span>
          <span class="metric-value mono">{{ latestCpu }}<small>%</small></span>
        </article>
        <article class="metric">
          <span class="metric-label">内存占用</span>
          <span class="metric-value mono">{{ latestMemory }}<small>MB</small></span>
        </article>
        <article class="metric">
          <span class="metric-label">实时帧率</span>
          <span class="metric-value mono">{{ latestFps }}<small>FPS</small></span>
        </article>
        <article class="metric">
          <span class="metric-label">电池温度</span>
          <span class="metric-value mono">{{ latestTemp }}<small>°C</small></span>
        </article>
      </div>

      <div class="live-bottom">
        <div class="foreground-panel">
          <div class="foreground-head">
            <span class="section-kicker">Foreground</span>
            <el-tag :type="currentForegroundApp.packageName ? 'success' : 'info'" size="small">
              {{ currentForegroundApp.packageName ? '已检测' : '未检测' }}
            </el-tag>
          </div>
          <div v-if="currentForegroundApp.packageName" class="foreground-grid">
            <div class="fg-row">
              <span>应用名称</span>
              <strong>{{ currentForegroundApp.appName || '未知' }}</strong>
            </div>
            <div class="fg-row">
              <span>应用类型</span>
              <el-tag size="small" :type="currentForegroundApp.isSystemApp ? 'warning' : 'success'">
                {{ currentForegroundApp.isSystemApp ? '系统应用' : '第三方应用' }}
              </el-tag>
            </div>
            <div class="fg-row">
              <span>包名</span>
              <strong class="mono">{{ currentForegroundApp.packageName }}</strong>
            </div>
            <div class="fg-row">
              <span>进程 ID</span>
              <strong class="mono">{{ currentForegroundApp.pid || '未知' }}</strong>
            </div>
          </div>
          <div v-else class="fg-empty">未检测到前台应用</div>
        </div>

        <div class="data-note">
          <el-icon><InfoFilled /></el-icon>
          <span>
            已采集 {{ performanceStore.timeStamps.length }} 条数据
            {{ performanceStore.maxDataPoints > 0 ? `(最大 ${performanceStore.maxDataPoints} 个)` : '(无限制)' }}。
            图表显示最近 60 条，导出将包含全部数据。
          </span>
        </div>
      </div>
    </section>

    <div class="chart-grid">
      <section v-for="card in chartCards" :key="card.key" class="chart-panel surface">
        <header class="chart-head">
          <div class="chart-heading">
            <span class="chart-icon"><el-icon><component :is="card.icon" /></el-icon></span>
            <div>
              <p class="section-kicker">{{ card.kicker }}</p>
              <h3 class="section-title">{{ card.title }}</h3>
            </div>
          </div>
          <span class="chart-live mono" :class="{ 'is-on': isMonitoring }">
            <span class="live-dot"></span>{{ isMonitoring ? 'LIVE' : 'IDLE' }}
          </span>
        </header>
        <div class="chart-body">
          <div v-if="!isMonitoring" class="chart-empty">
            <span class="empty-icon"><el-icon><component :is="card.icon" /></el-icon></span>
            <span>{{ card.hint }}</span>
          </div>
          <component :is="card.component" v-else />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { usePerformanceStore } from '../../stores/performance';
import { useDeviceStore } from '../../stores/device';
import { getInstalledApps, getProcessList } from '../../utils/adbManager';
import {
  initMonitor,
  startMonitoring as startMonitoringAPI,
  stopMonitoring as stopMonitoringAPI,
  setMonitoringInterval
} from '../../utils/performance/performanceMonitor';
import { collectForegroundApp } from '../../utils/performance/collectors/foregroundAppCollector';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Cpu, Histogram, DataAnalysis, Connection, Odometer, VideoPlay, VideoPause, Download, Menu, Phone, Search, Timer, Clock, InfoFilled, Loading, Refresh } from '@element-plus/icons-vue';

// 导入图表组件
import CpuChart from './components/CpuChart.vue';
import MemoryChart from './components/MemoryChart.vue';
import FpsChart from './components/FpsChart.vue';
import NetworkChart from './components/NetworkChart.vue';
import BatteryChart from './components/BatteryChart.vue';
import TemperatureChart from './components/TemperatureChart.vue';

const chartCards = [
  { key: 'cpu', kicker: 'Processor', title: 'CPU 使用率', hint: '启动监控后显示应用 CPU 使用率', icon: Cpu, component: CpuChart },
  { key: 'memory', kicker: 'Memory', title: '内存使用', hint: '启动监控后显示内存使用曲线', icon: Histogram, component: MemoryChart },
  { key: 'fps', kicker: 'Rendering', title: 'FPS', hint: '启动监控后显示实时帧率', icon: DataAnalysis, component: FpsChart },
  { key: 'network', kicker: 'Network', title: '网络流量', hint: '启动监控后显示上下行流量', icon: Connection, component: NetworkChart },
  { key: 'battery', kicker: 'Power', title: '电池电量', hint: '启动监控后显示电量变化', icon: Odometer, component: BatteryChart },
  { key: 'temperature', kicker: 'Thermal', title: '电池温度', hint: '启动监控后显示电池温度', icon: Odometer, component: TemperatureChart },
];

// 状态
const installedApps = ref([]);
const selectedPackage = ref('');
const isLoading = ref(false);
const collectionInterval = ref(1000);
const monitoringStartTime = ref(null);
const monitoringDuration = ref('');
let durationTimer = null;
const localMaxDataPoints = ref(300); // 本地状态用于绑定选择器
const processList = ref([]); // 存储进程列表
const selectedPid = ref(''); // 选中的进程ID
const isGettingCurrentApp = ref(false); // 获取当前应用的加载状态

// Store
const performanceStore = usePerformanceStore();
const deviceStore = useDeviceStore();

// 计算属性
const isMonitoring = computed(() => performanceStore.isMonitoring);
const currentAppName = computed(() => {
  if (!performanceStore.currentPackageName) return '';
  
  const app = installedApps.value.find(
    app => app.packageName === performanceStore.currentPackageName
  );
  return app ? app.appName : performanceStore.currentPackageName;
});

const latestCpu = computed(() => {
  const history = performanceStore.cpuAppHistory;
  return history.length > 0 ? history[history.length - 1] : 0;
});

const latestMemory = computed(() => {
  const history = performanceStore.memoryTotalHistory;
  return history.length > 0 ? history[history.length - 1] : 0;
});

const latestFps = computed(() => {
  const history = performanceStore.fpsHistory;
  return history.length > 0 ? history[history.length - 1] : 0;
});

const latestTemp = computed(() => {
  const history = performanceStore.batteryTemperatureHistory;
  return history.length > 0 ? history[history.length - 1] : 0;
});

// 当前前台应用信息
const currentForegroundApp = computed(() => performanceStore.currentForegroundAppInfo);

// 方法
const refreshAppList = async () => {
  isLoading.value = true;
  try {
    installedApps.value = await getInstalledApps(false);
  } catch (error) {
    console.error('获取应用列表失败:', error);
  } finally {
    isLoading.value = false;
  }
};

// 获取当前前台应用
const getCurrentApp = async () => {
  isGettingCurrentApp.value = true;
  try {
    const foregroundApp = await collectForegroundApp();

    if (foregroundApp && foregroundApp.packageName) {
      // 检查是否为系统应用
      if (foregroundApp.isSystemApp) {
        // 系统应用提示
        ElMessageBox.confirm(
          `检测到当前前台应用为系统内置应用：${foregroundApp.appName || foregroundApp.packageName}。\n\n系统应用的性能数据可能不够准确或有限制。\n\n是否仍要对此应用进行性能监控？`,
          '系统应用提示',
          {
            confirmButtonText: '继续监控',
            cancelButtonText: '取消',
            type: 'warning',
            center: true
          }
        ).then(async () => {
          // 用户选择继续监控
          await selectAndMonitorApp(foregroundApp);
        }).catch(() => {
          // 用户取消
          ElMessage.info({
            message: '已取消对系统应用的监控',
            duration: 2000
          });
        });
      } else {
        // 第三方应用，直接选择
        await selectAndMonitorApp(foregroundApp);
      }
    } else {
      ElMessage.warning({
        message: '未检测到前台应用，请确保设备上有应用正在运行',
        duration: 3000
      });
    }
  } catch (error) {
    console.error('获取当前应用失败:', error);
    ElMessage.error({
      message: '获取当前应用失败，请检查设备连接',
      duration: 3000
    });
  } finally {
    isGettingCurrentApp.value = false;
  }
};

// 选择并准备监控应用
const selectAndMonitorApp = async (foregroundApp) => {
  try {
    // 检查应用是否在已安装应用列表中
    const existingApp = installedApps.value.find(app => app.packageName === foregroundApp.packageName);

    if (existingApp) {
      // 如果应用在列表中，直接选择
      selectedPackage.value = foregroundApp.packageName;
      await onAppSelected(foregroundApp.packageName);
    } else {
      // 如果应用不在列表中，添加到列表并选择
      const newApp = {
        packageName: foregroundApp.packageName,
        appName: foregroundApp.appName || foregroundApp.packageName
      };
      installedApps.value.unshift(newApp);
      selectedPackage.value = foregroundApp.packageName;
      await onAppSelected(foregroundApp.packageName);
    }

    // 成功消息
    const appType = foregroundApp.isSystemApp ? '系统应用' : '第三方应用';
    const addedText = existingApp ? '' : '（已添加到应用列表）';

    ElMessage.success({
      message: `已获取当前前台${appType}: ${foregroundApp.appName || foregroundApp.packageName}${addedText}`,
      duration: 3000
    });
  } catch (error) {
    console.error('选择应用失败:', error);
    ElMessage.error({
      message: '选择应用失败，请重试',
      duration: 3000
    });
  }
};

const onAppSelected = async (packageName) => {
  if (!packageName) {
    processList.value = [];
    selectedPid.value = '';
    return;
  }
  
  isLoading.value = true;
  try {
    const processes = await getProcessList(packageName);
    processList.value = processes;
    
    // 如果只有一个进程，自动选择
    if (processes.length === 1) {
      selectedPid.value = processes[0].pid;
    } else if (processes.length > 1) {
      // 默认选择第一个进程
      selectedPid.value = processes[0].pid;
    } else {
      selectedPid.value = '';
      ElMessage.warning(`未找到应用 ${packageName} 的进程`);
    }
  } catch (error) {
    console.error('获取进程列表失败:', error);
    ElMessage.error('获取进程列表失败');
    processList.value = [];
    selectedPid.value = '';
  } finally {
    isLoading.value = false;
  }
};

const startMonitoring = async () => {
  if (!selectedPackage.value) {
    ElMessage.warning('请先选择要监控的应用');
    return;
  }

  if (!selectedPid.value && processList.value.length > 0) {
    ElMessage.warning('请选择要监控的进程');
    return;
  }

  isLoading.value = true;
  try {
    // 启动监控
    const success = await startMonitoringAPI(selectedPackage.value, selectedPid.value);
    if (success) {
      // 记录开始时间
      monitoringStartTime.value = new Date();
      
      // 启动计时器，更新运行时长
      durationTimer = setInterval(() => {
        updateDuration();
      }, 1000);
      
      ElMessage.success(`已开始监控 ${selectedPackage.value}`);
    } else {
      ElMessage.error('启动监控失败');
    }
  } catch (error) {
    console.error('启动监控时出错:', error);
    ElMessage.error('启动监控失败: ' + error.message);
  } finally {
    isLoading.value = false;
  }
};

const stopMonitor = () => {
  // 停止监控
  stopMonitoringAPI();
  
  // 清除计时器
  if (durationTimer) {
    clearInterval(durationTimer);
    durationTimer = null;
  }
  
  // 显示消息
  ElMessage.info('性能监控已停止');
  
  // 检查数据一致性
  checkDataConsistency();
};

// 将函数赋值给变量，以便在模板中使用
const stopMonitoring = stopMonitor;

/**
 * 检查数据一致性，确保所有数据数组长度相同
 */
const checkDataConsistency = () => {
  const timeStampsLength = performanceStore.timeStamps.length;
  if (timeStampsLength === 0) return;
  
  const dataLengths = {
    timeStamps: timeStampsLength,
    cpuApp: performanceStore.cpuAppHistory.length,
    cpuSystem: performanceStore.cpuSystemHistory.length,
    memoryTotal: performanceStore.memoryTotalHistory.length,
    batteryLevel: performanceStore.batteryLevelHistory.length,
    batteryTemperature: performanceStore.batteryTemperatureHistory.length,
    networkRx: performanceStore.networkRxHistory.length,
    networkTx: performanceStore.networkTxHistory.length,
    fps: performanceStore.fpsHistory.length,
    jankCount: performanceStore.jankCountHistory.length
  };
  
  const allEqual = Object.values(dataLengths).every(len => len === timeStampsLength);
  
  if (!allEqual) {
    console.warn('数据长度不一致，可能影响图表显示:', dataLengths);
    
    // 尝试修复数据长度不一致的问题
    Object.entries(dataLengths).forEach(([key, length]) => {
      if (key !== 'timeStamps' && length !== timeStampsLength) {
        console.warn(`${key}数据长度(${length})与timeStamps长度(${timeStampsLength})不一致`);
      }
    });
  } else {
    console.log('数据长度一致性检查通过:', timeStampsLength);
  }
};

/**
 * 导出性能数据为CSV文件
 */
const exportData = () => {
  // 检查是否有数据
  if (performanceStore.timeStamps.length === 0) {
    ElMessage.warning('没有可导出的数据');
    return;
  }
  
  // 检查数据一致性
  checkDataConsistency();
  
  // 准备CSV头
  let csvContent = 'Timestamp,CPU App(%),CPU System(%),Memory(MB),Battery(%),Temperature(°C),Network Download(KB/s),Network Upload(KB/s),FPS,Jank Count\n';
  
  // 添加数据行
  const timeStamps = performanceStore.timeStamps;
  for (let i = 0; i < timeStamps.length; i++) {
    const row = [
      timeStamps[i],
      performanceStore.cpuAppHistory[i] || '',
      performanceStore.cpuSystemHistory[i] || '',
      performanceStore.memoryTotalHistory[i] || '',
      performanceStore.batteryLevelHistory[i] || '',
      performanceStore.batteryTemperatureHistory[i] || '',
      performanceStore.networkRxHistory[i] || '',
      performanceStore.networkTxHistory[i] || '',
      performanceStore.fpsHistory[i] || '',
      performanceStore.jankCountHistory[i] || ''
    ].join(',');
    
    csvContent += row + '\n';
  }
  
  // 创建Blob对象
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // 创建下载链接
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // 设置下载属性
  link.setAttribute('href', url);
  link.setAttribute('download', `performance_data_${selectedPackage.value}_${new Date().toISOString().replace(/:/g, '-')}.csv`);
  link.style.visibility = 'hidden';
  
  // 添加到文档并触发下载
  document.body.appendChild(link);
  link.click();
  
  // 清理
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  ElMessage.success('数据导出成功');
};

// 设置最大数据点数量
const updateMaxDataPoints = (value) => {
  // 更新store中的配置
  performanceStore.setMaxDataPoints(value);
  
  const message = value === 0 
    ? '已设置为不限制数据点数量，长时间监控可能会占用较多内存' 
    : `最大数据点数量已设置为 ${value} 个`;
  
  ElMessage.success(message);
};

// 更新监控持续时间
const updateDuration = () => {
  if (!monitoringStartTime.value) return;
  
  const now = new Date();
  const diff = now - monitoringStartTime.value;
  
  // 格式化持续时间
  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  monitoringDuration.value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// 生命周期钩子
onMounted(async () => {
  // 初始化监控器
  initMonitor();
  
  // 设置初始最大数据点数量
  localMaxDataPoints.value = performanceStore.maxDataPoints || 300;
  performanceStore.setMaxDataPoints(localMaxDataPoints.value);
  
  // 加载应用列表
  await refreshAppList();
});


</script>

<style scoped>
.performance-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-console {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(270px, 0.7fr);
  overflow: hidden;
}

.config-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  min-width: 0;
}

.setting-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
}

.field-label > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.field .el-select {
  width: 100%;
}

.full-width {
  width: 100%;
}

.option-pkg {
  float: right;
  margin-left: 10px;
  font-size: 10px;
  color: var(--muted);
}

.info-icon {
  cursor: help;
  color: var(--muted-2);
}

.config-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 2px;
}

.status-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 16px 20px;
  border-left: 1px solid var(--line);
  background: var(--surface-2);
}

.status-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-kicker {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: var(--muted-2);
}

.status-panel.is-live .status-kicker {
  color: var(--accent-ink);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted-2);
}

.status-panel.is-live .status-dot {
  background: var(--accent);
  box-shadow: 0 0 0 3px rgba(228, 87, 46, 0.14);
  animation: record-pulse 1.8s ease-in-out infinite;
}

.status-app {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14.5px;
  font-weight: 650;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.status-duration {
  font-size: 30px;
  font-weight: 650;
  letter-spacing: -0.03em;
  color: var(--ink);
  line-height: 1.15;
}

.status-hint {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--muted);
}

.live-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.live-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-bottom: 1px solid var(--line);
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 13px 18px;
  border-right: 1px solid var(--line-soft);
}

.metric:last-child {
  border-right: 0;
}

.metric-label {
  font-size: 11px;
  color: var(--muted);
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--ink);
  line-height: 1.2;
}

.metric-value small {
  margin-left: 3px;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.live-bottom {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.7fr);
  gap: 16px;
  align-items: start;
  padding: 14px 18px 16px;
}

.foreground-panel {
  overflow: hidden;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
}

.foreground-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--line-soft);
  background: var(--surface-2);
}

.foreground-grid {
  padding: 4px 12px;
}

.fg-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 7px 0;
  border-bottom: 1px solid var(--line-soft);
  font-size: 12px;
}

.fg-row:last-child {
  border-bottom: 0;
}

.fg-row span {
  flex: none;
  color: var(--muted);
}

.fg-row strong {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
  text-align: right;
  overflow-wrap: anywhere;
}

.fg-empty {
  padding: 20px 12px;
  text-align: center;
  font-size: 12px;
  color: var(--muted);
}

.data-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-sm);
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--muted);
}

.data-note .el-icon {
  flex: none;
  margin-top: 2px;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.chart-panel {
  overflow: hidden;
}

.chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line-soft);
}

.chart-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.chart-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: none;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--ink-soft);
}

.chart-heading .section-kicker {
  font-size: 9px;
  letter-spacing: 0.16em;
}

.chart-heading .section-title {
  margin-top: 2px;
  font-size: 14px;
}

.chart-live {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--muted-2);
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted-2);
}

.chart-live.is-on {
  color: var(--accent-ink);
}

.chart-live.is-on .live-dot {
  background: var(--accent);
  animation: record-pulse 1.8s ease-in-out infinite;
}

.chart-body {
  min-height: 300px;
  padding: 10px 12px 12px;
}

.chart-body :deep(.chart-container) {
  min-height: 280px;
}

.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 280px;
  text-align: center;
  font-size: 12px;
  color: var(--muted);
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border: 1px dashed var(--line-strong);
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--muted-2);
  font-size: 21px;
}

@keyframes record-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (max-width: 1100px) {
  .control-console {
    grid-template-columns: minmax(0, 1fr);
  }

  .status-panel {
    border-left: 0;
    border-top: 1px solid var(--line);
  }

  .status-duration {
    font-size: 26px;
  }
}

@media (max-width: 900px) {
  .chart-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .live-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric:nth-child(2) {
    border-right: 0;
  }

  .metric:nth-child(-n + 2) {
    border-bottom: 1px solid var(--line-soft);
  }

  .live-bottom {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .setting-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .metric {
    padding: 12px 14px;
  }

  .metric-value {
    font-size: 21px;
  }
}
</style> 