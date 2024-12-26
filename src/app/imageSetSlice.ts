import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ImageSetMetadata } from "../page/imageset/Overview";


export interface ImageState {
  src: string,                // 图片的url
  thumbnail: string,          // 缩略图url
  filename: string,           // 文件名称(不包含扩展名)
  basename: string,           // 文件名称(包含扩展名)
  path: string,               // 准确路径, path 也可以唯一标识, 从 src/reg 目录下开始
  captions: string[],         // 字幕
  width: number,              // 宽度
  height: number,             // 高度
  concept: string,
  repeat: number,
};

export interface ImageSetState {
  name: string, // 图片集的名字

  src: ImageSetMetadata | null,
  reg: ImageSetMetadata | null,
};

const initialState: ImageSetState = {
  name: "<uninitiated>",
  src: null,
  reg: null,
};


export const imageSetSlice = createSlice({
  name: "imageset",
  initialState,
  reducers: {
    setImageSetName: (state, action: PayloadAction<string>) => {
      state.name = action.payload;
    },

    setImageSet: (state, action: PayloadAction<ImageSetState>) => {
      state.name = action.payload.name;
      state.reg = action.payload.reg;
      state.src = action.payload.src;
    },
  },
});

export default imageSetSlice.reducer;
export const { setImageSetName, setImageSet } = imageSetSlice.actions;

