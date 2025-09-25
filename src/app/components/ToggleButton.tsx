interface ToggleButtonProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ToggleButton({ label, checked, onChange }: ToggleButtonProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={checked ? {backgroundColor: 'blue'} : {}}>
        {label}
    </button>
  );
}

export default ToggleButton;
