




// 包含一个header, header中包含数据集名称, 刷新按钮, 新建按钮, 保存按钮, 设置按钮, 帮助按钮

import { Backdrop, Box, Button, CircularProgress, Container, Divider, IconButton, ImageList, ImageListItem, MenuItem, Paper, Select, Slider, TextField } from "@mui/material";
import { ImageState } from "../../app/imageSetSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PercentCrop,
} from 'react-image-crop';

// 一定要记得导入 css
import 'react-image-crop/dist/ReactCrop.css';
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { selectFilterNameList } from "./Editor";
import { FilterState, updateImages } from "../../app/conceptSlice";
import { Close } from "@mui/icons-material";
import api from "../../api";
import { useDispatch } from "react-redux";
import { addMessage } from "../../app/messageSlice";
import { exception2string } from "../../utils";


export interface CropperImageState {
  image: ImageState,
  crop: PercentCrop | undefined,
};

interface CropperImageFilterState {
  name: string,
  images: CropperImageState[],
};

function getFilterByName(filters: FilterState[], filter_name: string): CropperImageFilterState {
  // 注意这里要添加 crop 这个数据结构
  const f = filters.find(filter => filter.name === filter_name);

  return f ? ({
    name: f.name,
    images: f.images.map(img => ({ image: img, crop: undefined })),
  }) : ({ name: '<error>', images: [] });
}

