import { useEffect, useRef, useState } from "react";

export function usePullToRefresh(onRefresh?: () => Promise<void> | void) {
  const [refreshing, setRefreshing] = useState(false);
  const [distance, setDistance] = useState(0);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!onRefresh) return;
    let startY = 0;
    let tracking = false;

    function onTouchStart(event: TouchEvent) {
      if (window.scrollY === 0 && event.touches[0]) {
        startY = event.touches[0].clientY;
        tracking = true;
      }
    }

    function onTouchMove(event: TouchEvent) {
      if (!tracking || refreshingRef.current || !event.touches[0]) return;
      const nextDistance = Math.max(0, Math.min(96, event.touches[0].clientY - startY));
      if (nextDistance > 0) {
        distanceRef.current = nextDistance;
        setDistance(nextDistance);
        if (nextDistance > 8) event.preventDefault();
      }
    }

    function onTouchEnd() {
      if (!tracking) return;
      tracking = false;
      const shouldRefresh = distanceRef.current >= 56;
      setDistance(0);
      distanceRef.current = 0;
      if (shouldRefresh) {
        refreshingRef.current = true;
        setRefreshing(true);
        Promise.resolve(onRefresh()).finally(() => {
          refreshingRef.current = false;
          setRefreshing(false);
        });
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh]);

  return { refreshing, distance };
}

export function useBackNavigation(onBack: () => void) {
  useEffect(() => {
    window.history.pushState({ farmlogGuard: true }, "", window.location.href);

    function handlePopState() {
      onBack();
      window.history.pushState({ farmlogGuard: true }, "", window.location.href);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [onBack]);
}
