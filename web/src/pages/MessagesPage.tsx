import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { ThreadsCard } from '../messages/ThreadsCard';

export function MessagesPage(): React.JSX.Element {
  const { t } = useI18n();
  return (
    <>
      <PageTitle name={t.messages.title} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold text-ink">{t.messages.title}</h1>
        <ThreadsCard />
      </div>
    </>
  );
}
