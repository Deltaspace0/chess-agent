import { useEffect, useRef } from 'react';

interface RegionSelectionProps {
  region: Region;
  setRegion: (setter: (region: Region) => Region) => void;
  isSquare?: boolean;
}

function RegionSelection({ region, setRegion, isSquare }: RegionSelectionProps) {
  const regionDivRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        let newWidth = entry.contentRect.width;
        let newHeight = entry.contentRect.height;
        setRegion(({ left, top, width, height }) => {
          if (isSquare) {
            if (Math.abs(width-newWidth) > Math.abs(height-newHeight)) {
              newHeight = newWidth;
            } else {
              newWidth = newHeight;
            }
          }
          return { left, top, width: newWidth, height: newHeight };
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
