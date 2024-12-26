import { Button, Divider, Stack } from "@mui/material";
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import HelpIcon from '@mui/icons-material/Help';
import { useState } from "react";
import OpenDialog from "../dialog/OpenDialog";
import NewDialog from "../dialog/NewDialog";





function Start() {
  const [newDialog, setNewDialog] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  return (
    // 外层 div 负责将子元素居中
    <div className="container" >

      {/* 内层 div 放置实际元素 */}
      <div>

        {/* 先来一个标题 */}
        <h1>ImageSet Editor</h1>
        <Stack style={{ margin: "0 auto" }}
        direction="row" spacing={4}
        divider={<Divider orientation="vertical" flexItem />}
        >
          <Button color="secondary" variant="contained" startIcon={<CreateNewFolderIcon />} 
            onClick={() => setNewDialog(true) }
          >New</Button>
          <Button color="success" variant="contained" startIcon={<FolderOpenIcon />} onClick={() => setOpenDialog(true) } >Open</Button>
          <Button color="warning" variant="contained" startIcon={<HelpIcon />} href="https://github.com/jaguar-ninja/imageset-editor/wiki" target="_blank">Help</Button>
        </Stack>

      </div>
      <NewDialog open={newDialog} onClose={() => setNewDialog(false) }></NewDialog>

      <OpenDialog open={openDialog} onClose={() => setOpenDialog(false) }></OpenDialog>
    </div>
  );
}


export default Start;

