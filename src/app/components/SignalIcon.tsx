import type { CSSProperties } from 'react';
import { useSignal } from '../hooks.ts';

export interface SignalIconProps {
  name: BooleanSignal;
  title: string | ((value: boolean) => string);
  width?: number;
  height?: number;
  viewBox?: string;
  style?: CSSProperties;
  svgPath: string;
}

function SignalIcon(props: SignalIconProps) {
  const signal = useSignal(props.name) ?? true;
  const style: CSSProperties = { stroke: signal ? '#00e00f' : '#9d0000'};
  const title = typeof props.title === 'string'
    ? props.title
    : props.title(signal);
  return (
    <svg
      width={props.width ?? 16}
      height={props.height ?? 16}
      viewBox={props.viewBox ?? '0 0 10 10'}
      xmlns='http://www.w3.org'
      style={props.style ? {...props.style, ...style} : style}
      onClick={() => window.electronAPI.sendSignal(props.name, !signal)}
      className={'action-icon'}>
        <title>{title}</title>
        <path d={props.svgPath}/>
    </svg>
  );
}

export default SignalIcon;
