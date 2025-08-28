/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';

interface SliderHookProps {
  label: string;
  initialValue: number;
  list: number[];
  callback: (i: number) => void;
}

interface SliderProps {
  label: string;
  value: number;
  setValue: (i: number) => void;
  min: number;
  max: number;
  step: number;
  map?: (i: number) => number;
  disabled?: boolean;
}

export function useListSlider(props: SliderHookProps): SliderProps {
  const [value, setValue] = useState(props.initialValue);
  return {
    label: props.label,
    value: props.list.indexOf(value),
    setValue: (value) => {setValue(value); props.callback(value)},
    min: 0,
    max: props.list.length-1,
    step: 1,
    map: (x) => props.list[x]
  };
}

export function Slider({ label, value, setValue, min, max, step, map, disabled }: SliderProps) {
  map = map || ((x) => x);
  return (
    <div className='flex-center'>
      <input
        type='range'
        min={min}
        max={max}
        value={value}
        step={step}
        onInput={(e) => setValue(map(Number((e.target as HTMLInputElement).value)))}
        disabled={disabled}
      />
      <p>{label}: {map(value)}</p>
    </div>
  );
}
