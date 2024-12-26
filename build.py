import os, sys, platform
from PyInstaller.__main__ import run

def package():
  basePath = os.path.abspath(__file__)
  basePath = os.path.dirname(basePath)
  system_arch = platform.architecture()[0]
  python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
  system_name = platform.system().lower()

  # 自定义文件名
  output_name = f"imageset-editor_{system_name}_{system_arch}_py{python_version}.exe"
    
  opts = [
    '--clean',
    '-F',
    '{}/launch.py'.format(basePath),
    # '-w',
    '--icon','{}/build/icon.ico'.format(basePath),
    '--add-data', '{}/build;build'.format(basePath),
    '--add-binary', r'{}/api/exiv2api.pyd;pyexiv2/lib/py3.12-win'.format(basePath),
    '--collect-binaries=pyexiv2',
    '--name', output_name,
    "--hidden-import=launch",
  ]
  run(opts)
   
if __name__ == '__main__':
  package()

