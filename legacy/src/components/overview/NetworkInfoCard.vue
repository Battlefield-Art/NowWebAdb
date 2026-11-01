<template>
  <section class="info-section">
    <div class="section-header">
      <div class="section-title-wrap">
        <span class="icon-square">
          <SvgIcon icon="wifiIcon" :color="'#167a5b'" :style="{ width: '16px', height: '16px' }" />
        </span>
        <div>
          <p class="section-eyebrow">Network</p>
          <h3 class="section-title">网络连接</h3>
        </div>
      </div>
      <span class="status-chip" :class="{ online: isOnline }">
        <i aria-hidden="true"></i>{{ isOnline ? '在线' : '未连接' }}
      </span>
    </div>

    <div class="info-content">
      <div class="info-item primary-row">
        <span class="info-label">Wi-Fi</span>
        <strong class="info-value">{{ deviceInfo.wifiName || '--' }}</strong>
      </div>
      <div class="info-item">
        <span class="info-label">IP 地址</span>
        <span class="info-value mono">{{ deviceInfo.ipAddress || '--' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">无线电版本</span>
        <el-tooltip :content="deviceInfo.radioVersion" placement="top" :disabled="!deviceInfo.radioVersion || deviceInfo.radioVersion.length < 24">
          <span class="info-value text-ellipsis">{{ deviceInfo.radioVersion || '未知' }}</span>
        </el-tooltip>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import SvgIcon from "@/components/SvgIcon.vue";

const props = defineProps({
  deviceInfo: {
    type: Object,
    required: true
  }
});

const isOnline = computed(() => !!props.deviceInfo.wifiName && props.deviceInfo.wifiName !== '--' && props.deviceInfo.wifiName !== '未连接');
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
  gap: 5px;
  height: 21px;
  padding: 0 7px;
  border-radius: 5px;
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 650;
  letter-spacing: 0.04em;
}

.status-chip i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--muted-2);
}

.status-chip.online {
  background: var(--success-soft);
  border-color: #cfe4da;
  color: var(--success);
}

.status-chip.online i {
  background: var(--success);
}

.info-content {
  display: flex;
  flex-direction: column;
  padding-top: 4px;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 33px;
  padding: 7px 0;
  border-bottom: 1px solid var(--line-soft);
}

.info-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.info-label {
  flex: none;
  font-size: 11.5px;
  color: var(--muted);
}

.info-value {
  min-width: 0;
  max-width: 70%;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.primary-row {
  padding-top: 9px;
  padding-bottom: 9px;
}

.primary-row .info-value {
  font-size: 15px;
  font-weight: 720;
  color: var(--ink);
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70%;
}
</style>
