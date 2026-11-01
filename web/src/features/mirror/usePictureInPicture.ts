import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { toast } from 'sonner';
import { toErrorMessage } from '@/lib/utils/format';
import { t } from '@/lib/i18n';

export interface PictureInPicture {
  active: boolean;
  toggle: () => void;
}

export function usePictureInPicture(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  fps: number,
  ready: boolean,
): PictureInPicture {
  const [active, setActive] = useState(false);
  const streamRef = useRef<MediaStream | undefined>(undefined);

  const release = useCallback(() => {
    const video = videoRef.current;
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = undefined;
    if (video) {
      video.srcObject = null;
      video.pause();
    }
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnter = () => setActive(true);
    const onLeave = () => {
      setActive(false);
      release();
    };
    video.addEventListener('enterpictureinpicture', onEnter);
    video.addEventListener('leavepictureinpicture', onLeave);
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnter);
      video.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, [release, videoRef]);

  useEffect(() => {
    if (ready) return;
    if (document.pictureInPictureElement) void document.exitPictureInPicture().catch(() => undefined);
    release();
  }, [ready, release]);

  useEffect(() => () => {
    if (document.pictureInPictureElement) void document.exitPictureInPicture().catch(() => undefined);
    release();
  }, [release]);

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      void document.exitPictureInPicture().catch(cause => toast.error(t('mirror.pip.exitFailed', { error: toErrorMessage(cause) })));
      return;
    }
    if (typeof video.requestPictureInPicture !== 'function' || !document.pictureInPictureEnabled) {
      toast.error(t('mirror.pip.unsupported'));
      return;
    }
    void (async () => {
      try {
        if (!streamRef.current) {
          const canvas = canvasRef.current;
          if (!canvas || typeof canvas.captureStream !== 'function') throw new Error(t('mirror.session.screenNotReady'));
          streamRef.current = canvas.captureStream(fps);
          video.srcObject = streamRef.current;
          await video.play();
        }
        await video.requestPictureInPicture();
      } catch (cause) {
        toast.error(t('mirror.pip.enterFailed', { error: toErrorMessage(cause) }));
        release();
      }
    })();
  }, [canvasRef, fps, release, videoRef]);

  return { active, toggle };
}
