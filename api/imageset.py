from fastapi import APIRouter, HTTPException,  File, UploadFile, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from .config import CONF_REPO_DIR, CONF_HOST, CONF_PORT, CONF_IMAGE_EXT
import os,io
from typing import List
from tqdm import tqdm
from PIL import Image
import shutil
import re
import random
import platform, subprocess
import glob


api_imageset = APIRouter()


'''
  所有的 path 都从 imageset-xxx/src/8_xxx 开始
  绝对路径直接使用 repo_dir/{path} 即可
  图片的url则直接 http://{config.host}:{config.port}/image/{path}即可
  图片的缩略图url则直接 http://{config.host}:{config.port}/image/thumbnail/{path}即可
'''

def get_next_image_count(target_dir: str, image_count: int) -> int:
  '''
    path 应该从 imageset-xxx 开始
  '''
  max_number = 0
  min_number = 918932490718831499 # 随便初始化一个很大的数字
  # 列出目标目录中的所有文件
  for file_name in os.listdir(os.path.join(CONF_REPO_DIR, target_dir)):
    name, _ = os.path.splitext(file_name)
    try:
      number = int(name)
      if number > max_number:
        max_number = number
      elif number < min_number:
        min_number = number
    except:
      continue
  if image_count < min_number:
    return 0
  return max_number + 1  # 返回下一个可用的序号

def get_concept_folder_list(train_or_regular_dir: str) -> list[dict]:
  '''
    从 imageset-xxx/src 目录下获取所有的概念列表
    ret [{ 'name': 'katana', 'repeat': 8, 'path': 'imageset-xx/src/8_katana' }, ...]
  '''
  pattern = r'^(?P<repeat>\d+)_(?P<concept>.+)$'

  result = []
  for name in os.listdir(os.path.join(CONF_REPO_DIR, train_or_regular_dir)):
    match = re.match(pattern, name)
    if not match:
      continue
    # 获取当前concept的重复次数
    repeat: int = int(match.group('repeat'))
    concept_name: str = match.group('concept')
    result.append({
      'name': concept_name, 
      'repeat': repeat, 
      'path': os.path.join(train_or_regular_dir, name)
    })
  return result

def get_image_list(concept_dir: str) -> list[str]:
  '''
    从 imageset-xxx/src/8_katana 目录下获取所有的图片文件名称
    return ['imageset-xxx/src/8_katana/katana_000001.jpg', ...]
  '''
  image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
  imagefilenames = [os.path.join(concept_dir, imagefilename) for imagefilename in os.listdir(os.path.join(CONF_REPO_DIR, concept_dir))
    if os.path.isfile(os.path.join(CONF_REPO_DIR, concept_dir, imagefilename)) and os.path.splitext(imagefilename)[1].lower() in image_extensions]
  imagefilenames = [os.path.normpath(imagefilename).replace('\\', '/') for imagefilename in imagefilenames]
  return imagefilenames

