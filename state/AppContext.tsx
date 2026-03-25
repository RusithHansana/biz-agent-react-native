import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo, useReducer } from "react";

import type { AppAction } from "./actions";
import { appReducer, initialState, type AppState } from "./appReducer";

type AppContextValue = {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
};

export const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(appReducer, initialState);

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