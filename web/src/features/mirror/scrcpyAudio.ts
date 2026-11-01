import type { AdbScrcpyAudioStreamMetadata } from '@yume-chan/adb-scrcpy';
import type { ScrcpyMediaStreamPacket } from '@yume-chan/scrcpy';
import { WritableStream } from '@yume-chan/stream-extra';
import { t } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';
import { ScrcpyAudioPlayer } from './scrcpyAudioPlayer';

/**
 * Plays the device audio stream (AAC) and drains it when audio isn't supported,
 * so the shared transport never stalls.
 */
export async function setupAudioStream(
  metadataPromise: Promise<AdbScrcpyAudioStreamMetadata> | undefined,
  signal: AbortSignal,
  onStatus: (text: string) => void,
  setPlayer: (player: ScrcpyAudioPlayer | undefined) => void,
): Promise<void> {
  if (!metadataPromise) return;
  let player: ScrcpyAudioPlayer | undefined;
  const publish = (next: ScrcpyAudioPlayer | undefined) => {
    player = next;
    setPlayer(next);
  };
  try {
    const metadata = await metadataPromise;
    if (signal.aborted) {
      if (metadata.type === 'success') await metadata.stream.cancel().catch(() => undefined);
      return;
    }
    if (metadata.type !== 'success') {
      onStatus(metadata.type === 'disabled'
        ? t('mirror.audioStream.disabled')
        : t('mirror.audioStream.startFailed'));
      return;
    }
    const codec = metadata.codec.optionValue;
    if (ScrcpyAudioPlayer.isSupported && ScrcpyAudioPlayer.supports(codec)) {
      try {
        publish(new ScrcpyAudioPlayer(codec, status => {
          if (!signal.aborted) onStatus(status);
        }));
      } catch (error) {
        onStatus(t('mirror.session.audioUnavailable', { error: toErrorMessage(error) }));
      }
    } else {
      onStatus(codec === 'raw' ? t('mirror.audioStream.rawUnsupported') : t('mirror.audioStream.decodeUnsupported'));
    }
    await metadata.stream.pipeTo(
      new WritableStream<ScrcpyMediaStreamPacket>({ write: packet => player?.write(packet) }),
      { signal },
    );
    if (!signal.aborted) onStatus(t('mirror.audioStream.ended'));
  } catch (error) {
    if (!signal.aborted) onStatus(t('mirror.audioStream.error', { error: toErrorMessage(error) }));
  } finally {
    const current = player;
    publish(undefined);
    await current?.dispose().catch(() => undefined);
  }
}
