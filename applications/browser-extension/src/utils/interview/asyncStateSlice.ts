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

type AsyncStateMap = Record<string, AsyncState<any>>;

const initialState: AsyncStateMap = {};

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

const fetchInProgress = new Map<string, boolean>();

// Unlike useAsyncState, this hook should only await one async call, regardless of instance count
const useAsyncState2 = <T>(
  storeKey: string,
  asyncFunction: () => Promise<T>,
  subscribe: Subscribe,
): FetchableAsyncState<T> => {
  const dispatch = useDispatch();
  const asyncState = useSelector(
    (state: RootState) => state.async?.[storeKey] as AsyncState<T>,
  );

  const fetchData = useCallback(async () => {
    // Don't duplicate fetch in progress
    if (fetchInProgress.get(storeKey)) {
      return;
    }

    // Set key to true while fetch is in progress
    fetchInProgress.set(storeKey, true);

    dispatch(
      setAsyncState({
        key: storeKey,
        state: loadingAsyncStateFactory(),
      }),
    );

    try {
      const data = await asyncFunction();
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
      fetchInProgress.delete(storeKey);
    }
  }, [dispatch, storeKey, asyncFunction]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // handle subscriptions
  useEffect(() => {
    const unsubscribe = subscribe(fetchData);
    return () => unsubscribe();
  }, [subscribe, fetchData]);

  // allow for refetching
  const refetch = useCallback(() => {
    fetchData();
  }, [dispatch, storeKey, fetchData]);

  return { ...asyncState, refetch };
};

export default useAsyncState2;
