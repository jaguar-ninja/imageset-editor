import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@mui/material";
import { exception2string } from "../../utils";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { useDispatch } from "react-redux";
import { addMessage } from "../../app/messageSlice";


interface newDialogProps {
  open: boolean;
  onClose: () => void,
};

function NewDialog(props: newDialogProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch();


  return (
    <><Dialog
      open={props.open}
      onClose={props.onClose}
      PaperProps={{
        component: 'form',
        onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const formJson = Object.fromEntries((formData as any).entries());
          const name = formJson.name;

          api.create_imageset(name)
            .then((res: any) => {
              dispatch(addMessage({ msg: `create imageset '${res}' successful.`, severity: 'success' }));
              // 应该在这里就设置 imageset_name
              navigate(`/overview/${name}`);
            })
            .catch((err: any) => {
              dispatch(addMessage({ msg: exception2string(err), severity: 'error' }));
            })
            .finally(() => {
              props.onClose();
            });
        },
      }}
    >
      <DialogTitle>create new imageset</DialogTitle>
      <DialogContent>
        <DialogContentText>
          input imageset name to create a new imageset.
        </DialogContentText>
        <TextField
          autoFocus
          required
          margin="dense"
          id="name"
          name="name"
          label="ImageSet Name"
          type="text"
          variant="standard"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>cancel</Button>
        <Button type="submit">create</Button>
      </DialogActions>
    </Dialog>
    </>
  );
}

export default NewDialog;



