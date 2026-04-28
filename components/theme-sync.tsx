'use client';

import { useEffect } from 'react';
import { useAssistMyDayStore } from '@/lib/assistmyday-store';

export function ThemeSync() {
  const themeMode = useAssistMyDayStore((s: any) => s.appPreferences?.themeMode ?? 'system');

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      root.classList.toggle('dark', media.matches);
    };

    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [themeMode]);

  return null;
}
