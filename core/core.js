/*
     This code, the project core, the implementation in this file is the intellectual property of Talkenson.
                           This code is made for study purposes, feel free to use it!
                  I hope, I can help you with some fields of your subject. By the way, welcome!

                                         Talkenson (Vitaly Shatalov)
                                                Autumn, 2020

    Project started on 10th Sept 2020.
*/

let STATE = _SETTINGS.setup.initialState;
const { pixelCrud, lineCrud, rectCrud, polyCrud, stateCrud, maskCrud } = {
  pixelCrud: new Crud(CrudStore.Pixels),
  lineCrud: new Crud(CrudStore.Lines),
  rectCrud: new Crud(CrudStore.Rectangles),
  polyCrud: new Crud(CrudStore.Polygons),
  stateCrud: new Crud(CrudStore.State),
  maskCrud: new Crud(CrudStore.Mask),
};
// Usage sample of new CRUD implementation
/*
lineCrud.create({point1: [0,0]});
lineCrud.create({point1: [55,2]});
lineCrud.create({point1: [1,4]});
console.log(lineCrud.getAll());
*/

const PolyMan = new PolygonContainer();


const countSizes = () => {
  _SETTINGS.general.activeArea.top = 0;
  _SETTINGS.general.activeArea.left = Math.floor((_SETTINGS.toolbar.width + _SETTINGS.toolbar.offset.left + _SETTINGS.toolbar.offset.right) / PIXEL_SIZE) * PIXEL_SIZE;
  _SETTINGS.general.activeArea.width = Math.floor((CANVAS_W - (_SETTINGS.toolbar.offset.left + _SETTINGS.toolbar.width  + _SETTINGS.toolbar.offset.right)) / PIXEL_SIZE) * PIXEL_SIZE;
  _SETTINGS.general.activeArea.height = (Math.floor((CANVAS_H - _SETTINGS.general.activeArea.top) / PIXEL_SIZE) - 1) * PIXEL_SIZE;
  _SETTINGS.general.activeArea.cellBorders.left = -Math.floor((CANVAS_W / 2 - _SETTINGS.general.activeArea.left) / PIXEL_SIZE);
  _SETTINGS.general.activeArea.cellBorders.top = Math.floor((CANVAS_H / 2 - _SETTINGS.general.activeArea.top + PIXEL_SIZE / 2) / PIXEL_SIZE) - 1;
  _SETTINGS.general.activeArea.cellBorders.right = Math.floor((_SETTINGS.general.activeArea.left + _SETTINGS.general.activeArea.width - CANVAS_W / 2) / PIXEL_SIZE);
  _SETTINGS.general.activeArea.cellBorders.bottom = -Math.floor((_SETTINGS.general.activeArea.top + _SETTINGS.general.activeArea.height - CANVAS_H / 2 + PIXEL_SIZE / 2) / PIXEL_SIZE);

};

const getRegion = () => {
  if (testXY(_SETTINGS.general.activeArea.left,
    _SETTINGS.general.activeArea.left + _SETTINGS.general.activeArea.width,
    _SETTINGS.general.activeArea.top,
    _SETTINGS.general.activeArea.top + _SETTINGS.general.activeArea.height)) {
    return 'activeArea'
  }
  if (testXY(_SETTINGS.toolbar.offset.left,
    _SETTINGS.toolbar.offset.left + _SETTINGS.toolbar.width,
    _SETTINGS.toolbar.offset.top,
    _SETTINGS.toolbar.offset.top + _SETTINGS.toolbar.height)) {
    return 'toolbar'
  }
  return 'none'
};

const utilsFixedUpdate = () => {
  const rg = getRegion();
  if (STATE.activeRegion !== rg || STATE.activeRegion === null) {
    STATE.activeRegion = rg;
    const index = _SETTINGS.cursors.findIndex(setup => STATE.activeRegion === setup.region);
    cursor(index >= 0 ? _SETTINGS.cursors[index].cursor : 'none')
  }
};

