import { configureStore } from "@reduxjs/toolkit";
import { asyncStateReducer } from "@/utils/interview/useAsyncState2";

const store = configureStore({
  reducer: {
    async: asyncStateReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
