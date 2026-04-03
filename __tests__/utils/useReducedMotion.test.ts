import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from '../../utils/useReducedMotion';

jest.mock('react-native', () => ({
  AccessibilityInfo: {
    isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
}));

describe('useReducedMotion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with value from isReduceMotionEnabled', async () => {
    const { result } = renderHook(() => useReducedMotion());
    
    // Initial state is false before promise resolves
    expect(result.current).toBe(false);
    
    await waitFor(() => {
      // Assuming mockResolvedValue(false)
      expect(result.current).toBe(false);
    });
    
    expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
  });

  it('should update state when reduceMotionChanged event fires', async () => {
    let changeHandler: ((enabled: boolean) => void) | undefined;
    
    (AccessibilityInfo.addEventListener as jest.Mock).mockImplementation((event, handler) => {
      if (event === 'reduceMotionChanged') {
        changeHandler = handler;
      }
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
    
    act(() => {
      if (changeHandler) {
        changeHandler(true);
      }
    });
    
    expect(result.current).toBe(true);
  });
});
