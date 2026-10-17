import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { LegalDocument } from '../legal/markdown';
import privacySource from '../../../docs/legal/privacy-policy.md?raw';

// The Markdown file is the page: its `# …` is the only h1.
export function PrivacyPage(): React.JSX.Element {
  const { t } = useI18n();
  return (
    <>
      <PageTitle name={t.legal.privacyTitle} />
      <LegalDocument source={privacySource} fileName="docs/legal/privacy-policy.md" language="en" />
    </>
  );
}
