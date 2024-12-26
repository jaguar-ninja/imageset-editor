import { Backdrop, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, Grid2 as Grid, IconButton, MenuItem, Paper, Select, Slider, TextField, Typography } from "@mui/material";
import { FilterState, loadConcept } from "../../app/conceptSlice";
import { useEffect, useState } from "react";
import DoneIcon from '@mui/icons-material/Done';
import AddIcon from '@mui/icons-material/Add';
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import { ImageState } from "../../app/imageSetSlice";
import { useDispatch } from "react-redux";
import { getFilterByName, selectFilterNameList } from "./Editor";
import ImageGallery from "./ImageGallery";
import { closeImage } from "../../app/openImageSlice";
import { addMessage } from "../../app/messageSlice";
import { exception2string } from "../../utils";



function EditableChip(props: {
  caption: string,
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning',
  editable: boolean, // 是否默认启动编辑(当需要添加的时候则默认启动编辑)

  onChange: (before: string, after: string) => void, // 将 before 标签修改为了 after 标签
  onRemove: (caption: string) => void, // 删除了 caption 标签
}) {
  const [inputValue, setInputValue] = useState(props.caption);
  const [edit, setEdit] = useState(props.editable);

  useEffect(() => { setInputValue(props.caption) }, [props.caption]);

  function finishEdit() {
    setEdit(false);
    if (!inputValue || !inputValue.trim()) {
      // 放弃修改
      setInputValue(props.caption);
    } else {
      // 触发修改事件
      props.onChange(props.caption, inputValue.trim())
    }
  }

  const label = edit ? (<div style={{ position: 'relative' }}>
    <span style={{ display: 'inline-block', width: '100%', height: '100%', visibility: 'hidden' }}>_{inputValue}</span>
    <input value={inputValue} style={{
      backgroundColor: 'transparent', outline: 'none',
      border: 'none', width: '100%', height: '100%', display: 'inline-block',
      position: 'absolute', left: 0, top: 0, color: 'inherit',
    }} autoFocus
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={finishEdit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          finishEdit();
          event.preventDefault();
        }
      }}
    />
  </div>) : inputValue;

  return (<Chip size="small" variant="filled" color={props.color} style={{ marginRight: 2 }}
    onDoubleClick={() => setEdit(true)}
    clickable={!edit}
    label={label}
    deleteIcon={edit ? <DoneIcon /> : undefined}
    onDelete={() => {
      if (edit) {
        // 完成编辑
        finishEdit();
      } else {
        // 执行删除操作
        props.onRemove(props.caption);
      }
    }}
  />);
}

function CaptionEditorBox(props: {
  // 将图片的标签取交集或者并集
  captions: string[], // 要编辑的所有标签
  addable?: boolean, // 通过父组件传入, 配合 onAddCaption 事件

  onAddCaption?: (caption: string) => void,
  onRemoveCaption?: (caption: string) => void,
  onChangeCaption?: (before: string, after: string) => void,
} = {
    addable: false,
    captions: [],
  }) {
  // 用于过滤标签
  const [filterText, setFilterText] = useState<string>('');
  const [filteredCaptions, setFilteredCaptions] = useState<string[]>(props.captions);

  useEffect(() => {
    setFilterText('');
    setFilteredCaptions(props.captions);
  }, [props.captions]);

  // 控制添加部分的显示
  const [adding, setAdding] = useState(false);

  const captionList = (filteredCaptions.map(caption =>
    <EditableChip editable={false} color="default" caption={caption}
      onRemove={(removedCaption: string) => {
        // 向上传递
        props.onRemoveCaption?.(removedCaption);
      }}

      onChange={(before, after) => {
        props.onChangeCaption?.(before, after);
      }} />));


  return (<div style={{ marginBottom: 2, marginTop: 2 }}>

    {/* 过滤器  */}
    <TextField fullWidth size="small" variant="standard" label="search" value={filterText} onChange={(e) => {
      setFilterText(e.target.value);
      const filtered = props.captions.filter(caption => caption.toLocaleLowerCase().includes(e.target.value.toLocaleLowerCase()));
      setFilteredCaptions(filtered);
    }} />

    <div style={{ maxHeight: '30vh', overflowY: 'auto', }}>

      {
        captionList
      }
      {
        // 只有当可以添加标签的时候才显示添加按钮
        props.addable ? (adding ? <EditableChip editable={true} color="default" caption="add new label"
          onRemove={() => { }}
          onChange={(_, after) => {/**新建标签 */
            setAdding(false);
            props.onAddCaption?.(after);
          }} />
          : <IconButton color="default" size="small" onClick={() => setAdding(true)}><AddIcon /></IconButton>) : ''
      }


    </div>
  </div>);
}



function intersection<T>(array1: T[], array2: T[]): T[] {
  return array1.filter(element => array2.includes(element));
}

function union<T>(arr1: T[], arr2: T[]): T[] {
  return [...new Set([...arr1, ...arr2])];
}


