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
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import useAsyncState2, { asyncStateReducer } from "./asyncStateSlice";
import { getCurrentValue, setCurrentValue, subscribe } from "./asyncValue";

jest.mock("./asyncValue", () => {
  const originalModule = jest.requireActual("./asyncValue");
  return {
    __esModule: true,
    ...originalModule,
    getCurrentValue: jest.fn(originalModule.getCurrentValue),
  };
});

const getCurrentValueMock = getCurrentValue as jest.Mock;

async function addNumbers(...numbers: number[]) {
  return numbers?.reduce((a, b) => a + b, 0);
}
const addNumbersMock = jest.fn(addNumbers);

type ValueComponentProps = {
  id?: number;
  ignoreSubscribe?: boolean;
};

const ValueComponent: React.FunctionComponent<ValueComponentProps> = ({
  id = 1,
  ignoreSubscribe = false,
}) => {
  const { data, error, isError, refetch } = useAsyncState2<{ value: number }>(
    ignoreSubscribe ? undefined : subscribe,
    "value1",
    getCurrentValueMock,
  );

  return (
    <div>
      <div data-testid={`data-${id}`}>{data?.value}</div>
      <button data-testid={`refetch-${id}`} onClick={refetch}>
        refetch
      </button>
      {isError && (
        <div data-testid="error">
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}
    </div>
  );
};

const AddNumbersComponent: React.FunctionComponent<
  ValueComponentProps & { numbers: number[] }
> = ({ id = 1, numbers }) => {
  const { data } = useAsyncState2<number>(
    undefined,
    `value-${id}`,
    addNumbersMock,
    ...numbers,
  );

  return (
    <div>
      <div data-testid={`data-${id}`}>{data}</div>
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
    setCurrentValue(42);
  });

  it("fetches async state", async () => {
    render(
      <Provider store={createTestStore()}>
        <ValueComponent />
      </Provider>,
    );

    await waitFor(() => {
      expect(getCurrentValueMock).toHaveBeenCalledOnce();
      expect(screen.getByTestId("data-1")).toHaveTextContent("42");
    });
  });

  it("computes only once", async () => {
    render(
      <Provider store={createTestStore()}>
        <ValueComponent id={1} />
        <ValueComponent id={2} />
      </Provider>,
    );

    await waitFor(() => {
      expect(getCurrentValueMock).toHaveBeenCalledOnce();
      expect(screen.getByTestId("data-1")).toHaveTextContent("42");
      expect(screen.getByTestId("data-2")).toHaveTextContent("42");
    });
  });

  it("can invoke function more than once with different arguments", async () => {
    render(
      <Provider store={createTestStore()}>
        <AddNumbersComponent id={1} numbers={[1, 2, 3]} />
        <AddNumbersComponent id={2} numbers={[4, 5, 6]} />
      </Provider>,
    );

    await waitFor(() => {
      expect(addNumbersMock).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByTestId("data-1")).toHaveTextContent("6"); // 1 + 2 + 3
    expect(screen.getByTestId("data-2")).toHaveTextContent("15"); // 4 + 5 + 6
  });

  it("returns errors", async () => {
    getCurrentValueMock.mockRejectedValueOnce(new Error("Test error"));

    render(
      <Provider store={createTestStore()}>
        <ValueComponent />
      </Provider>,
    );

    await waitFor(() => {
      expect(getCurrentValueMock).toHaveBeenCalledOnce();
    });

    await waitFor(() => {
      expect(screen.getByTestId("data-1")).toHaveTextContent("");
    });

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent("Test error");
    });
  });

  it("subscribes to updates", async () => {
    render(
      <Provider store={createTestStore()}>
        <ValueComponent />
      </Provider>,
    );

    await waitFor(() => {
      expect(getCurrentValueMock).toHaveBeenCalledOnce();
      expect(screen.getByTestId("data-1")).toHaveTextContent("42");
    });

    // Trigger the subscription update
    setCurrentValue(43);

    await waitFor(() => {
      expect(screen.getByTestId("data-1")).toHaveTextContent("43");
    });

    // Simulate another update
    setCurrentValue(44);

    await waitFor(() => {
      expect(getCurrentValueMock).toHaveBeenCalledTimes(3);
      expect(screen.getByTestId("data-1")).toHaveTextContent("44");
    });
  });

  it("re-fetches", async () => {
    render(
      <Provider store={createTestStore()}>
        <ValueComponent ignoreSubscribe />
      </Provider>,
    );

    await waitFor(() => {
      expect(getCurrentValueMock).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("data-1")).toHaveTextContent("42");
    });

    // Change the value without triggering subscribe
    setCurrentValue(43);

    expect(screen.getByTestId("data-1")).toHaveTextContent("42");

    // Trigger a manual re-fetch
    fireEvent.click(screen.getByText("refetch"));

    await waitFor(() => {
      expect(getCurrentValueMock).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId("data-1")).toHaveTextContent("43");
    });
  });
});
