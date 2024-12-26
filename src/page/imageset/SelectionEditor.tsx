import { AppBar, Breadcrumbs, Container, Toolbar, Tooltip, Typography } from "@mui/material";
import { Paper, Autocomplete, Avatar, Chip, Divider, FormControl, Grid2 as Grid, IconButton, ImageList, ImageListItem, InputLabel, MenuItem, Select, Slider, TextField } from "@mui/material";
import { useRef, useState } from "react";
import { ImageState } from "../../app/imageSetSlice";

import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';
import { CheckCircle, CloseFullscreen, Fullscreen } from "@mui/icons-material";
import { RootState } from "../../app/store";
import { createSelector } from "@reduxjs/toolkit";
import { useSelector } from "react-redux";
import VisibilityIcon from '@mui/icons-material/Visibility';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import TabUnselectedIcon from '@mui/icons-material/TabUnselected';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addFilter } from "../../app/conceptSlice";


// 可以将这个选择器放到外面的页面中，将对应的 filter_name 的图片作为属性传入进来
const selectImagesByFilterName = (filter_name: string) => createSelector(
  (state: RootState) => state.concept.filters,
  (filters) => filters.find(filter => filter.name === filter_name)?.images || [],
);


interface SelectableImageState {
  image: ImageState, // 必须包含一个指向原始图像的引用
  is_selected: boolean,
};

interface LabelState {
  content: string,
  frequency: number,
};




function getAllLabelsFromImages(images: SelectableImageState[]): LabelState[] {
  const label_count = new Map<string, number>();
  for (const image of images) {
    for (const caption of image.image.captions) {
      const cnt = label_count.get(caption);
      if (cnt) {
        label_count.set(caption, cnt + 1);
      } else {
        label_count.set(caption, 1);
      }
    }
  }

  const labels: LabelState[] = [];
  for (const [content, frequency] of label_count.entries()) {
    labels.push({ content, frequency, });
  }

  return labels;
}

function getAllImagesAndLabels(images: ImageState[]) {
  const _images = images.map(image => ({ image, is_selected: false }));

  const labels = getAllLabelsFromImages(_images);

  return {
    images: _images, labels,
  }
}




