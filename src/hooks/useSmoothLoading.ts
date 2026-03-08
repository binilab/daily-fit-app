import { useEffect, useRef, useState } from 'react';

// 빠르게 끝나는 로딩도 최소 시간만큼 유지해 화면 깜빡임을 줄이는 훅이다.
export function useSmoothLoading(isLoading: boolean, minimumMs = 420) {
  const [visible, setVisible] = useState(isLoading);
  const startedAtRef = useRef<number | null>(isLoading ? Date.now() : null);

  useEffect(() => {
    if (isLoading) {
      startedAtRef.current = Date.now();
      setVisible(true);
      return;
    }

    if (!visible) {
      return;
    }

    const elapsed = startedAtRef.current ? Date.now() - startedAtRef.current : minimumMs;
    const remain = Math.max(minimumMs - elapsed, 0);
    const timerId = setTimeout(() => setVisible(false), remain);

    return () => {
      clearTimeout(timerId);
    };
  }, [isLoading, minimumMs, visible]);

  return visible;
}
