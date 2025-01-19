import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { type AsyncState, type FetchableAsyncState } from "@/types/sliceTypes";
import { RootState } from "@/utils/interview/store";
import { type Subscribe } from "@/hooks/useAsyncExternalStore";
import {
  errorToAsyncState,
  loadingAsyncStateFactory,
  valueToAsyncState,
} from "@/utils/asyncStateUtils";
import pureBind from "./pureBind";

type AsyncStateMap = Record<string, AsyncState<any>>;

const initialState: AsyncStateMap = {};

const dummySubscribe: Subscribe = () => () => {};

const asyncStateSlice2 = createSlice({
  name: "async",
  initialState,
  reducers: {
    setAsyncState: (
      state,
      action: PayloadAction<{ key: string; state: AsyncState<any> }>,
    ) => {
      state[action.payload.key] = action.payload.state;
    },
  },
});

export const { setAsyncState } = asyncStateSlice2.actions;
export const { reducer: asyncStateReducer } = asyncStateSlice2;

type AsyncFunction<T> = (...args: any[]) => Promise<T>;

const fetchInProgress = new WeakMap<Function, boolean>();

// Unlike useAsyncState, this hook shares some state such that it should only await one async call for a given function/argument set, regardless of the number of hook instances.
const useAsyncState2 = <T>(
  // subscribe is the first parameter to match the usage of useAsyncExternalStore, but there may not be a Subscribe, so a no-op is provided as a default
  subscribe: Subscribe = dummySubscribe,
  storeKey: string,
  asyncFunction: AsyncFunction<T>,
  ...asyncFunctionArgs: any[]
): FetchableAsyncState<T> => {
  const dispatch = useDispatch();
  const asyncState = useSelector(
    (state: RootState) => state.async[storeKey] as AsyncState<T>,
  );

  const boundAsyncFunction =
    // pureBind binds asyncFunction with its supplied args while allowing strict equality check on WeakMap keys
    asyncFunctionArgs.length > 0
      ? pureBind(asyncFunction, ...asyncFunctionArgs)
      : asyncFunction;

  const fetchData = useCallback(async () => {
    // Don't duplicate fetch in progress
    if (fetchInProgress.get(boundAsyncFunction)) {
      return;
    }

    // Set key to true while fetch is in progress
    fetchInProgress.set(boundAsyncFunction, true);

    dispatch(
      setAsyncState({
        key: storeKey,
        state: loadingAsyncStateFactory(),
      }),
    );

    try {
      const data = await boundAsyncFunction();
      const newState = valueToAsyncState(data);
      dispatch(
        setAsyncState({
          key: storeKey,
          state: newState,
        }),
      );
    } catch (error) {
      const errorState = errorToAsyncState(error);
      dispatch(
        setAsyncState({
          key: storeKey,
          state: errorState,
        }),
      );
    } finally {
      // remove from fetchInProgress once the promise is settled
      fetchInProgress.delete(boundAsyncFunction);
    }
  }, [dispatch, storeKey, boundAsyncFunction]);

  useEffect(() => {
    // fetch the data on mount
    fetchData();
  }, [fetchData]);

  // handle subscriptions
  useEffect(() => {
    if (subscribe !== dummySubscribe) {
      const unsubscribe = subscribe(fetchData);
      return () => unsubscribe();
    }
  }, [subscribe, fetchData]);

  // allow for refetching
  const refetch = useCallback(() => {
    fetchData();
  }, [dispatch, storeKey, fetchData]);

  return { ...asyncState, refetch };
};

export default useAsyncState2;
