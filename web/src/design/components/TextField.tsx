import { useState, type ComponentProps } from 'react';
import { CharacterCount } from './CharacterCount';
import { FieldShell, capText, controlClass, useField, useTextDirection, type FieldMessage } from './field';

export interface TextFieldProps extends ComponentProps<'input'> {
  label: string;
  hint?: FieldMessage;
  error?: FieldMessage;
  maxBytes?: number;
  maxChars?: number;
}

export function TextField({ label, hint, error, id, dir, onInput, onChange, onCompositionStart, onCompositionEnd, maxBytes, maxChars, ref, 'aria-describedby': describedBy, 'aria-invalid': invalid, className, ...rest }: TextFieldProps): React.JSX.Element {
  const { controlProps, hintId, errorId } = useField('field', { id, hint, error, 'aria-describedby': describedBy, 'aria-invalid': invalid });
  const direction = useTextDirection<HTMLInputElement>({ dir, onInput, ref });
  const [cappedAt, setCappedAt] = useState<string | null>(null);
  const counted = typeof rest.value === 'string' && maxChars !== undefined ? rest.value : undefined;
  return (
    <FieldShell
      label={label}
      controlId={controlProps.id}
      hint={hint}
      error={error}
      hintId={hintId}
      errorId={errorId}
      className={className}
      aside={counted !== undefined && maxChars !== undefined ? <CharacterCount value={counted} maxChars={maxChars} capped={cappedAt === counted} counting={false} /> : undefined}
    >
      <input {...rest} {...controlProps} {...direction} {...capText({ maxBytes, maxChars }, { onChange, onCompositionStart, onCompositionEnd }, { previous: typeof rest.value === 'string' ? rest.value : undefined, onCapped: setCappedAt })} className={controlClass(Boolean(error))} />
    </FieldShell>
  );
}