// 这个页面展示图片预览, 以及操作按钮, 点击操作按钮会跳转到对应的操作页面
function CropperEditor({
  imageset_name, is_regular, concept_name, repeat,

}: {
  imageset_name: string,
  is_regular: boolean,
  concept_name: string,
  repeat: number,
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { filter_name = 'all' } = useParams();
  const filter_name_list = useSelector(selectFilterNameList);
  const filters = useSelector((state: RootState) => state.concept.filters);
  const [currentFilter, setCurrentFilter] = useState<CropperImageFilterState>(getFilterByName(filters, `[${filter_name}]`));

  useEffect(() => {
    const _filter_name = `[${filter_name}]`;
    setCurrentFilter(getFilterByName(filters, _filter_name));
  }, [filters, filter_name]);


  const timestamp = useSelector((state: RootState) => state.concept.time);


  function CropperItem({ image, aspect }: { image: CropperImageState, aspect?: number | undefined }) {
    function centerAspectCrop(
      mediaWidth: number,
      mediaHeight: number,
      aspect: number,
    ) {
      return centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 100,
          },
          aspect,
          mediaWidth,
          mediaHeight,
        ),
        mediaWidth,
        mediaHeight,
      )
    }
    const imgRef = useRef<HTMLImageElement>(null);
    const [crop, setCrop] = useState<Crop | undefined>(undefined);
    // 加载图片的时候就直接设置
    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
      const { width, height } = e.currentTarget;
      if (aspect) {
        const crop: PercentCrop = centerAspectCrop(width, height, aspect);
        image.crop = crop;
        setCrop(crop);
      } else {
        // 直接覆盖整个图片
        const crop: PercentCrop = { x: 0, y: 0, width: 100, height: 100, unit: '%' };
        image.crop = crop;
        setCrop(crop);
      }
    }

    return (
      <ImageListItem>
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(_, percentCrop) => {
            image.crop = percentCrop;
          }}
          aspect={aspect} // 宽高比, 设置为 undefined 表示自由
          minWidth={50}
          minHeight={50}
        >
          <img
            ref={imgRef}
            alt="Crop me"
            src={`${image.image.thumbnail}?t=${timestamp}`}
            onLoad={onImageLoad}
          />
          {/* 能否添加一个按钮 */}
          <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
            <IconButton size="small" onClick={() => {
              setCrop(undefined);
              image.crop = undefined;
            }}>
              <Close />
            </IconButton>
          </div>
        </ReactCrop>
      </ImageListItem>
    );
  }


  const [column, setColumn] = useState(6);
  const [loading, setLoading] = useState(false);

  // 对于自定义, 也只需要使用 aspect 作为 state 来进行滑动即可, 对于 custom, 直接输入宽高比即可
  const [aspect, setAspect] = useState<{ name: string, aspect: number | undefined, customWidth: number, customHeight: number }>({
    name: 'freedom',
    aspect: undefined, customWidth: 1, customHeight: 1,
  });
  const aspectMap: Map<string, number | undefined> = new Map([
    ['freedom', undefined],
    ['1:1', 1],
    ['16:9', 16 / 9],
    ['9:16', 9 / 16],
    ['7:5', 7 / 5],
    ['5:7', 5 / 7],
    ['5:4', 5 / 4],
    ['4:5', 4 / 5],
    ['4:3', 4 / 3],
    ['3:4', 3 / 4],
    ['3:2', 3 / 2],
    ['2:3', 2 / 3],
    ['2:1', 2 / 1],
    ['1:2', 1 / 2],
  ]);

  const height = '80vh';

  async function handle_cut() {
    const response = window.confirm('This operation is irreversible.');
    if (response) {
      setLoading(true);
      try {
        await api.cut_images(currentFilter.images.filter(image => image.crop));
      } catch(err: any) {
        dispatch(addMessage({msg: exception2string(err), severity: 'error'}));
      }
      
      dispatch(updateImages());
      navigate(-1);
      setLoading(false);
    }
  }

  return (<Container fixed maxWidth="xl">
    <Paper elevation={3}>
      <Box sx={{ display: 'flex', }}>
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

        <Box sx={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          images: <b>{currentFilter.images.length}</b>
          <Box sx={{ flex: 1 }}></Box>

          <Button color="secondary" size="small" variant="contained" sx={{ marginRight: 1 }}
            onClick={() => {
              const response = window.confirm("you will loose all your changes");
              if (response) navigate(-1);
            }}
          >return</Button>
          {/* 添加两个按钮, 裁剪和重置 */}
          <Button color="error" size="small" variant="contained" sx={{ marginRight: 1 }}
            onClick={() => {
              setCurrentFilter((state) => ({ ...state, images: state.images.map(image => ({ ...image, crop: undefined })) }));
            }}
          >reset</Button>
          <Button color="info" size="small" variant="contained" sx={{ marginRight: 1 }}
            onClick={handle_cut}
          >cut</Button>

          {/* 选择宽高比 */}
          <Select
            labelId="select-aspect"
            id="select-aspect"
            label="select aspect"
            variant="standard"
            size="small"
            value={aspect.name}
            sx={{ m: 1, minWidth: 96 }}
            onChange={(event) => {
              const aspect_name = event.target.value;
              const v = aspectMap.get(aspect_name);
              setAspect((state) => {
                if (aspect_name === "custom") {
                  return ({ ...state, name: aspect_name, aspect: state.customWidth / state.customHeight });
                }
                return ({ ...state, name: aspect_name, aspect: v });
              });
            }}
          >
            {
              Array.from(aspectMap.keys()).map((key, index) => <MenuItem key={index} value={key}>{key}</MenuItem>)
            }
            {/* 还需要再添加一个自定义 */}
            <MenuItem key={10000} value="custom">custom</MenuItem>
          </Select>
          {
            aspect.name === "custom" ?
              <>
                <Divider orientation="vertical" flexItem />
                <TextField
                  sx={{ width: 32 }}
                  variant="standard"
                  aria-label="repeat"
                  size="small"
                  value={aspect.customWidth}
                  onChange={(event) => {
                    const width = parseInt(event.target.value);
                    setAspect((state) => ({ ...state, customWidth: width, aspect: width / state.customHeight }));
                  }}
                  inputProps={{
                    step: 1,
                    min: 1,
                    max: 0xffffffff,
                    type: 'number',
                    style: { textAlign: 'center' },
                  }}
                />
                <b>:</b>
                <TextField
                  sx={{ width: 32 }}
                  variant="standard"
                  aria-label="repeat"
                  size="small"
                  value={aspect.customHeight}
                  onChange={(event) => {
                    const height = parseInt(event.target.value);
                    setAspect((state) => ({ ...state, customHeight: height, aspect: state.customWidth / height }));
                  }}
                  inputProps={{
                    step: 1,
                    min: 1,
                    max: 0xffffffff,
                    type: 'number',
                    style: { textAlign: 'center' }
                  }}
                />
                <Divider orientation="vertical" flexItem />
              </> : <></>
          }

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

      </Box>
      {/* 要裁剪的图片 */}
      <Box sx={{ maxHeight: height, height: height, overflowY: 'scroll', overflowX: 'hidden' }} >
        {currentFilter.images.length > 0 ? <ImageList variant="masonry" cols={column} gap={6} style={{ marginTop: 0, overflow: 'hidden', overflowY: 'hidden', overflowX: 'hidden' }} >
          {
            currentFilter.images.map((image, index) => <CropperItem key={index} image={image} aspect={aspect.aspect} />)
          }
        </ImageList> : <>no image found</>}
      </Box>
    </Paper>
    <Backdrop
        sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 10 })}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

  </Container>
  );
}

export default CropperEditor;





