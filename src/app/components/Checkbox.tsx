interface CheckboxProps {
  label: string;
  title?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function Checkbox(props: CheckboxProps) {
  return (
    <label title={props.title}>
      <input
        type='checkbox'
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <p>{props.label}</p>
    </label>
  );
}

export default Checkbox;
