import d3 from '#lib/d3';
import { setScroll, scrollPos } from './scrollbars';
import { updateWorkspace, getVDOM } from '#shared/workspace';
import { ws } from '../socket';

// variables

let selectedIndex = 6;
let lastDrawTool = 6;

let tools = [
    null, 'SELECT',
    'ERASE', 'FILL',
    'PICK', 'ZOOM',
    'PENCIL', 'BRUSH',
];

export let drawTool = {
    get name() {
        return tools[selectedIndex];
    },
    get size() {
        if (drawTool.name == 'BRUSH') {
            return [3,2,1][brushIndex%3];
        }
        else if (drawTool.name == 'ERASE') {
            return eraseRadii[eraseIndex];
        }
    },
    get shape() {
        if (drawTool.name == 'BRUSH') {
            return brushIndex < 3 ? 'circle'
                : brushIndex < 6 ? 'rect'
                : brushIndex < 9 ? 'bkLine'
                : 'fwLine';
        }
    },
    get transparency() {
        if (drawTool.name == 'SELECT') {
            return transIndex == 1 ? true : false;
        }
    },
    set pickColor(color) {
        if (drawTool.name == 'PICK') {
            subTool.style('background-color', color);
        }
    },
    get onEnd() {
        if (drawTool.name == 'PICK' || drawTool.name == 'ZOOM') {
            subTool.style('background-color', null);
            return () => selectTool(null, lastDrawTool);
        }
    },
};

// draw toolbox

let toolbox = d3.select('.toolbox');

let selection = toolbox.selectAll('.tool')
    .data(new Array(16).fill({}));

let enter = selection.enter()
    .append('div')
    .classed('tool', 1)
    .append('div')
    .on('mousedown', selectTool);

enter.append('img')
    .attr('src', (d,i) => `tools/${i==selectedIndex?'down':'up'}.png`);

enter.append('img')
    .attr('src', (d,i) => `tools/${i}.png`);

// change tool...

function selectTool(d, i) {
    if (getVDOM('local').type == 'SELECTION') {
        let obj = {
            cmd: 'DOM_SELECT',
            event: 'drop',
        };
        ws.sendObj(obj);
        updateWorkspace(obj);
    }

    if (selectedIndex == i) return;
    d3.selectAll('.tool')
        .select('img')
        .attr('src', 'tools/up.png');
    toolbox.select(`.tool:nth-child(${i+1})`)
        .select('img')
        .attr('src', 'tools/down.png');
    selectedIndex = i;
    if (~[2,3,6,7,8,10,11,12,13,14,15].indexOf(i)) {
        lastDrawTool = i;
    }
    selectSubTool();
}

// subtool

let subTool = toolbox.append('div').classed('subtool', 1);

function selectSubTool() {
    subTool.html('');

    if (drawTool.name == 'BRUSH') {
        drawBrushSub();
    }
    else if (drawTool.name == 'ZOOM') {
        drawZoomSub();
    }
    else if (drawTool.name == 'ERASE') {
        drawEraseSub();
    }
    else if (drawTool.name == 'SELECT') {
        drawTransparencySub();
    }
}

function getSubSVG() {
    let svg = subTool.select('svg');
    if (!svg.node()) {
        svg = subTool.append('svg');
    }
    return svg;
}

// brush

let brushData = [
    // circles
    {r: 3}, {r: 2}, {r: 1},
    // rectangles
    {x: 4, size: 8}, {x: 18, size: 5}, {x: 31, size: 2},
    // lines
    {x1: 4, x2: 12, y1: 42, y2: 34},{x1: 18, x2: 23, y1: 41, y2: 36},{x1: 31, x2: 33, y1: 40, y2: 38},
    {x2: 4, x1: 12, y1: 57, y2: 49},{x2: 18, x1: 23, y1: 56, y2: 51},{x2: 31, x1: 33, y1: 55, y2: 53},
];
let brushIndex = 1;

function drawBrushSub() {
    let svg = getSubSVG();

    let brushSelection = svg.selectAll('.brush')
        .data(brushData);

    brushSelection
        .enter()
        .append('g')
        .classed('brush', 1)
        .each(function(d, i) {
            let subShape, self = d3.select(this);

            self.append('rect')
                .classed('cover', 1)
                .attr('fill', 'transparent')
                .attr('x', ((i%3)*12)+5)
                .attr('y', (15*((i/3)|0))+2)
                .attr('width', 6)
                .attr('height', 12);

            if (i < 3) {
                subShape = self.append('circle')
                    .attr('r', (d) => d.r)
                    .attr('cx', (12*i) + 8)
                    .attr('cy', 8);
            }
            else if (i < 6) {
                subShape = self.append('rect')
                    .attr('x', (d) => d.x)
                    .attr('y', 16 + i)
                    .attr('width', (d) => d.size)
                    .attr('height', (d) => d.size);
            }
            else if (i < 12) {
                subShape = self.append('line')
                    .attr('x1', (d) => d.x1)
                    .attr('x2', (d) => d.x2)
                    .attr('y1', (d) => d.y1)
                    .attr('y2', (d) => d.y2)
                    .style('stroke', 'black')
                    .style('stroke-width', 1);
            }

            subShape
                .classed('shape',1);
        })
        .on('click', (d, i) => {
            brushIndex = i;
            drawBrushSub();
        })
        .merge(brushSelection)
        .each(function(d, i) {
            let self = d3.select(this);
            let cover = self.select('.cover');
            let shape = self.select('.shape');

            let isSelected = brushIndex == i;
            cover.attr('fill', isSelected ? '#008' : 'transparent');
            if (i < 6) {
                shape.attr('fill', isSelected ? 'white' : 'black');
            }
            else {
                shape.style('stroke', isSelected ? 'white' : 'black');
            }
        });

}

