import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { meQueryOptions } from '../api/profile';
import { Card } from '../design';
import { useI18n } from '../i18n/context';
import { BRAND } from '../layout';
import { FortyTwoRow } from './FortyTwoRow';
import { PasswordRow } from './PasswordRow';

export function SecurityCard({
  username,
  fortyTwoEnabled,
  onNoticeRetire,
  confirmed42At,
  onConfirmedEnd,
  onSignedOut,
}: {
  username: string;
  fortyTwoEnabled: boolean;
  onNoticeRetire: () => void;
  confirmed42At: number | null;
  onConfirmedEnd: () => void;
  onSignedOut: (notice: 'password-changed' | 'password-change-unknown') => Promise<void>;
}): React.JSX.Element {
  const { t, formatText } = useI18n();
  const copy = t.profile.security;
  const { data: me } = useQuery(meQueryOptions());
  const [activeRow, setActiveRow] = useState<'password' | 'fortyTwo' | null>(null);

  return (
    <Card title={copy.title} subtitle={formatText(copy.subtitle, { brand: BRAND })} headingLevel={2}>
      <div className="flex min-w-0 flex-col divide-y divide-line">
        <PasswordRow
          username={username}
          onSignedOut={onSignedOut}
          recovery={fortyTwoEnabled && me?.fortyTwoConnected === true}
          confirmedAt={confirmed42At}
          onConfirmedEnd={onConfirmedEnd}
          onAction={onNoticeRetire}
          otherActive={activeRow === 'fortyTwo'}
          onOpen={() => setActiveRow('password')}
        />
        {fortyTwoEnabled ? (
          <FortyTwoRow
            onAction={onNoticeRetire}
            otherActive={activeRow === 'password'}
            onOpen={() => setActiveRow('fortyTwo')}
          />
        ) : null}
      </div>
    </Card>
  );
}
