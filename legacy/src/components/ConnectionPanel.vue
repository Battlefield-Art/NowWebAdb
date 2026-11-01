<template>
  <section class="page connection-page">
    <header class="page-head">
      <div class="page-heading-copy">
        <p class="eyebrow">Link / Transport</p>
        <h1 class="page-title">连接管理</h1>
        <p class="page-sub">查看当前设备链路，或通过 USB 开启传统 TCP/IP 调试端口。端口会重启 adbd 并可能中断当前连接。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="busy" @click="refresh">刷新状态</el-button>
      </div>
    </header>

    <div class="connection-grid">
      <section class="surface link-panel">
        <header class="panel-head">
          <div>
            <p class="section-kicker">Current Link</p>
            <h2 class="section-title">当前链路</h2>
          </div>
          <span class="link-chip" :class="{ 'is-on': connectionState.serial }">
            <span class="dot"></span>{{ connectionState.serial ? '已连接' : '未连接' }}
          </span>
        </header>
        <dl class="data-list">
          <div class="data-row">
            <dt>连接方式</dt>
            <dd>{{ connectionState.type === 'usb' ? 'WebUSB 直连' : 'ADB Server 桥接' }}</dd>
          </div>
          <div class="data-row">
            <dt>设备序列号</dt>
            <dd class="mono">{{ connectionState.serial || '—' }}</dd>
          </div>
          <div class="data-row">
            <dt>Wi-Fi IPv4</dt>
            <dd class="mono">{{ address || '未检测到 wlan0 的 IPv4 地址' }}</dd>
          </div>
          <div class="data-row">
            <dt>TCP/IP 服务</dt>
            <dd class="mono tcp-status">{{ tcpStatus }}</dd>
          </div>
        </dl>
        <el-alert v-if="error" type="error" :title="error" :closable="false" show-icon />
      </section>

      <section class="surface tcp-panel">
        <header class="panel-head">
          <div>
            <p class="section-kicker">Legacy TCP/IP</p>
            <h2 class="section-title">传统无线调试</h2>
          </div>
          <span class="port-chip mono">PORT {{ port }}</span>
        </header>

        <el-alert
          type="warning"
          title="仅在可信局域网使用。开放调试端口会增加设备暴露面。"
          :closable="false"
          show-icon
        />
        <p class="note">Android 11+ 优先使用手机开发者选项中的「无线调试」与配对码，随后从首页的 ADB Server 桥接连接。</p>

        <label class="port-field">
          <span>传统 TCP/IP 端口</span>
          <el-input-number v-model="port" :min="1024" :max="65535" :precision="0" :disabled="busy" />
        </label>

        <p v-if="address" class="note">
          启用后在首页「无线 / ADB Server」填写 <code>{{ address }}:{{ port }}</code>。手机和运行桥接的电脑需要处于同一网络。
        </p>

        <div class="actions">
          <el-button type="warning" :disabled="busy || connectionState.type !== 'usb' || !address" @click="enableTcp">通过 USB 启用 TCP/IP</el-button>
          <el-button type="danger" plain :disabled="busy" @click="disableTcp">关闭传统 TCP/IP</el-button>
        </div>

        <p class="hint">关闭传统 TCP/IP 不会关闭 Android 11+ 的独立无线调试开关；请在手机开发者选项中关闭它。部分系统固化了 TCP 监听地址，需在设备上处理。</p>
      </section>
    </div>
  </section>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { connectionState, getAdbInstance } from '@/utils/adbManager.js';
const address = ref('');
const port = ref(5555);
const busy = ref(false);
const error = ref('');
const tcpStatus = ref('正在读取');
const refresh = async () => {
    const adb = getAdbInstance();
    if (!adb) return;
    busy.value = true;
    error.value = '';
    try {
        const addresses = await adb.tcpip.getListenAddresses();
        tcpStatus.value = JSON.stringify(addresses);
        const result = await adb.subprocess.noneProtocol.spawnWaitText('ip -o -4 addr show wlan0');
        address.value = result.match(/inet\s+([\d.]+)\//)?.[1] || '';
    } catch (cause) { error.value = `读取连接状态失败：${cause.message}`; }
    finally { busy.value = false; }
};
const changeTcp = async enable => {
    try {
        await ElMessageBox.confirm(enable ? `确定开放 ${port.value} 端口？请确认只在可信网络使用。当前连接可能中断。` : '确定关闭传统 TCP/IP 调试？当前无线连接可能中断。', '确认更改调试连接', { type: 'warning' });
    } catch { return; }
    const adb = getAdbInstance();
    if (!adb) return;
    busy.value = true;
    error.value = '';
    try {
        const response = enable ? await adb.tcpip.setPort(port.value) : await adb.tcpip.disable();
        ElMessage.success(response.trim() || '调试模式切换请求已完成');
    } catch (cause) { error.value = `切换未确认成功：${cause.message}。如果设备已断开，请重新连接并检查模式。`; }
    finally { busy.value = false; }
};
const enableTcp = () => changeTcp(true);
const disableTcp = () => changeTcp(false);
onMounted(refresh);
</script>
<style scoped>
.connection-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.connection-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 12px;
  align-items: start;
}

.link-panel,
.tcp-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px 18px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line-soft);
}

.section-kicker {
  display: block;
  font-size: 9px;
  letter-spacing: 0.16em;
}

.section-title {
  margin-top: 3px;
  font-size: 15px;
}

.link-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: 999px;
  background: var(--info-soft);
  color: var(--info);
  font-size: 10.5px;
  font-weight: 650;
  white-space: nowrap;
}

.link-chip .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.link-chip.is-on {
  background: var(--success-soft);
  color: var(--success);
}

.port-chip {
  padding: 4px 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 9.5px;
  letter-spacing: 0.1em;
  color: var(--muted);
  white-space: nowrap;
}

.data-list {
  margin: 0;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.data-row {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 12px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--line-soft);
  font-size: 12px;
}

.data-row:last-child {
  border-bottom: 0;
}

.data-row dt {
  color: var(--muted);
}

.data-row dd {
  margin: 0;
  color: var(--ink);
  font-weight: 550;
  text-align: right;
  overflow-wrap: anywhere;
}

.data-row dd.mono {
  font-size: 11px;
  font-weight: 500;
}

.tcp-status {
  color: var(--ink-soft);
}

.note {
  margin: 0;
  font-size: 12px;
  line-height: 1.75;
  color: var(--muted);
}

.note code {
  padding: 2px 5px;
  border-radius: 5px;
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  color: var(--accent-ink);
  font-size: 11px;
  white-space: nowrap;
}

.port-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.hint {
  margin: 0;
  padding-top: 10px;
  border-top: 1px dashed var(--line-soft);
  font-size: 11.5px;
  line-height: 1.75;
  color: var(--muted-2);
}

@media (max-width: 1000px) {
  .connection-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 560px) {
  .data-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 3px;
  }

  .data-row dd {
    text-align: left;
  }

  .port-field {
    flex-direction: column;
    align-items: stretch;
    gap: 7px;
  }

  .port-field :deep(.el-input-number) {
    width: 100%;
  }
}
</style>
