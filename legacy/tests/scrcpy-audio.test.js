import test from 'node:test';
import assert from 'node:assert/strict';
import { ScrcpyAudioPlayer } from '../src/pages/scrcpyShow/ScrcpyAudio.js';

function mockAudio(t) {
    const originals = { AudioDecoder: globalThis.AudioDecoder, AudioContext: globalThis.AudioContext, EncodedAudioChunk: globalThis.EncodedAudioChunk };
    const counts = { decode: 0, start: 0, stop: 0, close: 0, dataClose: 0 };
    class Context {
        state = 'suspended';
        currentTime = 0;
        destination = {};
        async resume() { this.state = 'running'; this.onstatechange?.(); }
        async close() { this.state = 'closed'; counts.close++; }
        createBuffer(channels, frames, sampleRate) { return { duration: frames / sampleRate, getChannelData: () => new Float32Array(frames) }; }
        createBufferSource() { return { connect() {}, disconnect() {}, start() { counts.start++; }, stop() { counts.stop++; } }; }
    }
    class Decoder {
        static supported = true;
        static async isConfigSupported() { return { supported: Decoder.supported }; }
        state = 'unconfigured';
        decodeQueueSize = 0;
        constructor(callbacks) { this.callbacks = callbacks; }
        configure(config) { this.config = config; this.state = 'configured'; }
        decode() { counts.decode++; }
        close() { this.state = 'closed'; }
    }
    globalThis.AudioContext = Context;
    globalThis.AudioDecoder = Decoder;
    globalThis.EncodedAudioChunk = class { constructor(init) { Object.assign(this, init); } };
    t.after(() => {
        for (const [name, original] of Object.entries(originals)) {
            if (original === undefined) delete globalThis[name]; else globalThis[name] = original;
        }
    });
    return { counts, Decoder, frame: () => ({ numberOfChannels: 2, numberOfFrames: 960, sampleRate: 48000, copyTo() {}, close() { counts.dataClose++; } }) };
}

test('AAC playback waits for user resume, bounds decoder/scheduler queues, and cleans up', async (t) => {
    const { counts, frame } = mockAudio(t);
    const statuses = [];
    const player = new ScrcpyAudioPlayer((status) => statuses.push(status));
    const config = new Uint8Array([0x11, 0x90]);
    await player.write({ type: 'configuration', data: config });
    assert.equal(player.decoder.config.codec, 'mp4a.40.2');
    assert.equal(player.decoder.config.description, config);
    await player.write({ type: 'data', data: new Uint8Array(1), pts: 0n });
    assert.equal(counts.decode, 0);
    await player.resume();
    await player.write({ type: 'data', data: new Uint8Array(1), pts: 20000n });
    assert.equal(counts.decode, 1);
    player.decoder.decodeQueueSize = 8;
    await player.write({ type: 'data', data: new Uint8Array(1), pts: 40000n });
    assert.equal(counts.decode, 1);
    for (let index = 0; index < 100; index++) player.play(frame());
    assert.ok(counts.start <= 16);
    assert.ok(player.nextTime < 0.30);
    assert.equal(counts.dataClose, 100);
    await player.dispose();
    await player.dispose();
    assert.equal(counts.stop, counts.start);
    assert.equal(counts.close, 1);
    assert.equal(player.decoder.state, 'closed');
    assert.match(statuses.join('\n'), /音频播放中/);
});

test('unsupported audio is reported, closed, and subsequent packets are safely drained', async (t) => {
    const { Decoder, counts } = mockAudio(t);
    Decoder.supported = false;
    let status;
    const player = new ScrcpyAudioPlayer((value) => { status = value; });
    await player.write({ type: 'configuration', data: new Uint8Array(2) });
    await player.write({ type: 'data', data: new Uint8Array(1) });
    assert.match(status, /不支持 AAC/);
    assert.equal(player.closed, true);
    assert.equal(counts.close, 1);
    assert.equal(counts.decode, 0);
});
