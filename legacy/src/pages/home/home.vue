<template>
  <main class="connect-page">
    <section class="hero">
      <div class="brand">
        <span class="brand-mark"><SvgIcon icon="AndroidIcon" color="#fffdf8" :style="{ width: '20px', height: '20px' }" /></span>
        <div class="brand-copy">
          <span class="brand-name">NowWebAdb</span>
          <span class="brand-meta mono">LOCAL TOOLKIT</span>
        </div>
      </div>

      <p class="eyebrow">Android / WebUSB · No client</p>
      <h1>把 Android 设备<br /><em>装进浏览器</em></h1>
      <p class="tagline">实时投屏、应用管理与设备排障，无需安装客户端。USB 直连或无线调试，打开网页就能开始。</p>

      <ul class="feature-list">
        <li>
          <span class="cap-index mono">01</span>
          <span class="cap-body"><el-icon><Monitor /></el-icon><span>实时投屏</span></span>
        </li>
        <li>
          <span class="cap-index mono">02</span>
          <span class="cap-body"><el-icon><Grid /></el-icon><span>应用管理</span></span>
        </li>
        <li>
          <span class="cap-index mono">03</span>
          <span class="cap-body"><el-icon><Connection /></el-icon><span>无线调试</span></span>
        </li>
        <li>
          <span class="cap-index mono">04</span>
          <span class="cap-body"><el-icon><ChatDotRound /></el-icon><span>AI 诊断</span></span>
        </li>
      </ul>

      <div class="device-stage">
        <span class="stage-tag mono">LIVE MIRROR</span>
        <svg class="mirror-art" viewBox="0 0 460 280" role="img" aria-label="浏览器实时投屏 Android 设备示意图">
          <defs>
            <linearGradient id="homeScreen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#1b1e24" />
              <stop offset="1" stop-color="#0d0f13" />
            </linearGradient>
            <linearGradient id="homeDeck" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#f1efe8" />
              <stop offset="1" stop-color="#d9d3c5" />
            </linearGradient>
            <linearGradient id="homePhoneSkin" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#33373f" />
              <stop offset="1" stop-color="#14171b" />
            </linearGradient>
            <pattern id="homeGrid" width="22" height="22" patternUnits="userSpaceOnUse">
              <path d="M22 0H0v22" fill="none" stroke="#ffffff" stroke-opacity=".07" />
            </pattern>
            <filter id="homeLaptopShadow" x="-30%" y="-30%" width="160%" height="170%">
              <feDropShadow dx="0" dy="12" stdDeviation="11" flood-color="#000000" flood-opacity=".45" />
            </filter>
            <filter id="homePhoneShadow" x="-50%" y="-30%" width="200%" height="180%">
              <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000000" flood-opacity=".5" />
            </filter>
          </defs>

          <circle cx="205" cy="142" r="132" fill="#e4572e" opacity=".08" />
          <circle cx="64" cy="66" r="3.5" fill="#e4572e" opacity=".8" />
          <circle cx="418" cy="244" r="4" fill="#8d9099" opacity=".7" />
          <path d="M52 106h8M56 102v8" stroke="#e4572e" stroke-width="2" stroke-linecap="round" opacity=".6" />
          <path d="M412 44h7M415.5 40.5v7" stroke="#8d9099" stroke-width="2" stroke-linecap="round" opacity=".6" />

          <g class="art-laptop" filter="url(#homeLaptopShadow)">
            <rect x="30" y="40" width="250" height="148" rx="13" fill="#2a2d34" />
            <rect x="38" y="48" width="234" height="132" rx="7" fill="url(#homeScreen)" />
            <rect x="38" y="48" width="234" height="132" rx="7" fill="url(#homeGrid)" />
            <path d="M38 48h74L38 136z" fill="#ffffff" opacity=".04" />
            <g transform="translate(91 55) scale(0.125)" fill="#e9e6dd" opacity=".92">
              <path d="M87.04 768h849.92c0-143.872-58.88-272.896-176.128-357.376L854.016 317.44c15.36-17.92 15.36-34.304 0-49.664-15.36-15.36-32.256-15.36-49.664 0L698.368 373.76c-57.856-30.72-119.808-46.08-186.368-46.08-68.608 0-131.584 15.36-189.44 46.592L216.576 267.776c-15.36-15.36-32.256-15.36-49.664 0-17.92 15.36-17.92 32.256 0 49.664l93.184 93.184C144.384 492.544 87.04 621.568 87.04 768z m616.96-239.616c28.16 0 50.688 22.528 50.688 50.688s-22.528 50.688-50.688 50.688-50.688-22.528-50.688-50.688 22.528-50.688 50.688-50.688z m-384.512 0c28.16 0 50.688 22.528 50.688 50.688s-22.528 50.688-50.688 50.688-50.688-22.528-50.688-50.688 22.528-50.688 50.688-50.688z" />
            </g>
            <path d="M24 188h268l18 30q4 8-6 8H12q-10 0-6-8z" fill="url(#homeDeck)" />
            <path d="M24 188h268" stroke="#ffffff" stroke-width="2" opacity=".5" />
            <g fill="#a49d90" opacity=".85">
              <rect x="46" y="195" width="18" height="6" rx="2" /><rect x="73" y="195" width="18" height="6" rx="2" /><rect x="100" y="195" width="18" height="6" rx="2" /><rect x="127" y="195" width="18" height="6" rx="2" /><rect x="154" y="195" width="18" height="6" rx="2" /><rect x="181" y="195" width="18" height="6" rx="2" /><rect x="208" y="195" width="18" height="6" rx="2" /><rect x="235" y="195" width="18" height="6" rx="2" /><rect x="262" y="195" width="18" height="6" rx="2" />
              <rect x="46" y="203" width="18" height="6" rx="2" /><rect x="73" y="203" width="18" height="6" rx="2" /><rect x="100" y="203" width="18" height="6" rx="2" /><rect x="127" y="203" width="18" height="6" rx="2" /><rect x="154" y="203" width="18" height="6" rx="2" /><rect x="181" y="203" width="18" height="6" rx="2" /><rect x="208" y="203" width="18" height="6" rx="2" /><rect x="235" y="203" width="18" height="6" rx="2" /><rect x="262" y="203" width="18" height="6" rx="2" />
            </g>
            <rect x="146" y="213" width="58" height="7" rx="3" fill="#c5bda9" />
          </g>

          <path class="art-link" d="M282 124C306 124 314 144 341 144" fill="none" stroke="#e4572e" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="6 7" />
          <circle class="art-halo" cx="341" cy="144" r="10" fill="#e4572e" opacity=".2" />
          <circle cx="341" cy="144" r="4.5" fill="#ff6a3d" />

          <g class="art-phone" filter="url(#homePhoneShadow)">
            <rect x="344" y="80" width="84" height="172" rx="19" fill="url(#homePhoneSkin)" />
            <rect x="351" y="88" width="70" height="156" rx="13" fill="#0b0d11" />
            <rect x="376" y="92" width="20" height="5" rx="2.5" fill="#33373f" />
            <rect x="358" y="106" width="12" height="12" rx="3.5" fill="#e4572e" /><rect x="374" y="106" width="12" height="12" rx="3.5" fill="#d9d3c5" /><rect x="390" y="106" width="12" height="12" rx="3.5" fill="#575d66" /><rect x="406" y="106" width="12" height="12" rx="3.5" fill="#f0a184" />
            <rect x="358" y="123" width="12" height="12" rx="3.5" fill="#575d66" /><rect x="374" y="123" width="12" height="12" rx="3.5" fill="#f0a184" /><rect x="390" y="123" width="12" height="12" rx="3.5" fill="#e4572e" /><rect x="406" y="123" width="12" height="12" rx="3.5" fill="#d9d3c5" />
            <rect x="358" y="140" width="12" height="12" rx="3.5" fill="#d9d3c5" /><rect x="374" y="140" width="12" height="12" rx="3.5" fill="#575d66" /><rect x="390" y="140" width="12" height="12" rx="3.5" fill="#e4572e" /><rect x="406" y="140" width="12" height="12" rx="3.5" fill="#8d9099" />
            <rect x="358" y="157" width="12" height="12" rx="3.5" fill="#8d9099" /><rect x="374" y="157" width="12" height="12" rx="3.5" fill="#e4572e" /><rect x="390" y="157" width="12" height="12" rx="3.5" fill="#575d66" /><rect x="406" y="157" width="12" height="12" rx="3.5" fill="#d9d3c5" />
            <rect x="358" y="222" width="12" height="12" rx="3.5" fill="#575d66" /><rect x="374" y="222" width="12" height="12" rx="3.5" fill="#e4572e" /><rect x="390" y="222" width="12" height="12" rx="3.5" fill="#8d9099" /><rect x="406" y="222" width="12" height="12" rx="3.5" fill="#d9d3c5" />
            <rect x="376" y="238" width="20" height="3" rx="1.5" fill="#3a3f47" />
          </g>
        </svg>
        <span class="float-chip chip-usb mono"><SvgIcon icon="usbIcon" :style="{ width: '13px', height: '13px', color: '#ff6a3d' }" />USB</span>
        <span class="float-chip chip-wifi mono"><SvgIcon icon="wifiIcon" color="#6ecfaa" :style="{ width: '13px', height: '13px' }" />WIRELESS</span>
      </div>

      <p class="privacy"><span class="dot"></span>会话与凭证仅保留在本机，不上传云端</p>
    </section>

    <section class="connect-card surface">
      <header class="card-head">
        <div>
          <p class="section-kicker">Connection</p>
          <h2>连接设备</h2>
          <p>选择一种方式开始</p>
        </div>
        <span class="context-pill mono" :class="secure ? 'is-ok' : 'is-warn'">
          <span class="dot"></span>{{ secure ? 'SECURE CONTEXT' : 'INSECURE CONTEXT' }}
        </span>
      </header>

      <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
      <el-alert v-if="busy" :title="status" type="info" show-icon :closable="false"><el-button size="small" @click="cancel">取消</el-button></el-alert>

      <el-tabs v-model="mode" class="mode-tabs" @tab-change="cancel">
        <el-tab-pane label="USB 直连" name="usb">
          <el-alert v-if="!secure || !usbSupported" :title="!secure ? '需要 HTTPS 或 localhost 安全上下文' : '此浏览器不支持 WebUSB，请使用桌面 Chrome 或 Edge；也可以使用桥接连接'" type="warning" :closable="false" />
          <div class="mode-body">
            <aside class="mode-guide">
              <p class="guide-title">操作步骤</p>
              <ol class="steps"><li>在手机上开启开发者选项和 USB 调试。</li><li>使用可传输数据的 USB 线连接，解锁手机。</li><li>选择设备，并在手机上确认 RSA 调试授权。</li></ol>
            </aside>
            <div class="mode-controls">
              <div class="actions">
                <el-button type="primary" :disabled="busy || !secure || !usbSupported" @click="pickUsb">选择 USB 设备</el-button>
                <el-button :disabled="busy || !usbSupported" @click="refreshUsb">刷新已授权设备</el-button>
              </div>
              <div v-for="(device, index) in usbDevices" :key="device.serial + index" class="device-row">
                <div class="device-main">
                  <span class="device-avatar"><SvgIcon icon="usbIcon" :style="{ width: '16px', height: '16px', color: '#e4572e' }" /></span>
                  <div class="device-text"><strong>{{ device.name || 'Android' }}</strong><small>{{ device.serial }}</small></div>
                </div>
                <el-button :disabled="busy" @click="connectUsb(device)">连接</el-button>
              </div>
              <el-checkbox v-model="autoConnect" @change="saveAutoConnect">下次自动连接唯一的已授权 USB 设备</el-checkbox>
              <p class="hint">设备被占用时，请关闭其他投屏程序、ADB Server 或使用 ADB Server 桥接。拒绝授权、未解锁和驱动问题会显示具体错误。</p>
              <el-button :disabled="busy" type="danger" plain class="danger-ghost" @click="forgetKeys">清除本站 ADB 凭证</el-button>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="无线 / ADB Server" name="server">
          <el-alert title="浏览器无法直接访问 TCP 端口，需要你在本机运行桥接程序" type="info" :closable="false" />
          <div class="mode-body">
            <aside class="mode-guide">
              <p class="guide-title">操作步骤</p>
              <ol class="steps"><li>安装 Android Platform Tools，运行 <code>adb start-server</code>。</li><li>在项目目录运行 <code>npm run adb:bridge</code>，复制终端里的会话令牌。</li><li>本地开发使用下面的同源 WebSocket 地址（HTTPS 页面需使用 WSS）。桥接仅监听本机，目标固定为本机 ADB Server。</li></ol>
            </aside>
            <div class="mode-controls">
              <el-form label-position="top" @submit.prevent>
                <el-form-item label="WebSocket 桥接地址"><el-input v-model="bridgeUrl" :disabled="busy || !!server" placeholder="wss://localhost:5173/adb-bridge" /></el-form-item>
                <el-form-item label="桥接会话令牌（仅在内存保存）"><el-input v-model="bridgeToken" type="password" show-password autocomplete="off" :disabled="busy || !!server" /></el-form-item>
                <div class="actions"><el-button type="primary" :disabled="busy" @click="refreshServer">{{ server ? '刷新设备' : '连接桥接' }}</el-button><el-button v-if="server" :disabled="busy" @click="closeServer">关闭桥接</el-button></div>
              </el-form>
              <p class="hint">生产环境需要自行配置可信 WSS 证书或同源反向代理，并用 ADB_BRIDGE_ORIGINS 指定允许的网站来源。不要把 ADB 5037 端口暴露到公网。开发代理仅在 npm run dev 可用。</p>
              <template v-if="server">
                <div class="panel-title"><el-icon><Connection /></el-icon>Android 11+ 无线调试配对</div>
                <p class="hint compact">在手机「无线调试 → 使用配对码配对设备」中读取配对端口；配对端口与连接端口不同。</p>
                <el-input v-model="pairAddress" placeholder="配对 IP:端口" aria-label="配对 IP:端口" :disabled="busy" />
                <div class="actions"><el-input v-model="pairCode" placeholder="6 位配对码" aria-label="6 位配对码" type="password" maxlength="6" autocomplete="off" :disabled="busy" /><el-button :disabled="busy" @click="pairWireless">配对</el-button></div>
                <div class="panel-title"><el-icon><Monitor /></el-icon>连接无线设备</div>
                <div class="actions"><el-input v-model="wirelessAddress" placeholder="无线调试主页的 IP:端口，或已启用的 IP:5555" aria-label="无线连接地址" :disabled="busy" /><el-button :disabled="busy" @click="connectWireless">连接地址</el-button></div>
                <el-empty v-if="!serverDevices.length" description="暂无设备；请完成手机授权或无线连接" :image-size="70" />
                <div v-for="device in serverDevices" :key="String(device.transportId)" class="device-row">
                  <div class="device-main">
                    <span class="device-avatar"><SvgIcon icon="wifiIcon" color="#167a5b" :style="{ width: '16px', height: '16px' }" /></span>
                    <div class="device-text"><strong>{{ device.model || device.serial }}</strong><small>{{ device.serial }} · {{ device.state }}</small></div>
                  </div>
                  <el-button :disabled="busy || device.state !== 'device'" @click="selectServerDevice(device)">{{ device.state === 'unauthorized' ? '请在手机授权' : device.state === 'offline' ? '设备离线' : '打开设备' }}</el-button>
                </div>
              </template>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <footer class="card-foot"><el-icon><Lock /></el-icon><span>USB 直连和本机 ADB Server 使用不同的 RSA 密钥，需要分别在手机上授权。</span></footer>
    </section>
  </main>