const handleHotkey = (key) => {
  if (_SETTINGS.general.hotkeys.isActive && _SETTINGS.general.hotkeys.linker[key]) {
    _SETTINGS.general.hotkeys.linker[key]();
  }
};

const drawLineRaw = (point1, point2, color = COLORS.BLACK, thickness = 1) => {
  STRCOLORS.STROKE && stroke(color);
  STRCOLORS.STROKE ? strokeWeight(thickness) : strokeWeight(0);
  line(point1[0], point1[1], point2[0], point2[1]);
};

const drawLine = (point1, point2, color = STATE.currentColor, thickness = 1, type = [AlgoType.BRZ]) => {
  if (type.includes(AlgoType.PLAIN)) {
    stroke(color);
    strokeWeight(thickness);
    line(CENTER_W + (point1[0] + 0.5) * PIXEL_SIZE, CENTER_H - (point1[1] + 0.5) * PIXEL_SIZE, CENTER_W + point2[0] * PIXEL_SIZE, CENTER_H - (point2[1] + 0.5) * PIXEL_SIZE);
  }

  if (type.includes(AlgoType.BRZ)) {
    let x00, x11, y00, y11;
    x00 = point1[0];
    x11 = point2[0];
    y00 = point1[1];
    y11 = point2[1];

    putPixel([x00, y00], color);

    if (x00 === x11 && y00 === y11) return;

    let A = y11 - y00, B = x00 - x11;
    let sign = Math.abs(A) > Math.abs(B) ? 1: -1;
    let signA = A < 0 ? -1 : 1;
    let signB = B < 0 ? -1 : 1;
    let f = 0;
    let x = x00, y = y00;
    if (sign === -1) {
      do {
        f += A * signA;
        if (f > 0) {
          f -= B * signB;
          y += signA;
        }
        x -= signB;
        putPixel([x, y], color);
      } while (x !== x11 || y !== y11);
    } else {
      do {
        f += B * signB;
        if (f > 0) {
          f -= A * signA;
          x -= signB;
        }
        y += signA;
        putPixel([x, y], color);
      } while (x !== x11 || y !== y11);
    }

  }
};
const drawRectangle = (point1, point2, color = STATE.currentColor, thickness = 1, type = [AlgoType.BRZ]) => {
  drawLine(point1, [point2[0], point1[1]], color, 0, [AlgoType.BRZ]);
  drawLine([point2[0], point1[1]], point2, color, 0, [AlgoType.BRZ]);
  drawLine(point2, [point1[0], point2[1]], color, 0, [AlgoType.BRZ]);
  drawLine([point1[0], point2[1]], point1, color, 0, [AlgoType.BRZ]);
};


const testForMask = ([x, y]) => {
  let mask = [false, false, false, false];

  if (testXY( // top part
    _SETTINGS.general.activeArea.cellBorders.left,
    _SETTINGS.general.activeArea.cellBorders.right,
    STATE.maskOptions.lt[1],
    _SETTINGS.general.activeArea.cellBorders.top, x, y)) {
    mask[0] = true
  }
  if (testXY( // right part
    STATE.maskOptions.rt[0],
    _SETTINGS.general.activeArea.cellBorders.right,
    _SETTINGS.general.activeArea.cellBorders.bottom,
    _SETTINGS.general.activeArea.cellBorders.top, x, y)) {
    mask[1] = true
  }
  if (testXY( // bottom part
    _SETTINGS.general.activeArea.cellBorders.left,
    _SETTINGS.general.activeArea.cellBorders.right,
    _SETTINGS.general.activeArea.cellBorders.bottom,
    STATE.maskOptions.rb[1], x, y)) {
    mask[2] = true
  }
  if (testXY( // left part
    _SETTINGS.general.activeArea.cellBorders.left,
    STATE.maskOptions.lt[0],
    _SETTINGS.general.activeArea.cellBorders.bottom,
    _SETTINGS.general.activeArea.cellBorders.top, x, y)) {
    mask[3] = true
  }
  //console.log(['top', 'right', 'bottom', 'left'].map((v, i) => mask[i] ? v : ''));
  return mask;
};

