import { useI18n } from '../../i18n/context';

export function NewDot({ className = 'ms-2' }: { className?: string }): React.JSX.Element {
  return <span aria-hidden="true" className={`inline-block size-2.5 shrink-0 rounded-full bg-danger-600 align-middle ${className}`} />;
}

export function useNewDotLabel(): (label: string) => string {
  const { t, formatText } = useI18n();
  return (label) => formatText(t.shell.header.newLabel, { label });
}
