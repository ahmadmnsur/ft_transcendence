import { useI18n } from '../i18n/context';
import type { Language } from '../i18n/types';
import { PageTitle } from '../layout';
import { LegalDocument } from '../legal/markdown';
import englishSource from '../../../docs/legal/privacy-policy.md?raw';
import frenchSource from '../../../docs/legal/privacy-policy.fr.md?raw';
import arabicSource from '../../../docs/legal/privacy-policy.ar.md?raw';

// Each language's file is the page: its `# …` is the only h1.
const files: Record<Language, { source: string; fileName: string }> = {
  en: { source: englishSource, fileName: 'docs/legal/privacy-policy.md' },
  fr: { source: frenchSource, fileName: 'docs/legal/privacy-policy.fr.md' },
  ar: { source: arabicSource, fileName: 'docs/legal/privacy-policy.ar.md' },
};

export function PrivacyPage(): React.JSX.Element {
  const { t, language } = useI18n();
  const { source, fileName } = files[language];
  return (
    <>
      <PageTitle name={t.legal.privacyTitle} />
      <LegalDocument source={source} fileName={fileName} language={language} />
    </>
  );
}
