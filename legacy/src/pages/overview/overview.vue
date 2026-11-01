<template>
  <div class="page overview-page">
    <DeviceHeaderCard :device-info="deviceInfo" />

    <div class="overview-grid">
      <NetworkInfoCard class="area-network" :device-info="deviceInfo" />
      <BatteryInfoCard class="area-battery" :device-info="deviceInfo" />
      <StorageInfoCard class="area-storage" :device-info="deviceInfo" />
      <PerformancePreviewCard
        class="area-performance"
        :device-info="deviceInfo"
        :cpu-frequency-data="cpuFrequencyData"
        :memory-usage-data="memoryUsageData"
      />
      <SystemInfoCard class="area-system" :device-info="deviceInfo" />
      <HardwareInfoCard class="area-hardware" :device-info="deviceInfo" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElNotification } from 'element-plus';
import {
  getDeviceInfo,
  getCpuFrequencyData,
  getMemoryUsageData
} from '@/utils/deviceInfoService';

// 导入拆分的组件
import DeviceHeaderCard from '@/components/overview/DeviceHeaderCard.vue';
import NetworkInfoCard from '@/components/overview/NetworkInfoCard.vue';
import BatteryInfoCard from '@/components/overview/BatteryInfoCard.vue';
import StorageInfoCard from '@/components/overview/StorageInfoCard.vue';
import PerformancePreviewCard from '@/components/overview/PerformancePreviewCard.vue';
import SystemInfoCard from '@/components/overview/SystemInfoCard.vue';
import HardwareInfoCard from '@/components/overview/HardwareInfoCard.vue';

const router = useRouter();

// 设备信息变量
const intervalId = ref();
const performanceIntervalId = ref(); // 用于性能图表数据更新
const deviceInfo = ref({
  // 初始化空对象，将通过getDeviceInfo获取数据
  batteryPercentage: 0,
  voltage: 0,
  temperature: 0,
  memoryUsedRate: 0,
  storageUsedRate: 0,
});

// 性能数据变量
const cpuFrequencyData = ref([]);
const memoryUsageData = ref([]);

/**
 * 获取并更新设备信息
 */
const updateDeviceInfo = async () => {
  try {
    const info = await getDeviceInfo();
    if (info) {
      deviceInfo.value = info;
    } else {
      handleConnectionError();
    }
  } catch (e) {
    console.error('获取设备信息出错:', e);
    handleConnectionError();
  }
};

/**
 * 处理连接错误
 */
const handleConnectionError = () => {
  ElNotification.error({
    title: '连接断开',
    message: '连接已断开，请重新连接',
    type: 'error',
    duration: 3000
  });
  // 路由跳转
  router.push({ name: "Home" });
};

// 每秒更新性能图表数据
const updatePerformanceData = async () => {
  try {
    // 获取CPU频率数据
    const cpuFreqData = await getCpuFrequencyData();
    if (cpuFreqData && cpuFreqData.length > 0) {
      cpuFrequencyData.value = [...cpuFrequencyData.value, ...cpuFreqData];
      // 限制数据点数量
      if (cpuFrequencyData.value.length > 60) {
        cpuFrequencyData.value = cpuFrequencyData.value.slice(-60);
      }
    }

    // 获取内存使用数据
    const memoryData = await getMemoryUsageData();
    if (memoryData && memoryData.length > 0) {
      memoryUsageData.value = [...memoryUsageData.value, ...memoryData];
      // 限制数据点数量
      if (memoryUsageData.value.length > 60) {
        memoryUsageData.value = memoryUsageData.value.slice(-60);
      }
    }
  } catch (e) {
    console.error('更新性能数据失败:', e);
  }
};

onMounted(() => {
  updateDeviceInfo();
  // 每5秒刷新一次设备信息
  intervalId.value = setInterval(updateDeviceInfo, 5000);

  // 每3秒更新一次性能图表数据
  performanceIntervalId.value = setInterval(updatePerformanceData, 3000);

  // 初始加载性能数据
  updatePerformanceData();
});

onUnmounted(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }
  if (performanceIntervalId.value) {
    clearInterval(performanceIntervalId.value);
  }
});
</script>

<style scoped>
.overview-page {
  padding-top: 4px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}

.area-network,
.area-battery,
.area-storage {
  grid-column: span 2;
}

.area-performance {
  grid-column: span 6;
}

.area-system,
.area-hardware {
  grid-column: span 3;
}

@media (max-width: 1300px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .area-network,
  .area-battery {
    grid-column: span 1;
  }

  .area-storage,
  .area-performance,
  .area-system,
  .area-hardware {
    grid-column: span 2;
  }
}

@media (max-width: 760px) {
  .overview-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .area-network,
  .area-battery,
  .area-storage,
  .area-performance,
  .area-system,
  .area-hardware {
    grid-column: span 1;
  }
}
</style>
