export const DEFAULT_SETTINGS = Object.freeze({
    maxSize: 1080,
    maxFps: 60,
    videoBitRate: 8000000,
    videoCodec: 'h264',
    displayId: 0,
    powerOn: true,
    audio: false,
    audioCodec: 'aac',
    control: true,
    tunnelForward: true,
});

export function normalizeScrcpySettings(value = {}) {
    const integer = (key, min, max) => {
        const number = Number(value[key] ?? DEFAULT_SETTINGS[key]);
        if (!Number.isInteger(number) || number < min || number > max) {
            throw new Error(`${key} 必须是 ${min}–${max} 之间的整数`);
        }
        return number;
    };
    if (!['h264', 'h265', 'av1'].includes(value.videoCodec ?? DEFAULT_SETTINGS.videoCodec)) {
        throw new Error('不支持的视频编码');
    }
    return {
        ...DEFAULT_SETTINGS,
        maxSize: integer('maxSize', 0, 8192),
        maxFps: integer('maxFps', 1, 240),
        videoBitRate: integer('videoBitRate', 100000, 100000000),
        videoCodec: value.videoCodec ?? DEFAULT_SETTINGS.videoCodec,
        audio: value.audio === true,
    };
}
