import type React from 'react';
import { actionLabels } from '../../config';

interface ActionButtonProps {
  name: Action;
  label?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

function ActionButton({ name, label, disabled, style }: ActionButtonProps) {
  return (
    <button
      onClick={() => window.electronAPI.doAction(name)}
      disabled={disabled}
      style={style}>
        {label ?? actionLabels[name]}
    </button>
  );
}

export default ActionButton;
