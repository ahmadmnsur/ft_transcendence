import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { LegalDocument } from '../legal/markdown';
import termsSource from '../../../docs/legal/terms-of-service.md?raw';

// The Markdown file is the page: its `# …` is the only h1.
export function TermsPage(): React.JSX.Element {
  const { t } = useI18n();
  return (
    <>
      <PageTitle name={t.legal.termsTitle} />
      <LegalDocument source={termsSource} fileName="docs/legal/terms-of-service.md" language="en" />
    </>
  );
}
