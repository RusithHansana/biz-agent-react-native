import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { __resetReducedMotionStoreForTests, useReducedMotion } from "../../utils/useReducedMotion";

let isReduceMotionEnabledSpy: jest.SpyInstance;
let addEventListenerSpy: jest.SpyInstance;

describe("useReducedMotion", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    __resetReducedMotionStoreForTests();

    isReduceMotionEnabledSpy = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    addEventListenerSpy = jest.spyOn(AccessibilityInfo, "addEventListener").mockReturnValue({
      remove: jest.fn(),
    } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>);
  });

  afterEach(() => {
    isReduceMotionEnabledSpy.mockRestore();
    addEventListenerSpy.mockRestore();
  });

  it("defaults to reduced motion until accessibility preference is resolved", async () => {
    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);

    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    expect(isReduceMotionEnabledSpy).toHaveBeenCalledTimes(1);
    expect(addEventListenerSpy).toHaveBeenCalledWith("reduceMotionChanged", expect.any(Function));
  });

  it("updates state when reduceMotionChanged event fires", async () => {
    let changeHandler: ((enabled: boolean) => void) | undefined;

    addEventListenerSpy.mockImplementation((event, handler) => {
      if (event === "reduceMotionChanged") {
        changeHandler = handler;
      }
      return { remove: jest.fn() } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>;
    });

    const { result } = renderHook(() => useReducedMotion());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    act(() => {
      changeHandler?.(true);
    });

    expect(result.current).toBe(true);
  });

  it("keeps motion-safe fallback when initial lookup fails", async () => {
    isReduceMotionEnabledSpy.mockRejectedValueOnce(new Error("lookup failed"));

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);

    await waitFor(() => {
      expect(isReduceMotionEnabledSpy).toHaveBeenCalledTimes(1);
    });

    expect(result.current).toBe(true);
  });

  it("cleans up the native subscription on unmount", async () => {
    const remove = jest.fn();
    addEventListenerSpy.mockReturnValue({ remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>);

    const { unmount } = renderHook(() => useReducedMotion());

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    });

    unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
