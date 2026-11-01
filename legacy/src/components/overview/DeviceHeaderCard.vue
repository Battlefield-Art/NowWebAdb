<template>
  <section class="device-header-card">
    <div class="device-visual" aria-hidden="true">
      <svg viewBox="0 0 80 106" role="presentation">
        <rect x="3.5" y="3.5" width="73" height="99" rx="13" fill="#111318" stroke="#2b2e35" />
        <rect x="9.5" y="11" width="61" height="84" rx="6.5" fill="#1b1e24" />
        <rect x="31" y="6" width="18" height="3" rx="1.5" fill="#3b3f47" />
        <g fill="#343841">
          <rect x="15" y="18" width="13" height="13" rx="3" />
          <rect x="33.5" y="18" width="13" height="13" rx="3" />
          <rect x="52" y="18" width="13" height="13" rx="3" />
          <rect x="15" y="36" width="13" height="13" rx="3" />
          <rect x="33.5" y="36" width="13" height="13" rx="3" />
          <rect x="52" y="36" width="13" height="13" rx="3" />
          <rect x="15" y="54" width="13" height="13" rx="3" />
          <rect x="33.5" y="54" width="13" height="13" rx="3" />
          <rect x="52" y="54" width="13" height="13" rx="3" />
        </g>
        <rect x="15" y="78" width="13" height="13" rx="3" fill="#343841" />
        <rect x="33.5" y="78" width="13" height="13" rx="3" fill="#e4572e" />
        <rect x="52" y="78" width="13" height="13" rx="3" fill="#343841" />
        <rect x="30" y="96" width="20" height="2" rx="1" fill="#4a4e57" />
      </svg>
      <span class="visual-tag mono">ONLINE</span>
    </div>

    <div class="device-identity">
      <p class="eyebrow">Connected handset</p>
      <h1>{{ deviceInfo.manufacturer }} <span>{{ deviceInfo.deviceModel }}</span></h1>
      <div class="device-specs">
        <span class="device-spec-item">
          <SvgIcon icon="AndroidIcon" :color="'#167a5b'" :style="{ width: '14px', height: '14px' }" />
          Android {{ deviceInfo.androidVersion }} <i>SDK {{ deviceInfo.sdkVersionCode }}</i>
        </span>
        <span class="device-spec-item">
          <SvgIcon icon="CpuIcon" :color="'#7a7468'" :style="{ width: '14px', height: '14px' }" />
          {{ deviceInfo.cpuInfo }} <i>{{ deviceInfo.cpuCore }}</i>
        </span>
        <span class="device-spec-item">
          <SvgIcon icon="ScreenIcon" :color="'#7a7468'" :style="{ width: '14px', height: '14px' }" />
          {{ deviceInfo.resolution }} <i>{{ deviceInfo.screenDensity }}</i>
        </span>
      </div>
    </div>

    <div class="device-quickstats">
      <div class="quickstat">
        <span class="quickstat-label">电量</span>
        <strong class="mono">{{ deviceInfo.batteryPercentage ?? 0 }}<em>%</em></strong>
        <span class="quickstat-bar"><i :style="{ width: `${deviceInfo.batteryPercentage || 0}%`, background: batteryTone }" /></span>
      </div>
      <div class="quickstat">
        <span class="quickstat-label">电池温度</span>
        <strong class="mono" :style="{ color: getTemperatureColor(deviceInfo.temperature) }">{{ deviceInfo.temperature ?? 0 }}<em>°C</em></strong>
        <span class="quickstat-note">实时读取</span>
      </div>
      <div class="quickstat">
        <span class="quickstat-label">内存占用</span>
        <strong class="mono">{{ Math.round(deviceInfo.memoryUsedRate || 0) }}<em>%</em></strong>
        <span class="quickstat-bar"><i :style="{ width: `${Math.round(deviceInfo.memoryUsedRate || 0)}%` }" /></span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import SvgIcon from "@/components/SvgIcon.vue";
import { getTemperatureColor } from "@/utils/deviceInfoService.js";

const props = defineProps({
  deviceInfo: {
    type: Object,
    required: true
  }
});

const batteryTone = computed(() => {
  const value = props.deviceInfo.batteryPercentage || 0;
  if (value <= 15) return 'var(--danger)';
  if (value <= 30) return 'var(--warning)';
  return 'var(--success)';
});
</script>

<style scoped>
.device-header-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 22px;
  padding: 18px 22px;
  margin-bottom: 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-1);
}

.device-visual {
  position: relative;
  width: 76px;
  height: 100px;
  display: grid;
  place-items: center;
  background: var(--paper-2);
  border: 1px solid var(--line-soft);
  border-radius: 10px;
}

.device-visual svg {
  width: 58px;
  height: 77px;
  margin-top: -6px;
}

.visual-tag {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--success);
}

.device-identity {
  min-width: 0;
}

.device-identity .eyebrow {
  margin-bottom: 5px;
}

.device-identity h1 {
  margin: 0;
  font-size: 25px;
  line-height: 1.12;
  font-weight: 780;
  letter-spacing: -0.035em;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.device-identity h1 span {
  color: var(--muted);
  font-weight: 620;
}

.device-specs {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}

.device-spec-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 9px;
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  border-radius: 6px;
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}

.device-spec-item i {
  font-style: normal;
  color: var(--muted-2);
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 0.02em;
}

.device-quickstats {
  display: grid;
  grid-template-columns: repeat(3, minmax(76px, 1fr));
  gap: 0;
  align-self: stretch;
  border-left: 1px solid var(--line-soft);
}

.quickstat {
  min-width: 0;
  padding: 4px 0 4px 18px;
  border-right: 1px solid var(--line-soft);
}

.quickstat:last-child {
  border-right: 0;
  padding-right: 2px;
}

.quickstat-label {
  display: block;
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--muted-2);
  white-space: nowrap;
}

.quickstat strong {
  display: block;
  margin: 4px 0 5px;
  font-size: 22px;
  line-height: 1;
  font-weight: 720;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.quickstat strong em {
  margin-left: 1px;
  font-style: normal;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted-2);
}

.quickstat-bar {
  display: block;
  width: 100%;
  max-width: 76px;
  height: 3px;
  border-radius: 999px;
  background: var(--line-soft);
  overflow: hidden;
}

.quickstat-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--ink);
}

.quickstat-note {
  display: block;
  font-size: 9.5px;
  color: var(--muted-2);
}

@media (max-width: 1280px) {
  .device-header-card {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .device-quickstats {
    grid-column: 1 / -1;
    border-left: 0;
    border-top: 1px solid var(--line-soft);
    padding-top: 12px;
  }

  .quickstat {
    padding: 2px 16px;
  }

  .quickstat:first-child {
    padding-left: 0;
  }

  .quickstat:last-child {
    padding-right: 0;
  }
}

@media (max-width: 640px) {
  .device-header-card {
    gap: 14px;
    padding: 15px;
  }

  .device-visual {
    width: 62px;
    height: 84px;
  }

  .device-visual svg {
    width: 48px;
    height: 64px;
  }

  .device-identity h1 {
    font-size: 21px;
    white-space: normal;
  }

  .device-quickstats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .quickstat {
    padding: 2px 10px;
  }

  .quickstat strong {
    font-size: 18px;
  }
}
</style>