const drawGrid = (drawBack = null) => {
  background(COLORS.BG);

  /*stroke(COLORS.BLACK);
  strokeWeight(3);
  console.log(_SETTINGS.general.activeArea.left,
    _SETTINGS.general.activeArea.top,
    _SETTINGS.general.activeArea.left + _SETTINGS.general.activeArea.width,
    _SETTINGS.general.activeArea.top + _SETTINGS.general.activeArea.height);
  rect(
    _SETTINGS.general.activeArea.left,
    _SETTINGS.general.activeArea.top,
    _SETTINGS.general.activeArea.left + _SETTINGS.general.activeArea.width,
    _SETTINGS.general.activeArea.top + _SETTINGS.general.activeArea.height
  );*/

  for (let i = _SETTINGS.general.activeArea.left; i <= _SETTINGS.general.activeArea.left + _SETTINGS.general.activeArea.width; i += PIXEL_SIZE) {
    drawLineRaw([i, 0], [i, _SETTINGS.general.activeArea.height], STRCOLORS.STROKE)
  }

  for (let i = _SETTINGS.general.activeArea.top; i <= _SETTINGS.general.activeArea.height; i += PIXEL_SIZE) {
    drawLineRaw([_SETTINGS.general.activeArea.left, i], [_SETTINGS.general.activeArea.width + _SETTINGS.general.activeArea.left, i], STRCOLORS.STROKE)
  }
};
_SETTINGS.setup.modules.grid.render = drawGrid;
// Initializing

const putPixel = ([cox, coy], color = STATE.currentColor, ignoreMask = false) => {
    if (ignoreMask || STATE.maskOptions.isActive && !testForMask([cox, coy]).includes(true) || !STATE.maskOptions.isActive) {
      fill(color);
    } else {
      fill(COLORS.WHAY);
    }
    STRCOLORS.STROKE && stroke(STRCOLORS.STROKE);
    STRCOLORS.STROKE ? strokeWeight(1) : strokeWeight(0);
    square(CENTER_W + cox * PIXEL_SIZE, CENTER_H - (coy + 1) * PIXEL_SIZE, PIXEL_SIZE);
};

const startFillFrom = async (x, y, isColored = false, startColor = COLORS.WHITE, blockDir = null) => {
  STATE.processes.created++;
  let c = get(x, y).slice(0, 3);
  if (arraysEqual(c, STATE.currentColor) || !arraysEqual(c, startColor)) {
    STATE.processes.terminatedByColor++;
    return;
  }
  putPixel(C2Pix(x, y), STATE.currentColor);

  blockDir !== Directions.Left && isDrawable(C2Pix(x - PIXEL_SIZE, y)) &&
  await setTimeout(() => startFillFrom(x - PIXEL_SIZE, y, true, startColor, Directions.Right), _SETTINGS.toolbar.toolParams.Fill.delay);
  blockDir !== Directions.Up && isDrawable(C2Pix(x, y - PIXEL_SIZE)) &&
  await setTimeout(() => startFillFrom(x, y - PIXEL_SIZE, true, startColor, Directions.Down), _SETTINGS.toolbar.toolParams.Fill.delay);
  blockDir !== Directions.Right && isDrawable(C2Pix(x + PIXEL_SIZE, y)) &&
  await setTimeout(() => startFillFrom(x + PIXEL_SIZE, y, true, startColor, Directions.Left), _SETTINGS.toolbar.toolParams.Fill.delay);
  blockDir !== Directions.Down && isDrawable(C2Pix(x, y + PIXEL_SIZE)) &&
  await setTimeout(() => startFillFrom(x, y + PIXEL_SIZE, true, startColor, Directions.Up), _SETTINGS.toolbar.toolParams.Fill.delay);
  STATE.processes.terminatedByEnd++;
};

