# 📱 NowWebAdb

【[Chinese Document](./README-CN.md)】 | 【[English Document](./README.md)】

Manage and drive an Android device from the browser: screen mirroring and control, file transfer, app installation and parsing, live logs, a shell terminal, performance sampling, port forwarding and device diagnostics. It is built on [ya-webadb](https://github.com/yume-chan/ya-webadb), with React 19 + TypeScript + Vite 7 on the front end.

Three boundaries that always hold:

- **No client, no extension**: the device connects over WebUSB directly, or through a small bridge on your machine that listens only on `127.0.0.1` and talks to your existing ADB Server.
- **Your data stays local**: apart from the AI assistant you explicitly choose to use, every read and write happens between the browser and the device. The assistant shows the full payload before sending, and its API key lives in memory only.
- **AI never touches the device**: the assistant returns text advice; it cannot execute adb or shell commands.

## Contents

- [What it does](#what-it-does)
- [Why we moved from Vue to React](#why-we-moved-from-vue-to-react)
- [Why we moved from JavaScript to TypeScript](#why-we-moved-from-javascript-to-typescript)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Security boundaries](#security-boundaries)
- [Getting started](#getting-started)
- [Conventions and quality gates](#conventions-and-quality-gates)
- [Project layout](#project-layout)
- [Known limitations](#known-limitations)
- [Credits and license](#credits-and-license)

## What it does

| Page | Route | Capabilities |
| --- | --- | --- |
| Connection manager | `/` | WebUSB direct connection, saved RSA credentials, local bridge (token + origin checks), Android 11+ wireless pairing, mDNS discovery, one-click switch between USB and wireless |
| Device info | `/overview` | Model / OS / serial / ABI / screen / memory / storage / battery / temperature / Wi-Fi / IP / CPU, plus a live screenshot |
| Mirror & control | Persistent workbench panel | scrcpy 3.3.3 with H.264 / H.265 / AV1 and optional AAC audio; swipes, multi-touch, scroll wheel, physical keyboard (UHID), two-way clipboard, recording, picture-in-picture, crop selection, multi-display and codec options, power / rotation / navigation / notification shade / screenshot |
| Files | `/files` | Browse, upload, download, rename, create, delete, details, jump to path, sort and filter, folder change watching |
| Apps | `/apps` | Filter third-party / system / enabled / disabled; read APK ranges on demand and parse the manifest and resources (name / version / permissions / icon with no helper installed); install single and split APKs and multi-user installs, uninstall with data retention, export a single APK or a split-bundle ZIP |
| Logcat | `/logcat` | Priority / tag / keyword filters, buffer multi-select (main / system / crash / radio / events / all) and PID filtering with automatic reconnect, per-entry details, exports whose header records the capture settings |
| Terminal | `/terminal` | Interactive xterm terminal with ANSI colours and responsive sizing |
| Performance | `/performance` | Self-drawn CPU / memory / FPS / network / battery charts, configurable sampling interval and cap, CSV report export |
| Processes | `/processes` | Process list with resource usage, searchable by name or PID |
| Connection & device | `/connection` | Link status, legacy TCP/IP debugging, ADB key management, reverse tunnels, host port forwarding, power actions, system settings, protocol capability panel, virtual displays, diagnostic report, demo mode, backup |
| AI assistant | `/assistant` | Bring your own OpenAI-compatible endpoint; explicit context selection, review before sending, plain-text answers, no command execution |

The UI ships in Simplified Chinese and English (following the browser language by default) with light, dark and system themes. The mirror stage, terminal and log console keep their own dedicated dark palette regardless of theme.

## Why we moved from Vue to React

Start with numbers you can verify. The archived version in `legacy/` is Vue 3 + Element Plus + plain JavaScript (`git show HEAD:package.json` still lists its dependencies): 72 source files (40 `.vue` + 32 `.js`) totalling 18,064 lines, the largest single file being 1,163 lines (`fileManage.vue`), followed by a 1,030-line `PerformancePage.vue` and a 1,012-line `home.vue`. Styling came from three places at once — Element Plus, Bootstrap 5 and Sass — charts pulled in AntV G2, and `unplugin-auto-import` / `unplugin-vue-components` injected globals implicitly. There was no TypeScript and no ESLint configuration. It did have seven `node:test` files with 69 cases, but they needed a manual esbuild pass to run, there was no `test` script in `package.json`, and nothing covered the page components or reactive state. `/package-lock.json` was explicitly gitignored and every `@yume-chan/*` dependency floated on `^`.

Each point below is phrased as requirement → what React gives us → what the old shape cost. The costs are mechanisms, not anecdotes.

### 1. Three high-frequency data sources are live at once, so render boundaries must be explicit

Mirror frame callbacks, the logcat stream and performance collectors all run concurrently on one page. React makes that boundary part of the code: streamed data goes into a `useRef` buffer and a single `setState` happens on a fixed flush interval (`useLogcatStream`); connection state lives in Zustand behind `useSyncExternalStore` so a component subscribes only to the fields it reads; every route is `lazy()` so heavy dependencies stay out of the first chunk. Vue 3's automatic dependency tracking is a genuine convenience in small components. Once a single file crosses a thousand lines with a dozen reactive sources inside, "which ref changed and what repaints because of it" has to be fenced by hand with `shallowRef` / `markRaw` — and a wrong fence costs a full page re-render.

### 2. Logic has to be testable as a unit

The rewritten layout is: `lib/adb/*` — 35 pure-function modules with no UI dependency — and `features/<page>/*` — pages, hooks and presentational components. As a result the logcat export header, the APK parser, the directory diff watcher and the forwarding address validation are all testable without a browser: 33 test files, 181 cases, one `npm test` command, wired into CI. The old layout was page-equals-logic-equals-template-equals-style, so unit-testing a rule meant dragging the component context along with it.

### 3. Unstyled primitives and theme tokens

Radix UI primitives (Dialog, Dropdown, Select, Switch, Tabs, Tooltip…) are React-first, and with Tailwind CSS 4 `@theme` tokens the app keeps only 19 base components while light and dark palettes switch through one set of CSS variables. The old version overrode Element Plus theme variables while Bootstrap was still loaded, so visual consistency got more expensive with every page. Charts moved from AntV G2 to self-drawn SVG (`MetricChart.tsx`, no charting dependency) whose line colours reference the theme tokens directly — no chart instance has to be rebuilt when the theme flips.

### 4. Rules are enforced by tooling, not by discipline

`eslint-plugin-react-hooks` v7 ships the React Compiler static checks: `set-state-in-effect` is an error, and combined with the CI `--max-warnings=0` gate, "do not call setState synchronously in an effect body" became a machine constraint rather than a wiki sentence. `max-lines: 260` and `max-lines-per-function: 160` keep the thousand-line page out of the tree before review. Equivalent Vue rules mostly police the template; how logic is organized is still up to the author.

### 5. What the rewrite bought, in numbers

| Metric | Old (Vue + JS) | New (React + TS) |
| --- | --- | --- |
| Source files / lines | 72 files (40 `.vue` + 32 `.js`) / 18,064 lines | 263 source files (262 `.ts`/`.tsx` + 1 `.css`) / 27,739 lines |
| Largest single file | 1,163 lines | 260 effective code lines, enforced by lint |
| Type checking | None | `tsc -b`, strict, clean |
| Linting | No configuration | ESLint 9 flat config, zero-warning gate |
| Automated tests | 7 `node:test` files / 69 cases, no `test` script, not in CI, zero page coverage | 33 files / 181 cases via `npm test`, inside the CI matrix |
| Dependency locking | Floating `^`, gitignored lockfile | Exact versions for core packages, lockfile committed |
| Styling sources | Element Plus + Bootstrap + Sass | Tailwind 4 tokens + Radix primitives |

### The costs we took

Dependency arrays are handwritten, `useEffect` carries more mental load than a template, JSX is wordier than `v-for` for lists, and losing auto-imports made every file start with an import block. Those costs are real. We handle them with rules instead of self-discipline: ESLint errors on dependency arrays and effect-time setState, Prettier owns formatting, and lint rejects oversized files at the merge gate.

### When you should not copy this migration

If your pages are template-driven, state stays local, and the team has already invested in a Vue component library, Vue 3 remains the cheaper option. Our premise was "concurrent streaming data + about a dozen feature pages + one person maintaining it long term"; under that premise the explicitness of React plus TypeScript pays for itself.

## Why we moved from JavaScript to TypeScript

### Benefits, each pointing at real code

- **Protocol fields stop being memorized**: `RemoteFile`, `ExecResult`, `ForwardRule`, `TcpIpState` replace `res.data.xxx` scattered across pages. ADB and scrcpy have byte layouts; field names and nullability belong in types, not comments.
- **The strict switches are all on**: beyond `strict`, we enable `noUncheckedIndexedAccess` (`entries[0]` is `RemoteFile | undefined`, so bounds handling is forced), `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`, `verbatimModuleSyntax` and `isolatedModules`. Across 263 source files, `any` appears zero times.
- **Message keys are types, not strings**: `MessageKey = keyof typeof zh` and the catalogs are declared as `Record<Locale, Record<MessageKey, string>>`, so a missing English key fails the build; `tests/i18n.test.ts` catches placeholder mismatches.
- **Unions replace runtime guessing**: `ConnectionKind = 'usb' | 'server'`, ya-webadb's `DeviceSelector`, `LinuxFileType` and friends make "how this device was reached" unique at the type level, so UI branches become exhaustively checkable.
- **One error exit**: `catch (cause: unknown)` funnels through `toErrorMessage`, which removes the class of crashes on `err.message` of an undefined error.
- **Refactoring is verifiable**: changing a service signature makes `tsc` list every call site; the old codebase relied on grep and luck.
- **Tests cannot drift from implementation**: mocking the service layer has to match the real signature, so interface drift surfaces at compile time.
- **Upstream type flaws are contained**: ya-webadb declares `Logcat.logIdToName` as returning `string`, but it is a reverse-lookup map and returns `undefined` for unknown ids. Instead of scattering `as any`, one three-line `logIdName()` helper absorbs the inconsistency.

### Costs

Some generics need documentation to read; imperfect upstream `.d.ts` files occasionally require an explicit cast; the build gained a `tsc -b` step — which is also why type checking is a separate CI step with readable output. Net of all that, TypeScript removed more rework than it added in first-week friction.

## Architecture

```plaintext
features/<page>        pages + hooks + components (the only UI layer)
        │
        ├── stores/device        Zustand: the current connection (adb / kind / server / serial) — the one mutable global
        │
        └── lib/adb/*            35 pure modules: files / packages / logcat / tcpip / forward / reverse / scrcpy …
                    │
                lib/connection/* three transports: usb (WebUSB) · bridge (WebSocket → ADB Server) · server (protocol)
                    │
                @yume-chan/adb   transport and protocol (Adb / AdbServerClient / AdbScrcpyClient)
```

- **The service layer touches neither the DOM nor React**: `lib/adb/*` takes an `Adb` instance plus parameters and returns a promise. Every capability is unit-testable on its own and pages only orchestrate and render.
- **One service layer behind all three transports**: WebUSB direct, the WebSocket bridge and a paired wireless device all yield the same `Adb` object. Only capabilities that need a host-side listener (external reverse tunnels, host port forwarding) require the ADB Server bridge — and the UI explains that instead of showing a button that cannot work.
- **Routing and chunking**: every page is `lazy()` and the mirror pane stays mounted in the workbench. `manualChunks` in `vite.config.ts` splits `react` / `ui` / `adb` by top-level package name and deliberately omits a catch-all vendor chunk, so `@zip.js`, xterm and `@tanstack/react-virtual` never leak into the eager graph. The build reports no 500 kB warning; the entry chunk is 281.60 kB (82.59 kB gzipped).
- **Cross-cutting concerns stay small**: `lib/i18n` (named-key catalogs + `useT()`) and `styles` (`@theme` tokens). Adding a page means two paired keys and one semantic colour.

## Tech stack

| Area | Choice | Version |
| --- | --- | --- |
| Framework | React | 19.3 |
| Language | TypeScript | 5.9 |
| Build / dev server | Vite | 7.3 |
| Styling | Tailwind CSS (`@theme` tokens) | 4.3 |
| Primitives | Radix UI | 1.1–2.2 |
| State | Zustand | 5.0 |
| Routing | React Router | 7.18 |
| ADB / scrcpy | ya-webadb (`adb` 2.6.4, `adb-scrcpy` 2.3.2, `android-bin` 2.1.0, `scrcpy` 2.3.0, `scrcpy-decoder-webcodecs` 2.5.3, `stream-extra` 2.6.1), pinned |
| scrcpy server | placed at `web/public/server.bin` by `scripts/prepare-scrcpy.mjs` during `npm install` | 3.3.3 |
| Terminal | xterm (`@xterm/xterm` + fit) | 5.5 |
| ZIP | `@zip.js/zip.js` | 2.24 |
| Virtualization | `@tanstack/react-virtual` | 3.14 |
| Toasts | Sonner | 2.0 |
| Icons | lucide-react | 1.66 |
| Testing | Vitest + Testing Library + jsdom | 3.2 / 16.3 / 27 |
| Code quality | ESLint 9 flat config + typescript-eslint 8 + eslint-plugin-react-hooks 7 + Prettier |  |
| Bridge | Node `ws` (localhost only) | 8.22 |

## Security boundaries

- **Device traffic stays peer-to-peer**: every ADB exchange originates in the browser; nothing is proxied through a third-party server.
- **The bridge listens on `127.0.0.1` only**: `scripts/adb-bridge.mjs` (default port 5858) is a byte pipe between a WebSocket and `127.0.0.1:5037`. It verifies three things — the request origin must be in `ADB_BRIDGE_ORIGINS`, the path must be `/adb-bridge`, and the token carried in the WS subprotocol must match the startup token with a constant-time comparison (`timingSafeEqual`). Messages are capped at 1 MB and concurrent clients at 64.
- **Never expose 5037**: the ADB Server has no authentication; the bridge exists precisely to keep it local.
- **Tokens are per-session**: a fresh token is printed on every bridge start, is pasted by hand, never written to disk and dies with the process.
- **Forwarded host ports bind to loopback**: rules created with `adb forward` are bound to `127.0.0.1` by adbd; the connection page lists them and lets you remove one or all.
- **AI assistant**: you supply the endpoint, model and key; the key lives in page memory only (never `localStorage`, gone on refresh); context is selected explicitly and shown in full before sending; answers render as plain text and are never treated as commands.
- **Destructive device actions are confirmed**: reboot / power off / recovery / bootloader / EDL / Odin, disabling TCP/IP debugging, clearing reverse tunnels or host forwards, deleting files and uninstalling apps all go through a confirmation dialog.

## Getting started

1. Clone and install:

   ```bash
   git clone https://github.com/srrchysfzy/NowWebAdb.git
   cd NowWebAdb
   npm install
   ```

   `npm install` installs the root workspace and `web/`, then runs `scripts/prepare-scrcpy.mjs`, which downloads the scrcpy 3.3.3 server into `web/public/server.bin` when it is missing.

2. Start the dev server:

   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in Chrome or Edge (`localhost` is a secure context, so WebUSB is available) and pick a connection method.

### USB direct

Enable developer options and USB debugging, connect with a data cable, choose the device in the browser prompt and accept the RSA authorization on the phone. If the device reports as busy, close other local adb clients — they contend for the same WebUSB interface.

### Wireless debugging / ADB Server bridge

Browsers cannot open TCP connections, so run the bridge locally:

```bash
adb start-server
npm run adb:bridge
```

Paste the printed session token into the Wireless / ADB Server tab on the home page. In development the default `ws://localhost:5173/adb-bridge` is proxied by Vite to the bridge on `127.0.0.1:5858`. On Android 11+ you can enter the pairing port and code shown by the phone directly; mDNS discovery is supported too, and the connection page can switch an already connected device between USB and wireless.

### Production hosting

Serve the site over HTTPS — browsers refuse WebUSB otherwise. Start the bridge with TLS and a tightened origin allowlist:

```bash
ADB_BRIDGE_CERT=/path/fullchain.pem ADB_BRIDGE_KEY=/path/privkey.pem \
ADB_BRIDGE_ORIGINS=https://adb.example.com npm run adb:bridge
```

```bash
npm run build && npm run preview
```

### Language and theme

The language and theme menus sit in the top-right of the home page, and choices persist locally (`nowwebadb.locale`, `nowwebadb.theme`). Language follows the browser and theme follows the system by default, with no flash on first paint.

When adding copy, add the same key to the matching module under `web/src/lib/i18n/messages/zh/` and `.../en/`; the type check and `npm test` reject missing keys, duplicates and placeholder mismatches.

## Conventions and quality gates

```bash
npm run typecheck   # tsc -b, strict everything
npm run lint        # eslint . --max-warnings=0
npm test            # vitest run: 33 files / 181 cases
npm run build       # tsc -b && vite build
```

`.github/workflows/ci.yml` runs those four steps on Node.js 20, 22 and 24, and any warning fails the build. The constraints that are actually enforced:

- At most 260 effective code lines per file and 160 per function (i18n catalogs are exempt).
- `react-hooks/set-state-in-effect` is an error: state updates come from event handlers, async continuations or DOM callbacks. "Latest options" are kept in a ref, and effect dependencies list only the values that must restart a stream.
- Service modules do not import React; UI components never assemble ADB request strings. User input is allow-list validated before it enters a protocol string.
- Every user-facing string goes through `t()`, with the zh/en key sets guaranteed by both the type system and tests.

## Project layout

```plaintext
NowWebAdb
├── .github/workflows/ci.yml   # typecheck / lint / test / build on Node 20·22·24
├── web                        # the current app (React + TypeScript)
│   ├── public/server.bin      # scrcpy 3.3.3 server, prepared by npm install
│   ├── src
│   │   ├── components         # layout + 19 base UI components
│   │   ├── features           # 11 feature directories: page + hooks + components + pure utils
│   │   ├── lib                # adb (35 modules) · connection · apk · ai · i18n · theme · utils
│   │   ├── stores             # Zustand device connection state
│   │   ├── styles             # design tokens and global styles
│   │   ├── router.tsx         # lazy routes behind a RequireDevice guard
│   │   └── main.tsx
│   ├── tests                  # Vitest + Testing Library
│   ├── eslint.config.js       # flat config: line caps, hooks rules, React Compiler
│   └── vite.config.ts         # HTTPS, bridge proxy, manualChunks
├── scripts
│   ├── adb-bridge.mjs         # localhost only: WebSocket → 127.0.0.1:5037
│   └── prepare-scrcpy.mjs
├── legacy                     # archived Vue 3 + Element Plus version, excluded from the build
├── package.json               # root scripts delegating to web/, plus bridge dependencies
└── README.md / README-CN.md
```

## Known limitations

- Desktop Chrome or Edge in a secure context (`https://` or `localhost`); WebUSB and WebCodecs are hard requirements.
- A device is held by one client at a time: the browser and a local adb instance contend for it.
- scrcpy AAC audio needs a user gesture to start mirroring; even when the browser cannot decode, the audio stream is drained so video does not stall.
- Folder change watching is a `readdir` diff every 15 seconds — ya-webadb exposes no inotify primitive, so it is polling, not events.
- Host port forwarding and external reverse tunnels require the ADB Server bridge; a WebUSB direct connection has no host port to bind, and the connection page says so.
- Forward rules address the device through ya-webadb's `host-serial:<serial>:<command>` service name, so serials containing a colon (wireless `ip:port`) depend on the same escaping convention and have not been verified on hardware.
- Advanced mirror options (camera, virtual displays, codec combinations) and real-device logcat buffer / PID behaviour still need per-model regression.

## Credits and license

This project stands on:

- [ya-webadb](https://github.com/yume-chan/ya-webadb) — Android device protocols in the browser
- [scrcpy](https://github.com/genymobile/scrcpy) — mirroring protocol and server
- [React](https://react.dev), [Vite](https://vitejs.dev), [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com), [lucide](https://lucide.dev)
- [xterm.js](https://xtermjs.org), [zip.js](https://gildas-lormeau.github.io/zip.js/), [TanStack Virtual](https://tanstack.com/virtual)

GPL-3.0
