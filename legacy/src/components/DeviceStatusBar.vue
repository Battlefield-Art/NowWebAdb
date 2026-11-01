<template>
  <div class="device-status-bar">
    <span class="rail-state"><i aria-hidden="true"></i>已连接</span>
    <div class="status-items">
      <div class="status-item battery-item" title="设备电量">
        <BatteryIcon :is-charge="isCharge" :quantity="battery" />
      </div>
      <div class="status-item temperature-item" title="电池温度">
        <TemperatureIcon :temperature="temperature" />
      </div>
      <WiFiDetailPopover
        v-model:visible="wifiPopoverVisible"
        :wifi-details="wifiDetails"
        class="status-item wifi-item"
      >
        <span class="wifi-container">
          <SvgIcon icon="wifiIcon" :color="wifiSsid !== '未连接' && wifiSsid !== '--' ? '#167a5b' : '#a49d90'" :style="{ width: '14px', height: '14px', flexShrink: 0 }" />
          <span class="status-text wifi-name" :title="wifiSsid">{{ wifiSsid }}</span>
        </span>
      </WiFiDetailPopover>
      <span class="status-text device-model status-item" :title="deviceModel">{{ deviceModel }}</span>
      <div class="status-item session-item">
        <span class="session-kind" :title="sessionLabel">
          <SvgIcon :icon="sessionIcon" :color="'#7a7468'" :style="{ width: '14px', height: '14px', color: '#7a7468' }" />
          <span class="session-kind-text">{{ sessionType }}</span>
        </span>
        <span class="session-serial mono" :title="sessionLabel">{{ sessionSerial ? `· ${sessionSerial}` : '' }}</span>
        <button type="button" class="disconnect-btn" title="断开 / 切换设备" aria-label="断开 / 切换设备" @click="emit('disconnect')">
          <el-icon :size="14"><SwitchButton /></el-icon>
          <span class="disconnect-text">断开</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { SwitchButton } from '@element-plus/icons-vue';
import SvgIcon from "@/components/SvgIcon.vue";
import BatteryIcon from "@/components/BatteryIcon.vue";
import TemperatureIcon from "@/components/TemperatureIcon.vue";
import WiFiDetailPopover from "@/components/WiFiDetailPopover.vue";
import { connectionState, getAdbInstance, executeCommand } from "@/utils/adbManager.js";
import { getWifiInfo } from "@/utils/deviceInfoService.js";

const emit = defineEmits(['disconnect']);

const battery = ref(0);
const isCharge = ref(false);
const deviceModel = ref('');
const wifiSsid = ref('--');
const temperature = ref(0);
const wifiPopoverVisible = ref(false);
const wifiDetails = ref({
  ssid: '',
  frequency: '',
  macAddress: '',
  ipAddress: '',
  linkSpeed: ''
});

const sessionType = computed(() => connectionState.type === 'usb' ? 'USB' : '无线');
const sessionSerial = computed(() => connectionState.serial || '');
const sessionLabel = computed(() => sessionSerial.value ? `${sessionType.value} · ${sessionSerial.value}` : sessionType.value);
const sessionIcon = computed(() => connectionState.type === 'usb' ? 'usbIcon' : 'wifiIcon');

const getDeviceInfo = async () => {
  const adbObject = getAdbInstance();
  if (!adbObject) return;

  // Get battery info
  try {
    const res = await executeCommand('dumpsys battery');
    if (res) {
      const usbPoweredMatch = res.match(/USB powered: (\w+)/);
      const levelMatch = res.match(/level: (\d+)/);
      isCharge.value = usbPoweredMatch ? usbPoweredMatch[1] === 'true' : false;
      battery.value = levelMatch ? Number(levelMatch[1]) : 0;

      // Get temperature info
      const tempMatch = res.match(/temperature: (\d+)/);
      if (tempMatch) {
        // Convert temperature from tenths of degrees to degrees
        temperature.value = Math.round(Number(tempMatch[1]) / 10);
      }
    }
  } catch (e) {
    console.warn("Failed to get battery info", e);
  }

  // Get WiFi info using improved method
  try {
    const ssid = await getWifiInfo();
    wifiSsid.value = ssid || '未连接';
    wifiDetails.value.ssid = ssid || '';

    // Get detailed WiFi information
    await updateWifiDetails();
  } catch (e) {
    console.warn("Failed to get wifi info", e);
    wifiSsid.value = '--';
  }

  deviceModel.value = adbObject.banner?.model || '';
};

