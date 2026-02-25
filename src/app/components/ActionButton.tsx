import type { CSSProperties } from 'react';
import { actionDescriptions } from '../../config.ts';

export interface ActionButtonProps {
  name: Action;
  label: string;
  disabled?: boolean;
  style?: CSSProperties;
}

function ActionButton(props: ActionButtonProps) {
  return (
    <button
      title={actionDescriptions[props.name]}
      onClick={() => window.electronAPI.sendSignal('action', props.name)}
      disabled={props.disabled}
      style={props.style}>
        {props.label}
    </button>
  );
}

export default ActionButton;
