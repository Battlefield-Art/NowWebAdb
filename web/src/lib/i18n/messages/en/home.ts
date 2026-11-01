import type { homeZh } from '../zh/home';

export const homeEn: Record<keyof typeof homeZh, string> = {
  'home.page.insecure': 'HTTPS or localhost required',
  'home.page.workspace': 'Back to workspace',
  'home.page.connectTitle': 'Connect device',
  'home.page.connectSubtitle': 'Choose a connection method to start managing the workspace.',
  'home.page.tabUsb': 'Direct USB',
  'home.page.tabBridge': 'Bridge service',
  'home.page.footer':
    'Keys and bridge tokens stay in this browser only. Every operation goes directly to the device, never through a third-party server.',
  'home.page.footerVersion': 'NowWebAdb · React + TypeScript rewrite',
  'home.page.toast.saveFailed': 'Device connected, but the browser blocked saving the device record',
  'home.page.status.connecting': 'Connecting… Unlock the phone and confirm the USB debugging prompt.',
  'home.page.status.pickUsb': 'Select the device in the browser dialog and complete authorization…',
  'home.device.android': 'Android device',

  'home.intro.line1': 'In your browser,',
  'home.intro.line2': 'turn an Android device',
  'home.intro.highlight': 'into a workspace',
  'home.intro.lead':
    'App management, file browsing, logs, terminal, screen mirroring and performance monitoring. Every operation goes directly to the device, never through a third-party server.',
  'home.intro.usb.title': 'Direct USB',
  'home.intro.usb.body':
    'Talk to the on-device ADB daemon over WebUSB; no desktop client needed.',
  'home.intro.bridge.title': 'Local bridge',
  'home.intro.bridge.body':
    'Connect to the local ADB Server bridge and reuse authorized wireless devices and ports.',
  'home.intro.credentials.title': 'Credentials stay local',
  'home.intro.credentials.body':
    'ADB keys live in this site’s IndexedDB; the bridge only allows localhost or WSS.',

  'home.usb.title': 'Direct USB',
  'home.usb.available': 'WebUSB available',
  'home.usb.unsupported': 'Browser unsupported',
  'home.usb.lead': 'Requires Chrome / Edge, and USB debugging authorization on the phone.',
  'home.usb.refresh': 'Refresh devices',
  'home.usb.emptyTitle': 'No USB device selected yet',
  'home.usb.emptyHint': 'Click the button below and authorize the device in the browser dialog.',
  'home.usb.pick': 'Select USB device',
  'home.usb.connectLast': 'Connect last device',
  'home.usb.switchBridge': 'Use bridge service',
  'home.usb.autoConnectAria': 'Auto-connect the only device',
  'home.usb.autoConnect': 'Auto-connect the only device when opening the page',
  'home.usb.clear': 'Clear local credentials',
  'home.usb.clearTitle': 'Clear local ADB credentials?',
  'home.usb.clearDescription':
    'This deletes every USB ADB key and device record saved by this site. The next connection requires authorizing the phone again; no data on the phone is deleted.',
  'home.usb.clearing': 'Clearing…',
  'home.usb.clearConfirm': 'Clear credentials',
  'home.usb.cleared': 'Cleared {count} local keys',
  'home.usb.clearFailed': 'Failed to clear credentials',
  'home.usb.busy':
    'The USB device is exclusively held by another program (often a local adb.exe, Android Studio, a phone assistant or another tab). Close the program and retry, or connect through the bridge service.',
  'home.usb.denied': 'No device was selected or the browser denied USB access. Please authorize again.',
  'home.usb.unsupportedError': 'This browser does not support WebUSB. Use Chrome or Edge.',

  'home.bridge.title': 'ADB Server bridge',
  'home.bridge.lead':
    'Connect to the local ADB bridge program to use already-authorized USB and wireless devices.',
  'home.bridge.refreshAria': 'Read devices',
  'home.bridge.urlLabel': 'Bridge URL',
  'home.bridge.urlHint':
    'Defaults to the same-origin /adb-bridge. HTTPS pages must use WSS; non-local addresses must be encrypted.',
  'home.bridge.tokenLabel': 'Session token',
  'home.bridge.tokenHint':
    'Printed by the bridge program in its terminal; kept in memory for this page only.',
  'home.bridge.tokenPlaceholder': '32-128 letters, digits, underscores or hyphens',
  'home.bridge.readDevices': 'Read device list',
  'home.bridge.scopeNote': 'The bridge URL and token apply only to this page session.',
  'home.bridge.status.reading': 'Reading ADB Server devices…',
  'home.bridge.status.opening': 'Opening device…',
  'home.bridge.status.reconnecting': 'Reconnecting {serial}…',
  'home.bridge.status.disconnecting': 'Disconnecting {serial}…',
  'home.bridge.error.invalidUrl': 'Enter a valid bridge URL',
  'home.bridge.error.urlProtocol':
    'The bridge URL must be a ws:// or wss:// address without username, password or query parameters',
  'home.bridge.error.httpsWss': 'HTTPS pages must use WSS; local development can use the same-origin proxy below',
  'home.bridge.error.wssRequired': 'A non-local bridge must use WSS encryption',
  'home.bridge.error.invalidAddress': 'Enter the device IP:port (use [address]:port for IPv6)',
  'home.bridge.error.invalidToken': 'Enter the session token printed by the local bridge terminal',
  'home.bridge.error.closed': 'Bridge connection closed',
  'home.bridge.error.cancelled': 'Connection cancelled',
  'home.bridge.error.timeout': 'Bridge connection timed out. Check the bridge program, certificate, origin allowlist and token.',
  'home.bridge.error.notBinary': 'The bridge returned non-binary data',
  'home.bridge.error.queueFull': 'Bridge receive queue is full; disconnected to avoid running out of memory',
  'home.bridge.error.unreachable':
    'Cannot reach the ADB bridge. Check that the program is running, and that the token and allowed origins are correct.',
  'home.bridge.error.closedBeforeOpen': 'The ADB bridge closed before the connection was established',
  'home.bridge.error.unexpectedClose': 'The ADB bridge disconnected unexpectedly',
  'home.bridge.error.alreadyClosed': 'The ADB bridge connection is closed',
  'home.bridge.error.reverseTunnel': 'The WebSocket bridge does not support reverse tunnels; use tunnelForward',

  'home.serverMeta.info': 'ADB Server {version} · {count} host features',
  'home.serverMeta.notLoaded': 'Server information not read yet',
  'home.serverMeta.autoTrack': 'Auto-track device changes',

  'home.serverDevice.state.available': 'Available',
  'home.serverDevice.state.unauthorized': 'Unauthorized',
  'home.serverDevice.state.offline': 'Offline',
  'home.serverDevice.featuresAria': 'View features of {serial}',
  'home.serverDevice.featuresTitle': 'View ADB Server side device features',
  'home.serverDevice.disconnectAria': 'Disconnect {serial}',
  'home.serverDevice.disconnectTitle': 'Disconnect wireless device',
  'home.serverDevice.reconnectAria': 'Reconnect {serial}',
  'home.serverDevice.reconnectTitle': 'Ask ADB Server to reconnect this device',
  'home.serverDevice.empty': 'No devices found',
  'home.serverDevice.notLoaded': 'Device list not read yet',
  'home.serverDevice.emptyHint': 'Make sure ADB Server is running and a phone is connected.',
  'home.serverDevice.loadHint': 'Enter the bridge URL and token, then read devices.',

  'home.serverFeatures.title': 'Device features',
  'home.serverFeatures.description': '{serial} · features ADB Server negotiated for this transport',
  'home.serverFeatures.loading': 'Reading device features…',
  'home.serverFeatures.empty': 'This device reported no features.',
  'home.serverFeatures.note':
    'Features are negotiated by the Server side transport and may differ slightly from the connection-side features on the Protocol capabilities page.',

  'home.serverMaintenance.title': 'Server maintenance',
  'home.serverMaintenance.lead':
    'Reconnect offline transports or stop the local ADB Server. Stopping affects every tool using that Server.',
  'home.serverMaintenance.reconnect': 'Reconnect offline devices',
  'home.serverMaintenance.stop': 'Stop Server',
  'home.serverMaintenance.reconnecting': 'Reconnecting all offline devices…',
  'home.serverMaintenance.stopping': 'Stopping ADB Server…',
  'home.serverMaintenance.reconnected': 'Asked ADB Server to reconnect offline devices',
  'home.serverMaintenance.stopped': 'ADB Server stopped. Run adb start-server again, then refresh.',
  'home.serverMaintenance.stopTitle': 'Stop the local ADB Server?',
  'home.serverMaintenance.stopDescription':
    'This runs adb kill-server, disconnecting every ADB client attached to this Server, including other tools. You must start ADB Server manually afterwards.',

  'home.server.error.invalidSerial': 'Invalid device serial',
  'home.server.error.network': 'ADB Server network error: {message}',
  'home.server.error.unauthorized':
    'ADB Server rejected the bridge token or origin. Check the token and the origin allowlist.',
  'home.server.error.alreadyConnected': 'The device is already connected; no need to connect again.',
  'home.server.error.pairCode': 'The pairing code must be 6 digits',

  'home.spin.dismiss': 'Dismiss error',

  'home.wireless.title': 'Wireless debugging',
  'home.wireless.lead':
    'Pair in the phone’s Wireless debugging screen to connect automatically; pair once, then connect directly by IP:port.',
  'home.wireless.serviceCount': '{count} services',
  'home.wireless.serviceCount.one': '{count} service',
  'home.wireless.discover': 'Discover / refresh devices',
  'home.wireless.discoverHint': 'Read the pairing and connect addresses advertised over mDNS',
  'home.wireless.pairAddress': 'Pairing address',
  'home.wireless.pairCode': 'Pairing code',
  'home.wireless.pairCodePlaceholder': '6-digit code',
  'home.wireless.pair': 'Pair and connect',
  'home.wireless.addressLabel': 'Connect address',
  'home.wireless.connect': 'Connect device',
  'home.wireless.note.mdnsUnsupported':
    'This ADB Server does not support mDNS discovery. Upgrade the local ADB version, or enter the address and pairing code manually.',
  'home.wireless.note.notFound':
    'No services found. Make sure the phone and computer are on the same LAN and wireless debugging is on.',
  'home.wireless.status.connecting': 'Connecting wireless device…',
  'home.wireless.toast.connected': 'Connected {address}',
  'home.wireless.toast.notReady':
    'Connection requested, but {address} is not ready yet. Check device authorization or refresh later.',
  'home.wireless.status.pairing': 'Pairing wireless debugging…',
  'home.wireless.note.mdnsFailed':
    'Paired successfully, but mDNS discovery failed. Enter the IP:port shown on the phone’s Wireless debugging screen manually.',
  'home.wireless.note.noConnectService':
    'Paired successfully, but no connect port was found yet. Check the IP:port on the phone’s wireless debugging screen and connect manually.',
  'home.wireless.toast.paired': 'Paired successfully',
  'home.wireless.toast.pairedConnected': 'Paired and connected {address}',
  'home.wireless.note.pairedStarting':
    'Paired successfully; {address} is coming online. You can click “Connect device” shortly.',
  'home.wireless.toast.pairedNotReady': 'Paired successfully, but the device is not ready yet',
  'home.wireless.note.pairedConnectFailed':
    'Paired successfully, but automatic connection failed: {error}. Click “Connect device” to retry.',
  'home.wireless.toast.pairedConnectFailed': 'Paired successfully, but automatic connection failed',
  'home.wireless.status.discovering': 'Discovering wireless debugging services…',
  'home.wireless.status.disconnecting': 'Disconnecting wireless device…',
  'home.wireless.toast.disconnected': 'Disconnected {address}',
  'home.wireless.note.pairAddressFilled':
    'Pairing address filled in. Find the 6-digit code under Wireless debugging → Pair device with pairing code on the phone.',
  'home.wireless.note.connectAddressFilled': 'Connect address filled in; you can connect directly.',
  'home.wireless.error.code':
    'The pairing code is wrong or expired. Reopen “Pair device with pairing code” on the phone and enter the latest 6-digit code.',
  'home.wireless.error.unreachable':
    'Cannot reach the pairing port. Make sure the phone and computer are on the same LAN and keep the pairing dialog open.',
  'home.wireless.error.unsupported':
    'This ADB Server does not support wireless pairing. Upgrade platform-tools and restart ADB Server.',
  'home.wireless.error.failed': 'Pairing failed; please try again later',

  'home.mdns.kind.pairing': 'Pairing',
  'home.mdns.kind.connect': 'Connect',
  'home.mdns.kind.other': 'Other',
  'home.mdns.fill': 'Use',

  'home.task.cancelled': 'Operation cancelled',
  'home.task.timeout':
    'Operation timed out. Check device authorization, the connection address and the bridge service, then retry.',

  'home.credentials.error.open': 'Cannot open the credential store',
  'home.credentials.error.blocked': 'The credential store is held by another tab. Close it and retry.',
  'home.credentials.error.operation': 'Credential store operation failed',
  'home.credentials.error.transaction': 'Credential store transaction failed',
  'home.credentials.error.aborted': 'Credential store transaction was cancelled',
};
