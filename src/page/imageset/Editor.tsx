import { Backdrop, Box, CircularProgress, Container, Divider, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Slider, Toolbar, Tooltip } from "@mui/material";
import ImageGallery from "./ImageGallery";
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ClosedCaptionIcon from '@mui/icons-material/ClosedCaption';
import EditNoteIcon from '@mui/icons-material/EditNote';
import TransformIcon from '@mui/icons-material/Transform';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import CalculateIcon from '@mui/icons-material/Calculate';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import FolderDeleteIcon from '@mui/icons-material/FolderDelete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import { useNavigate, useParams } from "react-router-dom";
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { addFilter, FilterState, loadConcept, removeFilter, updateImages } from "../../app/conceptSlice";
import api from "../../api";
import CreateDialog from "../dialog/CreateDialog";
import AddImageDialog from "../dialog/AddImagesDialog";
import TaggerDialog from "../dialog/TaggerDialog";
import { SimilarImageState } from "./SimilarImageEditor";
import SelectionOperatorDialog from "../dialog/SelectionOperatorDialog";
import { ImageSetState, ImageState, setImageSet } from "../../app/imageSetSlice";
import MoveDialog from "../dialog/MoveDialog";
import { exception2string } from "../../utils";
import { addMessage } from "../../app/messageSlice";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import UpscaleDialog from "../dialog/UpscaleDialog";


export const selectFilterNameList = createSelector(
  (state: RootState) => state.concept.filters,
  (filters) => filters.map(filter => filter.name),
);

export function getFilterByName(filters: FilterState[], filter_name: string): FilterState {
  return filters.find(filter => filter.name === filter_name) || { name: '<error>', images: [] };
}

