import { useCallback, useEffect, useRef, useState } from 'react';

interface RegionSelectionProps {
  region: Region | null;
  onChange: (region: Region) => void;
}

const nullRegion: Region = { left: 0, top: 0, width: 0, height: 0 };

function RegionSelection(props: RegionSelectionProps) {
  const { onChange } = props;
  const [region, setRegion] = useState(props.region || nullRegion);
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
      } else {
        setRegion(props.region || nullRegion);
      }
    }
  }, [onChange, props.region]);
  useEffect(() => setRegion(props.region || nullRegion), [props.region]);
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        setRegion(({ left, top }) => ({ left, top, width, height }));
      }
    });
    if (regionDivRef.current) {
      resizeObserver.observe(regionDivRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);
  useEffect(() => {
    const regionDiv = regionDivRef.current;
    if (!regionDiv) {
      return;
    }
    let selecting = false;
    let changed = false;
    let startX = 0;
    let startY = 0;
    const downListener = (e: MouseEvent) => {
      const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = regionDiv;
      const x = e.screenX;
      const y = e.screenY;
      if (x >= offsetLeft && x <= offsetLeft+offsetWidth &&
        y >= offsetTop && y <= offsetTop+offsetHeight
      ) {
        return;
      }
      selecting = true;
      startX = x;
      startY = y;
    };
    const moveListener = (e: MouseEvent) => {
      if (!selecting) {
        return;
      }
      changed = true;
      setRegion({
        left: Math.min(e.screenX, startX),
        top: Math.min(e.screenY, startY),
        width: Math.abs(e.screenX-startX),
        height: Math.abs(e.screenY-startY)
      });
    };
    const upListener = () => {
      if (changed) {
        sendRegion();
      }
      selecting = false;
      changed = false;
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
  useEffect(() => {
    const regionDiv = regionDivRef.current;
    if (!regionDiv) {
      return;
    }
    let dragging = false;
    let changing = false;
    let dx = 0;
    let dy = 0;
    const downListener = (e: MouseEvent) => {
      changing = true;
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
      if (changing) {
        sendRegion();
      }
      dragging = false;
      changing = false;
    };
    regionDiv.addEventListener('mousedown', downListener);
    window.addEventListener('mousemove', moveListener);
    window.addEventListener('mouseup', upListener);
    return () => {
      regionDiv.removeEventListener('mousedown', downListener);
      window.removeEventListener('mousemove', moveListener);
      window.removeEventListener('mouseup', upListener);
    };
  }, [setRegion, sendRegion]);
  return (<div
    ref={regionDivRef}
    className={region === nullRegion ? '' : 'region-div'}
    style={region}
  />);
}

export default RegionSelection;
