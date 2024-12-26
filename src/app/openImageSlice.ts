import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { ImageState } from "./imageSetSlice";

// openImage 使用 path 来标识

export interface OpenImageState {
  image: ImageState | null,
};

const initialState: OpenImageState = {
  image: null,
}


const openImageSlice = createSlice({
  name: "openImage",
  initialState, 
  reducers: {
    openImage: (state, action: PayloadAction<ImageState>) => {
      state.image = action.payload;
    },
    closeImage: (state) => {
      state.image = null;
    }
  }
});



export default openImageSlice.reducer;
export const { openImage, closeImage } = openImageSlice.actions;

