import { HashRouter as Router, Navigate, Route, Routes, } from 'react-router-dom';
import './App.css';
import Start from './page/start/Start';
import Overview from './page/imageset/Overview';

import Debug from './page/debug/Debug';
import NotFound from './page/notfound/NotFound';
import SelectionEditor from './page/imageset/SelectionEditor';
import SimilarImageEditor from './page/imageset/SimilarImageEditor';
import ImageSet from './page/imageset/ImageSet';
import { Alert, Snackbar } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from './app/store';
import { useDispatch } from 'react-redux';
import { removeMessage } from './app/messageSlice';

export function App() {
  const messages = useSelector((state: RootState) => state.message.messages);
  const dispatch = useDispatch();

  return (
    <>
      <Router>
        <Routes>
          <Route path='/home' element={<Start />} />
          <Route path='/overview/:imageset_name/*' element={<Overview />} />
          <Route path="/selection-editor/:imageset_name/:type/:concept_name/:repeat/:filter_name/*" element={<SelectionEditor selectable badge />} />

          {/* 有点意思，还可以这样 */}
          <Route path='/concept/:imageset_name/:type/:concept_name/:repeat/:filter_name/*' element={<ImageSet />} />

          <Route path='/similar-image-editor' element={<SimilarImageEditor />} />
          <Route path='/debug' element={<Debug />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<NotFound />}></Route>
        </Routes>
      </Router>

      {/* 直接在最外层展示错误消息 */}
      {
        messages.map((msg, index) => <Snackbar
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          open={true}
          onClose={() => {
            // 移除掉这条消息
            dispatch(removeMessage(msg.id));
          }}
        >
          <Alert severity={msg.severity} onClose={() => dispatch(removeMessage(msg.id)) }>
            {msg.msg}
          </Alert>

        </Snackbar>)
      }


      {/* 背景图片 */}
      <img src="https://images.unsplash.com/photo-1549388604-817d15aa0110" alt='bg'
        style={{
          zIndex: -1,
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }} />
    </>
  );
}

export default App;
