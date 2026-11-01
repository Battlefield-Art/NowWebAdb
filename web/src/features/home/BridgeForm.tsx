import { Cable } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';

export interface BridgeFormProps {
  url: string;
  token: string;
  busy: boolean;
  onUrlChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onRefresh: () => void;
}

export function BridgeForm({ url, token, busy, onUrlChange, onTokenChange, onRefresh }: BridgeFormProps) {
  const t = useT();
  return (
    <>
      <div className="grid gap-3">
        <Field
          label={t('home.bridge.urlLabel')}
          htmlFor="bridge-url"
          hint={t('home.bridge.urlHint')}
        >
          <Input
            id="bridge-url"
            value={url}
            onChange={event => onUrlChange(event.target.value)}
            placeholder="ws://127.0.0.1:5038"
            spellCheck={false}
            className="font-mono text-[11.5px]"
          />
        </Field>
        <Field
          label={t('home.bridge.tokenLabel')}
          htmlFor="bridge-token"
          hint={t('home.bridge.tokenHint')}
        >
          <Input
            id="bridge-token"
            type="password"
            value={token}
            onChange={event => onTokenChange(event.target.value)}
            placeholder={t('home.bridge.tokenPlaceholder')}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="lg" disabled={busy} onClick={onRefresh}>
          <Cable />
          {t('home.bridge.readDevices')}
        </Button>
        <span className="text-[11px] text-muted">{t('home.bridge.scopeNote')}</span>
      </div>
    </>
  );
}