function Tool({
  imageset_name, concept_name, is_regular, repeat, filter
}: {
  imageset_name: string,
  concept_name: string,
  is_regular: boolean,
  repeat: number,
  filter: FilterState,
}) {
  const openImage: ImageState | null = useSelector((state: RootState) => state.openImage.image);

  async function reload() {
    try {
      const result = await api.load_concept(imageset_name, is_regular, concept_name, repeat);
      dispatch(loadConcept(result));
      dispatch(updateImages());
    } catch (err: any) {
      dispatch(addMessage({ msg: exception2string(err), severity: 'error' }));
    }
  }

  async function reload2() {
    await reload();
    const { train, regular } = await api.get_imageset_metadata(imageset_name);
    const imageset: ImageSetState = {
      name: imageset_name,
      src: train,
      reg: regular
    };
    dispatch(setImageSet(imageset));
  }

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const ty = is_regular ? "reg" : "src";


  const [loading, setLoading] = useState(false);

  const [createDialog, setCreateDialog] = useState(false);
  const [addImageDialog, setAddImageDialog] = useState(false);
  const [taggerDialog, setTaggerDialog] = useState(false);
  const [operatorDialog, setOperatorDialog] = useState(false);
  const [moveDialog, setMoveDialog] = useState(false);
  const [upscaleDialog, setUpscaleDialog] = useState(false);


  async function flip(horizontal: boolean) {
    setLoading(true);
    let images: ImageState[] = [];
    if (openImage) {
      // 水平反转所选图片
      images = [openImage];
    } else {
      // 水平反转所有图片
      images = filter.images;
    }

    try {
      await api.flip_images(images, horizontal);
      await reload();
    } catch (err: any) {
      dispatch(addMessage({ msg: exception2string(err), severity: 'error' }));
    }
    setLoading(false);
  }

  async function delete_images(images: ImageState[]) {
    setLoading(true);
    try {
      await api.delete_images(images);
      await reload();

      navigate(`/concept/${imageset_name}/${is_regular ? "reg" : "src"}/${concept_name}/${repeat}/all`, { replace: true });
    } catch (err: any) {
      dispatch(addMessage({ msg: exception2string(err), severity: 'error' }));
    }
    setLoading(false);
  }

  return (
    <Toolbar variant="dense">
      {/* 直接在这里定义操作按钮 */}
      <Tooltip title="create selection"><IconButton color="success" size="small"
        onClick={() => {
          const filter_name = filter.name.substring(1, filter.name.length - 1);
          navigate(`/selection-editor/${imageset_name}/${ty}/${concept_name}/${repeat}/${filter_name}`);
        }}
      ><FilterAltIcon /></IconButton></Tooltip>
      <Tooltip title="selection operator"><IconButton color="success" size="small"
        onClick={() => setOperatorDialog(true)}
      ><CalculateIcon /></IconButton></Tooltip>
      <Divider orientation="vertical" flexItem />
      <Tooltip title="detect duplicate images"
        onClick={() => {
          setLoading(true);
          api.detect_similar_images(filter.images, 0.9).then((similar_images: SimilarImageState[][]) => {
            if (similar_images.length > 0) {
              navigate(`/concept/${imageset_name}/${ty}/${concept_name}/${repeat}/${filter.name.substring(1, filter.name.length - 1)}/similar-image-editor`, { state: { similar_images } });
            }
            else {
              window.alert('did not found similar images.');
            }
          }).catch((err: any) => dispatch(addMessage({ msg: exception2string(err), severity: 'error' }))).finally(() => setLoading(false));
        }}
      ><IconButton color="error" size="small"><ImageSearchIcon /></IconButton></Tooltip>
      <Divider orientation="vertical" flexItem />
      <Tooltip title="create new concept" onClick={() => setCreateDialog(true)}><IconButton color="info" size="small"><CreateNewFolderIcon /></IconButton></Tooltip>
      <Tooltip title="add images for current concept" onClick={() => setAddImageDialog(true)}><IconButton color="info" size="small"><AddIcon /></IconButton></Tooltip>
      <Divider orientation="vertical" flexItem />


      <Tooltip title="convert image format and rename for open concept" onClick={() => {
        setLoading(true);
        api.rename_and_convert(imageset_name, is_regular, `${repeat}_${concept_name}`).then(() => {
          reload().then(() => {
            setLoading(false);
          });
        }).catch((err: any) => dispatch(addMessage({ msg: exception2string(err), severity: 'error' })));
      }}><IconButton color="secondary" size="small"><TransformIcon /></IconButton></Tooltip>
      {
        (filter.name !== '[all]' || openImage) ? <Tooltip title="move current images to"
        ><IconButton color="secondary" size="small" onClick={() => setMoveDialog(true)}><DriveFileMoveIcon /></IconButton></Tooltip> : <></>
      }
      {
        filter.name !== "[all]" ? <>
          <Tooltip title="remove selection(keep the image)"
            onClick={() => {
              const respone = window.confirm(`do you want to delete selection ${filter.name}`);
              if (respone) {
                // 直接删除对应的 selection 即可
                dispatch(removeFilter(filter.name));
                navigate(`/concept/${imageset_name}/${is_regular ? "reg" : "src"}/${concept_name}/${repeat}/all`, { replace: true });
              }
            }}
          ><IconButton color="secondary" size="small"><DeleteIcon /></IconButton></Tooltip>
          <Tooltip title="delete images in current selection"
            onClick={() => {
              const response = window.confirm(`do you want to delete all images in ${filter.name}`);
              if (response) {
                setLoading(true);
                const name = filter.name;
                dispatch(removeFilter(name));
                delete_images(filter.images);
              }
            }}
          ><IconButton color="secondary" size="small"><FolderDeleteIcon /></IconButton></Tooltip>


        </> : <></>
      }
      {
        openImage ? <>
          <Tooltip title="delete current open image"
            onClick={() => {
              const response = window.confirm(`do you want to delete opened image ${openImage.filename}`);
              if (response) {
                delete_images([openImage]);
              }
            }}
          ><IconButton color="secondary" size="small"><DeleteForeverIcon /></IconButton></Tooltip>
        </> : <></>
      }
      <Divider orientation="vertical" flexItem />





      <Tooltip title="tag current images" onClick={() => setTaggerDialog(true)}>
        <IconButton color="warning" size="small"><ClosedCaptionIcon /></IconButton></Tooltip>
      <Tooltip title="edit captions" onClick={() => {
        if (openImage) {
          // 对该图片进行标签编辑
          dispatch(addFilter({
            name: `[${openImage.filename}]`,
            images: [openImage],
          }));
          navigate(`/concept/${imageset_name}/${ty}/${concept_name}/${repeat}/${openImage.filename}/caption-editor`)
        } else {
          navigate(`/concept/${imageset_name}/${ty}/${concept_name}/${repeat}/${filter.name.substring(1, filter.name.length - 1)}/caption-editor`)
        }

      }}
      ><IconButton color="warning" size="small"><EditNoteIcon /></IconButton></Tooltip>

      <Divider orientation="vertical" flexItem />




      <Tooltip title="cut images"><IconButton color="primary" size="small"
        onClick={() => {
          if (openImage) {
            navigate(`/concept/${imageset_name}/${ty}/${concept_name}/${repeat}/${filter.name.substring(1, filter.name.length - 1)}/single-cropper-editor`);
          }
          else {
            navigate(`/concept/${imageset_name}/${ty}/${concept_name}/${repeat}/${filter.name.substring(1, filter.name.length - 1)}/cropper-editor`);
          }
        }}
      ><ContentCutIcon /></IconButton></Tooltip>
      <Tooltip title="upscale images"><IconButton color="primary" size="small"
        onClick={() => setUpscaleDialog(true)}
      ><ZoomInIcon /></IconButton></Tooltip>
      <Tooltip title="horizontal flip images"
        onClick={() => flip(true)}
      ><IconButton color="primary" size="small"><SwapHorizIcon /></IconButton></Tooltip>
      <Tooltip title="vertical flip images" onClick={() => flip(false)}
      ><IconButton color="primary" size="small"><SwapVertIcon /></IconButton></Tooltip>

      <CreateDialog open={createDialog} imageset_name={imageset_name} type={is_regular ? 'regular' : 'train'}
        onClose={() => { setCreateDialog(false); }} onSubmit={() => {
          reload2();
        }} />
      <AddImageDialog open={addImageDialog} imageset_name={imageset_name} is_regular={is_regular} concept_folder={`${repeat}_${concept_name}`}
        onClose={() => { setAddImageDialog(false); }} onSubmit={reload} />

      <TaggerDialog open={taggerDialog} filter={filter} openImage={openImage} imageset_name={imageset_name}
        is_regular={is_regular} concept_name={concept_name} repeat={repeat}
        onClose={() => { setTaggerDialog(false); }} onSubmit={() => {
          reload();
        }} />
      <SelectionOperatorDialog open={operatorDialog} onClose={() => setOperatorDialog(false)}
        onSubmit={(name) => {
          navigate(`/concept/${imageset_name}/${ty}/${concept_name}/${repeat}/${name}`);
        }}
      ></SelectionOperatorDialog>
      <MoveDialog open={moveDialog} filter={filter} openImage={openImage} imageset_name={imageset_name}
        is_regular={is_regular} concept_name={concept_name} repeat={repeat}
        onClose={() => { setMoveDialog(false); }} onSubmit={() => {
          reload2();
        }}></MoveDialog>
      <UpscaleDialog open={upscaleDialog} filter={filter} openImage={openImage} imageset_name={imageset_name}
        is_regular={is_regular} concept_name={concept_name} repeat={repeat} onSubmit={reload}
        onClose={() => { setUpscaleDialog(false); }} />


      <Backdrop
        sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 10 })}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Toolbar>
  );
}


