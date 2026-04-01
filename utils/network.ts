import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

export type NetworkStatusChangeHandler = (
  isConnected: boolean,
  isInternetReachable: boolean | null,
) => void;

function resolveConnectedState(state: NetInfoState, lastKnownConnected: boolean): boolean {
  if (state.isInternetReachable === false) {
    return false;
  }

  if (state.isInternetReachable === true) {
    return state.isConnected !== false;
  }

  if (typeof state.isConnected === "boolean") {
    return state.isConnected;
  }

  // Reachability is unknown, so keep the latest stable value to reduce flapping.
  return lastKnownConnected;
}

let globalLastKnownConnected = true;

export function subscribeToNetworkStatus(onChange: NetworkStatusChangeHandler): () => void {
  return NetInfo.addEventListener((state) => {
    const isConnected = resolveConnectedState(state, globalLastKnownConnected);
    globalLastKnownConnected = isConnected;
    onChange(isConnected, state.isInternetReachable);
  });
}