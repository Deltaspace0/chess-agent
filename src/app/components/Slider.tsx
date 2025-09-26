interface SliderProps {
  label: string;
  title?: string;
  value: number;
  setValue: (i: number) => void;
  min: number;
  max: number;
  step: number;
  map?: (i: number) => number;
  disabled?: boolean;
}

function Slider(props: SliderProps) {
  const map = props.map || ((x) => x);
  return (
    <div className='flex-center'>
      <input
        type='range'
        title={props.title}
        min={props.min}
        max={props.max}
        value={props.value}
        step={props.step}
        onInput={(e) => {
          const targetValue = (e.target as HTMLInputElement).value;
          props.setValue(map(Number(targetValue)));
        }}
        disabled={props.disabled}
      />
      <p>{props.label}: {map(props.value)}</p>
    </div>
  );
}

export default Slider;
