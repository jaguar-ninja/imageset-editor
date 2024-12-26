import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Card, CardContent, CircularProgress, Container, Fab, Toolbar, Typography } from "@mui/material";
import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';
import Header from "../header/Header";
import { ImageSetState, setImageSet, setImageSetName } from "../../app/imageSetSlice";
import CreateDialog from "../dialog/CreateDialog";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import api from "../../api";
import { useDispatch } from "react-redux";
import { addMessage } from "../../app/messageSlice";
import { exception2string } from "../../utils";


export interface ConceptMetadata {
  name: string,
  repeat: number,
  image_count: number,
  cover: string | null, 
};

export interface ImageSetMetadata {
  image_count: number, // 总图片数量
  total_repeat: number, // 总重复次数
  concepts: ConceptMetadata[], // 概念的metadata
};


function ConceptCover(props: { concept: ConceptMetadata, onClick: () => void }) {
  const image_url = props.concept.cover || '/web/No-Image-Found-400x264.png';

  
  return (<div style={{
    height: '100%', backgroundImage: `url('${image_url}')`,
    backgroundSize: 'cover', position: 'relative',
  }}
    onClick={props.onClick}>

    <img
      src={image_url}
      alt="img" style={{
        objectFit: 'contain',
        width: '100%',
        height: '100%',
        background: 'rgba(255, 255, 255, .47)',
        backdropFilter: 'blur(48px)',
      }} />
    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', }} >
      <CardContent>
        <Typography variant="h4" component="div" color="success" style={{ fontWeight: 900 }} >
          {props.concept.name}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {props.concept.image_count} images, {props.concept.repeat} repeat.
        </Typography>
      </CardContent>
    </div>
  </div>);
}