function Editor({
  imageset_name, concept_name, repeat, is_regular
}: {
  imageset_name: string,
  concept_name: string,
  repeat: number,
  is_regular: boolean,
}) {
  const filter_name_list = useSelector(selectFilterNameList);
  const images = useSelector((state: RootState) => state.concept.images);
  const filters = useSelector((state: RootState) => state.concept.filters);


  const [column, setColumn] = useState(10);



  const { filter_name = 'all' } = useParams();
  
  
  const [sortMethod, setSortMethod] = useState(0);
  const sortMethodList = [
    (a: ImageState, b: ImageState): number => a.filename.localeCompare(b.filename),
    (a: ImageState, b: ImageState): number => b.filename.localeCompare(a.filename),
    (a: ImageState, b: ImageState): number => a.width - b.width,
    (a: ImageState, b: ImageState): number => b.width - a.width,
    (a: ImageState, b: ImageState): number => a.height - b.height,
    (a: ImageState, b: ImageState): number => b.height - a.height,
  ];
  
  const f = getFilterByName(filters, `[${filter_name}]`);
  const [currentFilter, setCurrentFilter] = useState<FilterState>({ ...f, images: f.images.slice().sort(sortMethodList[sortMethod])});
  


  useEffect(() => {
    const _filter_name = `[${filter_name}]`;
    const f = getFilterByName(filters, _filter_name);
    setCurrentFilter({ ...f, images: f.images.slice().sort(sortMethodList[sortMethod])});
  }, [filters, filter_name]);

  const height = '80vh';

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
          total images: <b>{images.length}</b>, current images: <b>{currentFilter.images.length}</b>
          <Box sx={{ flex: 1 }}></Box>
          <Tool filter={currentFilter} imageset_name={imageset_name} repeat={repeat} is_regular={is_regular} concept_name={concept_name} />
          
          {/* 排序方式 */}
          <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
            <InputLabel id="demo-simple-select-standard-label">sort method</InputLabel>
            <Select
              labelId="image-sort-method"
              id="image-sort-method"
              value={sortMethod}

              onChange={(e) => {
                const index = e.target.value as number;
                setSortMethod(index);
                const sortMethod = sortMethodList[index];
                console.log(sortMethod);
                setCurrentFilter((state) => ({ ...state, images: state.images.slice().sort(sortMethod) }));
              }}

              label="sort method"
            >
              <MenuItem value={0}>filename(asc)</MenuItem>
              <MenuItem value={1}>filename(desc)</MenuItem>
              <MenuItem value={2}>width(asc)</MenuItem>
              <MenuItem value={3}>width(desc)</MenuItem>
              <MenuItem value={4}>height(asc)</MenuItem>
              <MenuItem value={5}>height(desc)</MenuItem>
            </Select>
          </FormControl>
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
      <ImageGallery height={height} images={currentFilter.images} column={column} enableFullscreen badge></ImageGallery>
    </Paper>



  </Container>);
}


export default Editor;


