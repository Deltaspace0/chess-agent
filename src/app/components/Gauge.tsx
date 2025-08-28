interface GaugeProps {
  evaluation: string;
  isWhitePerspective: boolean;
}

function Gauge({ evaluation, isWhitePerspective }: GaugeProps) {
  const [type, n] = evaluation.split(' ');
  const value = Number(n);
  let height = value > 0 ? 100 : 0;
  if (type === 'cp') {
    height = 50+Math.tanh(value/600)*50;
  }
  const gaugeStyle = {
    height: `${height}%`,
    ...(isWhitePerspective ? {bottom: 0} : {})
  };
  const evalStyle = {
    color: (isWhitePerspective && height > 98
      || !isWhitePerspective && height > 5) ? '#000' : '#fff'
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