// zoom

let zoomFactors = [1, 2, 6, 8];

function drawZoomSub() {
    let svg = getSubSVG();

    let zoomSelection = svg.selectAll('.zoom')
        .data(zoomFactors);

    let zoomGroup = zoomSelection
        .enter()
        .append('g')
        .classed('zoom', 1)
        .each(function(d, i) {
            let zoomGroup = d3.select(this);
            // selection
            zoomGroup
                .append('rect')
                .classed('cover', 1)
                .attr('x', 0)
                .attr('y', (i * 16) + 2)
                .attr('width', 40)
                .attr('height', 12)
                .on('click', () => {
                    setScroll({zoom: d});
                    selectTool(null, lastDrawTool);
                });

            // number
            zoomGroup
                .append('text')
                .classed('desc', 1)
                .attr('x', 6)
                .attr('y', i * 16)
                .attr('dy', '1.1em')
                .style('font-size', '11px')
                .text(d + 'x');

            // shape
            zoomGroup
                .append('rect')
                .classed('desc', 1)
                .attr('x', 28 - (d/2))
                .attr('y', (i * 14.15) + 9 +(i==3))
                .attr('width', d)
                .attr('height', d);
        })
        .merge(zoomSelection)
        .each(function(d, i) {
            let group = d3.select(this);
            let { zoom } = scrollPos;
            let zoomIndex = zoomFactors.indexOf(zoom);
            group
                .selectAll('.cover')
                .attr('fill', zoomIndex == i ? '#008' : 'transparent');
            group
                .selectAll('.desc')
                .attr('fill', zoomIndex == i ? 'white' : 'black');
        });

}

// erase

let eraseIndex = 2;
let eraseRadii = [2, 3, 4, 5];

function drawEraseSub() {
    let svg = getSubSVG();

    let eraseSelection = svg.selectAll('.erase')
        .data(eraseRadii);

    eraseSelection
        .enter()
        .append('g')
        .classed('erase', 1)
        .each(function(d, i) {
            let group = d3.select(this);
            group.append('rect')
                .classed('select', 1)
                .attr('x', 12)
                .attr('y', (i * 15) + 2 +(i==3))
                .attr('width', 14)
                .attr('height', 14)
                .on('click', () => {
                    eraseIndex = i;
                    drawEraseSub();
                });
            group.append('rect')
                .classed('size', 1)
                .attr('x', 19 - d)
                .attr('y', (i * 14) + 7 +(i==3))
                .attr('width', d*2)
                .attr('height', d*2);
        })
        .merge(eraseSelection)
        .each(function(d, i) {
            let group = d3.select(this);
            group.selectAll('.select')
                .attr('fill', eraseIndex == i ? '#008' : 'transparent');
            group.selectAll('.size')
                .attr('fill', eraseIndex == i ? 'white' : 'black');
        });
}

// transparency

let transIndex = 0;
let transTypes = [
    { name: 'opaque', top: 4 },
    { name: 'transparent', top: 36 },
];

function drawTransparencySub() {
    let transSelection = subTool.selectAll('.trans')
        .data(transTypes);

    transSelection
        .enter()
        .append('img')
        .classed('trans', 1)
        .attr('src', (d) => `tools/${d.name}.png`)
        .style('position', 'absolute')
        .style('z-index', 2)
        .style('top', (d) => d.top + 'px');

    let coverSelection = subTool.selectAll('.cover')
        .data(transTypes);

    coverSelection
        .enter()
        .append('div')
        .classed('cover', 1)
        .style('position', 'absolute')
        .style('top', (d) => d.top - 3 + 'px')
        .style('left', 0)
        .style('right', 0)
        .style('height', '29px')
        .style('z-index', 1)
        .on('click', (d, i) => {
            transIndex = i;
            drawTransparencySub();
            let obj = {
                cmd: 'DOM_ASSIGN',
                properties: {
                    transparency: drawTool.transparency,
                },
            };
            ws.sendObj(obj);
            updateWorkspace(obj);
        })
        .merge(coverSelection)
        .style('background-color', (d, i) => i == transIndex ? '#008' : 'rgba(0,0,0,0)');

}
