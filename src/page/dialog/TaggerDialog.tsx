import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, InputLabel, LinearProgress, MenuItem, Select, Slider, Stack, Switch, TextField } from "@mui/material";
import { useRef, useState } from "react";
import { addFilter, FilterState } from "../../app/conceptSlice";
import api from "../../api";
import { ImageState } from "../../app/imageSetSlice";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addMessage } from "../../app/messageSlice";
import { exception2string } from "../../utils";

interface taggerDialogProps {
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


// 配置thredhold, additional_tags,
function TaggerDialog(props: taggerDialogProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const default_model_name = 'wd14-convnextv2.v1';
  const all_model_name = [
    'wd14-vit.v1', 'wd14-vit.v2', 'wd14-convnext.v1', 'wd14-convnext.v2', 'wd14-convnextv2.v1', 'wd14-swinv2-v1,wd-v1-4-moat-tagger.v2',
    'wd-v1-4-vit-tagger.v3', 'wd-v1-4-convnext-tagger.v3', 'wd-v1-4-swinv2-tagger.v3', 'wd-vit-large-tagger-v3',
    'wd-eva02-large-tagger-v3', 'z3d-e621-convnext-toynya', 'z3d-e621-convnext-silveroxides', 'mld-caformer.dec-5-97527', 'mld-tresnetd.6-30000',
  ];


  const [modelName, setModelName] = useState(default_model_name);
  const [threshold, setThreshold] = useState(0.35);
  const [additionalTags, setAdditionalTags] = useState('');
  const [excludeTags, setExcludeTags] = useState('');
  const [ignoreTagged, setIgnoreTagged] = useState(true);

  const [loading, setLoading] = useState(false);
  const stop = useRef(false);
  const [progress, setProgress] = useState(0);



  async function tagger() {
    setLoading(true);
    stop.current = false;
    const additional_tags = additionalTags.split(',').map(tag => tag.trim());
    const exclude_tags = excludeTags.split(',').map(tag => tag.trim());

    if (props.openImage) {
      // 如果打开了图片，那么就对打开的图片进行打标
      try {
        await api.interrogate(props.openImage, modelName, threshold, additional_tags, exclude_tags, ignoreTagged);
      } catch(err: any) {
        dispatch(addMessage({msg: exception2string(err), severity: 'error'}));
        setLoading(false);
        return;
      }
      
      // 创建一个 selection
      dispatch(addFilter({
        name: `[${props.openImage.filename}]`,
        images: [props.openImage],
      }));
      // 跳转到对应的 selection 进行编辑
      navigate(`/concept/${props.imageset_name}/${props.is_regular ? "reg" : "src"}/${props.concept_name}/${props.repeat}/${props.openImage.filename}/caption-editor`);
    }
    else {
      for (const [index, image] of props.filter.images.entries()) {
        if (stop.current) { break; }
        try {
          await api.interrogate(image, modelName, threshold, additional_tags, exclude_tags, ignoreTagged);
        } catch(err: any) {
          dispatch(addMessage({msg: exception2string(err), severity: 'error'}));
        }
        
        setProgress(index * 100 / props.filter.images.length);
      }

      const filter_name = props.filter.name.substring(1, props.filter.name.length - 1);
      navigate(`/concept/${props.imageset_name}/${props.is_regular ? "reg" : "src"}/${props.concept_name}/${props.repeat}/${filter_name}/caption-editor`);

    }


    setLoading(false);

  }

  return (<>
    <Dialog
      open={props.open}
      onClose={props.onClose}
    >
      <DialogTitle>tagger for <b>{ props.openImage ? props.openImage.filename : props.filter.name}</b></DialogTitle>
      <DialogContent>
        {/* 模型选择器 */}
        <Stack spacing={2}>
          <FormControl variant="standard" sx={{ m: 1, minWidth: 360 }} >
            <InputLabel id="demo-simple-select-standard-label">model name</InputLabel>
            <Select
              labelId="demo-simple-select-standard-label"
              id="demo-simple-select-standard"
              value={modelName}
              defaultValue={default_model_name}
              onChange={(event) => setModelName(event.target.value)}
              label="model name"
            >
              {
                all_model_name.map(name => <MenuItem value={name}>{name}</MenuItem>)
              }
            </Select>
          </FormControl>
          <FormControl variant="standard" sx={{ m: 1, minWidth: 360 }} >
            <InputLabel >threshold</InputLabel>
            <Slider
              size="small"
              defaultValue={threshold}
              value={threshold}
              onChange={(_, value) => setThreshold(value as number)}
              aria-label="Small"
              valueLabelDisplay="auto"
              step={0.01}
              max={1}
              min={0}
            />
          </FormControl>
          <FormControlLabel labelPlacement="start" control={<Switch defaultChecked value={ignoreTagged} size="small"
            onChange={(event) => setIgnoreTagged(event.target.checked)} />} label="ignore tagged images" />

          {/* 直接使用 text input 即可 */}
          <TextField id="additional tags" label="additional tags(split by ',')" size="small" variant="standard"
            value={additionalTags} onChange={(event) => setAdditionalTags(event.target.value)}
          />
          <TextField id="exclude tags" label="exclude tags(split by ',')" size="small" variant="standard"
            value={excludeTags} onChange={(event) => setExcludeTags(event.target.value)}
          />
          {
            loading ? <LinearProgress variant="determinate" value={progress} /> : <></>
          }

        </Stack>

      </DialogContent>
      <DialogActions>
        {
          loading ?
            <Button onClick={() => stop.current = true}>stop</Button> :
            <Button onClick={() => {
              // 开始打标
              tagger().finally(() => {
                props.onClose();
                props.onSubmit?.();
              });
            }}>tagger</Button>
        }

      </DialogActions>
    </Dialog>
  </>);
}

export default TaggerDialog;