function getAllCaptionsFromFilter(filter: FilterState): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const image of filter.images) {
    result.set(image.path, image.captions);
  }
  return result;
}

function getTotalCaptionsAndCommonCaptionsFromImageCaptions(image_captions: Map<string, string[]>): { total_captions: string[], common_captions: string[] } {
  let total_captions: string[] = [];
  for (const captions of image_captions.values()) {
    total_captions = union(total_captions, captions);
  }
  total_captions = total_captions.sort();
  let common_captions: string[] = [...total_captions];
  for (const captions of image_captions.values()) {
    common_captions = intersection(common_captions, captions);
  }
  common_captions = common_captions.sort();

  return {
    total_captions, common_captions,
  };
}


interface CaptionState {
  total_captions: string[],
  common_captions: string[],
  image_captions: Map<string, string[]>,
}

function CaptionEditorCard({
  filter,
  imageset_name,
  is_regular,
  concept_name,
  repeat,
}: {
  filter: FilterState,
  imageset_name: string,
  is_regular: boolean,
  concept_name: string,
  repeat: number,
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();


  // 第一步, 计算所有标签的交集
  const image_captions = getAllCaptionsFromFilter(filter);
  const { total_captions, common_captions } = getTotalCaptionsAndCommonCaptionsFromImageCaptions(image_captions);

  const [captionState, setCaptionState] = useState<CaptionState>({
    total_captions, common_captions, image_captions
  });

  const openImage = useSelector((state: RootState) => state.openImage.image);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);


  useEffect(() => {
    if (dirty) {
      const response = window.confirm("do you want to save your work?");
      if (response) { save(); }
    }
    const image_captions = getAllCaptionsFromFilter(filter);
    const { total_captions, common_captions } = getTotalCaptionsAndCommonCaptionsFromImageCaptions(image_captions);
    setCaptionState({
      image_captions, total_captions, common_captions,
    });
  }, [filter]);


  async function reload() {
    try {
      const result = await api.load_concept(imageset_name, is_regular, concept_name, repeat);
      dispatch(loadConcept(result));
    } catch (err: any) {
      dispatch(addMessage({ msg: exception2string(err), severity: 'error' }));
    }

  }

  async function save() {
    setLoading(true);
    // 调用保存api
    try {
      await api.save_tags(captionState.image_captions);
    } catch (err: any) {
      dispatch(addMessage({ msg: exception2string(err), severity: 'error' }));
      setLoading(false);
      return;
    }

    await reload();
    setLoading(false);

    setDirty(false);
  }

  function updateImageCaptions(image: ImageState, captions: string[]) {
    setDirty(true);
    // 直接修改对应图片的字幕
    const image_captions = new Map(captionState.image_captions);
    image_captions.set(image.path, captions);
    const { total_captions, common_captions } = getTotalCaptionsAndCommonCaptionsFromImageCaptions(image_captions);
    setCaptionState({
      image_captions, total_captions, common_captions,
    });
  }

  function addCaption(caption: string) {
    setDirty(true);
    // 所有图片都添加一个 caption
    const image_captions = new Map<string, string[]>();
    for (const [key, value] of captionState.image_captions) {
      image_captions.set(key, Array.from(new Set([...value, caption])));
    }
    const { total_captions, common_captions } = getTotalCaptionsAndCommonCaptionsFromImageCaptions(image_captions);
    setCaptionState({
      image_captions, total_captions, common_captions,
    });
  }

  function removeCaption(caption: string) {
    setDirty(true);
    // 所有图片都删除一个 caption
    const image_captions = new Map<string, string[]>();
    for (const [key, value] of captionState.image_captions) {
      const captions = value.filter(item => item !== caption);
      image_captions.set(key, Array.from(new Set(captions)));
    }
    const { total_captions, common_captions } = getTotalCaptionsAndCommonCaptionsFromImageCaptions(image_captions);
    setCaptionState({
      image_captions, total_captions, common_captions,
    });
  }

  function changeCaption(before: string, after: string) {
    setDirty(true);
    // 所有图片都修改一个 caption
    const image_captions = new Map<string, string[]>();
    for (const [key, value] of captionState.image_captions) {
      const captions = value.map(item => {
        if (item === before) { return after; }
        else { return item; }
      });
      image_captions.set(key, Array.from(new Set(captions)));
    }
    const { total_captions, common_captions } = getTotalCaptionsAndCommonCaptionsFromImageCaptions(image_captions);
    setCaptionState({
      image_captions, total_captions, common_captions,
    });
  }

  return (
    <Card sx={{ backgroundColor: 'rgba(255, 255, 255, 0.85)' }}>
      <CardContent>
        <Typography
          variant="h5"
          noWrap
          component="div"
          sx={{
            mr: 2,
            display: { xs: 'none', md: 'flex' },
            fontFamily: 'monospace',
            fontWeight: 700,
            letterSpacing: '.3rem',
            color: 'inherit',
            textDecoration: 'none',
          }}
        >Tag Editor</Typography>
      </CardContent>
      {
        !openImage ? <><CardContent>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 400,
              letterSpacing: '.1rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >Commom Tags</Typography>
          <CaptionEditorBox captions={captionState.common_captions} addable
            onRemoveCaption={(caption: string) => {
              removeCaption(caption);
            }}
            onAddCaption={(caption: string) => {
              addCaption(caption);
            }}
            onChangeCaption={(before, after) => {
              changeCaption(before, after);
            }}
          ></CaptionEditorBox>
        </CardContent>
          <CardContent>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                mr: 2,
                display: { xs: 'none', md: 'flex' },
                fontFamily: 'monospace',
                fontWeight: 400,
                letterSpacing: '.1rem',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >Total Tags</Typography>
            <CaptionEditorBox captions={captionState.total_captions}
              onRemoveCaption={(caption: string) => removeCaption(caption)}
              onChangeCaption={(before: string, after: string) => changeCaption(before, after)}
            ></CaptionEditorBox>
          </CardContent></> : <CardContent>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 400,
              letterSpacing: '.1rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >Image Tags</Typography>
          <CaptionEditorBox addable captions={captionState.image_captions.get(openImage.path) || []}
            onAddCaption={(caption) => {
              // 构造出新的字幕
              const origin_captions = captionState.image_captions.get(openImage.path) || [];
              const captions = Array.from(new Set([...origin_captions, caption]));
              updateImageCaptions(openImage, captions);
            }}
            onRemoveCaption={(caption) => {
              const origin_captions = captionState.image_captions.get(openImage.path) || [];
              const captions = origin_captions.filter(item => item !== caption);
              updateImageCaptions(openImage, captions);
            }}
            onChangeCaption={(before, after) => {
              const origin_captions = captionState.image_captions.get(openImage.path) || [];
              const captions = origin_captions.map(item => {
                if (item === before) {
                  return after;
                } else {
                  return item;
                }
              });
              updateImageCaptions(openImage, captions);
            }}
          ></CaptionEditorBox>
        </CardContent>
      }

      <CardActions>
        <Button size="small" color="primary" variant="contained"
          onClick={() => {
            save().finally(() => {
              // 跳转
            });
          }}
        >
          Save
        </Button>
        <Button size="small" color="secondary" variant="contained"
          onClick={() => {
            if (dirty) {
              const response = window.confirm("do you want to save your work?");
              if (response) { save(); }
            }
            dispatch(closeImage());
            navigate(-1);
          }}
        >
          Return
        </Button>
      </CardActions>

      <Backdrop
        sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 10 })}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

    </Card>
  );
}



