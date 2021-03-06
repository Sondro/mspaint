import d3 from '#lib/d3';
import { updateWorkspace, getVDOM } from '#shared/workspace';
import { CANVAS } from '#shared/constants';
import { pixelConvert } from '#shared/canvas/util';
import { drawColor, setColor } from '#ui/palette';
import { setScroll, scrollPos } from '#ui/scrollbars';
import { drawTool } from '#ui/tools';
import { ws, wsMessage } from '#js/socket';
import { getMotion, dragFilter } from './index';

let {width, height} = CANVAS;
let canvasWrap = d3.select('.canvasWrap');
let canvas = canvasWrap.select('canvas').style('opacity', 0);
let ctx = canvas.node().getContext('2d');
export const getContext = () => ctx;

// init canvas

canvas
    .attr('width', width)
    .attr('height', height);

// load initial canvas image

let preload = d3.select('.preload').node();

if (preload.complete) {
    initCanvas(preload);
}
else {
    preload.onload = () => initCanvas(preload);
}

function initCanvas(img) {
    ctx.drawImage(img, 0, 0, width, height);
    canvas.style('opacity', 1);

    // add events
    canvas.call(d3.drag()
        .filter(dragFilter)
        .on('start', dragstarted)
        .on('drag', dragging)
        .on('end', dragended));

    setScroll();
}


// drawing

let buttons = ['primary', void 0, 'secondary'];
let mouseName = buttons[0];

function dragstarted(d) {
    mouseName = buttons[d3.event.sourceEvent.button] || 'primary';

    let { x, y } = getMotion();

    let { name, ...drawToolEtc } = drawTool;

    // canvas
    if (name == 'FILL') {
        let obj = {cmd: 'CANVAS_FILL',
            x, y, color: drawColor[mouseName],
        };

        ws.sendObj(obj);
        updateWorkspace(obj);
    }
    // dom
    else if (name == 'SELECT') {
        let vdom = getVDOM('local');

        let obj = do {
            if (vdom.type == 'SELECTION') ({
                cmd: 'DOM_SELECT',
                event: 'drop',
            });
            else ({
                cmd: 'DOM_SELECT',
                x, y, event: 'start',
                color: drawColor.secondary,
                transparency: drawTool.transparency,
            });
        };

        ws.sendObj(obj);
        updateWorkspace(obj);
    }
    // other
    else {
        dragging(d);
    }
}

function dragging(d) {
    let { x, y, dx, dy } = getMotion();

    let { name, ...drawToolEtc } = drawTool;

    // canvas
    if (~['PENCIL','BRUSH'].indexOf(name)) {
        let obj = {cmd: 'CANVAS_' + name,
            x, y, dx, dy,
            color: drawColor[mouseName],
            ...drawToolEtc,
        };

        ws.sendObj(obj);
        updateWorkspace(obj);
    }
    else if (name == 'ERASE') {
        // I don't understand the logic here but this is what mspaint does, so...
        if (drawColor.match && mouseName == 'secondary') return;

        let obj = {cmd: 'CANVAS_ERASE',
            x, y, dx, dy,
            color: drawColor.secondary,
            ...drawToolEtc,
        };

        ws.sendObj(obj);
        updateWorkspace(obj);
    }
    // dom
    else if (name == 'SELECT') {

        let obj = {cmd: 'DOM_SELECT',
            x, y, event: 'drag',
        };

        ws.sendObj(obj);
        updateWorkspace(obj);
    }
    // other
    else if (name == 'PICK') {
        let pixelColor, pixelData = Array.from(ctx.getImageData(x, y, 1, 1).data);
        if (pixelData[3] > 128) {
            pixelColor = pixelConvert(pixelData.splice(0, 3));
            setColor({[mouseName]: pixelColor});
            drawTool.pickColor = pixelColor;
        }
    }

}

function dragended(d) {
    let { x, y } = getMotion();
    let { name } = drawTool;

    if (name == 'SELECT') {
        let obj = {cmd: 'DOM_SELECT',
            x, y, event: 'end',
        };

        ws.sendObj(obj);
        updateWorkspace(obj);
    }
    // other
    else if (name == 'ZOOM') {
        if (scrollPos.zoom != 1) {
            setScroll({zoom: 1});
        }
        else {
            setScroll({zoom: 4, x, y});
        }
    }

    drawTool.onEnd && drawTool.onEnd();
}
