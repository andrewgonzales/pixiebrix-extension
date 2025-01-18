import { configureStore } from "@reduxjs/toolkit";
import { asyncStateReducer } from "@/utils/interview/asyncStateSlice";

const store = configureStore({
  reducer: {
    async: asyncStateReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