// Get detailed WiFi info for the popover
const updateWifiDetails = async () => {
  try {
    // Get IP address and MAC address from ip addr command
    const ipAddrRes = await executeCommand("ip addr show wlan0");
    if (ipAddrRes) {
      // Extract IP address
      const ipMatch = ipAddrRes.match(/inet\s+([0-9.]+)\/\d+/);
      wifiDetails.value.ipAddress = ipMatch ? ipMatch[1] : '--';

      // Extract MAC address
      const macMatch = ipAddrRes.match(/link\/ether\s+([0-9a-f:]+)/i);
      wifiDetails.value.macAddress = macMatch ? macMatch[1] : '--';
    } else {
      wifiDetails.value.ipAddress = '--';
      wifiDetails.value.macAddress = '--';
    }

    // Get detailed WiFi info including frequency and link speed
    const wifiInfoRes = await executeCommand('dumpsys wifi | grep -A 15 "mWifiInfo"');
    if (wifiInfoRes) {
      // Extract frequency
      const frequencyMatch = wifiInfoRes.match(/Frequency: (\d+)MHz/);
      if (frequencyMatch && frequencyMatch[1]) {
        const freqMhz = parseInt(frequencyMatch[1]);
        wifiDetails.value.frequency = freqMhz >= 5000 ? `${freqMhz / 1000} GHz` : `${freqMhz} MHz`;
      }

      // Extract link speed
      const linkSpeedMatch = wifiInfoRes.match(/Link speed: (\d+)Mbps/);
      wifiDetails.value.linkSpeed = linkSpeedMatch ? `${linkSpeedMatch[1]} Mbps` : '--';
    }
  } catch (e) {
    console.warn("Failed to get detailed WiFi info", e);
  }
};

let timerId = null;

onMounted(() => {
  getDeviceInfo();
  timerId = setInterval(getDeviceInfo, 5000);
});

onUnmounted(() => {
  if (timerId) {
    clearInterval(timerId);
  }
});
</script>

<style scoped>
.device-status-bar {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  overflow: hidden;
}

.rail-state {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 9px;
  border: 1px solid #cfe4da;
  border-radius: 999px;
  background: var(--success-soft);
  color: var(--success);
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.rail-state i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 3px rgba(22, 122, 91, 0.12);
}

.status-items {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-width: 0;
}

.status-item {
  display: flex;
  align-items: center;
  height: 24px;
  flex: 0 0 auto;
  min-width: 0;
}

.battery-item,
.temperature-item {
  flex-shrink: 0;
}

.wifi-item {
  flex: 0 1 auto;
}

.wifi-item :deep(.wifi-icon-wrapper) {
  min-width: 0;
  max-width: 100%;
}

.wifi-container {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  cursor: pointer;
  padding: 3px 6px;
  margin: -3px -6px;
  border-radius: 6px;
  transition: background-color 0.16s ease;
}

.wifi-container:hover {
  background: var(--surface-2);
}

.wifi-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-text {
  font-size: 12px;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
}

.device-model {
  display: block;
  flex: 0 1 auto;
  padding-left: 14px;
  border-left: 1px solid var(--line-soft);
  line-height: 24px;
  font-size: 12.5px;
  font-weight: 680;
  color: var(--ink);
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-item {
  flex: 0 1 auto;
  margin-left: auto;
  gap: 7px;
  padding-left: 14px;
  border-left: 1px solid var(--line-soft);
}

.session-kind {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 650;
  color: var(--ink-soft);
  white-space: nowrap;
}

.session-kind-text {
  display: inline;
}

.session-serial {
  display: inline;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10.5px;
  color: var(--muted-2);
}

.disconnect-btn {
  flex-shrink: 0;
  height: 26px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface);
  color: var(--muted);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.16s ease, border-color 0.16s ease, background-color 0.16s ease;
}

.disconnect-btn:hover {
  border-color: #e5b9b3;
  background: var(--danger-soft);
  color: var(--danger);
}

.disconnect-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

@media (max-width: 1280px) {
  .session-serial { display: none; }
}

@media (max-width: 1120px) {
  .device-model { display: none; }
}

@media (max-width: 900px) {
  .device-status-bar { flex-wrap: wrap; gap: 8px; }
  .status-items { width: auto; }
  .session-item { margin-left: 0; }
}

@media (max-width: 760px) {
  .wifi-name { display: none; }
  .disconnect-text { display: none; }
  .disconnect-btn { padding: 0 7px; }
}

@media (max-width: 560px) {
  .rail-state { display: none; }
  .temperature-item { display: none; }
  .status-items { gap: 10px; }
  .session-item { padding-left: 10px; }
}
</style>
