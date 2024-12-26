import { Box, Button, Container, Divider, MenuItem, Select, TextField } from "@mui/material";
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
import { useNavigate } from "react-router-dom";
import { updateImages } from "../../app/conceptSlice";
import { useDispatch } from "react-redux";
import { addMessage } from "../../app/messageSlice";
import { exception2string } from "../../utils";
import api from "../../api";
import { closeImage } from "../../app/openImageSlice";







// 这个页面展示图片预览, 以及操作按钮, 点击操作按钮会跳转到对应的操作页面
function SingleCropperEditor({
  imageset_name, is_regular, concept_name, repeat,
}: {
  imageset_name: string,
  is_regular: boolean,
  concept_name: string,
  repeat: number,
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const timestamp = useSelector((state: RootState) => state.concept.time);
  const image = useSelector((state: RootState) => state.openImage.image);



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

  async function handle_cut() {
    const response = window.confirm('This operation is irreversible.');
    if (response) {

      if (image && crop) {
        try {
          await api.cut_images([{ image, crop: { ...crop, unit: '%' } }]);
        } catch (err: any) {
          dispatch(addMessage({ msg: exception2string(err), severity: 'error' }));
        }
      }
      dispatch(updateImages());
      navigate(-1);
      dispatch(closeImage());

    }
  }


  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  // 加载图片的时候就直接设置
  function onImageLoad() {
    reset();
  }

  function reset() {
    if(imgRef.current) {
      const { width, height } = imgRef.current;
      if (aspect.aspect) {
        const crop: PercentCrop = centerAspectCrop(width, height, aspect.aspect);
        setCrop(crop);
      } else {
        // 直接覆盖整个图片
        const crop: PercentCrop = { x: 0, y: 0, width: 100, height: 100, unit: '%' };
        setCrop(crop);
      }
    }
  }

  useEffect(() => {
    reset();
  }, [aspect.aspect]);

  return (<Container fixed maxWidth="xl">
    <Box sx={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button color="secondary" size="small" variant="contained" sx={{ marginRight: 1 }}
        onClick={() => {
          const response = window.confirm("you will loose all your changes");
          if (response) { 
            navigate(-1);
            dispatch(closeImage());
          }
        }}
      >return</Button>
      {/* 添加两个按钮, 裁剪和重置 */}
      <Button color="error" size="small" variant="contained" sx={{ marginRight: 1 }}
        onClick={() => {
          reset();
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
    </Box>






    {/* 要裁剪的图片, 仅仅一张 */}
    <Box sx={{ overflowX: 'hidden', display: 'flex', justifyContent: 'center' }} >
      <ReactCrop
        crop={crop}
        onChange={(_, percentCrop) => setCrop(percentCrop)}
        aspect={aspect.aspect} // 宽高比, 设置为 undefined 表示自由
        minWidth={50}
        minHeight={50}
        style={{ marginBottom: 10 }}
      >
        <img
          ref={imgRef}
          alt="Crop me"
          src={`${image?.src}?t=${timestamp}`}
          onLoad={onImageLoad}
        />
      </ReactCrop>
    </Box>
  </Container>
  );
}

export default SingleCropperEditor;





