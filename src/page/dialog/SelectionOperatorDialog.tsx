import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack, TextField } from "@mui/material";
import { useSelector } from "react-redux";
import { selectFilterNameList } from "../imageset/Editor";
import { useState } from "react";
import { RootState } from "../../app/store";
import { useDispatch } from "react-redux";
import { addFilter } from "../../app/conceptSlice";
import { ImageState } from "../../app/imageSetSlice";




function union<T>(a: Array<T>, b: Array<T>): Array<T> {
  return Array.from(new Set([...a, ...b]));
}

function intersection<T>(a: Array<T>, b: Array<T>): Array<T> {
  const setB = new Set(b);
  return Array.from(new Set([...a].filter(item => setB.has(item))));
}

function difference<T>(a: Array<T>, b: Array<T>): Array<T> {
  const setB = new Set(b);
  return Array.from(new Set([...a].filter(item => !setB.has(item))));
}

function symmetricDifference<T>(a: Array<T>, b: Array<T>): Array<T> {
  const diffA = difference(a, b);
  const diffB = difference(b, a);
  return union(diffA, diffB);
}


function SelectionOperatorDialog({
  open, onClose, onSubmit,
}: {
  open: boolean,
  onClose?: () => void,
  onSubmit?: (result_selection_name: string) => void,
}) {
  const dispatch = useDispatch();
  const filter_name_list = useSelector(selectFilterNameList);
  const union_char = "\u{222a}";
  const intersection_char = "\u{2229}";
  const symmetric_diff_char = "\u{2295}";
  const diff_char = "\u{2212}";
  const ops = [union_char, intersection_char, symmetric_diff_char, diff_char];

  const [op1, setOp1] = useState('[all]');
  const [op2, setOp2] = useState('[all]');
  const [op, setOp] = useState(union_char);
  const [resultName, setResultName] = useState('');


  const filters = useSelector((state: RootState) => state.concept.filters);

  return (<Dialog open={open} onClose={onClose}>
    <DialogTitle>Selection Operator</DialogTitle>

    <DialogContent>
      <Stack direction={"row"} sx={{ display: 'flex', alignContent: 'center', alignItems: 'center' }}>
        <Select
          variant="standard"
          size="small"
          value={op1}
          sx={{ m: 1, minWidth: 80 }}
          onChange={(event) => {
            setOp1(event.target.value);
          }}
        >
          {
            filter_name_list.map((name, index) => <MenuItem key={index} value={name}>
              {name}
            </MenuItem>)
          }
        </Select>

        <Select
          labelId="demo-simple-select-standard-label"
          id="demo-simple-select-standard"
          label="concept or selection"
          variant="standard"
          size="small"
          value={op}
          sx={{ m: 1, }}
          onChange={(event) => {
            setOp(event.target.value);
          }}
        >
          {
            ops.map((name, index) => <MenuItem key={index} value={name}>
              {name}
            </MenuItem>)
          }
        </Select>

        <Select
          labelId="demo-simple-select-standard-label"
          id="demo-simple-select-standard"
          label="concept or selection"
          variant="standard"
          size="small"
          value={op2}
          sx={{ m: 1, minWidth: 80 }}
          onChange={(event) => {
            setOp2(event.target.value);
          }}
        >
          {
            filter_name_list.map((name, index) => <MenuItem key={index} value={name}>
              {name}
            </MenuItem>)
          }
        </Select>
        <div style={{ marginLeft: 2, marginRight: 2 }}>
          <b>=</b>
        </div>

        <TextField
          variant="standard"
          size="small"
          value={resultName}
          onChange={(event) => setResultName(event.target.value)}
        />

      </Stack>

    </DialogContent>

    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button onClick={() => {
        if (!resultName || resultName === 'all') {
          window.alert(`result name can not be ${resultName}`);
        } else {
          // 执行计算
          const filter1 = filters.find(filter => filter.name === op1);
          const filter2 = filters.find(filter => filter.name === op2);
          
          let result: ImageState[] = [];

          if (filter1 && filter2) {
            // 针对符号进行运算
            switch (op) {
              case union_char:
                result = union(filter1.images, filter2.images);
                break;
              case intersection_char:
                result = intersection(filter1.images, filter2.images);
                break;
              case symmetric_diff_char:
                result = symmetricDifference(filter1.images, filter2.images);
                break;
              case diff_char:
                result = difference(filter1.images, filter2.images);
                break;
              default:
                window.alert(`unknown operator ${op}`);
                return;
            }
            
          }
          if(result.length <= 0) {
            window.alert("you get an empty selection");
            return;
          }
          dispatch(addFilter({
              name: `[${resultName}]`, 
              images: result,
            }));
            onClose?.();
            onSubmit?.(resultName);
        }
      }}>Compute</Button>
    </DialogActions>
  </Dialog>);
}

export default SelectionOperatorDialog;



