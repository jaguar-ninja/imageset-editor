'''
python 全局配置类

直接根据需要修改对应的配置项目即可
'''

import os, yaml
import sys

# 需要配置前端文件夹地址
if getattr(sys, "frozen", False):
  base_path = sys._MEIPASS
else:
  base_path = os.path.abspath(".")

CONFIG = {
  # 先设置默认值
  'port': 1420,
  'host': 'localhost',
  'repo_dir': os.path.join(os.getcwd(), 'repo'), 
  'image_ext': 'JPEG', # 将图片保存为 jpeg 还是 png
  'web_dir': os.path.join(base_path, 'build'), # 定义为这个路径再来尝试一下
}




CONF_PATH = os.path.join(os.getcwd(), 'config.yaml')
try:
  with open(CONF_PATH, 'r', encoding='utf-8') as f:
    config = yaml.safe_load(f)
    CONFIG.update(config)
except Exception as e:
  print(str(e))
  print('did not found config.yaml, use default config')
  pass



CONF_PORT = CONFIG['port']
CONF_HOST = CONFIG['host']
CONF_REPO_DIR = CONFIG['repo_dir']
CONF_IMAGE_EXT = CONFIG['image_ext']
CONF_WEB_DIR = CONFIG['web_dir']

if not os.path.exists(CONF_REPO_DIR):
  os.makedirs(CONF_REPO_DIR, exist_ok=True)







