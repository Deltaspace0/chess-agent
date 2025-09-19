interface GaugeProps {
  perspective: boolean;
  evaluation?: string;
}

function Gauge({ perspective, evaluation }: GaugeProps) {
  const [type, n] = evaluation?.split(' ') ?? ['cp', '0'];
  const value = Number(n);
  let height = value > 0 ? 100 : 0;
  if (type === 'cp') {
    height = 50+Math.tanh(value/600)*50;
  }
  const gaugeStyle = {
    height: `${height}%`,
    ...(perspective ? {bottom: 0} : {})
  };
  const evalStyle = {
    color: (height >= 50) ? '#000' : '#fff',
    ...((perspective ? height : (100-height)) > 50 ? {bottom: 0} : {})
  };
  const evalText = type === 'mate' ? `M${value}` : value/100;
  return (
    <div className='gauge'>
      <p className='gauge-eval' style={evalStyle}>{evalText}</p>
      <div className='gauge-light' style={gaugeStyle}/>
    </div>
  );
}

export default Gauge;
