import { useEffect, useState } from 'react';

interface SliderHookOptions {
  label: string;
  initialValue: number;
  list: number[];
  sendValue: (value: number) => void;
  onUpdateValue: (callback: (value: number) => void) => void;
}

function useSliderProps(options: SliderHookOptions) {
  const [value, setValue] = useState(options.initialValue);
  useEffect(() => {
    options.onUpdateValue(setValue);
  }, [options]);
  return {
    label: options.label,
    value: options.list.indexOf(value),
    setValue: (value: number) => options.sendValue(value),
    min: 0,
    max: options.list.length-1,
    step: 1,
    map: (x: number) => options.list[x]
  };
}

export default useSliderProps;
