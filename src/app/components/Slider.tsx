import { useState } from 'react';

export interface SliderProps {
  label: string;
  title?: string;
  list: number[];
  value: number;
  setValue: (i: number) => void;
  disabled?: boolean;
}

function Slider(props: SliderProps) {
  const [index, setIndex] = useState(props.list.indexOf(props.value));
  const [prevValue, setPrevValue] = useState(props.value);
  if (props.value !== prevValue) {
    setIndex(props.list.indexOf(props.value));
    setPrevValue(props.value);
  }
  const handleCommit = () => {
    const newValue = props.list[index];
    if (props.value !== newValue) {
      props.setValue(newValue);
    }
  };
  return (
    <div className='flex-center' title={props.title}>
      <input
        type='range'
        min={0}
        max={props.list.length-1}
        value={index}
        step={1}
        disabled={props.disabled}
        onInput={(e) => setIndex(Number((e.target as HTMLInputElement).value))}
        onMouseUp={handleCommit}
        onKeyUp={handleCommit}
        onTouchEnd={handleCommit}
      />
      <p>{props.label}: {props.list[index]}</p>
    </div>
  );
}

export default Slider;
