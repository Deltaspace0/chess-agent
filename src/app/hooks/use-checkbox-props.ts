import { useEffect, useState } from 'react';
import type { Preference, Preferences } from '../../interface';
import { defaultValues } from '../../config.ts';

type BooleanPreference = {
  [T in Preference]: Preferences[T] extends boolean ? T : never;
}[Preference];

interface CheckboxHookOptions {
  label: string;
  preferenceName: BooleanPreference;
}

function useCheckboxProps({ label, preferenceName }: CheckboxHookOptions) {
  const [value, setValue] = useState(defaultValues[preferenceName]);
  useEffect(() => {
    window.electronAPI.onUpdatePreference(preferenceName, setValue);
  }, [preferenceName]);
  return {
    label,
    type: 'checkbox',
    checked: value,
    onChange: (value: boolean) => {
      window.electronAPI.preferenceValue(preferenceName, value);
    }
  };
}

export default useCheckboxProps;
