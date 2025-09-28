import { useEffect, useState } from 'react';

export interface SliderProps {
  label: string;
  title?: string;
  list: number[];
  value: number;
  setValue: (i: number) => void;
  disabled?: boolean;
}

function Slider(props: SliderProps) {
  const [value, setValue] = useState(props.list.indexOf(props.value));
  useEffect(() => {
    setValue(props.list.indexOf(props.value));
  }, [props.list, props.value]);
  return (
    <div className='flex-center'>
      <input
        type='range'
        title={props.title}
        min={0}
        max={props.list.length-1}
        value={value}
        step={1}
        onInput={(e) => {
          const targetValue = Number((e.target as HTMLInputElement).value);
          setValue(targetValue);
          props.setValue(props.list[targetValue]);
        }}
        disabled={props.disabled}
      />
      <p>{props.label}: {props.list[value]}</p>
    </div>
  );
}

export default Slider;
