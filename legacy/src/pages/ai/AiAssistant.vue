<template>
  <section class="page ai-page" aria-labelledby="ai-title">
    <header class="page-head">
      <div class="page-heading-copy">
        <p class="eyebrow">Assistant / Diagnostics</p>
        <h1 id="ai-title" class="page-title">AI 诊断助手</h1>
        <p class="page-sub">描述问题，审核信息，再获取诊断建议。请求由浏览器直接发往你配置的服务商，AI 不会执行任何设备操作。</p>
      </div>
      <span class="policy-chip"><span class="dot"></span>仅建议 · 无自动操作</span>
    </header>

    <div class="privacy-banner surface">
      <span class="privacy-mark mono">PRIVACY</span>
      <div>
        <strong>每次发送前都需审核</strong>
        <p>不会自动上传设备数据、截图、应用列表或日志。请求可能产生费用，请先确认服务商隐私政策。密钥、会话和设置仅在当前页面内存中保存，刷新或离开后清除。</p>
      </div>
    </div>

    <div class="workspace">
      <aside class="settings-column">
        <section class="panel surface">
          <header class="panel-head">
            <span class="step mono">01</span>
            <div>
              <p class="section-kicker">Provider</p>
              <h2 class="section-title">配置服务</h2>
            </div>
          </header>
          <div class="panel-body">
            <el-form label-position="top" :disabled="locked" @submit.prevent>
              <el-form-item label="完整 Chat Completions 地址（必填）">
                <el-input
                  v-model="endpoint"
                  aria-label="完整 Chat Completions 地址"
                  placeholder="https://api.openai.com/v1/chat/completions"
                  :maxlength="2048"
                  autocomplete="off"
                  spellcheck="false"
                />
              </el-form-item>
              <p class="hint">按原路径请求，不自动追加路径。仅允许 HTTPS 或本机 HTTP；禁止 URL 用户名、密码、查询参数和片段。</p>
              <p v-if="endpointError" class="field-error" role="alert">{{ endpointError }}</p>
              <p class="destination">
                <span>接收方</span>
                <strong class="mono">{{ destination || '尚未配置有效地址' }}</strong>
              </p>
              <el-form-item label="模型名称（必填）">
                <el-input v-model="model" aria-label="模型名称" placeholder="例如 gpt-4o-mini，或服务商指定的名称" :maxlength="200" autocomplete="off" />
              </el-form-item>
              <el-form-item label="API Key（必填，仅内存）">
                <el-input
                  v-model="apiKey"
                  aria-label="API Key"
                  type="password"
                  show-password
                  :maxlength="4096"
                  autocomplete="new-password"
                  spellcheck="false"
                  placeholder="仅放入 Authorization 请求头"
                />
              </el-form-item>
              <div class="key-actions">
                <span class="hint">本地服务如需占位 Key，请按服务说明填写。</span>
                <el-button size="small" :disabled="!apiKey || locked" @click="apiKey = ''">清除密钥</el-button>
              </div>
            </el-form>
          </div>
        </section>

        <section class="panel surface">
          <header class="panel-head">
            <span class="step mono">02</span>
            <div>
              <p class="section-kicker">Context</p>
              <h2 class="section-title">准备参考信息</h2>
            </div>
            <span class="optional-chip mono">OPTIONAL</span>
          </header>
          <div class="panel-body">
            <p class="hint">仅点击下方按钮才读取设备。只执行以下四条只读命令，不采集序列号、应用列表、截图或日志。</p>
            <ul class="command-list">
              <li v-for="item in BASIC_CONTEXT_COMMANDS" :key="item.command"><code>{{ item.command }}</code></li>
            </ul>
            <el-button :loading="collecting" :disabled="locked" @click="collectContext">读取基础信息到草稿</el-button>
            <p class="hint">读取后不会发送。请在下方预览、编辑或删除敏感内容；也可完全手动填写。</p>
            <label for="ai-context" class="input-label">设备上下文草稿</label>
            <el-input
              id="ai-context"
              v-model="contextDraft"
              type="textarea"
              :rows="8"
              :maxlength="AI_LIMITS.context"
              show-word-limit
              :disabled="locked || collecting"
              placeholder="可选：型号、Android 版本、电池/存储现象。不要粘贴密钥、账号或完整日志。"
            />
            <el-checkbox v-model="includeContext" :disabled="locked || collecting || !contextDraft.trim()">本次附带上述上下文</el-checkbox>
            <p class="hint">上下文不会单独写入历史；回答可能引用它，后续发送历史时请再次检查。超过 {{ AI_LIMITS.context }} 字符的内容将截断。</p>
            <el-alert v-if="contextError" :title="contextError" type="error" show-icon :closable="false" role="alert" />
            <p v-if="contextStatus" class="status-text" role="status">{{ contextStatus }}</p>
          </div>
        </section>
      </aside>

      <section class="panel chat-panel surface">
        <header class="panel-head chat-head">
          <div class="chat-heading">
            <span class="step mono">03</span>
            <div>
              <p class="section-kicker">Conversation</p>
              <h2 class="section-title">对话与建议</h2>
            </div>
          </div>
          <el-button size="small" @click="clearConversation">清空会话</el-button>
        </header>

        <div class="panel-body chat-body">
          <p class="hint">仅保留最近 {{ AI_LIMITS.historyMessages }} 条成功对话消息，总计最多 {{ AI_LIMITS.historyCharacters }} 字符；每条回答最多 {{ AI_LIMITS.reply }} 字符。全部按纯文本显示。</p>

          <div class="conversation" aria-label="诊断对话" :aria-busy="sending">
            <el-empty v-if="!history.length && !sending" :image-size="64" description="从一个具体问题开始，无需附带设备信息" />
            <article v-for="(message, index) in history" :key="index" class="message" :class="message.role">
              <strong>{{ message.role === 'user' ? '你' : 'AI · 仅供参考' }}</strong>
              <pre>{{ message.content }}</pre>
            </article>
            <article v-if="sending" class="message user">
              <strong>你 · 等待回答</strong>
              <pre>{{ pendingQuestion }}</pre>
            </article>
            <p v-if="sending" class="status-text" role="status">正在请求 {{ activeDestination }}… 最长等待 60 秒。可随时停止。</p>
          </div>

          <el-alert v-if="requestError" :title="requestError" type="error" :closable="false" show-icon role="alert" />
          <p v-if="statusMessage" class="status-text" role="status">{{ statusMessage }}</p>

          <div class="composer">
            <el-checkbox v-model="includeHistory" :disabled="locked || !history.length">发送最近对话历史（{{ outgoingHistory.length }} 条）</el-checkbox>
            <label for="ai-question" class="input-label">需要诊断的问题</label>
            <el-input
              id="ai-question"
              v-model="question"
              type="textarea"
              :rows="5"
              :maxlength="AI_LIMITS.prompt"
              show-word-limit
              :disabled="locked"
              placeholder="例如：手机待机耗电明显增加，应该先检查哪些项目？请优先提供只读检查建议。"
              @keydown="handleQuestionKeydown"
            />
            <p class="hint">将发送：固定安全提示、所选历史、勾选的上下文及当前问题。Ctrl + Enter 打开发送审核，Enter 换行。</p>
            <p v-if="sendBlockReason && !sending" class="hint">{{ sendBlockReason }}</p>
            <div class="send-actions">
              <el-button v-if="sending" type="danger" plain @click="stopRequest">停止请求</el-button>
              <el-button type="primary" :disabled="!canReview" @click="openReview">审核并发送</el-button>
            </div>
            <p class="hint">清空会话会终止等待并删除历史、问题和上下文，不清除服务配置。停止或清空无法撤回已发出的数据。</p>
          </div>
        </div>
      </section>
    </div>

    <el-dialog
      v-model="reviewOpen"
      title="发送前审核：以下是本次请求的全部消息"
      width="min(800px, 94vw)"
      :close-on-click-modal="false"
      @close="reviewAcknowledged = false"
    >
      <template v-if="review">
        <el-alert title="仅点击“确认发送”才会发起外部请求" type="warning" :closable="false" show-icon />
        <dl class="review-destination">
          <dt>接收主机</dt><dd class="mono">{{ review.host }}</dd>
          <dt>完整地址</dt><dd class="mono">{{ review.endpoint }}</dd>
          <dt>模型</dt><dd class="mono">{{ review.model }}</dd>
        </dl>
        <p class="hint">API Key 仅放入请求头，不包含在下列消息中。非流式请求（stream: false），无工具调用。要编辑上下文、问题或取消历史，请返回修改。</p>
        <div class="review-messages" aria-label="即将发送的全部消息" tabindex="0">
          <article v-for="(message, index) in review.messages" :key="index" class="message">
            <strong>{{ index + 1 }}. {{ roleLabel(message.role) }}</strong>
            <pre>{{ message.content }}</pre>
          </article>
        </div>
        <el-checkbox v-model="reviewAcknowledged" class="review-consent">我已检查接收方及全部消息，同意本次发送（包括所选设备信息）</el-checkbox>
      </template>
      <template #footer>
        <el-button @click="cancelReview">返回修改</el-button>
        <el-button type="primary" :disabled="!review || !reviewAcknowledged || sending" @click="confirmSend">确认发送</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { ElAlert, ElButton, ElCheckbox, ElDialog, ElEmpty, ElForm, ElFormItem, ElInput } from 'element-plus';