function CaptionEditor({
  imageset_name, is_regular, concept_name, repeat,
}: {
  imageset_name: string,
  is_regular: boolean,
  concept_name: string,
  repeat: number,
}) {
  const { filter_name = 'all' } = useParams();

  const filter_name_list = useSelector(selectFilterNameList);
  const filters = useSelector((state: RootState) => state.concept.filters);
  const [currentFilter, setCurrentFilter] = useState<FilterState>(getFilterByName(filters, `[${filter_name}]`));
  const [column, setColumn] = useState(10);

  useEffect(() => {
    const _filter_name = `[${filter_name}]`;
    setCurrentFilter(getFilterByName(filters, _filter_name));
  }, [filters, filter_name]);



  const height = '80vh';
  return (
    <Grid container spacing={1} sx={{ marginLeft: 1, marginRight: 1 }}>
      <Grid size={9}>
        <Paper elevation={3} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.85)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Select
              labelId="demo-simple-select-standard-label"
              id="demo-simple-select-standard"
              label="concept or selection"
              variant="standard"
              size="small"
              value={currentFilter.name}
              sx={{ m: 1, minWidth: 180 }}
              onChange={(event) => {
                const filter_name = event.target.value;
                setCurrentFilter(getFilterByName(filters, filter_name));
              }}
            >
              {
                filter_name_list.map((name, index) => <MenuItem key={index} value={name}>
                  {name}
                </MenuItem>)
              }
            </Select>
            <div style={{ flex: 1 }}>
              current images: <b>{currentFilter.images.length}</b>
            </div>
            <Slider
              size="small"
              defaultValue={column}
              value={column}
              onChange={(_, value) => setColumn(value as number)}
              valueLabelDisplay="off"
              sx={{ maxWidth: 120, margin: 1, }}
              max={16}
              min={4}
            />
          </Box>
          <ImageGallery images={currentFilter.images} height={height} enableFullscreen badge></ImageGallery>
        </Paper>
      </Grid>

      {/* 似乎需要拆分为不同的组件 */}
      <Grid size={3}>
        <CaptionEditorCard
          imageset_name={imageset_name} is_regular={is_regular} concept_name={concept_name} repeat={repeat}
          filter={currentFilter}></CaptionEditorCard>
      </Grid>
    </Grid>
  );
}

export default CaptionEditor;

