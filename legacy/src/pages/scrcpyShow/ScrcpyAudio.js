export class ScrcpyAudioPlayer {
    static get isSupported() {
        return typeof globalThis.AudioDecoder !== 'undefined' && typeof globalThis.AudioContext !== 'undefined';
    }

    constructor(onStatus) {
        this.onStatus = onStatus;
        this.sources = new Set();
        this.nextTime = 0;
        this.closed = false;
        this.failed = false;
        this.context = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
        this.context.onstatechange = () => {
            if (!this.closed && !this.failed) {
                this.onStatus(this.context.state === 'running' ? '音频播放中' : '点击“播放音频”以启用声音');
            }
        };
        try {
            this.decoder = new AudioDecoder({
                output: (data) => this.play(data),
                error: (error) => this.fail(error),
            });
        } catch (error) {
            this.context.onstatechange = null;
            void this.context.close().catch((cleanupError) => console.warn('Audio cleanup:', cleanupError));
            throw error;
        }
        this.onStatus('点击“播放音频”以启用声音');
    }

    fail(error) {
        if (this.closed || this.failed) return;
        this.failed = true;
        this.onStatus(`音频不可用: ${error.message || error}`);
        void this.dispose().catch((cleanupError) => console.warn('Audio cleanup:', cleanupError));
    }

    async write(packet) {
        if (this.closed || this.failed) return;
        try {
            if (packet.type === 'configuration') {
                const config = { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, description: packet.data };
                const support = await AudioDecoder.isConfigSupported(config);
                if (this.closed) return;
                if (!support.supported) throw new Error('浏览器不支持 AAC 解码');
                this.decoder.configure(config);
            } else if (this.decoder.state === 'configured' && this.context.state === 'running' && this.decoder.decodeQueueSize < 8) {
                this.decoder.decode(new EncodedAudioChunk({
                    type: 'key',
                    timestamp: Number(packet.pts ?? 0n),
                    data: packet.data,
                }));
            }
        } catch (error) {
            this.fail(error);
        }
    }

    play(data) {
        try {
            if (this.closed || this.context.state !== 'running') return;
            const now = this.context.currentTime;
            // Drop excess frames instead of accumulating latency or suspended audio.
            if (this.nextTime > now + 0.25 || this.sources.size >= 16) return;
            const buffer = this.context.createBuffer(data.numberOfChannels, data.numberOfFrames, data.sampleRate);
            for (let planeIndex = 0; planeIndex < data.numberOfChannels; planeIndex++) {
                data.copyTo(buffer.getChannelData(planeIndex), { planeIndex, format: 'f32-planar' });
            }
            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.context.destination);
            this.sources.add(source);
            source.onended = () => { source.disconnect(); this.sources.delete(source); };
            const when = Math.max(now + 0.015, this.nextTime);
            source.start(when);
            this.nextTime = when + buffer.duration;
        } catch (error) {
            this.fail(error);
        } finally {
            data.close();
        }
    }

    async resume() {
        if (this.closed) throw new Error('音频未就绪，请重新连接');
        await this.context.resume();
    }

    async dispose() {
        if (this.closed) return;
        this.closed = true;
        this.context.onstatechange = null;
        if (this.decoder.state !== 'closed') this.decoder.close();
        for (const source of this.sources) {
            source.onended = null;
            try { source.stop(); } catch (error) { console.warn('Audio source cleanup:', error); }
            source.disconnect();
        }
        this.sources.clear();
        await this.context.close();
    }
}
