import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  describeAdbKey,
  exportKeyFilename,
  generateAdbKey,
  parsePrivateKey,
  type AdbKeyDetails,
} from '@/lib/adb/adbKey';
import { addStoredKey, listStoredKeys } from '@/lib/connection/credentials';
import { t } from '@/lib/i18n';
import { saveToDisk } from '@/lib/utils/download';
import { toErrorMessage } from '@/lib/utils/format';

export interface AdbKeyEntry extends AdbKeyDetails {
  index: number;
}

export interface AdbKeysController {
  entries: AdbKeyEntry[] | null;
  error: string;
  busy: boolean;
  refresh: () => void;
  generate: () => void;
  importFile: (file: File) => void;
  exportKey: (entry: AdbKeyEntry) => void;
  copyPublicKey: (entry: AdbKeyEntry) => void;
}

export function shortFingerprint(fingerprint: string): string {
  const parts = fingerprint.split(':');
  return parts.length > 4 ? `${parts.slice(0, 2).join(':')}…${parts.slice(-2).join(':')}` : fingerprint;
}

export function useAdbKeys(): AdbKeysController {
  const [entries, setEntries] = useState<AdbKeyEntry[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    void listStoredKeys()
      .then(async keys => {
        const described = await Promise.all(
          keys.map(async (key, index): Promise<AdbKeyEntry | null> => {
            try {
              return { ...(await describeAdbKey(key)), index };
            } catch {
              return null;
            }
          }),
        );
        setEntries(described.filter((entry): entry is AdbKeyEntry => entry !== null));
        setError('');
      })
      .catch(cause => setError(toErrorMessage(cause)));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = useCallback(
    (task: () => Promise<string>) => {
      setBusy(true);
      void task()
        .then(message => {
          toast.success(message);
          refresh();
        })
        .catch(cause => toast.error(toErrorMessage(cause)))
        .finally(() => setBusy(false));
    },
    [refresh],
  );

  const generate = useCallback(() => {
    run(async () => {
      const key = await generateAdbKey();
      await addStoredKey(key.privateKey);
      return t('connection.keys.generated', { fingerprint: shortFingerprint(key.fingerprint) });
    });
  }, [run]);

  const importFile = useCallback(
    (file: File) => {
      run(async () => {
        const pkcs8 = parsePrivateKey(new Uint8Array(await file.arrayBuffer()));
        const key = await describeAdbKey(pkcs8);
        await addStoredKey(pkcs8);
        return t('connection.keys.imported', { fingerprint: shortFingerprint(key.fingerprint) });
      });
    },
    [run],
  );

  const exportKey = useCallback((entry: AdbKeyEntry) => {
    saveToDisk(new Blob([entry.privatePem], { type: 'application/x-pem-file' }), exportKeyFilename(entry));
  }, []);

  const copyPublicKey = useCallback((entry: AdbKeyEntry) => {
    if (!navigator.clipboard) {
      toast.error(t('connection.keys.clipboardUnavailable'));
      return;
    }
    void navigator.clipboard
      .writeText(entry.publicKey)
      .then(() => toast.success(t('connection.keys.publicCopied')))
      .catch(() => toast.error(t('connection.keys.copyFailed')));
  }, []);

  return { entries, error, busy, refresh, generate, importFile, exportKey, copyPublicKey };
}
