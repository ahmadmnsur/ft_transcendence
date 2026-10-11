import { PageTitle } from '../layout';
import { LegalDocument } from '../legal/markdown';
import termsSource from '../../../docs/legal/terms-of-service.md?raw';

// The Markdown file is the page: its `# …` is the only h1.
export function TermsPage(): React.JSX.Element {
  return (
    <>
      <PageTitle name="Terms of Service" />
      <LegalDocument source={termsSource} fileName="docs/legal/terms-of-service.md" />
    </>
  );
}