</template>

<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Monitor, Grid, Connection, ChatDotRound, Lock } from '@element-plus/icons-vue';
import { Adb, AdbDaemonTransport, AdbServerClient } from '@yume-chan/adb';
import { AdbDaemonWebUsbDeviceManager } from '@yume-chan/adb-daemon-webusb';
import { setAdbInstance, connectionState } from '@/utils/adbManager.js';
import { deviceCredentialManager } from '@/utils/deviceCredentialManager.js';
import { AdbServerWebSocketConnector, validateWirelessAddress } from '@/utils/adbServerConnector.js';
import { useDeviceStore } from '@/stores/device.js';

const router = useRouter();
const store = useDeviceStore();
const mode = ref('usb');
const secure = window.isSecureContext;
const usbManager = AdbDaemonWebUsbDeviceManager.BROWSER;
const usbSupported = !!usbManager;
const usbDevices = shallowRef([]);
const serverDevices = shallowRef([]);
const server = shallowRef(null);
const busy = ref(false);
const status = ref('');
const error = ref(connectionState.error);
const autoConnect = ref(localStorage.getItem('adb_auto_connect') === 'true');
const bridgeUrl = ref(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/adb-bridge`);
const bridgeToken = ref('');
const pairAddress = ref('');
const pairCode = ref('');
const wirelessAddress = ref('');
let connector;
let operation = 0;
let abortOperation;
let timer;
let leavingConnected = false;
let mounted = true;

const saveAutoConnect = () => localStorage.setItem('adb_auto_connect', String(autoConnect.value));
const closeServer = () => {
    connector?.close();
    connector = undefined;
    server.value = null;
    serverDevices.value = [];
};
const cancel = () => {
    operation++;
    clearTimeout(timer);
    abortOperation?.();
    abortOperation = undefined;
    busy.value = false;
};
const begin = (message, abort) => {
    const id = ++operation;
    busy.value = true;
    error.value = '';
    status.value = message;
    abortOperation = abort;
    timer = setTimeout(() => {
        if (operation !== id) return;
        cancel();
        error.value = '操作超时；请检查设备授权、连接地址和桥接服务后重试';
    }, 60000);
    return id;
};
const finish = id => {
    if (operation !== id) return;
    clearTimeout(timer);
    busy.value = false;
    abortOperation = undefined;
};
const fail = (id, cause) => {
    if (operation !== id) return;
    error.value = cause?.message || String(cause);
    finish(id);
};
const activate = async (adb, type, release) => {
    setAdbInstance(adb, { type, release });
    store.updateAdb(adb);
    leavingConnected = true;
    await router.push('/dashboard');
};
const refreshUsb = async () => {
    try { usbDevices.value = usbManager ? await usbManager.getDevices() : []; }
    catch (cause) { error.value = `无法读取 USB 设备：${cause.message}`; }
};
const connectUsb = async device => {
    if (busy.value) return;
    let opened = false;
    const id = begin('正在连接，请解锁手机并确认 USB 调试授权…', () => { if (opened) device.raw.close().catch(() => {}); });
    try {
        const connection = await device.connect();
        opened = true;
        if (operation !== id) { await device.raw.close(); return; }
        const transport = await AdbDaemonTransport.authenticate({ serial: device.serial, connection, credentialStore: deviceCredentialManager.getCredentialStore() });
        const adb = new Adb(transport);
        if (operation !== id) { await adb.close(); return; }
        try { await deviceCredentialManager.saveDeviceInfo(device); } catch { ElMessage.warning('设备已连接，但浏览器不允许保存设备记录'); }
        finish(id);
        await activate(adb, 'usb');
    } catch (cause) {
        if (opened && operation === id) await device.raw.close().catch(() => {});
        const hint = cause.name === 'NetworkError' ? '设备可能被其他 ADB 程序占用，请关闭其他程序或改用 ADB Server 桥接。' : '';
        fail(id, new Error(`${hint}${cause.message}`));
    }
};
const pickUsb = async () => {
    if (busy.value) return;
    const id = begin('请在浏览器弹窗中选择设备…');
    try {
        const device = await usbManager.requestDevice();
        if (id !== operation) return;
        finish(id);
        if (device) await connectUsb(device);
    } catch (cause) {
        if (cause.name === 'NotFoundError') finish(id);
        else fail(id, cause);
    }
};
const forgetKeys = async () => {
    try {
        await ElMessageBox.confirm('将删除本站保存的全部 USB ADB 密钥（同源 Tango 凭证也会被清除）。下次需要重新授权，不会删除手机上的数据。', '清除本地凭证', { type: 'warning' });
        const count = await deviceCredentialManager.clearAllCredentials();
        ElMessage.success(`已清除 ${count} 个密钥`);
    } catch (cause) { if (cause !== 'cancel' && cause !== 'close') error.value = cause.message; }
};
const serverAction = async (message, action) => {
    if (busy.value) return;
    const id = begin(message, closeServer);
    try { await action(id); finish(id); }
    catch (cause) { if (operation === id) { fail(id, cause); closeServer(); } }
};
const refreshServer = () => serverAction('正在读取 ADB Server 设备…', async id => {
    if (!server.value) {
        connector = new AdbServerWebSocketConnector(bridgeUrl.value, bridgeToken.value);
        server.value = new AdbServerClient(connector);
    }
    const devices = await server.value.getDevices(['device', 'unauthorized', 'offline']);
    if (operation === id) serverDevices.value = devices;
});
const pairWireless = () => serverAction('正在配对无线调试…', async id => {
    const address = validateWirelessAddress(pairAddress.value);
    if (!/^\d{6}$/.test(pairCode.value)) throw new Error('配对码必须为 6 位数字');
    try { await server.value.wireless.pair(address, pairCode.value); }
    finally { pairCode.value = ''; }
    if (operation === id) ElMessage.success('配对成功；请使用无线调试主页的连接端口连接');
});
const connectWireless = () => serverAction('正在连接无线设备…', async id => {
    const address = validateWirelessAddress(wirelessAddress.value);
    try { await server.value.wireless.connect(address); }
    catch (cause) { if (!(cause instanceof AdbServerClient.AlreadyConnectedError)) throw cause; }
    const devices = await server.value.getDevices(['device', 'unauthorized', 'offline']);
    if (operation === id) serverDevices.value = devices;
});
const selectServerDevice = device => serverAction('正在打开设备…', async id => {
    const ownedConnector = connector;
    const adb = await server.value.createAdb({ transportId: device.transportId });
    if (operation !== id) { await adb.close(); return; }
    finish(id);
    await activate(adb, 'server', () => ownedConnector.close());
});

onMounted(async () => {
    navigator.usb?.addEventListener('connect', refreshUsb);
    navigator.usb?.addEventListener('disconnect', refreshUsb);
    await refreshUsb();
    try {
        if (mounted && autoConnect.value && usbDevices.value.length === 1 && !busy.value && await deviceCredentialManager.hasStoredKeys() && mounted && mode.value === 'usb') await connectUsb(usbDevices.value[0]);
    } catch (cause) { if (mounted) error.value = `无法读取本地凭证：${cause.message}`; }
});
onBeforeUnmount(() => {
    mounted = false;
    navigator.usb?.removeEventListener('connect', refreshUsb);
    navigator.usb?.removeEventListener('disconnect', refreshUsb);
    cancel();
    if (!leavingConnected) closeServer();
});
</script>

<style scoped>
.connect-page {
  position: relative;
  min-height: 100dvh;
  max-width: 1400px;
  margin: 0 auto;
  padding: 48px 32px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: clamp(32px, 4vw, 64px);
  align-items: center;
  color: var(--ink);
}

.hero {
  position: relative;
  z-index: 1;
  min-width: 0;
  animation: rise 0.6s ease both;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 26px;
}
.brand-mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: var(--ink);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}
.brand-mark::after {
  content: "";
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--accent);
}
.brand-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.brand-name {
  font-size: 15px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.brand-meta {
  margin-top: 3px;
  font-size: 8.5px;
  letter-spacing: 0.18em;
  color: var(--muted-2);
}

.hero .eyebrow {
  margin-bottom: 10px;
}
.hero h1 {
  margin: 0 0 16px;
  font-size: clamp(32px, 4vw, 50px);
  font-weight: 780;
  line-height: 1.08;
  letter-spacing: -0.045em;
  color: var(--ink);
}
.hero h1 em {
  position: relative;
  isolation: isolate;
  font-style: normal;
  color: var(--accent);
}
.hero h1 em::after {
  content: "";
  position: absolute;
  z-index: -1;
  left: 2px;
  right: 2px;
  bottom: 1px;
  height: 3px;
  background: var(--accent);
}
.tagline {
  max-width: 30em;
  margin: 0 0 22px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--muted);
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin: 0 0 26px;
  padding: 1px;
  list-style: none;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--line);
  overflow: hidden;
}
.feature-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  background: var(--surface);
  transition: background-color 0.16s ease;
}
.feature-list li:hover {
  background: var(--surface-2);
}
.cap-index {
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--muted-2);
}
.cap-body {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-soft);
}
.cap-body .el-icon {
  flex: none;
  font-size: 14px;
  color: var(--accent);
}

.device-stage {
  position: relative;
  width: 100%;
  max-width: 480px;
  aspect-ratio: 460 / 280;
  margin-bottom: 22px;
  border: 1px solid var(--bay-line);
  border-radius: var(--radius);
  background-color: var(--bay);
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    radial-gradient(120% 90% at 30% 10%, #1a1d23 0%, var(--bay) 70%);
  background-size: 26px 26px, 26px 26px, auto;
  box-shadow: 0 26px 50px -34px rgba(16, 18, 22, 0.75);
  overflow: hidden;
}
.stage-tag {
  position: absolute;
  z-index: 2;
  bottom: 10px;
  left: 12px;
  font-size: 8.5px;
  letter-spacing: 0.16em;
  color: var(--bay-muted);
}
.mirror-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.art-laptop,
.art-phone {
  transform-box: fill-box;
  transform-origin: center bottom;
  animation: float-y 6s ease-in-out infinite;
}
.art-phone {
  animation-delay: 1.2s;
}
.art-link {
  animation: stroke-dash 1.2s linear infinite;
}
.art-halo {
  transform-box: fill-box;
  transform-origin: center;
  animation: halo 1.8s ease-in-out infinite;
}
.float-chip {
  position: absolute;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--bay-line);
  border-radius: 5px;
  background: rgba(23, 26, 31, 0.94);
  color: var(--bay-text);
  font-size: 8.5px;
  letter-spacing: 0.12em;
  animation: float-y 5s ease-in-out infinite;
}
.chip-usb {
  top: 6%;
  left: 4%;
}
.chip-wifi {
  top: 12%;
  right: 4%;
  animation-delay: 1.4s;
}
.privacy {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 11.5px;
  color: var(--muted);
}
.privacy .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 3px var(--success-soft);
}

.connect-card {
  position: relative;
  z-index: 1;
  min-width: 0;
  container-type: inline-size;
  padding: clamp(20px, 2.2vw, 28px);
  animation: rise 0.6s 0.06s ease both;
}
.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 6px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line-soft);
}
.card-head .section-kicker {
  margin-bottom: 3px;
}
.card-head h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 740;
  letter-spacing: -0.03em;
  color: var(--ink);
}
.card-head p {
  margin: 4px 0 0;
  font-size: 11.5px;
  color: var(--muted);
}
.context-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface-2);
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  white-space: nowrap;
}
.context-pill .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.context-pill.is-ok {
  border-color: #cfe3da;
  background: var(--success-soft);
  color: var(--success);
}
.context-pill.is-warn {
  border-color: #eadcbb;
  background: var(--warning-soft);
  color: var(--warning);
}

:deep(.el-alert) {
  margin: 12px 0;
}
:deep(.el-alert .el-alert__content .el-button) {
  margin-top: 8px;
}

.mode-tabs {
  margin-top: 2px;
}
:deep(.mode-tabs .el-tabs__header) {
  margin: 0 0 14px;
}
:deep(.mode-tabs .el-tabs__item) {
  height: 42px;
  padding: 0 14px !important;
  font-size: 12.5px;
}
.mode-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}
.mode-guide,
.mode-controls {
  min-width: 0;
}
.guide-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted-2);
}
.guide-title::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line);
}
.steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
}
.steps li {
  position: relative;
  counter-increment: step;
  padding: 9px 11px 9px 38px;
  border: 1px solid var(--line-soft);
  border-radius: 7px;
  background: var(--surface-2);
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--ink-soft);
}
.steps li::before {
  content: counter(step, decimal-leading-zero);
  position: absolute;
  top: 9px;
  left: 10px;
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 600;
  color: var(--accent);
}
.steps code,
.hint code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-family: var(--mono);
  font-size: 10.5px;
  white-space: nowrap;
}
.mode-controls > .actions:first-child {
  margin-top: 0;
}
@container (min-width: 530px) {
  .mode-body {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    gap: 20px;
    align-items: start;
  }
  .mode-guide {
    grid-column: 2;
    grid-row: 1;
  }
  .mode-controls {
    grid-column: 1;
    grid-row: 1;
  }
}

:deep(.el-form-item) {
  margin-bottom: 12px;
}
:deep(.el-form-item__label) {
  padding-bottom: 4px;
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.5;
  color: var(--muted);
}
:deep(.el-empty) {
  padding: 10px 0;
}
:deep(.el-empty__description p) {
  font-size: 11.5px;
  color: var(--muted);
}

.actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}
.actions > .el-input {
  flex: 1;
  min-width: 190px;
}
.danger-ghost {
  margin-top: 2px;
}

.device-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 8px 0;
  padding: 9px 11px;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  background: var(--surface);
  transition: border-color 0.16s ease, background-color 0.16s ease;
}
.device-row:hover {
  border-color: var(--line-strong);
  background: var(--surface-2);
}
.device-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.device-avatar {
  flex: 0 0 30px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface-2);
}
.device-text {
  min-width: 0;
}
.device-text strong {
  display: block;
  font-size: 12.5px;
  font-weight: 650;
  color: var(--ink);
}
.device-text small {
  display: block;
  margin-top: 2px;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
  word-break: break-all;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 16px 0 8px;
  font-size: 12px;
  font-weight: 650;
  color: var(--ink-soft);
}
.panel-title .el-icon {
  color: var(--accent);
}
.hint {
  margin: 12px 0 0;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--muted);
}
.hint.compact {
  margin: 0 0 10px;
}
.card-foot {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
  font-size: 11px;
  line-height: 1.65;
  color: var(--muted);
}
.card-foot .el-icon {
  flex: none;
  margin-top: 2px;
}

@keyframes float-y {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes stroke-dash {
  to { stroke-dashoffset: -26; }
}
@keyframes halo {
  0%, 100% { opacity: 0.18; transform: scale(0.85); }
  50% { opacity: 0.42; transform: scale(1.2); }
}
@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}

@media (max-width: 1024px) {
  .connect-page {
    grid-template-columns: minmax(0, 1fr);
    align-items: stretch;
    max-width: 700px;
    gap: 30px;
    padding: 40px 20px 52px;
  }
  .device-stage {
    max-width: 520px;
  }
}
@media (max-width: 560px) {
  .connect-page {
    padding: 28px 14px 40px;
  }
  .brand {
    margin-bottom: 20px;
  }
  .hero h1 {
    font-size: 31px;
  }
  .feature-list {
    grid-template-columns: minmax(0, 1fr);
  }
  .float-chip {
    padding: 3px 6px;
    font-size: 8px;
  }
  .card-head {
    flex-direction: column;
    gap: 10px;
  }
  .actions > .el-input {
    min-width: 100%;
  }
}
@media (max-height: 820px) and (min-width: 1025px) {
  .connect-page {
    padding: 24px 32px;
  }
  .brand {
    margin-bottom: 16px;
  }
  .hero h1 {
    margin-bottom: 12px;
    font-size: clamp(30px, 3.4vw, 42px);
  }
  .tagline {
    margin-bottom: 16px;
    font-size: 12.5px;
    line-height: 1.7;
  }
  .feature-list {
    margin-bottom: 16px;
  }
  .feature-list li {
    padding: 7px 10px;
  }
  .device-stage {
    max-width: 400px;
    margin-bottom: 14px;
  }
  .connect-card {
    padding: 20px 22px;
  }
  .steps {
    gap: 5px;
  }
  .steps li {
    padding: 7px 10px 7px 36px;
    font-size: 11px;
  }
  .steps li::before {
    top: 7px;
    left: 9px;
  }
  .guide-title {
    margin-bottom: 6px;
  }
  .actions {
    margin: 9px 0;
  }
  .device-row {
    margin: 6px 0;
    padding: 8px 10px;
  }
  .hint {
    margin-top: 10px;
  }
  .card-foot {
    margin-top: 10px;
    padding-top: 9px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .art-laptop,
  .art-phone,
  .art-link,
  .art-halo,
  .float-chip,
  .hero,
  .connect-card {
    animation: none !important;
  }
}
</style>
