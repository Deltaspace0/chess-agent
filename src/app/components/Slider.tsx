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

function Slider({ label, value, setValue, min, max, step, map, disabled }: SliderProps) {
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

export default Slider;
