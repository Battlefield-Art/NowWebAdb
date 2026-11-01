# 📱 NowWebAdb

【[中文文档](./README-CN.md)】 | 【[English Document](./README.md)】

在浏览器里管理并操作一台 Android 设备：投屏与控制、文件读写、应用安装与解析、实时日志、Shell 终端、性能采集、端口转发和设备诊断。底层是 [ya-webadb](https://github.com/yume-chan/ya-webadb)，前端是 React 19 + TypeScript + Vite 7。

三条始终生效的边界：

- **不装客户端、不装插件**：设备通过 WebUSB 直连，或通过本机一个仅监听 `127.0.0.1` 的桥接程序连到已有 ADB Server。
- **数据默认不出本机**：除了你主动使用的 AI 诊断助手，所有读写都发生在浏览器与设备之间；AI 每次发送前都展示完整内容供审核，密钥只存在页面内存。
- **AI 不碰设备**：助手只输出文字建议，不会执行任何 adb / shell 命令。

## 目录

- [它能做什么](#它能做什么)
- [为什么从 Vue 迁到 React](#为什么从-vue-迁到-react)
- [为什么从 JS 迁到 TypeScript](#为什么从-js-迁到-typescript)
- [架构](#架构)
- [技术栈](#技术栈)
- [安全边界](#安全边界)
- [快速开始](#快速开始)
- [开发规范与质量门](#开发规范与质量门)
- [项目结构](#项目结构)
- [已知限制](#已知限制)
- [致谢与许可证](#致谢与许可证)

## 它能做什么

| 页面 | 路由 | 能力 |
| --- | --- | --- |
| 连接管理 | `/` | WebUSB 直连、保存 RSA 凭证、本机桥接（令牌 + 来源校验）、Android 11+ 无线调试配对、mDNS 发现、一键在 USB 与无线之间切换 |
| 基础信息 | `/overview` | 型号 / 系统 / 序列号 / ABI / 屏幕 / 内存 / 存储 / 电池 / 温度 / Wi-Fi / IP / CPU，以及当前画面截图 |
| 投屏与控制 | 常驻左侧工作台 | scrcpy 3.3.3，H.264 / H.265 / AV1，可选 AAC 音频；滑动、多点触控、滚轮、物理键盘（UHID）、剪贴板双向、录屏、画中画、裁剪框选、多显示器与编码器选项、电源 / 旋转 / 导航 / 通知栏 / 截图 |
| 文件管理 | `/files` | 浏览、上传、下载、重命名、新建、删除、详情、路径跳转、排序与过滤、目录变更监视 |
| 应用管理 | `/apps` | 第三方 / 系统 / 启用 / 停用筛选；按需读取 APK 片段解析清单与资源（免安装获取名称 / 版本 / 权限 / 图标）；安装单个与拆分 APK、多用户安装、卸载可保留数据、导出单 APK 或拆分包 ZIP |
| 实时日志 | `/logcat` | 级别 / 标签 / 关键字过滤，缓冲区多选（main / system / crash / radio / events / 全部）与 PID 过滤，参数变化自动重连接；单条详情；导出文件头部记录捕获参数 |
| Shell 终端 | `/terminal` | xterm 交互终端，支持 ANSI 颜色与自适应尺寸 |
| 性能监控 | `/performance` | CPU / 内存 / FPS / 网络 / 电池自绘图表，可调采样间隔与上限，导出 CSV 报告 |
| 设备进程 | `/processes` | 进程列表与资源占用，按名称 / PID 检索 |
| 连接与设备 | `/connection` | 链路状态、传统 TCP/IP 无线调试、ADB 密钥管理、反向端口转发、本机端口转发、电源动作、系统设置、协议能力面板、虚拟显示器、诊断报告、演示模式、备份 |
| AI 诊断助手 | `/assistant` | 自备 OpenAI 兼容接口；显式读取上下文、发送前审核、纯文本展示、不执行命令 |

界面支持简体中文与 English（默认跟随浏览器语言），以及浅色 / 深色 / 跟随系统三档主题；投屏舞台、终端和日志控制台使用各自的专用深色配色，不随主题变化。

## 为什么从 Vue 迁到 React

先给可核对的基线。归档在 `legacy/` 的旧版本是 Vue 3 + Element Plus + JavaScript（`git show HEAD:package.json` 就是它的依赖清单）：72 个源文件（40 个 `.vue` + 32 个 `.js`）共 18,064 行，单文件最长 1,163 行（`fileManage.vue`），另有 1,030 行的 `PerformancePage.vue`、1,012 行的 `home.vue`；样式同时来自 Element Plus、Bootstrap 5 和 Sass；图表依赖 AntV G2；`unplugin-auto-import` / `unplugin-vue-components` 负责隐式全局注入；没有 TypeScript，也没有 ESLint 配置。它有 7 个基于 `node:test` 的测试文件（69 个用例，要靠 esbuild 手工转译才能跑），但 `package.json` 里没有 `test` 脚本，页面组件与响应式状态完全不在覆盖范围内；`/package-lock.json` 被旧 `.gitignore` 显式忽略，`@yume-chan/*` 全部是 `^` 浮动版本。

下面每一条都是「需求 → React 侧的做法 → 旧写法的代价」，代价部分只讲机制，不讲故事。

### 1. 三类高频数据源同时在线，渲染边界必须显式可控

投屏帧回调、logcat 流、性能采集会在同一页面并发运行。React 侧把这条边界写死在代码里：流式数据先进 `useRef` 缓冲，只在固定间隔的 flush 里调用一次 `setState`（`useLogcatStream`）；连接状态用 Zustand + `useSyncExternalStore`，组件只订阅自己用到的字段；页面路由全部 `lazy()`，重依赖不进首屏。Vue 3 的自动依赖收集在小页面里非常省事，但在单文件上千行、一个页面里十几个响应式来源并存时，「改哪个 ref 会重画哪一块」只能靠人工 `shallowRef` / `markRaw` 去圈，圈错的代价是整页重渲染。

### 2. 逻辑单元要能独立测试

重写后的分层是：`lib/adb/*` 是无 UI 依赖的纯函数服务层（35 个模块），`features/<页面>/*` 是页面、hooks 与展示组件。于是 logcat 的导出头部、APK 解析、目录差分监视、转发地址校验这些规则都能脱离浏览器直接测——现在是 33 个测试文件 / 181 个用例，`npm test` 一条命令跑完并进 CI。旧版本是「页面即逻辑即模板即样式」，逻辑写在 `.vue` 的 `setup` 里，想单测就得连带组件上下文一起 mock。

### 3. 无样式组件与主题令牌

Radix UI 的原语（Dialog、Dropdown、Select、Switch、Tabs、Tooltip 等）主要面向 React，配合 Tailwind CSS 4 的 `@theme` 令牌，只有 19 个自持的基础组件，明暗配色靠一组 CSS 变量自动切换。旧版本要盖 Element Plus 的主题变量，同时还挂着 Bootstrap，视觉一致性的维护成本随页面数量线性上升。图表则从 AntV G2 换成自绘 SVG（`MetricChart.tsx`，无图表依赖），线色直接引用主题令牌，切换深色不需要重建图表实例。

### 4. 规则能被自动化执行，而不只是写在文档里

`eslint-plugin-react-hooks` v7 带上了 React Compiler 的静态检查：`set-state-in-effect` 是错误级别，配合 CI 的 `--max-warnings=0`，「不要在 effect 体里同步 setState」这条经验变成了机器约束；`max-lines: 260` / `max-lines-per-function: 160` 把上一节那种千行文件直接挡在合并之前。Vue 侧的等价规则大多围绕模板，逻辑组织仍然要靠人守。

### 5. 迁移的直接收益，用数字说话

| 指标 | 旧（Vue + JS） | 新（React + TS） |
| --- | --- | --- |
| 源文件 / 行数 | 72 个文件（40 `.vue` + 32 `.js`）/ 18,064 行 | 263 个源文件（262 `.ts`/`.tsx` + 1 `.css`）/ 27,739 行 |
| 最大单文件 | 1,163 行 | 有效代码行上限 260（由 lint 强制） |
| 类型检查 | 无 | `tsc -b` strict 全绿 |
| Lint | 无配置 | ESLint 9 flat config，零告警门禁 |
| 自动化测试 | 7 个 `node:test` 文件 / 69 用例，无 `test` 脚本、不接 CI、页面层零覆盖 | 33 文件 / 181 用例，`npm test` 一条命令并纳入 CI 矩阵 |
| 依赖锁定 | `^` 浮动，`/package-lock.json` 被 gitignore | 核心依赖精确版本，锁文件纳入版本控制 |
| 样式来源 | Element Plus + Bootstrap + Sass | Tailwind 4 令牌 + Radix 原语 |

### 明确付出的代价

依赖数组要手写，`useEffect` 的心智负担比模板重，JSX 里做列表比 Vue 模板啰嗦，自动导入没了以后 import 变长。这些都是真实成本。我们的处理方式是把它们交给规则而非自觉：依赖数组和 effect 内的 setState 由 ESLint 报错，import 顺序与行长由 Prettier 统一，超长文件由 lint 拒绝合并。

### 什么情况下不该照着我们迁移

如果页面以模板为主、状态基本局部、团队已经投入了大量 Vue 组件，Vue 3 依旧是更省心的选择。这次迁移的前提是「并发流式数据 + 十来个功能页面 + 要有人长期单独维护」，在这个前提下 React + TypeScript 的显式性更划算。

## 为什么从 JS 迁到 TypeScript

### 收益（都能在代码里指出来）

- **协议字段不用背**：`RemoteFile`、`ExecResult`、`ForwardRule`、`TcpIpState` 这类接口取代了散落在各页面里的 `res.data.xxx`。ADB 与 scrcpy 是有字节布局的协议，字段名和可空性写进类型，比写进注释可靠。
- **严格开关是全套开的**：`strict` 之外还启用了 `noUncheckedIndexedAccess`（`entries[0]` 的类型是 `RemoteFile | undefined`，必须处理越界）、`noUnusedLocals` / `noUnusedParameters`、`noImplicitOverride`、`verbatimModuleSyntax`、`isolatedModules`。全仓 263 个源文件里 `any` 出现 0 次。
- **文案键是类型而不是字符串**：`MessageKey = keyof typeof zh`，而目录表声明为 `Record<Locale, Record<MessageKey, string>>`——少写一个英文键直接编译不过；中英文占位符不一致由 `tests/i18n.test.ts` 拦截。
- **用联合类型代替运行时猜测**：`ConnectionKind = 'usb' | 'server'`、ya-webadb 的 `DeviceSelector`、`LinuxFileType` 等，让「这台设备是怎么连上的」在类型层面唯一，UI 分支因此可穷尽检查。
- **错误出口只有一个**：`catch (cause: unknown)` 统一经 `toErrorMessage` 转文案，不再出现 `err.message` 直接崩在 `undefined` 上。
- **重构是可验证的**：改一个服务层签名，`tsc` 会列出全部调用点；旧版本靠全文搜索加运气。
- **测试与实现不会各说各话**：mock 服务层时类型必须匹配真实签名，接口漂移在编译期暴露。
- **上游类型缺陷被局部收口**：例如 ya-webadb 把 `Logcat.logIdToName` 声明为必定返回 `string`，而它是反查表、未知 id 实际返回 `undefined`。我们没有到处 `as any`，而是在 `logIdName()` 这一个 3 行函数里承担这个不一致。

### 代价

泛型偶尔要读文档才能看懂；上游 d.ts 不完美时需要少量显式 cast；构建多一步 `tsc -b`（换来的是 CI 里类型检查独立成一步，报错信息更好读）。总体上，这个项目里 TypeScript 带来的返工减少远多于它增加的第一周成本。

## 架构

```plaintext
features/<页面>        页面 + hooks + 展示组件（唯一的 UI 层）
        │
        ├── stores/device        Zustand：当前连接（adb / kind / server / serial），全站唯一可变全局
        │
        └── lib/adb/*            35 个纯函数模块：files / packages / logcat / tcpip / forward / reverse / scrcpy …
                    │
                lib/connection/* 三种传输：usb（WebUSB）· bridge（WebSocket → ADB Server）· server（协议封装）
                    │
                @yume-chan/adb   传输与协议实现（Adb / AdbServerClient / AdbScrcpyClient）
```

要点：

- **服务层不碰 DOM、不碰 React**：`lib/adb/*` 只接受 `Adb` 实例和参数，返回 Promise。这让每个能力都能单独测试，也让页面只负责编排与展示。
- **三种连接方式共用一套服务层**：WebUSB 直连、WebSocket 桥接、无线调试建立后拿到的是同一个 `Adb` 对象；只有依赖「本机监听」的能力（外部反向隧道、本机端口转发）需要 ADB Server 桥接，UI 会在不可用时说明原因而不是摆一个坏掉的按钮。
- **路由与分包**：所有页面 `lazy()` 加载，投屏面板常驻工作台左侧；`vite.config.ts` 的 `manualChunks` 按顶层包名切出 `react` / `ui` / `adb` 三块，刻意不设 catch-all vendor，这样 @zip.js、xterm、@tanstack/react-virtual 这些只被单个懒加载页面用到的依赖不会渗进首图。构建无 500 kB 告警，入口 281.60 kB（gzip 82.59 kB）。
- **文案与主题**：`lib/i18n`（命名键目录 + `useT()`）和 `styles`（`@theme` 令牌）都是横切关注点，任何新页面接进来只需要加两个成对键和一个语义色。

## 技术栈

| 领域 | 选择 | 版本 |
| --- | --- | --- |
| 框架 | React | 19.3 |
| 语言 | TypeScript | 5.9 |
| 构建 / 开发服务器 | Vite | 7.3 |
| 样式 | Tailwind CSS（`@theme` 令牌） | 4.3 |
| 组件原语 | Radix UI | 1.1–2.2 |
| 状态 | Zustand | 5.0 |
| 路由 | React Router | 7.18 |
| ADB / scrcpy | ya-webadb（`adb` 2.6.4、`adb-scrcpy` 2.3.2、`android-bin` 2.1.0、`scrcpy` 2.3.0、`scrcpy-decoder-webcodecs` 2.5.3、`stream-extra` 2.6.1） | 固定 |
| scrcpy 服务端 | `npm install` 时由 `scripts/prepare-scrcpy.mjs` 放到 `web/public/server.bin` | 3.3.3 |
| 终端 | xterm（`@xterm/xterm` + fit） | 5.5 |
| ZIP | `@zip.js/zip.js` | 2.24 |
| 虚拟列表 | `@tanstack/react-virtual` | 3.14 |
| 提示 | Sonner | 2.0 |
| 图标 | lucide-react | 1.66 |
| 测试 | Vitest + Testing Library + jsdom | 3.2 / 16.3 / 27 |
| 代码质量 | ESLint 9 flat config + typescript-eslint 8 + eslint-plugin-react-hooks 7 + Prettier |  |
| 桥接 | Node `ws`（仅本机） | 8.22 |

## 安全边界

- **设备通道只在可信来源之间建立**：所有 ADB 通信由浏览器直接发起，不经过任何第三方服务器。
- **桥接程序仅监听 `127.0.0.1`**：`scripts/adb-bridge.mjs` 默认端口 5858，只做 WebSocket ↔ `127.0.0.1:5037` 的字节管道。它校验三件事——请求来源必须在 `ADB_BRIDGE_ORIGINS` 白名单内、路径必须是 `/adb-bridge`、WS 子协议里带的令牌必须与启动令牌等长且恒定时间比较（`timingSafeEqual`）。单条消息上限 1 MB，并发客户端上限 64。
- **不要把 5037 暴露到公网**：ADB Server 本身没有鉴权，桥接的全部意义就是让它只对本机可见。
- **令牌只在会话内**：桥接每次启动打印新的会话令牌，粘贴使用，不写盘；关闭进程即失效。
- **本机端口转发只绑回环**：`adb forward` 创建的监听端口由 adbd 绑定在 `127.0.0.1`，转发规则可在连接页查看、逐条移除或清空。
- **AI 助手**：接口地址、模型和密钥由你自备，密钥只保存在页面内存（不落 `localStorage`，刷新即失）；上下文由你逐次勾选并展示全文后才发送；模型的回答按纯文本渲染，项目不会把它当成命令执行。
- **设备侧危险动作都有确认**：重启 / 关机 / recovery / bootloader / EDL / Odin、关闭 TCP/IP 调试、清空反向隧道与本机转发、删除文件与卸载应用，全部走确认弹窗。

## 快速开始

1. 克隆并安装：

   ```bash
   git clone https://github.com/srrchysfzy/NowWebAdb.git
   cd NowWebAdb
   npm install
   ```

   `npm install` 会安装根工程与 `web/` workspace，并执行 `scripts/prepare-scrcpy.mjs`，在 `web/public/server.bin` 缺失时下载 scrcpy 3.3.3 服务端。

2. 启动开发服务器：

   ```bash
   npm run dev
   ```

3. 用 Chrome 或 Edge 打开 `http://localhost:5173`（`localhost` 是安全上下文，WebUSB 可用），选择连接方式。

### USB 直连

手机开启开发者选项与 USB 调试，用可传数据的 USB 线连接，在浏览器弹窗里选中设备并在手机上确认 RSA 授权。若提示设备被占用，先退出本机其他 adb 客户端（它们与浏览器抢占同一个 WebUSB 接口）。

### 无线调试 / ADB Server 桥接

浏览器不能直接建立 TCP 连接，需要在本机跑桥接：

```bash
adb start-server
npm run adb:bridge
```

把终端打印的会话令牌填入首页的「无线 / ADB Server」标签页。开发环境默认地址 `ws://localhost:5173/adb-bridge` 由 Vite 代理到 `127.0.0.1:5858`。Android 11+ 可直接填写手机「无线调试」弹窗里的配对端口与配对码完成配对，也支持 mDNS 发现；已连接的设备可以在连接页一键在 USB 与无线之间切换。

### 生产部署

站点必须是 HTTPS，否则浏览器不开放 WebUSB。桥接用证书启动并收紧来源白名单：

```bash
ADB_BRIDGE_CERT=/path/fullchain.pem ADB_BRIDGE_KEY=/path/privkey.pem \
ADB_BRIDGE_ORIGINS=https://adb.example.com npm run adb:bridge
```

```bash
npm run build && npm run preview
```

### 语言与主题

首页右上角的语言与主题菜单可随时切换，选择保存在浏览器本地（`nowwebadb.locale`、`nowwebadb.theme`），下次访问自动沿用；语言默认跟随浏览器，主题默认跟随系统且首屏不闪烁。

新增文案要在 `web/src/lib/i18n/messages/zh/` 与 `.../en/` 的对应模块中成对添加同一个键，类型检查和 `npm test` 会拦截缺键、重复键与占位符不一致。

## 开发规范与质量门

```bash
npm run typecheck   # tsc -b，strict 全家桶
npm run lint        # eslint . --max-warnings=0
npm test            # vitest run：33 文件 / 181 用例
npm run build       # tsc -b && vite build
```

`.github/workflows/ci.yml` 在 Node.js 20 / 22 / 24 三个版本上依次执行这四步，任何告警都算失败。写代码时会被机器约束的几条：

- 单文件有效代码不超过 260 行，单个函数不超过 160 行（i18n 文案表豁免）。
- `react-hooks/set-state-in-effect` 是错误：状态更新只能来自事件处理、异步续体或 DOM 回调；「最新参数」用 ref 持有，effect 依赖只放真正需要重启流的值。
- 服务层函数不导入 React，UI 组件不直接拼 ADB 请求串；用户输入进入协议字符串前必须过白名单校验。
- 面向用户的字符串一律走 `t()`，中英文键集由类型和测试双重保证。

## 项目结构

```plaintext
NowWebAdb
├── .github/workflows/ci.yml   # 类型检查 / lint / 测试 / 构建，Node 20·22·24
├── web                        # 当前应用（React + TypeScript）
│   ├── public/server.bin      # scrcpy 3.3.3 服务端，npm install 自动准备
│   ├── src
│   │   ├── components         # 布局与 19 个基础 UI 组件
│   │   ├── features           # 11 个功能目录：页面 + hooks + 组件 + 纯工具
│   │   ├── lib                # adb（35 个模块）· connection · apk · ai · i18n · theme · utils
│   │   ├── stores             # Zustand 设备连接状态
│   │   ├── styles             # 设计令牌与全局样式
│   │   ├── router.tsx         # 懒加载路由与 RequireDevice 守卫
│   │   └── main.tsx
│   ├── tests                  # Vitest + Testing Library
│   ├── eslint.config.js       # flat config：行数上限、hooks 规则、React Compiler
│   └── vite.config.ts         # HTTPS、桥接代理、manualChunks
├── scripts
│   ├── adb-bridge.mjs         # 仅本机：WebSocket → 127.0.0.1:5037
│   └── prepare-scrcpy.mjs
├── legacy                     # 归档的 Vue 3 + Element Plus 版本，不参与构建
├── package.json               # 根脚本转发到 web/，并管理桥接依赖
└── README.md / README-CN.md
```

## 已知限制

- 需要桌面 Chrome 或 Edge 的安全上下文（`https://` 或 `localhost`）；WebUSB 与 WebCodecs 是硬依赖。
- 同一设备只能被一个客户端持有：浏览器直连与本机 adb 会互相抢占。
- scrcpy 的 AAC 音频必须由用户手势启动投屏才能播放；即使浏览器无法解码，也会持续排空音频流以免阻塞视频。
- 目录变更监视是 15 秒一次的 `readdir` 差分，ya-webadb 没有暴露 inotify 原语，因此不是实时事件。
- 本机端口转发与外部反向隧道只在 ADB Server 桥接方式下可用；WebUSB 直连没有可绑定的本机端口，连接页会给出替代方案。
- 转发规则沿用 ya-webadb 的 `host-serial:<serial>:<command>` 设备服务名，含冒号的无线序列号（`ip:port`）依赖同样的转义约定，尚未在真机上验证。
- 高级投屏选项（摄像头、多显示器、编码组合）与真机日志缓冲区 / PID 过滤仍需按机型回归。

## 致谢与许可证

感谢以下开源项目与工具，本项目才成为可能：

- [ya-webadb](https://github.com/yume-chan/ya-webadb) — 浏览器端的 Android 设备协议实现
- [scrcpy](https://github.com/genymobile/scrcpy) — 投屏协议与服务端
- [React](https://react.dev)、[Vite](https://vitejs.dev)、[TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)、[Radix UI](https://www.radix-ui.com)、[lucide](https://lucide.dev)
- [xterm.js](https://xtermjs.org)、[zip.js](https://gildas-lormeau.github.io/zip.js/)、[TanStack Virtual](https://tanstack.com/virtual)

GPL-3.0
