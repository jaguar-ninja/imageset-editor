import { ImageState } from "./imageSetSlice";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";


export interface FilterState {
  name: string, 
  images: ImageState[],
};

export interface ConceptState {
  name : string, 
  repeat: number,
  is_regular: boolean,
  imageset_name: string,
  images: ImageState[],

  // filter 过滤
  filters: FilterState[],
  time: number,
};

const initialState: ConceptState = {
  name: 'uninitialzed',
  repeat: 0, 
  is_regular: false, 
  imageset_name: 'uninitialzed',
  images: [],
  filters: [],
  time: new Date().getTime(),
};


export const conceptSlice = createSlice({
  name: "concept",
  initialState,
  reducers: {
    loadConcept: (state, action: PayloadAction<ConceptState>) => {
      
      const filters = [ { name: "[all]", images: action.payload.images } ];
      if(
        state.name === action.payload.name 
        && state.is_regular === action.payload.is_regular 
        && state.repeat === action.payload.repeat
        && state.imageset_name === action.payload.imageset_name
      ) {
        const image_map = new Map<string, ImageState>();
        action.payload.images.forEach(image => image_map.set(image.path, image));

        const selections: FilterState[] = state.filters.filter(filter => filter.name !== '[all]');
        for(const selection of selections) {
          const filter: FilterState = {
            name: selection.name, 
            images: [],
          };
          for(const image of selection.images) {
            const new_image = image_map.get(image.path);
            if(new_image) {
              filter.images.push(new_image);
            }
          }
          filters.push(filter);
        }
      }
      state.images = action.payload.images;
      state.name = action.payload.name;
      state.is_regular = action.payload.is_regular;
      state.imageset_name = action.payload.imageset_name;
      state.repeat = action.payload.repeat;

      // 同时添加 filter all, 注意不要清除掉了已有的 selection
      state.filters = filters;
    },

    addFilter: (state, action: PayloadAction<FilterState>) => {
      const filters = state.filters.filter(filter => filter.name !== action.payload.name);
      state.filters = [...filters, action.payload];
    },

    removeFilter: (state, action: PayloadAction<string>) => {
      state.filters = state.filters.filter(filter => filter.name !== action.payload);
    },

    updateImages: (state) => {
      state.time = new Date().getTime();
    }
  },
});


export default conceptSlice.reducer;
export const { loadConcept, addFilter, removeFilter, updateImages } = conceptSlice.actions;

