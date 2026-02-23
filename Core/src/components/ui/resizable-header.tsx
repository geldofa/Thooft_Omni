import { Resizable } from 'react-resizable';
import { TableHead } from './table';


export const ResizableHeader = ({ onResize, width, ...props }: any) => {
    if (!width) {
        return <TableHead {...props} />;
    }

    return (
        <Resizable
            width={width}
            height={0}
            onResize={onResize}
            draggableOpts={{ enableUserSelectHack: false }}
        >
            <TableHead {...props} style={{ width: `${width}px` }} />
        </Resizable>
    );
};
