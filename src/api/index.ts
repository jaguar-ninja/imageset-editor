// 将所有 eel 调用全部切换为 api 调用

import axios from "axios";
import { ImageSetMetadata } from "../page/imageset/Overview";
import { ImageState } from "../app/imageSetSlice";
import { FileWithPath } from "@mantine/dropzone";
import { ConceptState } from "../app/conceptSlice";
import { CropperImageState } from "../page/imageset/ImageCropper";


const port = window.api_port || 1420;
const host = window.api_host || 'localhost';


// 设置后端路径
axios.defaults.baseURL = `http://${host}:${port}`;

async function flip_images(images: ImageState[], horizontal: boolean) {
  await axios.put("/image/flip", { 
    images: images.map(image => image.path),
    horizontal,
  });
}

async function delete_imageset(imageset_name: string) {
  await axios.delete('/imageset/delete', { params: { name: imageset_name } })
}

async function delete_train(imageset_name: string) {
  await axios.delete('/imageset/delete/src', { params: { name: imageset_name } })
}

async function delete_regular(imageset_name: string) {
  await axios.delete('/imageset/delete/reg', { params: { name: imageset_name } })
}

async function create_imageset(imageset_name: string) {
  return (await axios.post('/imageset/create', {}, { params: { name: imageset_name } })).data;
}

async function delete_images(images: ImageState[]) {
  return (await axios.delete("/imageset/delete/images", {
    data: {
      filenames: images.map(image => image.path),
    }
  })).data;
}

async function find_imageset_list(): Promise<string[]> {
  let result: string[] = (await axios.get("/imageset")).data;
  return result;
}

async function rename_imageset(oldname: string, newname: string) {
  await axios.put("/imageset/rename", {}, { params: { origin_name: oldname, new_name: newname } })
}

async function rename_concept(imageset_name: string,  
  is_regular: boolean, origin_name: string, new_name: string, origin_repeat: number, new_repeat: number) {
  await axios.put("/imageset/rename_concept", {}, { 
    params: { imageset_name, is_regular,  origin_name, new_name, origin_repeat, new_repeat } });
}

type Metadata = { train: ImageSetMetadata, regular: ImageSetMetadata };
async function get_imageset_metadata(name: string): Promise<Metadata> {
  let result: Metadata = (await axios.get("/imageset/metadata", { params: { name } })).data
  return result;
}

async function add_concept(
  imageset_name: string,
  concept_name: string,
  repeat: number,
  type: 'train' | 'regular',
  load_directory: string,
) {
  let result: number = (await axios.post("/imageset/add_concept", {}, {
    params: { imageset_name, concept_name, repeat, type, load_directory: load_directory.trim() }
  })).data;
  return result;
}

async function load_concept(imageset_name: string, is_regular: boolean, concept_name: string, repeat: number): Promise<ConceptState> {
  return (await axios.get("/imageset/load_concept", { params: { imageset_name, is_regular, concept_name, repeat } })).data;
}


async function open_in_file_explore(imageset_name: string) {
  await axios.get("/imageset/open_in_file_explore", { params: { imageset_name } });
}

async function delete_concept(imageset_name: string, is_regular: boolean, concept_folder: string) {
  await axios.delete("/imageset/delete_concept", { params: { imageset_name, is_regular, concept_folder } });
}

async function image_list_interrogate(
  images: ImageState[],
  model_name: string,
  threshold: number,
  additional_tags: string[] = [],
  exclude_tags: string[] = []) {
  return (await axios.post("/tag/image_list_interrogate", {
    images: images.map(image => image.path),
    model_name,
    threshold, additional_tags, exclude_tags,
  })).data
}

async function interrogate(
  image: ImageState, 
  model_name: string = 'wd14-convnextv2.v1', 
  threshold: number = 0.35, 
  additional_tags: string[] = [],
  exclude_tags: string[] = [],
  ignore: boolean = true,
) {
  return (await axios.post("/tag/interrogate", {
    image: image.path,
    model_name, threshold, additional_tags, exclude_tags,
    ignore,
  })).data;
}

async function upload_images(files: FileWithPath[], imageset_name: string, is_regular: boolean, concept_folder: string) {
  if(files.length <= 0) {
    return;
  }
  
  const form_data = new FormData();
  files.forEach((file, index) => {
    form_data.append("files", file, `image${index}`);
  });
  form_data.append("imageset_name", imageset_name);
  form_data.append("type", is_regular ? "regular" : "train");
  form_data.append("concept_folder", concept_folder);

  return (await axios.post("/imageset/uploadimages", form_data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })).data;
}

async function rename_and_convert(imageset_name: string, is_regular: boolean, concept_folder: string) {
  await axios.put("/imageset/rename_and_convert", {}, { params: { imageset_name, is_regular, concept_folder } });
}


async function save_tags(image_captions: Map<string, string[]>) {
  const data = Object.fromEntries(image_captions);
  await axios.put("/tag/save", { tags: data });
}

async function detect_similar_images(images: ImageState[], threshold: number) {
  return (await axios.post("/tag/detect_similar_images", { images: images.map(image => image.path), threshold })).data;
}

async function move_images(imageset_name: string, images:ImageState[], is_regular: boolean, concept_name: string, repeat: number) {
  await axios.put("/imageset/move", {
    imageset_name, filenames: images.map(img => img.path), is_regular, concept_name, repeat,
  });
}

async function upscale_images(images: ImageState[], width: number, height: number) {
  await axios.put("/image/upscale", { filenames: images.map(img => img.path), width, height });
}

async function explore(imageset_name: string) {
  const response = (await axios.post("/imageset/explore", {}, { params: { imageset_name }, responseType: 'blob' }));
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${imageset_name}.zip`); // 设置下载文件的名称
  document.body.appendChild(link);
  link.click(); // 模拟点击下载
  link.remove(); // 下载后移除链接
}

async function cut_images(images: CropperImageState[]) {
  // 直接传递 percent 
  const _images = images.map(image => ({ path: image.image.path, ...image.crop}));
  await axios.put("/image/cut", _images);
}

const api = {
  cut_images,
  delete_imageset,
  create_imageset,
  find_imageset_list,
  rename_imageset,
  get_imageset_metadata,
  add_concept,
  open_in_file_explore,
  delete_concept,
  image_list_interrogate,
  delete_train,
  delete_regular,
  delete_images,
  upload_images,
  interrogate,
  rename_and_convert,
  save_tags,
  detect_similar_images,
  move_images,
  rename_concept,
  load_concept,
  flip_images,
  explore,
  upscale_images,
  // find_concept_list,
};



export default api;