const forceFill = async ([x, y], ignoreColor = COLORS._MASK, blockDir = null) => {
  let c = get(x, y).slice(0, 3);
  if (arraysEqual(c, ignoreColor) || arraysEqual(c, COLORS.BG)) {
    STATE.processes.terminatedByColor++;
    return;
  }
  putPixel(C2Pix(x, y), COLORS.BG);

  blockDir !== Directions.Left && isDrawable(C2Pix(x - PIXEL_SIZE, y)) &&
  await setTimeout(() => forceFill([x - PIXEL_SIZE, y], ignoreColor, Directions.Right), _SETTINGS.toolbar.toolParams.Fill.delay);
  blockDir !== Directions.Up && isDrawable(C2Pix(x, y - PIXEL_SIZE)) &&
  await setTimeout(() => forceFill([x, y - PIXEL_SIZE], ignoreColor, Directions.Down), _SETTINGS.toolbar.toolParams.Fill.delay);
  blockDir !== Directions.Right && isDrawable(C2Pix(x + PIXEL_SIZE, y)) &&
  await setTimeout(() => forceFill([x + PIXEL_SIZE, y], ignoreColor, Directions.Left), _SETTINGS.toolbar.toolParams.Fill.delay);
  blockDir !== Directions.Down && isDrawable(C2Pix(x, y + PIXEL_SIZE)) &&
  await setTimeout(() => forceFill([x, y + PIXEL_SIZE], ignoreColor, Directions.Up), _SETTINGS.toolbar.toolParams.Fill.delay);
  STATE.processes.terminatedByEnd++;
};

const changeColor = (type) => {
  if (STATE.colorBlocked) return;
  switch (type) {
    case LEFT:
      _SETTINGS.general.color.current =
        (_SETTINGS.general.color.current + 1) % _SETTINGS.general.color.palette.length;
      break;
    case RIGHT:
      _SETTINGS.general.color.current =
        (_SETTINGS.general.color.current + _SETTINGS.general.color.palette.length - 1)
        % _SETTINGS.general.color.palette.length;
      break;
    case MIDDLE:
      _SETTINGS.general.color.current = 0;
      break;
  }
  STATE.currentColor = _SETTINGS.general.color.palette[_SETTINGS.general.color.current];
};

const ToolsRenderer = {
  'Pixel': (x, y, sx, sy) => {
    fill(50);
    text('Pix', x+1, y, sx-1, sy);
  },
  'Line': (x, y, sx, sy) => {
    fill(50);
    text('Line', x+1, y, sx-1, sy);
  },
  'Rectangle': (x, y, sx, sy) => {
    fill(50);
    text('Rect', x+1, y, sx-1, sy);
  },
  'Polygon': (x, y, sx, sy) => {
    fill(50);
    text('Poly', x+1, y, sx-1, sy);
  },
  'Fill': (x, y, sx, sy) => {
    fill(50);
    text('Fill', x+1, y, sx-1, sy);
  },
  'Colorizer': (x, y, sx, sy) => {
    fill(STATE.currentColor);
    rect(x, y, sx, sy);
    fill(50);
    text('COL', x+1, y, sx-1, sy);
  },
  'Clear': (x, y, sx, sy) => {
    fill(230, 40, 40);
    text('ERS', x+1, y, sx-1, sy);
  },
  'Export': (x, y, sx, sy) => {
    fill(50);
    text('SAV', x+1, y, sx-1, sy);
  },
  'Delimiter': (x, y, sx, sy) => {
    stroke(STRCOLORS.STROKEBLACKA);
    line(x, y + sy/2, x + sx, y + sy/2);
  },
  'Masking': (x, y, sx, sy) => {
    fill(COLORS.RED);
    text('MSK', x+1, y, sx-1, sy);
  },
  'MaskActivate': (x, y, sx, sy) => {
    fill(STATE.maskOptions.isActive ? COLORS._MASK : COLORS.WHAY);
    rect(x, y, sx, sy);
    fill(50);
    text(STATE.maskOptions.isActive ? 'ON' : 'OFF', x+1, y, sx-1, sy);
  },
};

