import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { createRoot } from 'react-dom/client';
import './index.css';
import { LanguageProvider } from './i18n/context';
import { applyLanguage, initialLanguage } from './i18n/language';
import { queryClient } from './queryClient';
import { router } from './router';

const language = initialLanguage();
applyLanguage(language);

createRoot(document.getElementById('root')!).render(
  <LanguageProvider initial={language}>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </LanguageProvider>,
);