import { getAdbInstance } from '@/utils/adbManager.js';
import {
  AI_LIMITS,
  BASIC_CONTEXT_COMMANDS,
  AiAssistantError,
  boundContext,
  buildChatMessages,
  collectBasicDeviceContext,
  requestChatCompletion,
  sanitizeHistory,
  sanitizeText,
  validateChatSettings,
  validateEndpoint,
} from '@/utils/aiAssistant.js';

const endpoint = ref('https://api.openai.com/v1/chat/completions');
const model = ref('');
// Deliberately no storage, URL synchronization, telemetry or global store for any input.
const apiKey = ref('');
const contextDraft = ref('');
const includeContext = ref(false);
const includeHistory = ref(true);
const question = ref('');
const history = ref([]);
const sending = ref(false);
const collecting = ref(false);
const pendingQuestion = ref('');
const activeDestination = ref('');
const requestError = ref('');
const contextError = ref('');
const contextStatus = ref('');
const statusMessage = ref('');
const reviewOpen = ref(false);
const reviewAcknowledged = ref(false);
const review = ref(null);
let requestController = null;
let collectionController = null;
let disposed = false;

const locked = computed(() => sending.value || reviewOpen.value);
const outgoingHistory = computed(() => includeHistory.value ? sanitizeHistory(history.value) : []);
const address = computed(() => {
  try { return validateEndpoint(endpoint.value); } catch { return null; }
});
const destination = computed(() => address.value?.host || '');
const endpointError = computed(() => {
  if (!endpoint.value) return '';
  try { validateEndpoint(endpoint.value); return ''; } catch (error) { return error.message; }
});
const sendBlockReason = computed(() => {
  try {
    validateChatSettings({ endpoint: endpoint.value, model: model.value, apiKey: apiKey.value });
    if (!sanitizeText(question.value, AI_LIMITS.prompt)) return '请填写要诊断的问题。';
    if (collecting.value) return '请等待读取完成并审核上下文。';
    return '';
  } catch (error) {
    return error.message;
  }
});
const canReview = computed(() => !locked.value && !sendBlockReason.value);

