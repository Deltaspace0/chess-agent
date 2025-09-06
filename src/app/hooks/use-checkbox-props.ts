import { useEffect, useState } from 'react';

interface CheckboxHookOptions {
  initialValue: boolean;
  sendValue?: (value: boolean) => void;
  onUpdateValue?: (callback: (value: boolean) => void) => void;
}

function useCheckboxProps(options: CheckboxHookOptions) {
  const [value, setValue] = useState(options.initialValue);
  let handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  if (options.sendValue) {
    handleChange = (e) => options.sendValue?.(e.target.checked);
  } else {
    handleChange = (e) => setValue(e.target.checked);
  }
  useEffect(() => {
    options.onUpdateValue?.(setValue);
  }, [options]);
  return {
    type: 'checkbox',
    checked: value,
    onChange: handleChange
  };
}

export default useCheckboxProps;
