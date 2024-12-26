import { Container, Divider, Paper, Stack, Grid2 as Grid, IconButton, Chip, Button, Backdrop, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DeleteIcon from '@mui/icons-material/Delete';
import api from "../../api";
import { CheckCircle } from "@mui/icons-material";
import { ImageState } from "../../app/imageSetSlice";
import { RootState } from "../../app/store";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { addMessage } from "../../app/messageSlice";
import { exception2string } from "../../utils";


export interface SimilarImageState {
  src: string,
  thumbnail: string,
  filename: string,
  basename: string,
  path: string,
  size: number,
  width: number,
  height: number,
  is_selected: boolean | undefined | null;
};

function init(images: SimilarImageState[][]) {
  return images.map(images => {
    images.sort((a, b) => b.size - a.size).map((image, index) => {
      image.is_selected = index !== 0;
      return image;
    });
    return images;
  });
}


function SimilarImageEditor() {
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const timestamp = useSelector((state: RootState) => state.concept.time);

  const location = useLocation();
  const navigate = useNavigate();

  const { similar_images }: { similar_images: SimilarImageState[][] } = location.state;

  const [similarImages, setSimilarImages] = useState(init(similar_images));
  useEffect(() => {
    setSimilarImages(init(similar_images));
  }, [similar_images]);


  async function delete_image(image: SimilarImageState, i: number, j: number) {
    try {
      await api.delete_images([{
        ...image,
        captions: [],
        concept: "",
        repeat: 0,
      }]);
    } catch (err: any) {
      dispatch(addMessage({ msg: exception2string(err), severity: 'error' }));
      return;
    }
    // 删除 similarImages 的 i, j 这张图片
    const images = similarImages.map((li, index) => {
      if (index === i) {
        return li.filter((_, index) => index !== j);
      } else {
        return li;
      }
    });
    setSimilarImages(images.filter(li => li.length > 0));

  }

  async function delete_images(_: any) {
    const response = window.confirm("do you want to delete the seleted images");
    if (!response) {
      return;
    }

    setLoading(true);
    const images: ImageState[] = [];
    for (const imageList of similarImages) {
      for (const image of imageList) {
        if (image.is_selected) {
          images.push({
            ...image,
            captions: [],
            concept: "",
            repeat: 0,
          });
        }
      }
    }
    try {
      await api.delete_images(images);
    } catch (err: any) {
      dispatch(addMessage({ msg: exception2string(err), severity: 'error' }));
      setLoading(false);
      return;
    }


    const _images = similarImages.map((li) => li.filter(image => !image.is_selected)).filter(li => li.length > 0);
    setSimilarImages(_images);
    setLoading(false);
  }


  function Image({ image, index, i }: { image: SimilarImageState, index: number, i: number }) {
    const [selected, setSelected] = useState<boolean>(image.is_selected || false);
    return <div style={{ position: 'relative', height: 256, overflow: 'hidden' }}>
      <img style={{ objectFit: 'contain', }} src={`${image.src}?t=${timestamp}`} height={256} alt="x"
        onClick={() => {
          image.is_selected = !image.is_selected;
          setSelected(image.is_selected);
        }}
      ></img>
      <Grid spacing={1} container sx={{ margin: 1, position: 'absolute', bottom: 0, left: 0, }}>
        <Chip label={image.filename} size="small" variant="filled" color="success" />
        <Chip label={`${image.width}x${image.height}`} size="small" variant="filled" color="primary" />
        <Chip label={`${(image.size / 1024).toFixed(1)}KB`} size="small" variant="filled" color="secondary" />
      </Grid>
      <IconButton
        sx={{ position: 'absolute', top: 0, right: 0, }}
        size="small"
        color="default"
        onClick={() => delete_image(image, index, i)}
      >
        <DeleteIcon />
      </IconButton>

      {
        selected ? <IconButton
          sx={{ position: 'absolute', top: 0, left: 0, }}
          size="small"
          color="error"
          onClick={() => delete_image(image, index, i)}
        >
          <CheckCircle />
        </IconButton> : <></>
      }

    </div>
  }


  function SimilarImageList({
    images, index,
  }: { images: SimilarImageState[], index: number }) {
    return (<Paper elevation={3}  >
      <Stack direction={"row"} sx={{ overflowX: 'auto' }} divider={<Divider orientation="vertical" flexItem />}>
        {
          images.sort((a, b) => b.size - a.size).map((image, i) => <Image image={image} index={index} i={i}></Image>
          )
        }
      </Stack>
    </Paper>);
  }


  return (<>
    <Container fixed maxWidth="xl">
      <Grid container spacing={1} sx={{ marginBottom: 1 }}>
        <Button onClick={() => navigate(-1)} size="small" variant="contained">return</Button>
        <Button onClick={delete_images} size="small" variant="contained" color="error">delete selected</Button>
      </Grid>

      <Grid container spacing={2}>
        {
          similarImages.map((images, index) =>
            <SimilarImageList index={index} images={images} />
          )
        }</Grid>


      <Backdrop
        sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 10 })}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Container>
  </>);
}

export default SimilarImageEditor;



