import { useEffect, useRef } from 'react';

interface RegionSelectionProps {
  region: Region;
  setRegion: (setter: (region: Region) => Region) => void;
}

function RegionSelection({ region, setRegion }: RegionSelectionProps) {
  const regionDivRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        const newHeight = entry.contentRect.height;
        setRegion(({ left, top }) => {
          return { left, top, width: newWidth, height: newHeight };
        });
      }
    });
    const regionDiv = regionDivRef.current;
    if (!regionDiv) {
      return;
    }
    resizeObserver.observe(regionDiv);
    let dragging = false;
    let dx = 0;
    let dy = 0;
    regionDiv.addEventListener('mousedown', (e) => {
      const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = regionDiv;
      const isNearRight = e.screenX+24 > offsetLeft+offsetWidth;
      const isNearBottom = e.screenY+24 > offsetTop+offsetHeight;
      if (isNearRight && isNearBottom) {
        return;
      }
      dragging = true;
      dx = e.screenX-offsetLeft;
      dy = e.screenY-offsetTop;
    });
    window.addEventListener('mousemove', (e) => {
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
    });
    window.addEventListener('mouseup', () => {
      dragging = false;
    });
  }, [setRegion]);
  return (
    <div ref={regionDivRef} className='region-div' style={region}/>
  );
}

export default RegionSelection;
