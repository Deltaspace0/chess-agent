import { useEffect, useRef } from 'react';

function VirtualCursor() {
  const virtualCursorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    return window.electronAPI.onSignal('mousePosition', (value) => {
      const virtualCursor = virtualCursorRef.current;
      if (!virtualCursor) {
        return;
      }
      const x = (!value || value.x > 1 || value.x < 0) ? -1 : value.x;
      const y = (!value || value.y > 1 || value.y < 0) ? -1 : value.y;
      virtualCursor.style.left = `calc(4px + ${x} * (100% - 8px))`;
      virtualCursor.style.top = `${y*100}%`;
    });
  }, []);
  return <div ref={virtualCursorRef} className='virtual-cursor'/>;
}

export default VirtualCursor;