const ToolActions = {
  'Pixel': (type) => ToolManager.changeTool('Pixel'),
  'Line': (type) => ToolManager.changeTool('Line'),
  'Rectangle': (type) => ToolManager.changeTool('Rectangle'),
  'Polygon': (type) => ToolManager.changeTool('Polygon'),
  'Fill': (type) => ToolManager.changeTool('Fill'),
  'Colorizer': (type) => ToolManager.useCallback(() => changeColor(type)),
  'Clear': (type) => ToolManager.useCallback( () => {
    Object.keys(_SETTINGS.setup.modules).forEach(key => {
      _SETTINGS.setup.modules[key].model ?
        _SETTINGS.setup.modules[key].model.render()
        : (_SETTINGS.setup.modules[key].render ? _SETTINGS.setup.modules[key].render() : console.log(`${key} isn\'t inited before clearing`))
    });
    document.dispatchEvent(new Event('clearEvent'));
  }),
  'Export': (type) => ToolManager.useCallback(
    () => saveCanvas(createCanvasName(), 'jpg')
  ),
  'Delimiter': (type) => {},
  'Masking': (type) => ToolManager.changeTool('Masking'),
  'MaskActivate': (type) => ToolManager.useCallback(
    () => STATE.maskOptions.isActive = !STATE.maskOptions.isActive
  ),
};


class Toolbar {
  constructor() {
    _SETTINGS.setup.modules.toolbar.isActive = true;
    _SETTINGS.setup.modules.toolbar.model = this;
  }
  width = _SETTINGS.toolbar.width;
  height = _SETTINGS.toolbar.height;
  pos = {
    x: _SETTINGS.toolbar.offset.left,
    y: _SETTINGS.toolbar.offset.top,
  };
  borderRadius = 5;
  tools = _SETTINGS.toolbar.toolset;
  _margins = {
    top: _SETTINGS.toolbar.buttonOffset.top,
    left: _SETTINGS.toolbar.buttonOffset.left,
    innerTop: _SETTINGS.toolbar.offset.inner.top,
  };
  _blockSize = {
    height: _SETTINGS.toolbar.buttonSize.height,
    width: _SETTINGS.toolbar.buttonSize.width,
    textMargin: {
      top: _SETTINGS.toolbar.innerTextOffset.top,
      left: _SETTINGS.toolbar.innerTextOffset.left,
    }
  };
  _buttons = [];

  pressButton = (mbtn = LEFT) => {
    this._buttons.forEach(btn => {
      if (testXY(btn.from.x, btn.to.x, btn.from.y, btn.to.y)) {
        btn.callback(mbtn);
        return;
      }
    })
  };

  render = () => {
    fill(COLORS.WHITE);
    stroke(COLORS.DARKGRAY);
    strokeWeight(1);

    rect(this.pos.x, this.pos.y,
      this.width, this.height,
      this.borderRadius, this.borderRadius, this.borderRadius, this.borderRadius
    );
    textAlign(CENTER, CENTER);

    fill(COLORS.LIGHTBLACK);
    text('Toolbar', this.pos.x + 2, this.pos.y + 5, 60, 15);

    let
      px = this.pos.x + this._margins.left,
      py = this.pos.y + this._margins.innerTop + this._margins.top,
      sx = this._blockSize.width,
      sy = this._blockSize.height;

    this.tools.forEach((tool, ind) => {
      if (tool === STATE.activeTool) {
        fill(COLORS.WHAY);
        stroke(COLORS.DARKGRAY);
      } else {
        fill(COLORS.WHITE);
        stroke(COLORS.WHAY);
      }

      (this._buttons.length < ind + 1) &&
        this._buttons.push({
          name: tool,
          from: {x: px, y: py},
          to: {x: px + sx, y: py + sy},
          callback: ToolActions[tool]
        });

      if (tool !== 'Delimiter') {
        rect(px, py, sx, sy);
      }
      ToolsRenderer[tool](px, py, sx, sy);

      py += this._margins.top + this._blockSize.height;
    });
  }
}
