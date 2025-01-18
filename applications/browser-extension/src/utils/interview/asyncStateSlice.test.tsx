/*
 * Copyright (C) 2024 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import useAsyncState2 from "./asyncStateSlice";
import { getCurrentValue, subscribe } from "./asyncValue";
import { asyncStateReducer } from "./asyncStateSlice";

jest.mock("./asyncValue", () => {
  return {
    ...jest.requireActual("./asyncValue"),
    getCurrentValue: jest.fn(),
  };
});

const asyncMock = getCurrentValue as jest.Mock;
asyncMock.mockResolvedValue(42);

const ValueComponent: React.FunctionComponent = () => {
  const { data } = useAsyncState2("value1", asyncMock, subscribe);

  return (
    <div>
      <div data-testid="data">{data}</div>
    </div>
  );
};

/**
 * Create a Redux store for use in the tests.
 */
function createTestStore() {
  return configureStore({
    reducer: {
      async: asyncStateReducer,
    },
  });
}

describe("asyncStateSlice", () => {
  beforeEach(() => {
    // Reset the mock call history before each test
    jest.clearAllMocks();
  });

  it("fetches async state", async () => {
    render(
      <Provider store={createTestStore()}>
        <ValueComponent />
      </Provider>,
    );

    await waitFor(() => {
      expect(asyncMock).toHaveBeenCalledOnce();
    });

    expect(screen.getByTestId("data")).toHaveTextContent("42");
  });

  it("computes only once", async () => {
    render(
      <Provider store={createTestStore()}>
        <ValueComponent />
        <ValueComponent />
      </Provider>,
    );

    await waitFor(() => {
      expect(asyncMock).toHaveBeenCalledOnce();
    });
  });
});
