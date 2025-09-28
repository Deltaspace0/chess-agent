export interface RadioProps {
  label: string;
  name: string;
  value?: string;
  checked: boolean;
  onChange: (value: string) => void;
}

function Radio(props: RadioProps) {
  return (
    <label>
      <input
        type='radio'
        name={props.name}
        value={props.value}
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <p>{props.label}</p>
    </label>
  );
}

export default Radio;
