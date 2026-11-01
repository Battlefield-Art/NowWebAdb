<template>
  <section class="info-section">
    <div class="section-header">
      <div class="section-title-wrap">
        <span class="icon-square">
          <SvgIcon icon="AndroidIcon" :color="'#167a5b'" :style="{ width: '16px', height: '16px' }" />
        </span>
        <div>
          <p class="section-eyebrow">System</p>
          <h3 class="section-title">系统信息</h3>
        </div>
      </div>
      <span class="count-chip mono">{{ items.length }} FIELDS</span>
    </div>

    <dl class="data-grid">
      <div v-for="item in items" :key="item.label" class="data-item">
        <dt>{{ item.label }}</dt>
        <dd :title="item.value" :class="{ 'mono': item.mono }">{{ item.value || '—' }}</dd>
      </div>
    </dl>
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

const items = computed(() => [
  { label: '设备型号', value: props.deviceInfo.deviceModel },
  { label: '制造商', value: props.deviceInfo.manufacturer },
  { label: '品牌', value: props.deviceInfo.brand },
  { label: '序列号', value: props.deviceInfo.serialNumber, mono: true },
  { label: 'Android 版本', value: props.deviceInfo.androidVersion },
  { label: 'SDK 版本', value: props.deviceInfo.sdkVersionCode, mono: true },
  { label: '产品名称', value: props.deviceInfo.product, mono: true },
  { label: '构建标识', value: props.deviceInfo.display, mono: true },
  { label: '构建版本', value: props.deviceInfo.id, mono: true },
  { label: '构建类型', value: props.deviceInfo.type },
  { label: '构建标签', value: props.deviceInfo.tags },
  { label: '引导加载程序', value: props.deviceInfo.bootloader, mono: true },
  { label: '分区信息', value: props.deviceInfo.abPartition, mono: true },
  { label: '设备 ID', value: props.deviceInfo.device, mono: true },
  { label: '内核版本', value: props.deviceInfo.kernelVersion, mono: true },
  { label: '构建用户', value: props.deviceInfo.user },
  { label: '构建主机', value: props.deviceInfo.host, mono: true },
  { label: '指纹', value: props.deviceInfo.fingerPrint, mono: true },
  { label: '上电时间', value: props.deviceInfo.uptime },
]);
</script>

<style scoped>
.info-section {
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

.count-chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  height: 21px;
  padding: 0 7px;
  border-radius: 5px;
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  color: var(--muted-2);
  font-size: 8.5px;
  font-weight: 650;
  letter-spacing: 0.08em;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 22px;
  margin: 4px 0 0;
}

.data-item {
  min-width: 0;
  padding: 9px 0 8px;
  border-bottom: 1px solid var(--line-soft);
}

.data-item dt {
  font-size: 10.5px;
  color: var(--muted);
  white-space: nowrap;
}

.data-item dd {
  margin: 3px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data-item dd.mono {
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-soft);
}

@media (max-width: 560px) {
  .data-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
