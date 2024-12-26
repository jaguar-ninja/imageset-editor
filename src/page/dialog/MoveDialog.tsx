import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Select, Stack, Switch, TextField } from "@mui/material";
import { FilterState } from "../../app/conceptSlice";
import { ImageState } from "../../app/imageSetSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { useState } from "react";
import { createSelector } from "@reduxjs/toolkit";
import api from "../../api";
import { useDispatch } from "react-redux";
import { addMessage } from "../../app/messageSlice";
import { exception2string } from "../../utils";


interface moveDialogProps {
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

const selectConcepts = createSelector(
  (state: RootState) => state.imageSet,
  (imageset) => {
    const concepts: {
      name: string,
      repeat: number,
      is_regular: boolean,
      label: string,
    }[] = [];
    imageset.src?.concepts.forEach(item => concepts.push({
      is_regular: false,
      name: item.name,
      repeat: item.repeat,
      label: `${item.repeat}_${item.name}(src)`,
    }));
    imageset.reg?.concepts.forEach(item => concepts.push({
      is_regular: true,
      name: item.name,
      repeat: item.repeat,
      label: `${item.repeat}_${item.name}(reg)`,
    }));
    return concepts;
  },
);




function MoveDialog({
  open, filter, onClose, onSubmit, openImage, imageset_name,
}: moveDialogProps) {
  const dispatch = useDispatch();
  const concepts = useSelector(selectConcepts);


  const [selectedConcept, setSelectedConcept] = useState<{
    name: string, repeat: number, is_regular: boolean, create: boolean,
    label: string,
  }>({ ...concepts[0], create: false, });

  return (<Dialog open={open} onClose={onClose}>
    <DialogTitle>move <b>{openImage ? openImage.filename : filter.name}</b></DialogTitle>
    <DialogContent>
      <Stack spacing={2}>
        <Select
          labelId="demo-simple-select-standard-label"
          label="concept"
          variant="standard"
          size="small"
          value={selectedConcept.label}
          sx={{ m: 1, minWidth: 180 }}
          onChange={(event) => {
            const value = event.target.value;
            const concept = concepts.find(item => item.label === value);
            if (concept) {
              setSelectedConcept({ ...concept, create: false });
            } else {
              setSelectedConcept((state) => ({ ...state, label: value, create: true }));
            }
          }}
        >
          {
            concepts.map((item, index) => <MenuItem key={index} value={item.label}>
              {item.label}
            </MenuItem>)
          }
          <MenuItem key={1000} value={"create new concept"}>create new concept</MenuItem>
        </Select>
        {
          selectedConcept.label === "create new concept" ? <><div>
          <TextField variant="standard" 
          label="concept name" size="small" value={selectedConcept.name} onChange={(event) => { 
            setSelectedConcept((state) => ({ ...state, name: event.target.value })); 
          }} />
          <TextField
            variant="standard"
            aria-label="repeat"
            label="repeat"
            size="small"
            value={selectedConcept.repeat}
            onChange={(event) => setSelectedConcept((state) => ({ ...state, repeat: parseInt(event.target.value) })) }
            sx={{ maxWidth: 64 }}
            inputProps={{
              step: 1,
              min: 1,
              max: 0xffffffff,
              type: 'number',
            }}
          />
          <br />
          <FormControlLabel control={<Switch 
            size="small" value={selectedConcept.is_regular} 
            onChange={(e) => setSelectedConcept((state) => ({ ...state, is_regular: e.target.checked })) }
          />} label="is regular" />
        </div>
          </> : <></>
        }
        
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>cancel</Button>
      <Button onClick={() => {
        // 执行移动操作, name, repeat, is_regular, 
        const images = openImage ? [openImage] : filter.images;
        api.move_images(imageset_name, images, selectedConcept.is_regular, selectedConcept.name, selectedConcept.repeat)
        .then(() => {
          onSubmit?.();
        })
        .catch((error: any) => dispatch(addMessage({msg: exception2string(error), severity: 'error'})))
        .finally(() => {
          onClose();
        });
        
      }}>move</Button>
    </DialogActions>
  </Dialog>);
}

export default MoveDialog;



