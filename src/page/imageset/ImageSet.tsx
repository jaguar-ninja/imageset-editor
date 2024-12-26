import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import Header from "../header/Header";
import api from "../../api";
import { Backdrop, CircularProgress, Toolbar } from "@mui/material";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { loadConcept } from "../../app/conceptSlice";
import Editor from "./Editor";
import CaptionEditor from "./CaptionEditor";
import SimilarImageEditor from "./SimilarImageEditor";
import CropperEditor from "./ImageCropper";
import { addMessage } from "../../app/messageSlice";
import { exception2string } from "../../utils";
import { ImageSetState, setImageSet } from "../../app/imageSetSlice";
import SingleCropperEditor from "./SingleImageCropper";






function ImageSet() {
  const param = useParams();
  const imageset_name = param.imageset_name || 'error';
  const is_regular = param.type === 'reg';
  const concept_name = param.concept_name || 'error';
  const repeat = parseInt(param.repeat || "0") || 0;
  // const filter_name = `${param.filter || 'all'}`; // 默认是 all

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);


  async function rename_imageset(oldname: string, newname: string) {
    setLoading(true);
    try {
      await api.rename_imageset(oldname, newname);
      navigate(`/concept/${newname}/${param.type}/${concept_name}/${repeat}/all`);
    } catch (err: any) {
      dispatch(addMessage({ msg: exception2string(err), severity: 'error' }));
    }
    setLoading(false);
  }

  async function rename_concept(before: { name: string, repeat: number }, after: { name: string, repeat: number }) {
    setLoading(true);
    try {
      await api.rename_concept(imageset_name, is_regular, before.name, after.name, before.repeat, after.repeat);
      // 记得要重新加载 concept name
      const { train, regular } = await api.get_imageset_metadata(imageset_name);
      const imageset: ImageSetState = {
        name: imageset_name,
        src: train,
        reg: regular
      };
      dispatch(setImageSet(imageset));

      navigate(`/concept/${imageset_name}/${param.type}/${after.name}/${after.repeat}/all`);
    } catch (err: any) {
      dispatch(addMessage({ msg: exception2string(err), severity: 'error' }));
    }
    setLoading(false);
  }

  async function _delete() {
    const response = window.confirm(`do you want to delete ${repeat}_${concept_name}`);
    if (response) {
      setLoading(true);
      try {
        await api.delete_concept(imageset_name, is_regular, `${repeat}_${concept_name}`);
        navigate(`/overview/${imageset_name}`);
      } catch (err: any) {
        dispatch(addMessage({ msg: exception2string(err), severity: 'error' }));
      }
      setLoading(false);

    }
  }

  async function load() {
    // 加载
    setLoading(true);
    try {
      const result = await api.load_concept(imageset_name, is_regular, concept_name, repeat);
      dispatch(loadConcept(result));
      const { train, regular } = await api.get_imageset_metadata(imageset_name);
      const imageset: ImageSetState = { 
        name: imageset_name, 
        src: train, 
        reg: regular 
      };
      dispatch(setImageSet(imageset));
    } catch (err: any) {
      dispatch(addMessage({ msg: exception2string(err), severity: 'error' }));
    }

    setLoading(false);
  }

  useEffect(() => {
    // 每次路径变化后都需要修改
    load();
  },
    [imageset_name, is_regular, concept_name, repeat]);
  return (<>
    <Header
      imageset_name={imageset_name}
      concept={{ name: concept_name, repeat }}
      onRenameImageset={rename_imageset}
      onConceptChange={rename_concept}
      onDelete={_delete}
      onLoad={load}
    ></Header>

    <Backdrop
      sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 10 })}
      open={loading}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
    <Toolbar />


    <Routes>
      {/* 加入标签编辑页面 */}
      <Route path="/similar-image-editor" element={<SimilarImageEditor />} ></Route>
      <Route path="/caption-editor" element={<CaptionEditor
        imageset_name={imageset_name} is_regular={is_regular} repeat={repeat} concept_name={concept_name} />}></Route>
      <Route path="/cropper-editor" element={<CropperEditor
        imageset_name={imageset_name} is_regular={is_regular} repeat={repeat} concept_name={concept_name} />}></Route>
      <Route path="/single-cropper-editor" element={<SingleCropperEditor 
        imageset_name={imageset_name} is_regular={is_regular} repeat={repeat} concept_name={concept_name} />}></Route>
      <Route path="*" element={<Editor imageset_name={imageset_name} is_regular={is_regular} repeat={repeat} concept_name={concept_name} />}></Route>
    </Routes>

  </>);
}


export default ImageSet;

