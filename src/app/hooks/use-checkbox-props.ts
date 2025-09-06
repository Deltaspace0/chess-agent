import { useEffect, useState } from 'react';

interface CheckboxHookOptions {
  label: string;
  initialValue: boolean;
  sendValue?: (value: boolean) => void;
  onUpdateValue?: (callback: (value: boolean) => void) => void;
}

function useCheckboxProps(options: CheckboxHookOptions) {
  const [value, setValue] = useState(options.initialValue);
  useEffect(() => {
    options.onUpdateValue?.(setValue);
  }, [options]);
  return {
    label: options.label,
    type: 'checkbox',
    checked: value,
    onChange: options.sendValue ?? setValue
  };
}

export default useCheckboxProps;
