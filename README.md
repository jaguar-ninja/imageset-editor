# ImageSet Editor

## install
```shell
# create venv
python -m venv venv 

# activate venv(windows)
venv/Scripts/activate
# macOs/Linux
source venv/bin/activate

# install python requirement
pip install -r requirements.txt

# install nodejs requirement
npm install --legacy-peer-deps
```

## develop

```shell
# start python backend
python launch.py --web --reload

# open another terminal, and start web
npm start
```
now you can access the service at url `http://localhost:3000/web`

## release
```shell
# build web
npm run build

# start app
python launch.py
```

## package
```shell
# build web first
npm run build

# install pyinstaller
pip install pyinstaller

# use pyinstaller to package, note: you may need to use `--add-binary` command to add the exiv2api.pyd file for pyexiv2 module. if you use windows and python3.12, you can use the same command as mine.
pyinstaller --clean -F launch.py --icon="build/icon.ico" --add-data="build;build" --add-binary="api/exiv2api.pyd;pyexiv2/lib/py3.12-win" --collect-binaries=pyexiv2 --name=imageset-editor --hidden-import=launch
```

you can found the result in `dist` folder.

