import { useCallback, useRef, useState } from 'react';

interface LongPressOptions {
  threshold?: number;
  onLongPress?: (e: any) => void;
  onClick?: (e: any) => void;
}

export function useLongPress({
  threshold = 500,
  onLongPress,
  onClick,
}: LongPressOptions = {}) {
  const [isLongPressActive, setIsLongPressActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressExecutedRef = useRef(false);

  const start = useCallback(
    (e: any) => {
      e.persist();
      isLongPressExecutedRef.current = false;
      timerRef.current = setTimeout(() => {
        if (onLongPress) {
          onLongPress(e);
          isLongPressExecutedRef.current = true;
          setIsLongPressActive(true);
        }
      }, threshold);
    },
    [onLongPress, threshold]
  );

  const stop = useCallback(
    (e: any) => {
      e.persist();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      if (!isLongPressExecutedRef.current && onClick) {
        onClick(e);
      }
      
      setIsLongPressActive(false);
    },
    [onClick]
  );

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}
