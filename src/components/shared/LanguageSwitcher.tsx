
'use client';

import { useTranslations } from '@/contexts/LocalizationContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import type { SupportedLocale } from '@/lib/locale-utils';

export function LanguageSwitcher() {
  const { locale, setLocale, supportedLocales, t } = useTranslations();

  const languages: { code: SupportedLocale; nameKey: string }[] = [
    { code: 'en', nameKey: 'languageSwitcher.en' },
    { code: 'es', nameKey: 'languageSwitcher.es' },
    { code: 'pt', nameKey: 'languageSwitcher.pt' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('languageSwitcher.selectLanguage')}>
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          supportedLocales.includes(lang.code) && (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLocale(lang.code)}
              className={locale === lang.code ? 'font-semibold bg-accent' : ''}
            >
              {t(lang.nameKey)}
            </DropdownMenuItem>
          )
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
