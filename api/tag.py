from fastapi import APIRouter, HTTPException
from typing import List, Dict
import os
import imagehash
from .config import CONF_HOST, CONF_PORT, CONF_REPO_DIR
from pydantic import BaseModel
from .tagger import interrogators
from pathlib import Path
from PIL import Image
from .tagger import Interrogator
from tqdm import tqdm
from .imageset import load_caption, save_caption


api_tag = APIRouter()


'''
  将图片列表作为data传递过来
'''






def update_captions(image_path: str, tags: list[str]) -> list[str]:
  old_tags = load_caption(image_path)
  tags = list(set([*tags, *old_tags]))
  save_caption(image_path, tags)
  return tags


def compute_hash(filenames: list[str]) -> dict:
  result = {}
  for filename in tqdm(filenames):
    highfreq_factor = 4 # resize的尺度
    hash_size = 32 # 最终返回hash数值长度
    image_scale = 64
    image = Image.open(os.path.join(CONF_REPO_DIR, filename))
    phash = imagehash.phash(image, hash_size=hash_size,highfreq_factor=highfreq_factor)
    ahash = imagehash.average_hash(image,hash_size=hash_size)   
    dhash = imagehash.dhash(image,hash_size=hash_size) 
    whash = imagehash.whash(image,image_scale=image_scale,hash_size=hash_size,mode = 'db4')
    result[filename] = {
      "phash": phash, "ahash": ahash, "dhash": dhash, "whash": whash 
    }
  return result

class ImageListInterrogateRequest(BaseModel):
  images: List[str]               # 图片元信息列表
  additional_tags: List[str] = []
  exclude_tags: List[str] = []
  model_name: str                 # 模型名称
  threshold: float                # 可选的阈值
@api_tag.post('/image_list_interrogate')
async def image_list_interrogate(request_body: ImageListInterrogateRequest):
  interrogator = interrogators[request_body.model_name]
  ret = {}
  for image_path in tqdm(request_body.images):
    # 注意添加将原有的标签添加到 additional 的逻辑
    im = Image.open(Path(os.path.join(CONF_REPO_DIR, image_path)))
    _, result = interrogator.interrogate(im)
    im.close()
    tags = Interrogator.postprocess_tags(
      result,
      threshold=request_body.threshold,
      additional_tags=request_body.additional_tags, # 要添加的标签
      exclude_tags=request_body.exclude_tags, # 要排除的标签, 给出一个标签的列表即可
    )
    tags = list(tags.keys())
    tags = update_captions(image_path, tags)
    ret[image_path] = tags
  return ret


class UnionFind:
  def __init__(self, elements):
    self.parent = {element: element for element in elements}
  
  def find(self, item):
    if self.parent[item] != item:
      self.parent[item] = self.find(self.parent[item])  # 路径压缩
    return self.parent[item]
  
  def union(self, item1, item2):
    root1 = self.find(item1)
    root2 = self.find(item2)
    if root1 != root2:
      self.parent[root1] = root2  # 合并两个集合
  
  def connected(self, item1, item2):
    return self.find(item1) == self.find(item2)
  
  def get_all_sets(self):
    sets = {}
    for item in self.parent:
      root = self.find(item)
      if root not in sets:
        sets[root] = []
      sets[root].append(item)
    
    # 过滤出大于 1 的集合
    return [s for s in sets.values() if len(s) > 1]

class DetectSimilarRequest(BaseModel):
  images: List[str]               # 图片元信息列表, path
  threshold: float                # 可选的阈值
@api_tag.post("/detect_similar_images")
async def find_similar_images(request: DetectSimilarRequest):
  # 第一步, 求出每张图片的 hash 值
  hash = compute_hash(request.images)
  uf = UnionFind(request.images)
  
  image_pair = []
  for i in range(len(request.images)):
    for j in range(i+1, len(request.images)):
      image_pair.append((request.images[i], request.images[j]))
  
  for f1, f2 in tqdm(image_pair):
    d1 = hash[f1]
    d2 = hash[f2]
    phash1 = d1['phash']
    phash2 = d2['phash']
    phash_value = 1-(phash1-phash2)/len(phash1.hash)**2
    
    ahash1 = d1['ahash']
    ahash2 = d2['ahash']  
    ahash_value = 1-(ahash1-ahash2)/len(ahash1.hash)**2
    
    dhash1 = d1['dhash']
    dhash2 = d2['dhash']
    dhash_value = 1-(dhash1-dhash2)/len(dhash1.hash)**2  

    whash1 = d1['whash']
    whash2 = d2['whash']
    whash_value = 1-(whash1-whash2)/len(whash1.hash)**2  

    value_hash = max(phash_value,ahash_value,dhash_value,whash_value)
    if value_hash > request.threshold:
      uf.union(f1, f2)
  all_sets = uf.get_all_sets()  
  result = []
  for images in all_sets:
    t = []
    for imagefilename in images:
      basename = os.path.basename(imagefilename)
      filename, _ = os.path.splitext(basename)
      abs_path = os.path.join(CONF_REPO_DIR, imagefilename)
      with Image.open(abs_path) as img:
        width, height = img.size
      t.append({
        'src': f'http://{CONF_HOST}:{CONF_PORT}/image/{imagefilename}', 
        'thumbnail': f'http://{CONF_HOST}:{CONF_PORT}/image/thumbnail/{imagefilename}',
        'filename': filename,
        'basename': basename,
        'path': imagefilename,
        'size': os.path.getsize(abs_path),
        'width': width,
        'height': height,
      })
    result.append(t)
  return result
  


class InterrogateRequest(BaseModel):
  image: str                          # 图片元信息列表
  additional_tags: List[str] = []
  exclude_tags: List[str] = []
  model_name: str                     # 模型名称
  threshold: float                    # 可选的阈值
  ignore: bool
@api_tag.post("/interrogate")
async def image_interrogate(request: InterrogateRequest):
  interrogator = interrogators[request.model_name]
  image_path = os.path.join(CONF_REPO_DIR, request.image)
  tags = load_caption(image_path)
  if len(tags) > 0:
    return tags
  im = Image.open(Path(image_path))
  _, result = interrogator.interrogate(im)
  im.close()
  tags = Interrogator.postprocess_tags(
    result,
    threshold=request.threshold,
    additional_tags=request.additional_tags,  # 要添加的标签
    exclude_tags=request.exclude_tags,        # 要排除的标签, 给出一个标签的列表即可
  )
  tags = list(tags.keys())
  tags = update_captions(image_path, tags)
  return tags


class TagMap(BaseModel):
  tags: Dict[str, List[str]]
  
@api_tag.put("/save")
async def save_tags(data: TagMap):
  '''
    i = Image(image_path)
    i.read_comment()
    i.modity_comment('')
    i.close()
    Map<path, caption[]>
  '''
  # 接下来直接保存
  for path, captions in tqdm(data.tags.items()):
    save_caption(path, captions)
  

