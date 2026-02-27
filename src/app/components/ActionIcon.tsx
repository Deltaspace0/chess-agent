import type { CSSProperties } from 'react';
import { actionDescriptions } from '../../config.ts';

export interface ActionIconProps {
  name?: Action;
  title?: string;
  width?: number;
  height?: number;
  viewBox?: string;
  style?: CSSProperties;
  onClick?: () => void;
  svgPath: string;
}

function ActionIcon(props: ActionIconProps) {
  const onClick = props.onClick ?? (() => {
    if (props.name) {
      window.electronAPI.sendSignal('action', props.name);
    }
  });
  const title = props.title ?? (props.name && actionDescriptions[props.name]);
  return (
    <svg
      width={props.width ?? 16}
      height={props.height ?? 16}
      viewBox={props.viewBox ?? '0 0 10 10'}
      xmlns='http://www.w3.org'
      style={props.style}
      onClick={onClick}
      className={'action-icon'}>
        <title>{title}</title>
        <path d={props.svgPath}/>
    </svg>
  );
}

export default ActionIcon;