function roleLabel(role) {
  return { system: '固定安全提示', user: '用户消息 / 参考数据', assistant: '历史 AI 回答' }[role];
}

function visibleError(error, fallback) {
  // Never expose arbitrary exception text: it could contain credentials or device output.
  return error instanceof AiAssistantError ? error.message : fallback;
}

async function collectContext() {
  if (locked.value || collecting.value || disposed) return;
  const controller = new AbortController();
  collectionController = controller;
  collecting.value = true;
  contextError.value = '';
  contextStatus.value = '';
  try {
    const context = await collectBasicDeviceContext(getAdbInstance(), { signal: controller.signal });
    if (disposed || collectionController !== controller) return;
    contextDraft.value = context;
    // Collection does not opt the user into sending the data.
    includeContext.value = false;
    contextStatus.value = '草稿已更新，仅保存在本页。请检查、编辑后再勾选附带。';
  } catch (error) {
    if (!disposed && collectionController === controller) {
      contextError.value = visibleError(error, '读取设备信息失败，草稿未更新；请检查设备连接。');
    }
  } finally {
    if (collectionController === controller) {
      collectionController = null;
      collecting.value = false;
    }
  }
}

function openReview() {
  if (!canReview.value || disposed) return;
  const settings = validateChatSettings({ endpoint: endpoint.value, model: model.value, apiKey: apiKey.value });
  const payload = {
    endpoint: settings.url,
    host: settings.host,
    model: settings.model,
    history: outgoingHistory.value.map((message) => ({ ...message })),
    context: includeContext.value ? boundContext(contextDraft.value) : '',
    prompt: sanitizeText(question.value, AI_LIMITS.prompt),
  };
  // A detached snapshot ensures the reviewed payload is the one sent, even after async work.
  review.value = { ...payload, messages: buildChatMessages(payload) };
  reviewAcknowledged.value = false;
  requestError.value = '';
  statusMessage.value = '';
  reviewOpen.value = true;
}

