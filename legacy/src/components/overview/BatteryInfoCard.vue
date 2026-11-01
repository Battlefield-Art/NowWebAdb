<template>
  <section class="info-section">
    <div class="section-header">
      <div class="section-title-wrap">
        <span class="icon-square">
          <SvgIcon icon="BatteryIcon" :color="'#a4690f'" :style="{ width: '16px', height: '16px' }" />
        </span>
        <div>
          <p class="section-eyebrow">Power</p>
          <h3 class="section-title">电池状态</h3>
        </div>
      </div>
      <span class="status-chip" :style="{ color: getTemperatureColor(deviceInfo.temperature), background: 'var(--surface-2)', borderColor: 'var(--line-soft)' }">
        {{ deviceInfo.temperature ?? 0 }} °C
      </span>
    </div>

    <div class="battery-hero">
      <div class="battery-number">
        <strong class="mono">{{ deviceInfo.batteryPercentage ?? 0 }}</strong><em>%</em>
      </div>
      <div class="battery-track">
        <i :style="{ width: `${deviceInfo.batteryPercentage || 0}%`, background: batteryTone }" />
      </div>
      <span class="battery-caption">当前电量</span>
    </div>

    <div class="info-content">
      <div class="info-item">
        <span class="info-label">电池温度</span>
        <span class="info-value mono" :style="{ color: getTemperatureColor(deviceInfo.temperature) }">{{ deviceInfo.temperature ?? 0 }} °C</span>
      </div>
      <div class="info-item">
        <span class="info-label">电池电压</span>
        <span class="info-value mono">{{ deviceInfo.voltage || '--' }}<small v-if="deviceInfo.voltage"> V</small></span>
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
.info-section {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 18px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-1);
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line-soft);
}

.section-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.icon-square {
  width: 30px;
  height: 30px;
  flex: none;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  border-radius: 7px;
}

.section-eyebrow {
  margin: 0;
  font-family: var(--mono);
  font-size: 8.5px;
  font-weight: 650;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--muted-2);
}

.section-title {
  margin: 2px 0 0;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.status-chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  height: 21px;
  padding: 0 7px;
  border: 1px solid var(--line-soft);
  border-radius: 5px;
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 650;
}

.battery-hero {
  padding: 14px 0 12px;
}

.battery-number {
  display: flex;
  align-items: baseline;
  color: var(--ink);
}

.battery-number strong {
  font-size: 40px;
  line-height: 1;
  font-weight: 720;
  letter-spacing: -0.04em;
}

.battery-number em {
  margin-left: 2px;
  font-style: normal;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}

.battery-track {
  height: 6px;
  margin: 12px 0 7px;
  border-radius: 999px;
  background: var(--line-soft);
  overflow: hidden;
}

.battery-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.4s ease;
}

.battery-caption {
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted-2);
}

.info-content {
  display: flex;
  flex-direction: column;
  margin-top: auto;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
  padding: 7px 0;
  border-top: 1px solid var(--line-soft);
}

.info-label {
  font-size: 11.5px;
  color: var(--muted);
}

.info-value {
  font-size: 12px;
  font-weight: 650;
  color: var(--ink-soft);
}

.info-value small {
  color: var(--muted-2);
  font-size: 10px;
  font-weight: 500;
}
</style>
