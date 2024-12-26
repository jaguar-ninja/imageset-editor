
import { Backdrop, Button, IconButton, ImageList, ImageListItem, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { Group, Text } from '@mantine/core';
import { Dropzone, DropzoneProps, FileWithPath, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageIcon from '@mui/icons-material/Image';
import ErrorIcon from '@mui/icons-material/Error';
import { useState } from 'react';
import { CloseOutlined } from '@mui/icons-material';
import api from '../../api';
import { useDispatch } from "react-redux";
import { addMessage } from "../../app/messageSlice";
import { exception2string } from "../../utils";


function ImageUploader({
  onChange,
  dropZoneProps,
  preview = false,
}: {
  onChange?: (files: FileWithPath[]) => void,
  dropZoneProps?: Partial<DropzoneProps>,
  preview: boolean,
}) {
  const [files, setFiles] = useState<FileWithPath[]>([]);
  return (
    <>
      <Dropzone
        // 这里的 file 是带数据的
        onDrop={(_files) => {
          const __files = [...files, ..._files];
          setFiles(__files);
          onChange?.(__files);
        }}
        // maxSize={1 * 1024 ** 3}
        accept={IMAGE_MIME_TYPE} // 接受图片类型
        {...dropZoneProps}
      >
        <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <CloudUploadIcon />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <ErrorIcon />
          </Dropzone.Reject>
          {/* 默认展示的是idle */}
          <Dropzone.Idle>
            <ImageIcon />
          </Dropzone.Idle>

          <div>
            <Text size="xl" inline>
              Drag images here or click to select files
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Attach as many files as you like, each file should not exceed 5mb
            </Text>
          </div>
        </Group>
      </Dropzone>

      {
        preview ? <ImageList variant="masonry" cols={4} gap={4} sx={{ marginTop: 0, }}>
          {
            files.map((file, index) => {
              const imageUrl = URL.createObjectURL(file);
              return <ImageListItem>
                <img key={index} src={imageUrl} alt="load fail" onLoad={() => URL.revokeObjectURL(imageUrl)} />
                <IconButton size='small' sx={{ position: 'absolute', top: 0, right: 0, }}
                  onClick={() => {
                    const _files = files.filter(f => f !== file);
                    setFiles(_files);
                    onChange?.(_files);
                  }}
                > <CloseOutlined /> </IconButton>
              </ImageListItem>
            })
          }
        </ImageList> : <></>
      }
    </>

  );
}

interface addImageDialogProps {
  open: boolean,
  imageset_name: string,
  concept_folder: string,
  is_regular: boolean,
  onClose: () => void,
  onSubmit?: () => void,
};

function AddImageDialog(props: addImageDialogProps) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileWithPath[]>([]);

  return (<><Dialog open={props.open} onClose={props.onClose}>
    <DialogTitle>Add images for <b>{props.concept_folder}</b></DialogTitle>
    <DialogContent>
      <ImageUploader preview onChange={(files) => setFiles(files)}></ImageUploader>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => { props.onClose() }}>Cancel</Button>
      <Button disabled={loading} onClick={() => {
        setLoading(true);
        api.upload_images(files, props.imageset_name, props.is_regular, props.concept_folder).then((result) => {
          props.onSubmit?.();
        }).catch((err: any) => {
          dispatch(addMessage({ msg: exception2string(err), severity: 'error' }));
        }).finally(() => {
          setLoading(false);
          props.onClose();
        });
      }}>Finish
      </Button>

    </DialogActions>

    <Backdrop
      sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 10 })}
      open={loading}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  </Dialog>
  </>);
}


export default AddImageDialog;

