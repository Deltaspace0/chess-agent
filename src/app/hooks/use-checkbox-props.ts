import { useEffect, useState } from 'react';
import type { Preference } from '../../interface';

interface CheckboxHookOptions {
  label: string;
  initialValue: boolean;
  preferenceName: Preference;
}

function useCheckboxProps(options: CheckboxHookOptions) {
  const [value, setValue] = useState(options.initialValue);
  useEffect(() => {
    window.electronAPI.onUpdatePreference(options.preferenceName, setValue);
  }, [options]);
  return {
    label: options.label,
    type: 'checkbox',
    checked: value,
    onChange: (value: boolean) => {
      window.electronAPI.preferenceValue(options.preferenceName, value);
    }
  };
}

export default useCheckboxProps;
