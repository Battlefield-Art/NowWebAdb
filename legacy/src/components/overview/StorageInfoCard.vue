<template>
  <section class="info-section">
    <div class="section-header">
      <div class="section-title-wrap">
        <span class="icon-square">
          <SvgIcon icon="StorageIcon" :color="'#5c6470'" :style="{ width: '16px', height: '16px' }" />
        </span>
        <div>
          <p class="section-eyebrow">Capacity</p>
          <h3 class="section-title">存储与内存</h3>
        </div>
      </div>
      <span class="status-chip mono">{{ deviceInfo.totalStorage || '--' }}</span>
    </div>

    <div class="meters">
      <div class="meter">
        <div class="meter-head">
          <span>存储空间</span>
          <strong class="mono">{{ deviceInfo.storageUsedRate ?? 0 }}<em>%</em></strong>
        </div>
        <div class="meter-track">
          <i :style="{ width: `${deviceInfo.storageUsedRate || 0}%`, background: storageTone }" />
        </div>
        <div class="meter-foot mono">{{ deviceInfo.usedStorage || '--' }} / {{ deviceInfo.totalStorage || '--' }}</div>
      </div>

      <div class="meter">
        <div class="meter-head">
          <span>内存使用</span>
          <strong class="mono">{{ Math.round(deviceInfo.memoryUsedRate || 0) }}<em>%</em></strong>
        </div>
        <div class="meter-track">
          <i :style="{ width: `${deviceInfo.memoryUsedRate || 0}%`, background: memoryTone }" />
        </div>
        <div class="meter-foot mono">{{ deviceInfo.usedMemory || '--' }} / {{ deviceInfo.totalMemory || '--' }}</div>
      </div>
    </div>

    <div class="info-item">
      <span class="info-label">存储类型</span>
      <el-tooltip :content="deviceInfo.storageType" placement="top" :disabled="!deviceInfo.storageType || deviceInfo.storageType.length < 24">
        <span class="info-value mono text-ellipsis">{{ deviceInfo.storageType || '未知' }}</span>
      </el-tooltip>
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

function toneFor(value) {
  if (value >= 90) return 'var(--danger)';
  if (value >= 70) return 'var(--warning)';
  return 'var(--ink)';
}

const storageTone = computed(() => toneFor(props.deviceInfo.storageUsedRate || 0));
const memoryTone = computed(() => toneFor(props.deviceInfo.memoryUsedRate || 0));
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
  border-radius: 5px;
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 650;
}

.meters {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 14px 0 12px;
}

.meter-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 11.5px;
  color: var(--muted);
}

.meter-head strong {
  font-size: 15px;
  font-weight: 720;
  color: var(--ink);
}

.meter-head strong em {
  margin-left: 1px;
  font-style: normal;
  font-size: 9.5px;
  font-weight: 600;
  color: var(--muted-2);
}

.meter-track {
  height: 5px;
  border-radius: 999px;
  background: var(--line-soft);
  overflow: hidden;
}

.meter-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.4s ease;
}

.meter-foot {
  margin-top: 7px;
  font-size: 10px;
  color: var(--muted-2);
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding-top: 9px;
  border-top: 1px solid var(--line-soft);
}

.info-label {
  font-size: 11.5px;
  color: var(--muted);
}

.info-value {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-soft);
}

.text-ellipsis {
  max-width: 65%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