// 这个页面展示图片预览, 以及操作按钮, 点击操作按钮会跳转到对应的操作页面
function SelectionEditor({
  selectable = false,
  enableFullscreen = false,
  badge = false,
}: {
  selectable?: boolean,
  enableFullscreen?: boolean,
  badge?: boolean,
}) {
  const param = useParams();
  const imageset_name = param.imageset_name || 'error';
  const is_regular = param.type === 'reg';
  const concept_name = param.concept_name || 'error';
  const repeat = parseInt(param.repeat || "0") || 0;
  const filter_name = param.filter_name || 'all'; // 过滤名称

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [column, setColumn] = useState(12);


  // 获取到了所有的 concept 和 selection
  const images = useSelector(selectImagesByFilterName(`[${filter_name}]`)); // 获取所有图片

  // 当前的所有图片和所有标签
  const data = useRef(getAllImagesAndLabels(images));

  const [showCaptionFilter, setShowCaptionFilter] = useState(false);
  const [sortMethod, setSortMethod] = useState(0);
  const sortMethodList = [
    (a: LabelState, b: LabelState): number => b.frequency - a.frequency,
    (a: LabelState, b: LabelState): number => a.frequency - b.frequency,
    (a: LabelState, b: LabelState): number => b.content.localeCompare(a.content),
    (a: LabelState, b: LabelState): number => a.content.localeCompare(b.content),
  ];


  const [filteredImages, setFilteredImages] = useState<SelectableImageState[]>(data.current.images);
  const [selectedImageCount, setSelectedImageCount] = useState(0);

  const [selectedLabels, setSelectedLabels] = useState<LabelState[]>([]);
  const [selectableLabels, setSelectableLabels] = useState<LabelState[]>(data.current.labels.sort(sortMethodList[sortMethod]));


  const [openImageIndex, setOpenImageIndex] = useState(0);
  const timestamp = useSelector((state: RootState) => state.concept.time);

  function ImageCard(props: { image: SelectableImageState, index: number, selectable: boolean, }) {
    const [selected, setSelected] = useState(props.image.is_selected);
    const [hovered, setHovered] = useState(false);

    function click_handler() {
      if (!props.selectable) { return; }
      props.image.is_selected = !props.image.is_selected;
      // 这是修改自己的状态
      setSelected(props.image.is_selected);
      setSelectedImageCount(data.current.images.filter(image => image.is_selected).length);
    }

    return (
      <ImageListItem key={props.image.image.path}
      >
        <img src={`${props.image.image.thumbnail}?t=${timestamp}`} // 显示缩略图算了
          alt={props.image.image.filename}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          loading="lazy"
          onClick={click_handler}
        />

        {/* 蒙版就只是蒙版 */}
        {
          hovered ? <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to bottom,  rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.25) 30%, rgba(0,0,0,0) 75%)',
            pointerEvents: 'none',
          }} >
            {
              badge ?
                <Grid spacing={1} container sx={{ margin: 1, position: 'absolute', bottom: 0, left: 0, }}>
                  <Chip label={props.image.image.filename} size="small" variant="filled" color="success" />
                  <Chip label={props.image.image.concept} size="small" variant="filled" color="primary" />
                  {/* <Chip label={props.image.image.repeat} size="small" variant="filled" color="secondary" /> */}
                  <Chip label={`${props.image.image.width}x${props.image.image.height}`} size="small" variant="filled" color="secondary" />
                </Grid> : <></>
            }

          </div> : <></>
        }



        {
          props.selectable && selected ? <IconButton onClick={click_handler}
            sx={{ position: 'absolute', top: 0, left: 0, }}
            size="small" color="error" > <CheckCircle /> </IconButton> : <></>
        }

        {
          enableFullscreen ? <IconButton
            onClick={() => setOpenImageIndex(props.index)}
            sx={{ position: 'absolute', top: 0, right: 0, }}
            size="small"
            color="info"
          >
            <Fullscreen />
          </IconButton> : <></>
        }
      </ImageListItem>
    );
  }


  function ImageSlider({ image, index }: { image: SelectableImageState, index: number }) {
    const [selected, setSelected] = useState(image.is_selected);
    return (

      <Carousel.Slide key={index}>
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <img src={`${image.image.src}?t=${timestamp}`}
            alt={image.image.filename}
            style={{
              objectFit: 'contain', width: '100%', height: '100%',
              background: 'rgba(255, 255, 255, .27)',
              backdropFilter: 'blur(7px)',
            }}
            onDoubleClick={() => {
              image.is_selected = !image.is_selected;
              setSelected(image.is_selected);
              setSelectedImageCount(data.current.images.filter(image => image.is_selected).length);
            }}
          />

          <IconButton sx={{ position: 'absolute', top: 0, left: 0, }} onClick={() => {
            image.is_selected = !image.is_selected;
            setSelected(image.is_selected);
          }}
          ><CheckCircle color={selected ? "error" : "disabled"} /> </IconButton>

          <IconButton sx={{ position: 'absolute', top: 0, right: 0, }} onClick={() => setOpenImageIndex(-1)}
          ><CloseFullscreen /> </IconButton>
        </div>
      </Carousel.Slide>

    );
  }


  function updateImageListAndSelectableLabels(selectedLabels: LabelState[]) {
    // 注意, 是对所有的图片进行过滤, 提供一个反向过滤函数
    const images = data.current.images.filter(image => {
      for (const label of selectedLabels) {
        if (!image.image.captions.includes(label.content)) {
          return false;
        }
      }
      return true;
    });

    setFilteredImages(images);

    // 获取所有已选图片的标签, 如果是反向过滤,那么这里需要获取已选图片不包含的标签
    let caption_set = new Set<string>([]);
    for (const image of images) {
      caption_set = new Set([...caption_set, ...image.image.captions]);
    }
    // 去除所有已选标签
    for (const label of selectedLabels) {
      caption_set.delete(label.content);
    }

    // 最后计算得到可选标签
    const selectable_labels = data.current.labels.filter(label => caption_set.has(label.content)).sort(sortMethodList[sortMethod]);
    setSelectableLabels(selectable_labels);
  }

  function clearAllFilter() {
    // 清除所有过滤
    setSelectedLabels([]); // 删除所有已选标签
    setFilteredImages(data.current.images);
    setSelectableLabels(
      data.current.labels.sort(sortMethodList[sortMethod])
    );
  }

  function onLabelSelected(label: LabelState) {
    // 不要等state更新,先保存一份预先更新的 selectedLabels
    const _selectedLabels = [...selectedLabels, label].sort(sortMethodList[sortMethod]);
    // 将该标签标记为选中
    setSelectedLabels(_selectedLabels);

    updateImageListAndSelectableLabels(_selectedLabels);
  }

  function onLableUnselected(label: LabelState) {
    const _selectedLabels = selectedLabels.filter(_label => _label !== label);
    setSelectedLabels(_selectedLabels);
    updateImageListAndSelectableLabels(_selectedLabels);
  }



  const filter = (<div style={{ marginBottom: 5, marginLeft: 2, marginRight: 2, }}>

    {/* 首先来一个 switch(正向过滤或负向过滤), 一个输入框(搜索标签, 自动补全),  一个下拉菜单(排序方式), 一个清除按钮(重置) */}
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>

      {/* 自动补全 */}
      <Autocomplete renderInput={(params) => <TextField {...params} label="检索标签" variant="standard" />}
        style={{ flexGrow: 0.8 }}
        options={selectableLabels}
        onChange={(_, value) => {
          /**注意检查是否为空, 如果不为空则选择 e.target.value 这个标签 */
          if (value) {
            onLabelSelected(value);
          }
        }}
        getOptionLabel={(label) => label.content} size='small'></Autocomplete>

      {/* 排序方式 */}
      <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
        <InputLabel id="demo-simple-select-standard-label">排序方式</InputLabel>
        <Select
          labelId="demo-simple-select-standard-label"
          id="demo-simple-select-standard"
          value={sortMethod}

          onChange={(e) => {
            const index = e.target.value as number;
            setSortMethod(index);
            const sortMethod = sortMethodList[index];
            setSelectableLabels((labels) => labels.slice().sort(sortMethod));
            setSelectedLabels((labels) => labels.slice().sort(sortMethod));
          }}

          label="Age"
        >
          <MenuItem value={0}>频率(降序)</MenuItem>
          <MenuItem value={1}>频率(升序)</MenuItem>
          <MenuItem value={2}>字典(降序)</MenuItem>
          <MenuItem value={3}>字典(升序)</MenuItem>
        </Select>
      </FormControl>
      <IconButton size='small' onClick={clearAllFilter}
      > <ClearAllIcon /> </IconButton>
    </div>
    <div style={{ maxHeight: '80vh', overflow: 'scroll' }}>
      {
        // 已选标签
        selectedLabels.map((label, key) => <Chip avatar={<Avatar>{label.frequency}</Avatar>} key={key} color="primary"
          clickable variant='filled' size='small' label={label.content}
          onClick={() => onLableUnselected(label)} onDelete={() => onLableUnselected(label)} />)
      }
      {
        selectedLabels.length > 0 ? <Divider style={{ marginTop: 2 }} /> : ''
      }

      {
        // 可选标签
        selectableLabels.map((label, key) => <Chip avatar={<Avatar>{label.frequency}</Avatar>} key={key}
          clickable variant='outlined' size='small' label={label.content} onClick={() => onLabelSelected(label)} />)
      }
    </div>
  </div>);


  const height = '90vh';

  return (
    <>
      <Container fixed maxWidth="xl" >
        <AppBar position="fixed" color="default" >
          <Toolbar variant="dense">
            <Breadcrumbs aria-label="breadcrumb">
              <Typography
                variant="h6"
                noWrap
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '.3rem',
                  color: 'inherit',
                  textDecoration: 'none',
                }}
              >
                {imageset_name}
              </Typography>
              <Typography variant="h6" noWrap
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 600,
                }}
              >
                { is_regular ? "reg" : "src" }
              </Typography>

              <Chip variant="outlined" size="small" avatar={<Avatar>{repeat}</Avatar>} label={concept_name}
              />
              <Typography variant="h6" noWrap
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 600,
                }}
              >
                { filter_name }
              </Typography>
            </Breadcrumbs>

            <div style={{ flex:1 }}></div>
            <Grid container spacing={1} sx={{ flex: 1, display: 'flex', alignItems:'center' }}>
              <Tooltip title="show selected images">
                <IconButton size="small"
                  onClick={() => {
                    const images = data.current.images.filter(image => image.is_selected);
                    setFilteredImages(images);
                    setSelectableLabels(getAllLabelsFromImages(images));
                    setSelectedLabels([]);
                  }}
                > <VisibilityIcon /></IconButton>
              </Tooltip>

              <Tooltip title="show all images">
                <IconButton size="small"
                  onClick={() => clearAllFilter()}
                > <VisibilityOutlinedIcon /></IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem />
              <Tooltip title="select all below">
                <IconButton size="small"
                  onClick={() => {
                    const selected_images = filteredImages.map(image => {
                      image.is_selected = true;
                      return image;
                    });
                    setSelectedImageCount(data.current.images.filter(image => image.is_selected).length);
                    setFilteredImages(selected_images);
                  }}
                > <SelectAllIcon /></IconButton>
              </Tooltip>
              <Tooltip title="unselect all below">
                <IconButton size="small"
                  onClick={() => {
                    const selected_images = filteredImages.map(image => {
                      image.is_selected = false;
                      return image;
                    });
                    setSelectedImageCount(data.current.images.filter(image => image.is_selected).length);
                    setFilteredImages(selected_images);
                  }}
                > <TabUnselectedIcon /></IconButton>
              </Tooltip>

              <Tooltip title="reverse selection blow">
                <IconButton size="small"
                  onClick={() => {
                    const selected_images = filteredImages.map(image => {
                      image.is_selected = !image.is_selected;
                      return image;
                    });
                    setSelectedImageCount(data.current.images.filter(image => image.is_selected).length);
                    setFilteredImages(selected_images);
                  }}
                > <FlipCameraAndroidIcon /></IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem />
              <Tooltip title="reset">
                <IconButton size="small" color="error"
                  onClick={() => {
                    const response = selectedImageCount > 0 ? window.confirm('do you want to clear all your selection') : true;
                    if (response) {
                      data.current.images.forEach(image => image.is_selected = false);
                      setSelectedImageCount(0);
                      clearAllFilter();
                    }
                  }}
                > <RestartAltIcon /></IconButton>
              </Tooltip>
              <Tooltip title="return">
                <IconButton size="small" color="secondary"
                  onClick={() => {
                    const response = selectedImageCount > 0 ? window.confirm('do you want to clear all your selection') : true;
                    if (response) {
                      data.current.images.forEach(image => image.is_selected = false);
                      navigate(-1);
                    }
                  }}
                > <ChevronLeftIcon /></IconButton>
              </Tooltip>

              <Tooltip title="create">
                <IconButton size="small" color="success"
                  onClick={() => {
                    const images: ImageState[] = data.current.images.filter(image => image.is_selected).map(image => image.image) || [];
                    if (images.length <= 0) {
                      // 警告
                      window.alert('you have not select any images');
                      return;
                    }

                    let input = window.prompt('create a new selection', 'input your selection name');
                    while (input && input.trim() === 'all') {
                      input = window.prompt('create a new selection', 'input your selection name, can not be "all"');
                    }


                    if (input) {
                      input = input.trim();
                      const name = `[${input}]`;

                      dispatch(addFilter({
                        name,
                        images,
                      }));
                      navigate(`/concept/${imageset_name}/${is_regular ? "reg" : "src"}/${concept_name}/${repeat}/${input}`, { replace: true });
                    }
                  }}
                > <AddCircleIcon /></IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem />
              <div>
                <b>{selectedImageCount}</b> / <b>{data.current.images.length}</b>
              </div>
            </Grid>

            <Slider
              size="small"
              defaultValue={column}
              value={column}
              onChange={(_, value) => setColumn(value as number)}
              valueLabelDisplay="off"
              sx={{ maxWidth: 120, }}
              max={16}
              min={4}
            />
            <Tooltip title="filter by tags">
              <IconButton size="small" onClick={() => setShowCaptionFilter((prev) => !prev)} color="primary">
                {!showCaptionFilter ? <ExpandMoreIcon /> : <ExpandLessIcon />}
              </IconButton>
            </Tooltip>


          </Toolbar>

          {
            showCaptionFilter ? filter : <></>
          }
        </AppBar>
        <Toolbar />

        <Paper elevation={3} sx={{ maxHeight: height, height: height, overflow: 'scroll', backgroundColor: 'rgba(255,255,255,0.7)' }}>
          {
            filteredImages.length > 0 ? <ImageList variant="masonry" cols={column} gap={4} style={{ marginTop: 0 }} >
              {
                filteredImages.map((image, index) => <ImageCard key={index} image={image} index={index} selectable={selectable} />)
              }
            </ImageList> : <>no images</>
          }
        </Paper>


        {
          enableFullscreen && openImageIndex >= 0 ? <div style={{ height: height, marginTop: `-${height}`, }}>
            <Carousel loop initialSlide={openImageIndex} withIndicators height={height}>
              {
                filteredImages.map((image, index) =>
                  <ImageSlider image={image} index={index} />
                )
              }
            </Carousel></div> : <></>
        }


      </Container>
    </>);
}



export default SelectionEditor;


