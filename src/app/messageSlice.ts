import { AlertColor } from "@mui/material";
import shortid from 'shortid';
import { PayloadAction, createSlice } from "@reduxjs/toolkit";


export interface MessageState {
  messages: { id: string, msg: string, severity: AlertColor,}[],
};

const initialState: MessageState = {
  messages: [],
}


const messageSlice = createSlice({
  name: "settings",
  initialState, 
  reducers: {
    addMessage: (state, action: PayloadAction<{ msg: string, severity: AlertColor, }>) => {
      const id: string = shortid.generate();
      state.messages = [...state.messages, { ...action.payload, id}];
    },

    removeMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter((item) => item.id !== action.payload);
    },
  }
});



export default messageSlice.reducer;
export const { addMessage, removeMessage } = messageSlice.actions;