def convert_and_copy_images(source_dir: str, target_dir: str) -> int:  
  '''
    source_dir 为绝对路径
    target_dir imageset-xxx 的相对路径
  '''
  valid_image_extensions = {'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
  
  # 获取源目录下的所有图片文件
  files = [os.path.join(source_dir, filename) for filename in os.listdir(source_dir)]
  files = [filename for filename in files if os.path.isfile(filename) and os.path.splitext(filename)[1].lower() in valid_image_extensions]
  
  # 我需要将 len(files) 张图片移动到 target_dir 中
  index = get_next_image_count(target_dir, len(files))
  image_count = 0
  
  for file_name in tqdm(files):
    source_path = os.path.join(source_dir, file_name)
    try:
      with Image.open(source_path) as img:
        if CONF_IMAGE_EXT == "JPEG":
          img = img.convert("RGB")
        # 生成新的文件名
        new_file_name = f"{index:06d}.{CONF_IMAGE_EXT.lower()}"
        target_path = os.path.join(CONF_REPO_DIR, target_dir, new_file_name)
        # 保存为 JPG 格式
        img.save(target_path, CONF_IMAGE_EXT)
        # 增加计数器
        index += 1
        image_count += 1
    except Exception:
      continue
  return image_count

def load_caption(image_path: str) -> list[str]:
  '''
    image_path 从 imageset-xxx 开始
  '''
  import pyexiv2, json
  image_path = os.path.join(CONF_REPO_DIR, image_path)
  try:
    metadata = pyexiv2.Image(image_path)
    tags = metadata.read_comment()
    metadata.close()
  except Exception as e:
    # 这里会报异常 XMP Toolkit error 203: Duplicate property or field node
    # 是否应该 clear, 目前只能够使用 exiftool 手动删除
    print(image_path)
    print('exception', e)
    return []
  try: 
    tags = json.loads(tags)
  except:
    tags = []
  return tags

def save_caption(image_path: str, tags: list[str]):
  import pyexiv2, json
  image_path = os.path.join(CONF_REPO_DIR, image_path)
  try:
    metadata = pyexiv2.Image(image_path)
    metadata.modify_comment(json.dumps(tags))
    metadata.close()  
  except Exception as e:
    print(str(e))
  
  # 同时保存到文本文件中
  file_name_with_extension = os.path.basename(image_path)
  dirname = os.path.dirname(image_path)
  name, _ = os.path.splitext(file_name_with_extension)
  s = ", ".join(tags)
  with open(os.path.join(dirname, f"{name}.txt"), "w") as f:
    f.write(s)
  
  

def dump_caption(concept_path):
  # imageset-xx/src/8_katana
  imagefiles = get_image_list(concept_path)
  for imagefile in tqdm(imagefiles):
    file_name_with_extension = os.path.basename(imagefile)
    dirname = os.path.dirname(imagefile)
    name, _ = os.path.splitext(file_name_with_extension)
    tags = load_caption(imagefile)
    s = ", ".join(tags)
    with open(os.path.join(CONF_REPO_DIR, dirname, f"{name}.txt"), "w") as f:
      f.write(s)



@api_imageset.get('/metadata')
async def get_imageset_metadata(name: str):
  '''
    {
      'train': {
        'total_repeat': int, 
        'image_count': int,
        'concepts': [
          {
            'name': str,
            'cover': str, 
            'repeat': int, 
            'image_count': int,
          }
        ],
      },
      'regular': {
      },
    }
  '''
  train_dir = os.path.join('imageset-'+name, 'src')
  reg_dir = os.path.join('imageset-'+name, 'reg')
  
  
  # 拼接出缩略图的url
  # http://localhost:1420/image/imageset-mikasa/src/8_cloak/cloak___1.jpg
  def load_cover(concept_image_filenames: list[str]) -> str | None:
    if len(concept_image_filenames) <= 0:
      return None
    random_element = random.choice(concept_image_filenames)
    return random_element
  
  def get_metadata(train_or_regular_dir: str) -> dict:
    ret = {
      'total_repeat': 0,
      'image_count': 0,
      'concepts': [],
    }

    concepts = get_concept_folder_list(train_or_regular_dir)

    for concept in concepts:      
      concept_image_filenames = get_image_list(concept['path'])
      
      cover = load_cover(concept_image_filenames)
      count = len(concept_image_filenames)
      ret['concepts'].append({
        'name': concept['name'], 
        'cover': f"http://{CONF_HOST}:{CONF_PORT}/image/{cover}" if cover is not None else None ,
        'repeat': concept['repeat'], 
        'image_count': count,
      })
      ret['image_count'] += count
      ret['total_repeat'] += concept['repeat'] * count
    return ret
  
  if not os.path.exists(os.path.join(CONF_REPO_DIR, 'imageset-'+name)):
    raise HTTPException(status_code=404, detail=f'imageset {name} is not existed.')
  
  result = {}
  if os.path.exists(os.path.join(CONF_REPO_DIR, train_dir)):
    # 如果存在数据集, 那么获取数据集的相关元信息
    result['train'] = get_metadata(train_dir)

  if os.path.exists(os.path.join(CONF_REPO_DIR, reg_dir)):
    # 如果存在正则集, 那么获取正则集的相关元信息
    result['regular'] = get_metadata(reg_dir)
  return result

@api_imageset.get("/load")  
async def load(imageset_name: str, is_regular: bool):
  '''
    加载数据集中的所有图片元信息
    [{
      src: string,                // 图片的url
      thumbnail: string,          // 缩略图url
      filename: string,           // 文件名称(不包含扩展名)
      basename: string,           // 文件名称(包含扩展名)
      path: string,               // 准确路径, path 也可以唯一标识, 从 src/reg 目录下开始
      captions: string[],         // 字幕
      width: number,              // 宽度
      height: number,             // 高度
      concept: string,
      repeat: number,
    }]
  '''
  imageset_dir = os.path.join('imageset-' + imageset_name)
  if is_regular:
    imageset_dir = os.path.join(imageset_dir, 'reg')
  else:
    imageset_dir = os.path.join(imageset_dir, 'src')
  result = {
    "name": imageset_name, 
    "type": 'regular' if is_regular else 'train',
    "images": [],
    "filters": [], # 这里只将 filters 的名称构造出来, 其他在前端去填充
  }
  
  concepts = get_concept_folder_list(imageset_dir) # [{ 'name': 'katana', 'repeat': 8, 'path': 'imageset-xx/src/8_katana' }, ]
  for concept in concepts:
    result['filters'].append({
      'name': f"{concept['repeat']}_{concept['name']}", 
      'concept': {
        'name': concept['name'],
        'repeat': concept['repeat']
      },
      'images': [],
    })
    imagefilenames = get_image_list(concept['path'])
    for imagefilename in imagefilenames:
      basename = os.path.basename(imagefilename)
      filename, _ = os.path.splitext(basename)
      result['images'].append({
        'src': f'http://{CONF_HOST}:{CONF_PORT}/image/{imagefilename}',
        'thumbnail': f'http://{CONF_HOST}:{CONF_PORT}/image/thumbnail/{imagefilename}', # 缩略图都保存为 jpg 格式
        'filename': filename,
        'basename': basename,
        'captions': load_caption(imagefilename),
        'concept': concept['name'], 
        'repeat': concept['repeat'],
        'path': imagefilename,
      })
  return result

@api_imageset.get("/load_concept")
async def load_concept(imageset_name: str, is_regular: bool, concept_name: str, repeat: int):
  '''
    {
      name : string, 
      repeat: number,
      is_regular: boolean,
      imageset_name: string,
      images: ImageState[],
    }
  '''
  result = {
    "name": concept_name, 
    "repeat": repeat,
    "is_regular": is_regular,
    "imageset_name": imageset_name,
    
    "images": [],
  }
  
  imageset_dir = os.path.join("imageset-"+imageset_name)
  if is_regular:
    imageset_dir = os.path.join(imageset_dir, 'reg')
  else:
    imageset_dir = os.path.join(imageset_dir, 'src')
  concept_dir = os.path.join(imageset_dir, f"{repeat}_{concept_name}")
  if not os.path.exists(os.path.join(CONF_REPO_DIR, concept_dir)):
    raise HTTPException(status_code=404, detail=f"{concept_dir} is not found")
  # 加载 concept_dir 下面的所有图片
  imagefilenames = get_image_list(concept_dir)
  for imagefilename in imagefilenames:
    basename = os.path.basename(imagefilename)
    filename, _ = os.path.splitext(basename)
    abs_path = os.path.join(CONF_REPO_DIR, imagefilename)
    with Image.open(abs_path) as img:
      width, height = img.size
    result['images'].append({
      'src': f'http://{CONF_HOST}:{CONF_PORT}/image/{imagefilename}',
      'thumbnail': f'http://{CONF_HOST}:{CONF_PORT}/image/thumbnail/{imagefilename}',
      'filename': filename,
      'basename': basename,
      'captions': load_caption(imagefilename),
      'concept': concept_name, 
      'repeat': repeat,
      'path': imagefilename,
      'width': width,
      'height': height,
      'size': os.path.getsize(abs_path),
    })
  return result

@api_imageset.get("/open_in_file_explore")
async def open_in_file_explore(imageset_name: str):
  dir = os.path.join(CONF_REPO_DIR, 'imageset-' + imageset_name)
  info = platform.system()
  if info == 'Windows':
    os.startfile(dir)
  elif info == 'Darwin':
    subprocess.run(['open', dir])
  elif info == 'Linux':
    subprocess.run(['xdg-open', dir])

@api_imageset.get("/")
async def get_imageset_list():
  '''
    查找已经创建的所有数据集
  '''
  imageset_names = os.listdir(CONF_REPO_DIR)
  imageset_names = [name[9:] for name in imageset_names if name.startswith('imageset-')]
  return imageset_names




@api_imageset.post("/create")  
async def create_imageset(name: str):
  origin_name = name
  name = 'imageset-' + name
  imageset_path = os.path.join(CONF_REPO_DIR, name)
  if not os.path.exists(imageset_path):
    os.mkdir(imageset_path)
    return origin_name
  # 创建失败
  raise HTTPException(status_code=400, detail=f"imageset {origin_name} is already exists.")

@api_imageset.post("/add_concept")
async def add_concept(
  imageset_name: str, 
  concept_name: str, 
  repeat: int, 
  type: str, 
  load_directory: str):
  # load_directory 需要是绝对路径
  dir = 'imageset-' + imageset_name
  if type == 'train':
    dir = os.path.join(dir, "src")
  elif type == "regular":
    dir = os.path.join(dir, "reg")
  else:
    raise HTTPException(status_code=400, detail=f"unknown type {type}")
  
  concept_dir = os.path.join(dir, f"{repeat}_{concept_name.strip()}")
  abs_concept_dir = os.path.join(CONF_REPO_DIR, concept_dir)
  # 如果不存在，则创建目录, 创建目录功能正常
  if not os.path.exists(abs_concept_dir):
    os.makedirs(abs_concept_dir, exist_ok=True)
  if not os.path.exists(load_directory):
    return 0
  
  # 将 load_directory 目录下的所有图片全部复制到concept目录下, 并全部转换为统一格式, 统一命名
  image_count = convert_and_copy_images(load_directory, concept_dir)
  return image_count

@api_imageset.post("/uploadimages")
async def upload_images(files: List[UploadFile] = File(...), 
                        imageset_name: str = Form(...),
                        type: str = Form(...),
                        concept_folder: str = Form(...),
                        ):
  subdir = 'reg' if type == "regular" else "src"
  dest_dir = os.path.join('imageset-'+imageset_name, subdir, concept_folder)
  abs_dest_dir = os.path.join(CONF_REPO_DIR, dest_dir)
  if not os.path.exists(abs_dest_dir):
    os.makedirs(abs_dest_dir, exist_ok=True)
  
  index = get_next_image_count(dest_dir, len(files))
  
  for file in tqdm(files):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    if CONF_IMAGE_EXT == "JPEG":
      image = image.convert("RGB")
    file_path = os.path.join(CONF_REPO_DIR, dest_dir, f'{index:06d}.{CONF_IMAGE_EXT.lower()}')
    index += 1
    image.save(file_path, CONF_IMAGE_EXT)
  return index

@api_imageset.post("/explore")
async def explore(imageset_name: str):
  zip_files = glob.glob(os.path.join(CONF_REPO_DIR, '*.zip'))
  for zip_file in zip_files:
    os.remove(zip_file)
  # 创建临时目录
  temp_dir = os.path.join(CONF_REPO_DIR, ".temp")
  if os.path.exists(temp_dir):
    shutil.rmtree(temp_dir)
  os.makedirs(temp_dir, exist_ok=True)
  
  # 导出数据集
  train_dir = os.path.join('imageset-'+imageset_name, 'src')
  reg_dir = os.path.join('imageset-'+imageset_name, 'reg')
  if os.path.exists(os.path.join(CONF_REPO_DIR, train_dir)):
    temp_train_dir = os.path.join(temp_dir, 'src')
    os.makedirs(temp_train_dir, exist_ok=True)
    concepts = get_concept_folder_list(train_dir)
    for concept in concepts:
      # 对每个概念，首先将标签导出为 txt 文件
      dump_caption(concept['path'])
      shutil.copytree(os.path.join(CONF_REPO_DIR, concept['path']), os.path.join(temp_train_dir, f"{concept['repeat']}_{concept['name']}"))
  if os.path.exists(os.path.join(CONF_REPO_DIR, reg_dir)):
    temp_reg_dir = os.path.join(temp_dir, 'reg')
    os.makedirs(temp_reg_dir, exist_ok=True)
    concepts = get_concept_folder_list(reg_dir)
    for concept in concepts:
      # 对每个概念，首先将标签导出为 txt 文件
      dump_caption(concept['path'])
      shutil.copytree(os.path.join(CONF_REPO_DIR, concept['path']), os.path.join(temp_reg_dir, f"{concept['repeat']}_{concept['name']}"))
  
  shutil.make_archive(os.path.join(CONF_REPO_DIR, imageset_name), 'zip', temp_dir)
  shutil.rmtree(temp_dir)
  return FileResponse(os.path.join(CONF_REPO_DIR, f"{imageset_name}.zip"), media_type='application/zip', filename=f"{imageset_name}.zip")
  


@api_imageset.put("/rename")  
async def rename_imageset(origin_name: str, new_name: str): 
  new_name = 'imageset-' + new_name
  origin_name = 'imageset-' + origin_name
  new_path = os.path.join(CONF_REPO_DIR, new_name)
  origin_path = os.path.join(CONF_REPO_DIR, origin_name)
  try:
    os.rename(origin_path, new_path)  
  except Exception as e:
    print(str(e))
    raise HTTPException(status_code=400, detail=str(e))
  return new_name

@api_imageset.put("/rename_concept")
async def rename_concept(imageset_name: str, is_regular: bool, origin_name: str, new_name: str, origin_repeat: int, new_repeat: int):
  if is_regular:
    dir = os.path.join('imageset-'+imageset_name, 'reg')
  else:
    dir = os.path.join('imageset-'+imageset_name, 'src')
  origin_dir = os.path.join(dir, f'{origin_repeat}_{origin_name}')
  new_dir = os.path.join(dir, f'{new_repeat}_{new_name}')
  origin_thumbnail_dir = os.path.join(CONF_REPO_DIR, '.thumbnail', dir, f"{origin_repeat}_{origin_name}")
  try:
    if os.path.exists(origin_thumbnail_dir):
      shutil.rmtree(origin_thumbnail_dir)
    os.rename(os.path.join(CONF_REPO_DIR, origin_dir), os.path.join(CONF_REPO_DIR, new_dir))
  except Exception as e:
    raise HTTPException(status_code=400, detail=str(e))
  return {
    'name': new_name, 
    'repeat': new_repeat,
  }

@api_imageset.put("/rename_and_convert")
async def rename_and_convert(imageset_name: str, is_regular: bool, concept_folder: str):
  if is_regular:
    base_dir = os.path.join('imageset-'+imageset_name, 'reg', concept_folder)
  else:
    base_dir = os.path.join('imageset-'+imageset_name, 'src', concept_folder)
  # 先删除缩略图
  thumbnail_dir = os.path.join(CONF_REPO_DIR, ".thumbnail", base_dir)
  if os.path.exists(thumbnail_dir):
    shutil.rmtree(thumbnail_dir)
  
  imagefilenames = get_image_list(base_dir)
  index = get_next_image_count(base_dir, len(imagefilenames))
  for imagefilename in tqdm(imagefilenames):
    newfilename = os.path.join(base_dir, f"{index:06d}.{CONF_IMAGE_EXT.lower()}")
    index += 1
    # 注意不要把标签掉了
    tags = load_caption(imagefilename)
    img = Image.open(os.path.join(CONF_REPO_DIR, imagefilename))
    if CONF_IMAGE_EXT == "JPEG":
      img = img.convert('RGB')
    img.save(os.path.join(CONF_REPO_DIR, newfilename), CONF_IMAGE_EXT)
    img.close()
    save_caption(newfilename, tags)
    # 删除原始图片
    os.remove(os.path.join(CONF_REPO_DIR, imagefilename))

class MoveRequest(BaseModel):
  filenames: List[str]
  imageset_name: str
  is_regular: bool
  concept_name: str 
  repeat: int  
@api_imageset.put("/move")  
async def move(request: MoveRequest):
  # 将 filenames 中的图片移动到对应的地址即可
  if request.is_regular:
    d = os.path.join("imageset-" + request.imageset_name, "reg")
  else:
    d = os.path.join("imageset-"+request.imageset_name, "src")
  d = os.path.join(d, f"{request.repeat}_{request.concept_name}")
  dest_path = os.path.join(CONF_REPO_DIR, d)
  if not os.path.exists(dest_path):
    os.makedirs(dest_path, exist_ok=True)
  # 将图片移动过去
  id = get_next_image_count(d, len(request.filenames))
  
  for filename in tqdm(request.filenames):
    src_path = os.path.join(CONF_REPO_DIR, filename)
    thumbnail = os.path.join(CONF_REPO_DIR, '.thumbnail', filename)
    shutil.move(src_path, os.path.join(dest_path, f"{id:06d}.{CONF_IMAGE_EXT.lower()}"))
    if os.path.exists(thumbnail):
      os.remove(thumbnail)
    id += 1
  




@api_imageset.delete("/delete")
async def delete_imageset(name: str):

  imageset_dir = os.path.join(CONF_REPO_DIR, 'imageset-' + name)
  # 注意先删除缩略图再删除原图
  thumbnail_dir = os.path.join(CONF_REPO_DIR, '.thumbnail', 'imageset-'+name)
  if os.path.exists(thumbnail_dir):
    shutil.rmtree(thumbnail_dir)
  if os.path.exists(imageset_dir):
    shutil.rmtree(imageset_dir)
  

@api_imageset.delete("/delete/src")
async def delete_train(name: str):
  imageset_dir = os.path.join(CONF_REPO_DIR, 'imageset-' + name, 'src')
  thumbnail_dir = os.path.join(CONF_REPO_DIR, '.thumbnail', 'imageset-' + name, 'src')
  if os.path.exists(thumbnail_dir):
    shutil.rmtree(thumbnail_dir)
  if os.path.exists(imageset_dir):
    shutil.rmtree(imageset_dir)
  
@api_imageset.delete("/delete/reg")
async def delete_regular(name: str):
  imageset_dir = os.path.join(CONF_REPO_DIR, 'imageset-' + name, 'reg')
  thumbnail_dir = os.path.join(CONF_REPO_DIR, '.thumbnail', 'imageset-' + name, 'reg')
  if os.path.exists(thumbnail_dir):
    shutil.rmtree(thumbnail_dir)
  if os.path.exists(imageset_dir):
    shutil.rmtree(imageset_dir)
  
class DeleteImageRequest(BaseModel):
  filenames: List[str]

@api_imageset.delete("/delete/images")
async def delete_images(request: DeleteImageRequest):
  deleted_names = []
  for filename in tqdm(request.filenames):
    abs_filename = os.path.join(CONF_REPO_DIR, filename)
    thumbnail_filename = os.path.join(CONF_REPO_DIR, '.thumbnail', filename)
    try:
      if os.path.exists(thumbnail_filename):
        os.remove(thumbnail_filename)
    except Exception as e:
      print(e)
      continue
    try:
      if os.path.exists(abs_filename):
        os.remove(abs_filename)
    except Exception as e:
      print(e)
      continue
    deleted_names.append(filename)
  return deleted_names
  
@api_imageset.delete("/delete_concept")
async def delete_concept(imageset_name: str, is_regular: bool, concept_folder: str):
  if is_regular:
    dir = os.path.join('imageset-'+imageset_name, 'reg', concept_folder)
  else:
    dir = os.path.join('imageset-'+imageset_name, 'src', concept_folder)
  thumbnail_dir = os.path.join(CONF_REPO_DIR, '.thumbnail', dir)
  dir = os.path.join(CONF_REPO_DIR, dir)
  if os.path.exists(thumbnail_dir):
    shutil.rmtree(thumbnail_dir)
  if os.path.exists(dir):
    shutil.rmtree(dir)
  


