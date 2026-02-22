import type React from 'react';
import { actionDescriptions, actionLabels } from '../../config';

export interface ActionButtonProps {
  name: Action;
  label?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

function ActionButton(props: ActionButtonProps) {
  return (
    <button
      title={actionDescriptions[props.name]}
      onClick={() => window.electronAPI.sendSignal('action', props.name)}
      disabled={props.disabled}
      style={props.style}>
        {props.label ?? actionLabels[props.name]}
    </button>
  );
}

export default ActionButton;
