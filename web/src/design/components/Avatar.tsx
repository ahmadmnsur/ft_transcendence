import { useState, type ComponentProps } from 'react';
import defaultAvatarUrl from '../assets/default-avatar.svg';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends Omit<ComponentProps<'img'>, 'src' | 'alt'> {
  src?: string | null;
  alt: string;
  size?: AvatarSize;
}

const dims: Record<AvatarSize, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
};

export function Avatar({ src, alt, size = 'md', onError, loading = 'lazy', className = '', ...rest }: AvatarProps): React.JSX.Element {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const resolved = src && src !== failedSrc ? src : defaultAvatarUrl;
  return (
    <img
      {...rest}
      src={resolved}
      alt={alt}
      // Record the src prop, not currentTarget.src: the browser makes that
      // absolute, so it would never equal the prop.
      onError={(event) => {
        setFailedSrc(src ?? null);
        onError?.(event);
      }}
      loading={loading}
      className={`shrink-0 rounded-full bg-surface-sunken object-cover ${dims[size]} ${className}`.trim()}
    />
  );
}
