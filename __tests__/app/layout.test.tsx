import React from "react";

import { render, waitFor } from "@testing-library/react-native";

import RootLayout from "../../app/_layout";

jest.mock("expo-font", () => ({
  useFonts: jest.fn(() => [true, null]),
}));

const mockLockAsync = jest.fn(() => Promise.resolve());

jest.mock("expo-screen-orientation", () => ({
  OrientationLock: {
    PORTRAIT_UP: "PORTRAIT_UP",
  },
  lockAsync: (...args: unknown[]) => mockLockAsync(...args),
}));

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-router", () => ({
  Stack: () => null,
}));

jest.mock("../../state/AppContext", () => ({
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("RootLayout", () => {
  afterEach(() => {
    mockLockAsync.mockReset();
  });

  it("attempts to lock orientation to portrait on mount", async () => {
    render(<RootLayout />);

    await waitFor(() => {
      expect(mockLockAsync).toHaveBeenCalledWith("PORTRAIT_UP");
    });
  });
});
