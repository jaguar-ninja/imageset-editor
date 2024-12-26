import { Backdrop, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { FilterState, updateImages } from "../../app/conceptSlice";
import { ImageState } from "../../app/imageSetSlice";
import { useState } from "react";
import api from "../../api";
import { useDispatch } from "react-redux";
import { addMessage } from "../../app/messageSlice";
import { exception2string } from "../../utils";


interface upscaleDialogProps {
  open: boolean;
  filter: FilterState,
  onClose: () => void,
  onSubmit?: () => void,
  openImage?: ImageState | null,

  imageset_name: string,
  is_regular: boolean,
  concept_name: string,
  repeat: number,
};




function UpscaleDialog({
  open, filter, onClose, openImage, onSubmit,
}: upscaleDialogProps) {
  const dispatch = useDispatch();
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);

  const [loading, setLoading] = useState(false);

  async function upscale() {
    setLoading(true);

    const images = openImage ? [openImage] : filter.images;
    try {
      await api.upscale_images(images, width, height);
      onSubmit?.();
      dispatch(updateImages());
    } catch (err: any) {
      dispatch(addMessage({ msg: exception2string(err), severity: 'error' }));
    }

    onClose();

    setLoading(false);
  }

  return (<Dialog open={open} onClose={onClose}>
    <DialogTitle>upscale for <b>{openImage ? openImage.filename : filter.name}</b></DialogTitle>
    <DialogContent>
      {/* 输入目标宽高 */}
      <TextField
        variant="standard"
        aria-label="width"
        label="width"
        size="small"
        value={width}
        onChange={(event) => setWidth(parseInt(event.target.value))}
        inputProps={{
          step: 8,
          min: 1,
          max: 0xffffffff,
          type: 'number',
        }}
      />
      <TextField
        variant="standard"
        aria-label="height"
        label="height"
        size="small"
        value={height}
        onChange={(event) => setHeight(parseInt(event.target.value))}
        inputProps={{
          step: 8,
          min: 1,
          max: 0xffffffff,
          type: 'number',
        }}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>cancel</Button>
      <Button onClick={upscale}>upscale</Button>
    </DialogActions>


    <Backdrop
      sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 10 })}
      open={loading}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  </Dialog>);
}

export default UpscaleDialog;



