import { BRAND, PageTitle } from '../layout';

export function HomePage(): React.JSX.Element {
  return (
    <>
      <PageTitle />
      <h1 className="text-2xl font-semibold text-ink">
        <bdi>{BRAND}</bdi>
      </h1>
    </>
  );
}
