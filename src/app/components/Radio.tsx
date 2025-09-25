interface RadioProps {
  label: string;
  name: string;
  value?: string;
  checked: boolean;
  onChange: (value: string) => void;
}

function Radio({ label, name, value, checked, onChange }: RadioProps) {
  return (
    <label>
      <input
        type='radio'
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.value)}
      />
      <p>{label}</p>
    </label>
  );
}

export default Radio;
