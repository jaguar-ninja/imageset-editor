import { Button, Grid2 as Grid } from "@mui/material";
import { useNavigate } from "react-router-dom";

import HomeIcon from '@mui/icons-material/Home';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';





function NotFound() {
  const navigate = useNavigate();

  return (
    // 外层 div 负责将子元素居中
    <div style={{ display: 'flex', justifyContent: 'center', alignContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>

        <div style={{ fontSize: 120, color: 'darkred' }}><b>404 Not Found</b></div>
        <br />
        <Grid container spacing={2} sx={{ textAlign: 'center' }}>
          <Button onClick={() => navigate("/home")} variant="contained" startIcon={<HomeIcon />} >Go Home</Button>
          <Button onClick={() => navigate(-1)} variant="contained" color="secondary" startIcon={<KeyboardArrowLeftIcon />} >Go Back</Button>
        </Grid>

      </div>



    </div>
  );
}


export default NotFound;

