<template>
  <section class="panel perf-preview">
    <header class="perf-head">
      <div class="perf-title">
        <span class="icon-tile">
          <SvgIcon icon="CpuIcon" :color="'#e4572e'" :style="{ width: 16 + 'px', height: 16 + 'px' }" />
        </span>
        <div>
          <p class="eyebrow">Telemetry</p>
          <h3 class="section-title">实时性能</h3>
        </div>
      </div>
      <span class="perf-note mono">3s 采样</span>
    </header>

    <div class="perf-grid">
      <article class="perf-cell">
        <div class="perf-cell-head">
          <span class="perf-label">CPU 频率</span>
          <span class="perf-value mono num">{{ deviceInfo.cpuCur || '--' }}</span>
        </div>
        <div class="chart-box">
          <CpuFrequencyChart :cpu-data="cpuFrequencyData" />
        </div>
      </article>
      <article class="perf-cell">
        <div class="perf-cell-head">
          <span class="perf-label">内存占用</span>
          <span class="perf-value mono num">
            {{ Math.round(deviceInfo.memoryUsedRate || 0) }}<small>%</small>
          </span>
        </div>
        <div class="chart-box">
          <MemoryUsageChart :memory-data="memoryUsageData" />
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import SvgIcon from "@/components/SvgIcon.vue";
import CpuFrequencyChart from "@/components/CpuFrequencyChart.vue";
import MemoryUsageChart from "@/components/MemoryUsageChart.vue";

defineProps({
  deviceInfo: {
    type: Object,
    required: true
  },
  cpuFrequencyData: {
    type: Array,
    required: true
  },
  memoryUsageData: {
    type: Array,
    required: true
  }
});
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-1);
  padding: 16px 18px 14px;
  height: 100%;
}

.perf-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line-soft);
}

.perf-title {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.icon-tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-line);
  flex: none;
}

.perf-title .eyebrow {
  font-size: 9px;
  letter-spacing: 0.16em;
}

.perf-title .eyebrow::before {
  display: none;
}

.perf-title .section-title {
  margin-top: 2px;
  font-size: 14.5px;
}

.perf-note {
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--muted-2);
  white-space: nowrap;
}

.perf-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
  flex: 1;
}

.perf-cell {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  padding: 12px 12px 6px;
}

.perf-cell-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 0 2px 8px;
}

.perf-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
}

.perf-value {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ink);
  white-space: nowrap;
}

.perf-value small {
  margin-left: 1px;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.chart-box {
  min-height: 158px;
  flex: 1;
}

@media (max-width: 760px) {
  .perf-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
