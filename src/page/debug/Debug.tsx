import { ImageList, ImageListItem } from '@mui/material';
import React, { useState, useRef } from 'react'

import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
} from 'react-image-crop';

// 一定要记得导入 css
import 'react-image-crop/dist/ReactCrop.css'



// This is to demonstate how to make and center a % aspect crop
// which is a bit trickier so we use some helper functions.
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



function CropperItem({ url, aspect }: { url: string, aspect?: number | undefined }) {

  const imgRef = useRef<HTMLImageElement>(null);

  const [crop, setCrop] = useState<Crop>();

  // 加载图片的时候就直接设置
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget
      setCrop(centerAspectCrop(width, height, aspect))
    }
  }

  return (
    <ImageListItem>
      <ReactCrop
        crop={crop}
        onChange={(_, percentCrop) => setCrop(percentCrop)}
        onComplete={(pixCrop, percentCrop) => {
          console.log('complete');
          console.log(pixCrop);
          console.log(percentCrop);
        }}
        aspect={aspect} // 宽高比, 设置为 undefined 表示自由
        minWidth={50}
        minHeight={50}
      >
        <img
          ref={imgRef}
          alt="Crop me"
          src={url}
          onLoad={onImageLoad}
        />
      </ReactCrop></ImageListItem>
  );
}




export default function Debug() {
  const image_urls = [
    'http://localhost:1420/image/imageset-katana/src/8_katana/000000.jpeg?t=1734514712037',
    'http://localhost:1420/image/imageset-katana/src/8_katana/000001.jpeg?t=1734514712037',
    'http://localhost:1420/image/imageset-katana/src/8_katana/000002.jpeg?t=1734514712037',
    'http://localhost:1420/image/imageset-katana/src/8_katana/000003.jpeg?t=1734514712037',
    'http://localhost:1420/image/imageset-katana/src/8_katana/000004.jpeg?t=1734514712037',
    'http://localhost:1420/image/imageset-katana/src/8_katana/000005.jpeg?t=1734514712037',
    'http://localhost:1420/image/imageset-katana/src/8_katana/000006.jpeg?t=1734514712037',
    'http://localhost:1420/image/imageset-katana/src/8_katana/000007.jpeg?t=1734514712037',
    'http://localhost:1420/image/imageset-katana/src/8_katana/000008.jpeg?t=1734514712037',
    'http://localhost:1420/image/imageset-katana/src/8_katana/000009.jpeg?t=1734514712037',
  ];

  return (
    <div>
      {/* 这里展示图片 */}
      <ImageList variant="masonry" cols={8} gap={4} sx={{ marginTop: 0, overflow: 'hidden' }}>
        {
          image_urls.map(url => <CropperItem url={url} aspect={16 / 9} />)
        }
      </ImageList>

    </div>
  )
}
