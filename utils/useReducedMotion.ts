import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

type StoreListener = () => void;

let reduceMotionEnabled = true;
let hasReceivedEvent = false;
let nativeSubscription: { remove?: () => void } | null = null;
const listeners = new Set<StoreListener>();

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

function setReduceMotionEnabled(nextValue: boolean): void {
  if (reduceMotionEnabled === nextValue) {
    return;
  }

  reduceMotionEnabled = nextValue;
  notifyListeners();
}

function initializeStore(): void {
  if (nativeSubscription) {
    return;
  }

  hasReceivedEvent = false;

  void AccessibilityInfo.isReduceMotionEnabled()
    .then((enabled) => {
      if (!hasReceivedEvent) {
        setReduceMotionEnabled(Boolean(enabled));
      }
    })
    .catch(() => {
      // Motion-safe fallback if platform query fails.
      setReduceMotionEnabled(true);
    });

  nativeSubscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
    hasReceivedEvent = true;
    setReduceMotionEnabled(Boolean(enabled));
  });
}

function cleanupStoreIfUnused(): void {
  if (listeners.size > 0) {
    return;
  }

  nativeSubscription?.remove?.();
  nativeSubscription = null;
}

function subscribe(listener: StoreListener): () => void {
  listeners.add(listener);
  initializeStore();

  return () => {
    listeners.delete(listener);
    cleanupStoreIfUnused();
  };
}

function getSnapshot(): boolean {
  return reduceMotionEnabled;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function __resetReducedMotionStoreForTests(): void {
  listeners.clear();
  nativeSubscription?.remove?.();
  nativeSubscription = null;
  reduceMotionEnabled = true;
  hasReceivedEvent = false;
}
