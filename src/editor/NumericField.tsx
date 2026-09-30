import { useEffect, useState } from 'react';

export function NumericField({ path, value, label, onChange }: {
  path: string; label?: string; value: number; onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <label title={path}>{label ?? path.split('.').at(-1)}
      <input type="number" step="0.1" aria-label={path} value={draft}
        onChange={event => {
          setDraft(event.target.value);
          const number = event.target.valueAsNumber;
          if (Number.isFinite(number)) onChange(number);
        }}
        onBlur={() => setDraft(String(value))} />
    </label>
  );
}
