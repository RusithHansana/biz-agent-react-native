import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

import { subscribeToNetworkStatus } from "../../utils/network";

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
  },
}));

describe("subscribeToNetworkStatus", () => {
  const mockedNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("subscribes via NetInfo.addEventListener and returns unsubscribe", () => {
    const unsubscribe = jest.fn();
    mockedNetInfo.addEventListener.mockReturnValue(unsubscribe);

    const onChange = jest.fn();
    const cleanup = subscribeToNetworkStatus(onChange);

    expect(mockedNetInfo.addEventListener).toHaveBeenCalledTimes(1);
    cleanup();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("treats isInternetReachable false as offline even when isConnected is true", () => {
    let listener: ((state: NetInfoState) => void) | undefined;
    mockedNetInfo.addEventListener.mockImplementation((cb) => {
      listener = cb;
      return jest.fn();
    });

    const onChange = jest.fn();
    subscribeToNetworkStatus(onChange);

    listener?.({
      type: "wifi",
      isConnected: true,
      isInternetReachable: false,
      details: null,
    } as unknown as NetInfoState);

    expect(onChange).toHaveBeenCalledWith(false, false);
  });

  it("uses isConnected when internet reachability is unknown", () => {
    let listener: ((state: NetInfoState) => void) | undefined;
    mockedNetInfo.addEventListener.mockImplementation((cb) => {
      listener = cb;
      return jest.fn();
    });

    const onChange = jest.fn();
    subscribeToNetworkStatus(onChange);

    listener?.({
      type: "wifi",
      isConnected: false,
      isInternetReachable: null,
      details: null,
    } as unknown as NetInfoState);

    expect(onChange).toHaveBeenCalledWith(false, null);
  });
});