import { AppBar, Avatar, Chip, IconButton, Grid2 as Grid, TextField, Toolbar, Typography, Tooltip } from "@mui/material";
import RefreshIcon from '@mui/icons-material/Refresh';
import FolderIcon from '@mui/icons-material/Folder';
import HomeIcon from '@mui/icons-material/Home';
import HelpIcon from '@mui/icons-material/Help';
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import DeleteIcon from '@mui/icons-material/Delete';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import EditNoteIcon from '@mui/icons-material/EditNote';
import TocIcon from '@mui/icons-material/Toc';
import NewDialog from "../dialog/NewDialog";
import OpenDialog from "../dialog/OpenDialog";
import api from "../../api";
import { addMessage } from "../../app/messageSlice";
import { exception2string } from "../../utils";
import { useDispatch } from "react-redux";


interface HeaderProps {
  imageset_name: string,
  onRenameImageset?: (origin_name: string, new_name: string) => Promise<void>,

  concept?: { name: string, repeat: number }, // 只有两种情况，不如直接通过 concept 是否为空来进行判断
  onConceptChange?: (before: { name: string, repeat: number }, after: { name: string, repeat: number }) => Promise<void>,

  onLoad?: () => Promise<void>,
  onDelete?: () => Promise<void>,
};


export default function Header(props: HeaderProps) {
  const dispatch = useDispatch();
  const [newDialog, setNewDialog] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  const navigate = useNavigate();


  const [editImagesetName, setEditImagesetName] = useState(false);
  const [imagesetName, setImagesetName] = useState(props.imageset_name);

  const [editConcept, setEditConcept] = useState(false);
  const [concept, setConcept] = useState<{ name: string, repeat: number }>(props.concept || { name: '', repeat: 0 });


  function load() {
    props.onLoad?.().catch((error: any) => console.error(error));
  }

  function changeConcept(concept: { name: string, repeat: number }) {
    if(props.concept) {
      props.onConceptChange?.(props.concept, concept).finally(() => {
        setEditConcept(false);
      });
    }
  }

  // 不要在这里执行
  useEffect(() => {
    setNewDialog(false);
    setOpenDialog(false);
    setEditImagesetName(false);
    setImagesetName(props.imageset_name);

    // 由 header 来执行加载
    load();

  }, [props.imageset_name]);





  const imageset_name_ui = (editImagesetName ?
    <TextField
      variant="standard" size="small"
      value={imagesetName}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
        setImagesetName(event.target.value.trim());
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key.toLowerCase() === 'enter') {
          props.onRenameImageset?.(props.imageset_name, imagesetName).then(
            () => setEditImagesetName(false)
          );
        }
      }}
    />
    : <Typography
      variant="h6"
      noWrap
      component="div"
      sx={{
        mr: 2,
        display: { xs: 'none', md: 'flex' },
        fontFamily: 'monospace',
        fontWeight: 700,
        letterSpacing: '.3rem',
        color: 'inherit',
        textDecoration: 'none',
      }}
    >
      {imagesetName}
      <IconButton aria-label="delete" size="small" onClick={() => setEditImagesetName(true)}>
        <EditNoteIcon fontSize="inherit" />
      </IconButton>
    </Typography>);

  const concept_name_ui = (
    editConcept ?

      <Grid container>
        <Grid size={2}>
          <TextField
            variant="standard"
            aria-label="repeat"
            label="repeat"
            size="small"
            value={concept.repeat}
            onChange={(event) => setConcept((state) => ({ ...state, repeat: parseInt(event.target.value) }))}
            inputProps={{
              step: 1,
              min: 1,
              max: 0xffffffff,
              type: 'number',
            }}
            onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
              if (event.key.toLowerCase() === 'enter') {
                changeConcept(concept);
              }
            }}
          /></Grid>
        <Grid size={10}>
          <TextField variant="standard" label="concept name" size="small" value={concept.name}
            onChange={(event) => setConcept((state) => ({ ...state, name: event.target.value }))}
            onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
              if (event.key.toLowerCase() === 'enter') {
                changeConcept(concept);
              }
            }}
          /></Grid>

      </Grid>

      :
      <Chip variant="outlined" avatar={<Avatar>{concept.repeat}</Avatar>} label={concept.name}
        deleteIcon={<EditNoteIcon />}
        onDelete={() => setEditConcept(true)}
      />
  );


  return (<AppBar position="fixed" color="default"  >
    <Toolbar variant="dense" >

      {imageset_name_ui}


      <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }} >
        {/* 在这里添加一些 concept 的显示 */}
        {
          props.concept ? <>
            {concept_name_ui}
          </> : <></>
        }
      </div>

      <Tooltip title="reload"><IconButton onClick={load}><RefreshIcon /></IconButton></Tooltip>
      <Tooltip title="overview"><IconButton onClick={() => navigate(`/overview/${props.imageset_name}`) }><TocIcon /></IconButton></Tooltip>
      <Tooltip title="create new imageset"><IconButton onClick={() => setNewDialog(true)}><CreateNewFolderIcon /></IconButton></Tooltip>
      <Tooltip title="open"><IconButton onClick={() => setOpenDialog(true)}><FolderOpenIcon /></IconButton></Tooltip>
      <Tooltip title="open in file explore"><IconButton onClick={() => { 
        api.open_in_file_explore(imagesetName).catch((err: any) => dispatch(addMessage({msg: exception2string(err), severity: 'error'}))) }}><FolderIcon /></IconButton></Tooltip>
      <Tooltip title="explore imageset"><IconButton onClick={() => {  
        api.explore(props.imageset_name).catch((err: any) => dispatch(addMessage({msg: exception2string(err), severity: 'error'})) );
      }}><FileDownloadIcon /></IconButton></Tooltip>


      <Tooltip title="help"><IconButton href="https://github.com/ninja-jaguar/imageset-editor.git" target="_blank"> <HelpIcon /> </IconButton></Tooltip>
      <Tooltip title="home"><IconButton onClick={() => navigate("/")}><HomeIcon /></IconButton></Tooltip>
      <Tooltip title="delete"><IconButton onClick={() => {
        props.onDelete?.().catch((error: any) => console.error(error));
      }}> <DeleteIcon /> </IconButton></Tooltip>
    </Toolbar>



    <NewDialog open={newDialog} onClose={() => setNewDialog(false)} />
    <OpenDialog open={openDialog} onClose={() => setOpenDialog(false)} />
  </AppBar>);
}


