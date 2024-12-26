

// 包含一个header, header中包含数据集名称, 刷新按钮, 新建按钮, 保存按钮, 设置按钮, 帮助按钮

import { Box, Chip, Grid2 as Grid, ImageList, ImageListItem } from "@mui/material";
import { useState } from "react";
import { ImageState } from "../../app/imageSetSlice";

import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';
import { useDispatch } from "react-redux";
import { closeImage, openImage } from "../../app/openImageSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";



// 这个页面展示图片预览, 以及操作按钮, 点击操作按钮会跳转到对应的操作页面
function ImageGallery({
  height,
  column = 8,
  images, // 图片需要从外面传递过来
  enableFullscreen = false,
  badge = false,
}: {
  height: string | number,
  column?: number,
  images: ImageState[],
  enableFullscreen?: boolean,
  badge?: boolean,
}) {
  const timestamp = useSelector((state: RootState) => state.concept.time);
  const dispatch = useDispatch();

  const [openImageIndex, setOpenImageIndex] = useState(-1);
  function ImageCard(props: { image: ImageState, index: number, }) {
    const [hovered, setHovered] = useState(false);
    function click_handler() {
      setOpenImageIndex(props.index);
      dispatch(openImage(props.image));
    }

    return (
      <>
        <ImageListItem key={props.image.path}
        >
          <img alt="fail to load" src={`${props.image.thumbnail}?t=${timestamp}`} // 显示缩略图算了
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
                    <Chip label={props.image.filename} size="small" variant="filled" color="success" />
                    <Chip label={props.image.concept} size="small" variant="filled" color="primary" />
                    <Chip label={`${props.image.width}x${props.image.height}`} size="small" variant="filled" color="secondary" />
                    {/* 添加图片大小 */}
                  </Grid> : <></>
              }
            </div> : <></>
          }
        </ImageListItem>
      </>
    );
  }
  const imagelist = (
    <ImageList variant="masonry" cols={column} gap={4} style={{ marginTop: 0, }} >
      {
        images.map((image, index) => <ImageCard key={index} image={image} index={index} />)
      }
    </ImageList>
  );
  function ImageCarousel({ images, openSlide }: { images: ImageState[], openSlide: number }) {
    return (
      <Carousel loop height={height} initialSlide={openSlide} withIndicators style={{ marginTop: `-${height}` }}
        onSlideChange={(index) => {  
          dispatch(openImage(images[index]));
        } }
      >
        {
          images.map((image, index) =>
            <Carousel.Slide key={index}>
              <img src={`${image.src}?t=${timestamp}`} alt="fail to load" style={{
                objectFit: 'contain', width: '100%', height: '100%',
                background: 'rgba(255, 255, 255, .2)',
                backdropFilter: 'blur(7px)',
              }}
                onClick={() => {
                  setOpenImageIndex(-1); 
                  dispatch(closeImage());
                }}
              />
            </Carousel.Slide>
          )
        }
      </Carousel>
    );
  }
  const carousel = (
    <ImageCarousel images={images} openSlide={openImageIndex} />
  );
  return (
    <Box >
      {/* 应该将 carousel 盖在 paper 上面 */}
      <Box sx={{
        maxHeight: height, height: height, overflow: 'scroll',
      }} >
        {images.length > 0 ? imagelist : <>no image found</>}
      </Box>

      {enableFullscreen && openImageIndex >= 0 ? carousel : <></>}
    </Box>
  );
}

export default ImageGallery;


