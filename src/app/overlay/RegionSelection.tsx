import { useCallback, useEffect, useRef, useState } from 'react';

interface RegionSelectionProps {
  onChange: (region: Region) => void;
}

const nullRegion: Region = { left: 0, top: 0, width: 0, height: 0 };

function RegionSelection({ onChange }: RegionSelectionProps) {
  const [region, setRegion] = useState(nullRegion);
  const regionDivRef = useRef<HTMLDivElement>(null);
  const sendRegion = useCallback(() => {
    const regionDiv = regionDivRef.current;
    if (regionDiv) {
      const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = regionDiv;
      if (offsetWidth >= 48 && offsetHeight >= 48) {
        onChange({
          left: offsetLeft,
          top: offsetTop,
          width: offsetWidth,
          height: offsetHeight
        });
      }
    }
  }, [onChange]);
  useEffect(() => {
    const regionDiv = regionDivRef.current;
    if (!regionDiv) {
      return;
    }
    let selecting = false;
    let startX = 0;
    let startY = 0;
    const downListener = (e: MouseEvent) => {
      selecting = true;
      startX = e.screenX;
      startY = e.screenY;
    };
    const moveListener = (e: MouseEvent) => {
      if (!selecting) {
        return;
      }
      setRegion({
        left: Math.min(e.screenX, startX),
        top: Math.min(e.screenY, startY),
        width: Math.abs(e.screenX-startX),
        height: Math.abs(e.screenY-startY)
      });
    };
    const upListener = () => {
      sendRegion();
      setRegion(nullRegion);
      selecting = false;
    };
    window.addEventListener('mousedown', downListener);
    window.addEventListener('mousemove', moveListener);
    window.addEventListener('mouseup', upListener);
    return () => {
      window.removeEventListener('mousedown', downListener);
      window.removeEventListener('mousemove', moveListener);
      window.removeEventListener('mouseup', upListener);
    };
  }, [sendRegion]);
  return (<div
    ref={regionDivRef}
    className={region === nullRegion ? '' : 'region-div'}
    style={region}
  />);
}

export default RegionSelection;
