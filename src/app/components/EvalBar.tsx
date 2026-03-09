export interface EvalBarProps {
  perspective: boolean;
  evaluation?: string;
}

function EvalBar({ perspective, evaluation }: EvalBarProps) {
  const [type, n] = evaluation?.split(' ') ?? ['', '0'];
  const value = Number(n);
  let height = value > 0 ? 100 : 0;
  if (type !== 'mate') {
    height = 50+Math.tanh(value/600)*50;
  }
  const evalBarStyle = {
    height: `${height}%`,
    ...(perspective ? { bottom: 0 } : {})
  };
  const evalStyle = {
    color: (height >= 50) ? '#000' : '#fff',
    ...((perspective ? height : (100-height)) > 50 ? { bottom: 0 } : {})
  };
  const evalText = type ? (type === 'mate' ? `M${value}` : value/100) : '';
  return (
    <div className='eval-bar'>
      <p className='eval-bar-eval' style={evalStyle}>{evalText}</p>
      <div className='eval-bar-light' style={evalBarStyle}/>
      <div className='eval-bar-middle'/>
    </div>
  );
}

export default EvalBar;
