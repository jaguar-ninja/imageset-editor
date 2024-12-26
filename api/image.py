from fastapi import APIRouter, HTTPException
from PIL import Image
from pydantic import BaseModel
from .config import CONF_REPO_DIR
from tqdm import tqdm
import os
from fastapi.responses import FileResponse
from typing import List



api_image = APIRouter()



# 注意将这个放在前面, 直接通过路径获取缩略图
@api_image.get("/thumbnail/{image_name:path}")
async def get_thumbnail(image_name: str):
  
  
  image_path = os.path.join(CONF_REPO_DIR, image_name)
  thumbnail_path = os.path.join(CONF_REPO_DIR, './.thumbnail', image_name)
  
  # 检查缩略图是否存在, 存在就直接返回即可
  if os.path.exists(thumbnail_path) and os.path.isfile(thumbnail_path):
    return FileResponse(thumbnail_path)
  elif os.path.exists(image_path) and os.path.isfile(image_path):
    with Image.open(image_path) as img:
      img: Image = img.convert('RGB')
      img.thumbnail(size=(256, 512))
      parent_dir = os.path.dirname(thumbnail_path)
      if not os.path.exists(parent_dir):
        os.makedirs(parent_dir)
      img.save(thumbnail_path)
      return FileResponse(thumbnail_path)
  raise HTTPException(status_code=404, detail="Image not found")
  
# 直接通过路径获取原图
@api_image.get("/{image_name:path}")
async def get_image(image_name: str):

  # 结合基础路径和用户传入的图像名称, repo_dir (将所有图片都保存在repo_dir中)
  image_path = os.path.join(CONF_REPO_DIR, image_name)
  
  # 检查文件是否存在
  if os.path.exists(image_path) and os.path.isfile(image_path):
    return FileResponse(image_path)
  raise HTTPException(status_code=404, detail="Image not found")
  
class FlipRequest(BaseModel):
  images: List[str]
  horizontal: bool
  
@api_image.put("/flip")
async def flip_images(request: FlipRequest):
  for image in tqdm(request.images):
    image_path = os.path.join(CONF_REPO_DIR, image)
    thumbnail_path = os.path.join(CONF_REPO_DIR, '.thumbnail', image)
    
    image = Image.open(image_path)
    if request.horizontal:
      image = image.transpose(Image.FLIP_LEFT_RIGHT)
    else:
      image = image.transpose(Image.FLIP_TOP_BOTTOM)
    image.save(image_path)
    image.close()
    # 记得删除对应的缩略图
    if os.path.exists(thumbnail_path):
      os.remove(thumbnail_path)

class CropperImage(BaseModel):
  path: str 
  x: float
  y: float
  width: float
  height: float  
@api_image.put("/cut")    
async def cut_images(images: List[CropperImage]):
  for item in tqdm(images):
    img_path = os.path.join(CONF_REPO_DIR, item.path)
    thumbnail_path = os.path.join(CONF_REPO_DIR, '.thumbnail', item.path)
    image = Image.open(img_path)
    left = item.x * image.width / 100
    right = left + item.width * image.width / 100
    top = item.y * image.height / 100
    bottom = top + item.height * image.height / 100
    crop_area = (left, top, right, bottom,)
    try:
      cropped_image = image.crop(crop_area)
      cropped_image.save(img_path)
    except:
      image.close()
    if os.path.exists(thumbnail_path):
      os.remove(thumbnail_path)

class UpscaleImage(BaseModel):
  filenames: List[str]
  width: int
  height: int

@api_image.put("/upscale")    
async def upscale_images(request: UpscaleImage):
  for filename in tqdm(request.filenames):
    imagefilename = os.path.join(CONF_REPO_DIR, filename) 
    image = Image.open(imagefilename)
    width, height = image.size # 原始尺寸
    if width >= request.width and height >= request.height:
      continue
    scale = max(request.width / width, request.height / height)
    image = image.resize((int(width * scale + 0.001), int(height * scale + 0.001)), Image.Resampling.LANCZOS)
    image.save(imagefilename)


