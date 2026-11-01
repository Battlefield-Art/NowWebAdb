import { Cable, ShieldCheck, Smartphone } from 'lucide-react';
import { useT } from '@/lib/i18n';

const POINTS = [
  {
    icon: Smartphone,
    titleKey: 'home.intro.usb.title',
    bodyKey: 'home.intro.usb.body',
  },
  {
    icon: Cable,
    titleKey: 'home.intro.bridge.title',
    bodyKey: 'home.intro.bridge.body',
  },
  {
    icon: ShieldCheck,
    titleKey: 'home.intro.credentials.title',
    bodyKey: 'home.intro.credentials.body',
  },
] as const;

export function IntroPanel() {
  const t = useT();
  return (
    <section className="flex flex-col justify-between gap-10 py-2">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-semibold text-muted">
          <span className="size-1.5 rounded-full bg-accent" />
          NowWebAdb / Browser ADB Workspace
        </div>
        <h1 className="mt-6 max-w-[560px] text-[34px] font-[760] leading-[1.15] tracking-[-0.03em] text-ink sm:text-[42px]">
          {t('home.intro.line1')}
          <br />
          {t('home.intro.line2')}
          <span className="relative ml-1 whitespace-nowrap">
            {t('home.intro.highlight')}
            <span className="absolute inset-x-0 -bottom-1 h-[3px] rounded-full bg-accent/80" />
          </span>
        </h1>
        <p className="mt-5 max-w-[480px] text-[13px] leading-relaxed text-muted">
          {t('home.intro.lead')}
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {POINTS.map(({ icon: Icon, titleKey, bodyKey }, index) => (
          <li
            key={titleKey}
            className="rounded-[12px] border border-line bg-surface/80 p-3.5 transition-colors hover:border-line-strong"
          >
            <div className="flex items-center justify-between">
              <Icon className="size-4 text-accent" strokeWidth={2.1} />
              <span className="font-mono text-[10px] font-semibold text-muted-2">0{index + 1}</span>
            </div>
            <p className="mt-3 text-[12.5px] font-semibold text-ink">{t(titleKey)}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{t(bodyKey)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
