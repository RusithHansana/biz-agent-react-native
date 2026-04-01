import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";

import { subscribeToNetworkStatus } from "../utils/network";
import type { AppAction } from "./actions";
import { SET_CONNECTION_STATUS } from "./actions";
import { appReducer, initialState, type AppState } from "./appReducer";

type AppContextValue = {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
};

export const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const lastConnectionStateRef = useRef(state.isConnected);

  useEffect(() => {
    const unsubscribe = subscribeToNetworkStatus((isConnected) => {
      if (lastConnectionStateRef.current === isConnected) {
        return;
      }

      lastConnectionStateRef.current = isConnected;
      dispatch({ type: SET_CONNECTION_STATUS, payload: isConnected });
    });

    return unsubscribe;
  }, [dispatch]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
    }),
    [state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }

  return context;
}