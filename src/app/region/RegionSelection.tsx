import { useEffect, useRef } from 'react';

interface RegionSelectionProps {
  region: Region;
  setRegion: (setter: (region: Region) => Region) => void;
  isSquare?: boolean;
}

function RegionSelection(props: RegionSelectionProps) {
  const { region, setRegion, isSquare } = props;
  const regionDivRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = isSquare ? width : entry.contentRect.height;
        setRegion(({ left, top }) => {
          const newLeft = Math.min(screen.width-width, left);
          const newTop = Math.min(screen.height-height, top);
          return { left: newLeft, top: newTop, width, height };
        });
      }
    });
    if (regionDivRef.current) {
      resizeObserver.observe(regionDivRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [setRegion, isSquare]);
  useEffect(() => {
    const regionDiv = regionDivRef.current;
    if (!regionDiv) {
      return;
    }
    let dragging = false;
    let dx = 0;
    let dy = 0;
    const downListener = (e: MouseEvent) => {
      const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = regionDiv;
      const isNearRight = e.screenX+24 > offsetLeft+offsetWidth;
      const isNearBottom = e.screenY+24 > offsetTop+offsetHeight;
      if (isNearRight && isNearBottom) {
        return;
      }
      dragging = true;
      dx = e.screenX-offsetLeft;
      dy = e.screenY-offsetTop;
    };
    const moveListener = (e: MouseEvent) => {
      if (!dragging) {
        return;
      }
      const { offsetWidth, offsetHeight } = regionDiv;
      const maxLeft = screen.width-offsetWidth;
      const maxTop = screen.height-offsetHeight;
      const newLeft = Math.min(maxLeft, Math.max(0, e.screenX-dx));
      const newTop = Math.min(maxTop, Math.max(0, e.screenY-dy));
      dx = e.screenX-newLeft;
      dy = e.screenY-newTop;
      setRegion(({ width, height }) => {
        return { left: newLeft, top: newTop, width, height };
      });
    };
    const upListener = () => {
      dragging = false;
    };
    regionDiv.addEventListener('mousedown', downListener);
    window.addEventListener('mousemove', moveListener);
    window.addEventListener('mouseup', upListener);
    return () => {
      regionDiv.removeEventListener('mousedown', downListener);
      window.removeEventListener('mousemove', moveListener);
      window.removeEventListener('mouseup', upListener);
    };
  }, [setRegion]);
  return (
    <div
      ref={regionDivRef}
      className='region-div'
      style={isSquare ? {
        ...region,
        resize: 'horizontal',
        maxWidth: '100vh',
        maxHeight: '100vw'
      } : region}
    />
  );
}

export default RegionSelection;
