import { configureStore } from '@reduxjs/toolkit';
import imageSetReducer from './imageSetSlice';
import openImageReducer from './openImageSlice';
import conceptReducer from './conceptSlice';
import messageReducer from './messageSlice';


export const store = configureStore({
  reducer: {
    // setting: settingsReducer, // 用户设置
    imageSet: imageSetReducer,
    openImage: openImageReducer,
    concept: conceptReducer,
    message: messageReducer,
  },
})

export type RootState = ReturnType<typeof store.getState> 


