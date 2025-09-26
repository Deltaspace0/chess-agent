interface ToggleButtonProps {
  label: string;
  title?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ToggleButton(props: ToggleButtonProps) {
  return (
    <button
      title={props.title}
      onClick={() => props.onChange(!props.checked)}
      style={props.checked ? {backgroundColor: 'blue'} : {}}>
        {props.label}
    </button>
  );
}

export default ToggleButton;