function cancelReview() {
  reviewOpen.value = false;
  reviewAcknowledged.value = false;
  review.value = null;
}

async function confirmSend() {
  if (!reviewOpen.value || !review.value || !reviewAcknowledged.value || sending.value || disposed) return;
  const snapshot = review.value;
  const controller = new AbortController();
  requestController = controller;
  sending.value = true;
  pendingQuestion.value = snapshot.prompt;
  activeDestination.value = snapshot.host;
  cancelReview();
  requestError.value = '';
  statusMessage.value = '';
  try {
    const answer = await requestChatCompletion({ ...snapshot, apiKey: apiKey.value, signal: controller.signal });
    if (disposed || requestController !== controller) return;
    history.value = sanitizeHistory([
      ...history.value,
      { role: 'user', content: snapshot.prompt },
      { role: 'assistant', content: answer },
    ]);
    question.value = '';
    statusMessage.value = '回答已生成。请核实建议，任何设备操作均需你自行决定并执行。';
  } catch (error) {
    if (!disposed && requestController === controller) {
      requestError.value = visibleError(error, '请求失败，请检查配置后重试。');
    }
  } finally {
    if (requestController === controller) {
      requestController = null;
      sending.value = false;
      pendingQuestion.value = '';
      activeDestination.value = '';
    }
  }
}

function abortRequest() {
  const controller = requestController;
  requestController = null;
  controller?.abort();
  sending.value = false;
  pendingQuestion.value = '';
  activeDestination.value = '';
}

function stopRequest() {
  abortRequest();
  requestError.value = '';
  statusMessage.value = '已停止等待，问题草稿已保留。已发出的数据无法撤回，服务端可能仍在处理。';
}

function clearConversation() {
  abortRequest();
  const controller = collectionController;
  collectionController = null;
  controller?.abort();
  collecting.value = false;
  cancelReview();
  history.value = [];
  contextDraft.value = '';
  includeContext.value = false;
  question.value = '';
  contextError.value = '';
  contextStatus.value = '';
  requestError.value = '';
  statusMessage.value = '会话已清空，已停止等待。已发出的数据无法撤回。';
}

function handleQuestionKeydown(event) {
  if (event.key === 'Enter' && event.ctrlKey && !event.isComposing) {
    event.preventDefault();
    openReview();
  }
}

onBeforeUnmount(() => {
  disposed = true;
  clearConversation();
  apiKey.value = '';
});
</script>

<style scoped>
.ai-page {
  max-width: 1560px;
  container-type: inline-size;
}

.policy-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 11px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink-soft);
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.policy-chip .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 3px var(--success-soft);
}

.privacy-banner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  margin-bottom: 18px;
  background: var(--surface-2);
}

.privacy-mark {
  flex: none;
  padding: 3px 7px;
  border: 1px solid var(--accent-line);
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.14em;
}

