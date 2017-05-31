let { h, render: renderDOM, Component } = require('preact');

let { normalizeObj } = require('./util');
let { updateWorkspace } = require('../workspace');
let ws = typeof __WEB__ != 'undefined' ? require('#js/socket') : void 0;

let dom = typeof __WEB__ != 'undefined' ? document.querySelector('.dom') : void 0;
let d3 = typeof __WEB__ != 'undefined' ? require('#lib/d3').default : void 0;

let render = () => null;
class Container extends Component {

    constructor(props) {
        super(props);

        this.state = {
            vdom: [],
        };

        render = (vdom) => {
            this.setState({vdom: Object.keys(vdom).map((target) => {
                let key = `${target}:${vdom[target].type}`;
                let obj = Object.assign({key, target}, vdom[target]);
                normalizeObj(obj);
                return obj;
            })});
        };
    }

    onMove = (node) => {
        if (node) {
            d3.select(node)
                .call(d3.drag()
                .on('drag', () => {
                    let { dx, dy } = require('d3-selection').event;
                    let obj = {
                        cmd: 'DOM_MOVE',
                        dx, dy,
                    };
                    require('#js/socket').ws.sendObj(obj);
                    require('../workspace').updateWorkspace(obj);
                }));
        }
    };

    render(props, {vdom}) {
        return <div>
            {vdom.map((element) => {
                return <div
                    class={`
                        element
                        selection
                        ${element.selecting ?'selecting':''}
                        ${element.target == 'local' ? 'local' : ''}
                    `}
                    style={{
                        top: element.y,
                        left: element.x,
                        width: element.width,
                        height: element.height,
                    }}
                    key={element.key}
                    ref={element.target == 'local' && this.onMove}
                >
                    {element.imgData && <CanvasFragment data={element}/>}
                </div>;
            })}
        </div>;
    }
}

class CanvasFragment extends Component {
    loadImgData = (node) => {
        if (node) {
            requestAnimationFrame(() => {
                let ctx = node.getContext('2d');
                let { imgData, width, height } = this.props.data;
                ctx.putImageData(imgData, 0, 0, 0, 0, width, height);
            });
        }
    };

    render({data: {width, height}}) {
        return <canvas
            ref={this.loadImgData}
            width={width}
            height={height}
        />;
    }
}

__WEB__ &&
renderDOM(<Container/>, dom);

module.exports = {
    render,
    CanvasFragment,
    Container,
};