// 展示训练集和正则集的基本信息, 点击即可进入
function Overview() {
  const dispatch = useDispatch();
  const carousel_height = 480;
  const { imageset_name = 'error' } = useParams(); 

  // 通过路由传参将打开的imageset名称传入
  const navigate = useNavigate();

  const [trainDataset, setTrainDataset] = useState<ImageSetMetadata | null>(null);
  const [regularDataset, setRegularDataset] = useState<ImageSetMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  const [createTrainsetDialog, setCreateTrainsetDialog] = useState<boolean>(false);
  const [createRegularsetDialog, setCreateRegularsetDialog] = useState<boolean>(false);

  async function load() {
    setLoading(true);
    setTrainDataset(null);
    setRegularDataset(null);
    try {
      let result: { train: ImageSetMetadata, regular: ImageSetMetadata } = await api.get_imageset_metadata(imageset_name);
      const imageset: ImageSetState = { 
        name: imageset_name, 
        src: result.train, 
        reg: result.regular 
      };
      dispatch(setImageSet(imageset));

      if (result.train) {
        setTrainDataset(result.train);
      }
      if (result.regular) {
        setRegularDataset(result.regular);
      }

    } catch (err: any) {
      dispatch(addMessage({msg: exception2string(err), severity: 'error'}));
    } finally {
      setLoading(false);
    }
  }

  async function _delete() {
    const result = window.confirm(`Do you want to delete the whole imageset ${imageset_name}`);
    if (result) {
      setLoading(true);
      try {
        await api.delete_imageset(imageset_name);
      } catch (err: any) {
        dispatch(addMessage({msg: exception2string(err), severity: 'error'}));
      }
      setLoading(false);
      // 记得跳转到首页
      navigate("/");
    }
  }



  useEffect(() => {
    setImageSetName(imageset_name);
  }, [imageset_name]);

  // 还需要添加一个 concept 参数
  const jump2detail = (is_regular: boolean, concept: string, repeat: number) => {
    // 设置类型为 train | regular
    navigate(`/concept/${imageset_name}/${is_regular ? "reg" : "src"}/${concept}/${repeat}/all`);
  };


  const loadingContent = (<div style={{
    margin: "auto",
    minWidth: '100%',
    minHeight: '80%',
    width: '100%',
    height: '80%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  }}><CircularProgress size={128} /></div>);


  const train = trainDataset && trainDataset.concepts.length > 0 ?
    <Card sx={{ width: '100%', marginBottom: 1, }}>
      <CardContent sx={{ display: 'flex' }}>
        <div style={{ flex: 1 }}>
          <Typography gutterBottom variant="h5" component="div">
            Train Dataset
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {trainDataset.concepts.length} concepts, {trainDataset.image_count} images, {trainDataset.total_repeat} repeat.
          </Typography>
        </div>


        <Button variant="text" startIcon={<AddCircleIcon />} size="small" color="primary" onClick={() => setCreateTrainsetDialog(true)}>
          add concept
        </Button>
      </CardContent>

      <Carousel withIndicators height={carousel_height} loop>
        {
          trainDataset.concepts.map((item: ConceptMetadata, index: number) =>
            <Carousel.Slide key={index}>
              <ConceptCover concept={item} onClick={() => jump2detail(false, item.name, item.repeat)} />
            </Carousel.Slide>)
        }
      </Carousel>

    </Card> : <Fab variant="extended" color="primary" size="small" onClick={() => setCreateTrainsetDialog(true)}>
      <AddCircleIcon sx={{ mr: 1 }} />
      add train concept
    </Fab>
    ;


  const regular = regularDataset && regularDataset.concepts.length > 0 ?
    <Card sx={{ width: '100%', marginBottom: 1, }}>
      <CardContent sx={{ display: 'flex' }}>
        <div style={{ flex: 1, }}>
          <Typography gutterBottom variant="h5" component="div">
            Regular Dataset
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {regularDataset.concepts.length} concepts, {regularDataset.image_count} images, {regularDataset.total_repeat} repeat.
          </Typography>
        </div>
        <Button variant="text" startIcon={<AddCircleIcon />} size="small" color="secondary" onClick={() => setCreateRegularsetDialog(true)}>
          add concept
        </Button>



      </CardContent>

      <Carousel withIndicators height={carousel_height} loop >
        {
          regularDataset.concepts.map((item: ConceptMetadata, index: number) =>
            <Carousel.Slide key={index} style={{ height: '100%', backgroundImage: `url('${item.cover}')`, backgroundSize: 'cover' }}>
              <ConceptCover concept={item} onClick={() => jump2detail(true, item.name, item.repeat)} />
            </Carousel.Slide>)
        }
      </Carousel>

    </Card> : <Fab variant="extended" color="secondary" size="small" onClick={() => setCreateRegularsetDialog(true)}>
      <AddCircleIcon sx={{ mr: 1 }} />
      add regular concept
    </Fab>
    ;

  async function rename(oldname: string, newname: string) {
    setLoading(true);
    // 执行修改名称函数
    try {
      await api.rename_imageset(oldname, newname);
    } catch(err: any) {
      dispatch(addMessage({msg: exception2string(err), severity: 'error'}));
      setLoading(false);
      return;
    }
    
    navigate(`/overview/${newname}`, { replace: true, state: { imageset_name: newname } });
    setLoading(false);
  }


  return (
    <Container sx={{ minHeight: '100vh', height: '100vh' }}>
      <Header imageset_name={imageset_name} onRenameImageset={rename}
        onLoad={load}
        onDelete={_delete}
      ></Header>

      {/* tool bar 占位 */}
      <Toolbar></Toolbar>
      <Box style={{ display: 'flex', minHeight: '85vh', }}>
        {
          loading ? <>{loadingContent}</> :
            <><Container style={{
              width: '50%',
              minHeight: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }} >
              {train}
            </Container>

              <Container style={{
                width: '50%',
                minHeight: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }} >
                {regular}
              </Container>
            </>
        }

      </Box>

      <CreateDialog imageset_name={imageset_name} open={createTrainsetDialog} type="train" onClose={() => setCreateTrainsetDialog(false)} 
        onSubmit={load}
      />
      <CreateDialog imageset_name={imageset_name} open={createRegularsetDialog} type="regular" onClose={() => setCreateRegularsetDialog(false)} 
        onSubmit={load}
      />
    </Container>);
}



export default Overview;


