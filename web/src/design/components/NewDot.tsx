import { useI18n } from '../../i18n/context';

export function NewDot({ className = 'ms-2' }: { className?: string }): React.JSX.Element {
  const { t } = useI18n();
  return (
    <>
      <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full bg-danger-500 align-middle ${className}`} />
      <span className="sr-only"> {t.shell.header.new}</span>
    </>
  );
}
