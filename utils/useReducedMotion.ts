import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion() {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState<boolean>(false);

  useEffect(() => {
    // Get the initial state
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled);

    // Subscribe to changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled
    );

    // Cleanup subscription
    return () => {
      subscription.remove();
    };
  }, []);

  return reduceMotionEnabled;
}
