import type { CSSProperties } from 'react';
import { actionDescriptions } from '../../config.ts';

export interface ActionIconProps {
  name: Action;
  width?: number;
  height?: number;
  style?: CSSProperties;
  viewBox: string;
  svgPath: string;
}

function ActionIcon(props: ActionIconProps) {
  return (
    <svg
      width={props.width ?? 16}
      height={props.height ?? 16}
      viewBox={props.viewBox}
      xmlns='http://www.w3.org'
      style={props.style}
      onClick={() => window.electronAPI.sendSignal('action', props.name)}
      className={`action-icon ${props.name}-icon`}>
        <title>{actionDescriptions[props.name]}</title>
        <style>{`
          .${props.name}-icon { stroke: #aaa; }
          .${props.name}-icon:hover { stroke: #fff; }
        `}</style>
        <path d={props.svgPath}/>
    </svg>
  );
}

export default ActionIcon;