.privacy-banner strong {
  display: block;
  font-size: 12.5px;
  font-weight: 680;
  color: var(--ink);
}

.privacy-banner p {
  margin: 4px 0 0;
  max-width: 1100px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.65;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.settings-column {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.panel {
  min-width: 0;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--line-soft);
  background: var(--surface-2);
}

.panel-head > div {
  min-width: 0;
}

.step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 28px;
  height: 28px;
  border: 1px solid var(--line-strong);
  border-radius: 7px;
  background: var(--surface);
  color: var(--muted);
  font-size: 10.5px;
  font-weight: 600;
}

.panel-head .section-title {
  margin-top: 1px;
}

.optional-chip {
  margin-left: auto;
  padding: 2px 6px;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--muted-2);
  font-size: 9px;
  letter-spacing: 0.12em;
}

.panel-body {
  padding: 16px;
}

.chat-head {
  justify-content: space-between;
}

.chat-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.chat-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hint {
  margin: 0;
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.65;
}

.field-error {
  margin: 6px 0 0;
  color: var(--danger);
  font-size: 11.5px;
  line-height: 1.6;
}

.destination {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 10px 0 14px;
  padding: 8px 10px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-xs);
  background: var(--surface-2);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.destination span {
  flex: none;
  color: var(--muted);
  font-size: 11px;
}

.destination strong {
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 500;
}

.key-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 2px;
}

.key-actions .hint {
  min-width: 0;
}

.input-label {
  display: block;
  margin: 14px 0 6px;
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 600;
}

.command-list {
  display: grid;
  gap: 4px;
  margin: 10px 0 12px;
  padding: 10px 12px;
  list-style: none;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.command-list code {
  display: block;
  color: var(--ink-soft);
  font-size: 10.5px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.command-list code::before {
  content: "$ ";
  color: var(--accent);
}

.conversation {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 240px;
  max-height: 52vh;
  overflow-y: auto;
  padding: 2px;
  margin: 2px 0 4px;
}

.conversation .el-empty {
  margin: auto;
}

.message {
  padding: 11px 13px;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.message.user {
  border-color: var(--accent-line);
  background: var(--accent-soft);
}

.message strong {
  display: block;
  margin-bottom: 6px;
  color: var(--muted);
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.message.user strong {
  color: var(--accent-ink);
}

.message pre {
  margin: 0;
  font-family: var(--sans);
  font-size: 12.5px;
  line-height: 1.75;
  color: var(--ink-soft);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--line-soft);
}

.composer .input-label {
  margin-top: 0;
}

.send-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 2px;
}

.status-text {
  margin: 0;
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.6;
}

.review-destination {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 6px 10px;
  margin: 14px 0;
  padding: 12px 14px;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  font-size: 12px;
}

.review-destination dt {
  color: var(--muted);
}

.review-destination dd {
  margin: 0;
  color: var(--ink-soft);
  font-size: 11.5px;
  overflow-wrap: anywhere;
}

.review-messages {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 42vh;
  overflow-y: auto;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.review-messages .message {
  margin: 0;
  background: var(--surface);
}

.review-consent {
  height: auto;
  margin-top: 14px;
  white-space: normal;
}

.review-consent :deep(.el-checkbox__label) {
  white-space: normal;
  line-height: 1.6;
}

.panel-body :deep(.el-form-item) {
  margin-bottom: 12px;
}

.panel-body :deep(.el-form-item__label) {
  padding-bottom: 4px;
  color: var(--muted);
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.5;
}

.panel-body :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

@container (max-width: 1120px) {
  .workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .settings-column {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}

@container (max-width: 860px) {
  .settings-column {
    grid-template-columns: minmax(0, 1fr);
  }

  .privacy-banner {
    flex-direction: column;
    gap: 10px;
  }

  .conversation,
  .review-messages {
    max-height: none;
  }
}

@media (max-width: 560px) {
  .panel-body {
    padding: 13px;
  }

  .panel-head {
    padding: 11px 13px;
  }

  .key-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .send-actions {
    justify-content: stretch;
  }

  .send-actions .el-button {
    flex: 1;
    margin-left: 0;
  }
}
</style>
