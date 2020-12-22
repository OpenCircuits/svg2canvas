
type Style = {
    fillStyle?: string;
    font?: string;
    globalAlpha?: string;
    globalCompositeOperation?: string;
    imageSmoothingEnabled?: string;
    lineCap?: string;
    lineDashOffset?: string;
    lineJoin?: string;
    lineWidth?: string;
    miterLimit?: string;
    shadowBlur?: string;
    shadowColor?: string;
    shadowOffsetX?: string;
    shadowOffsetY?: string;
    strokeStyle?: string;
    textAlign?: string;
    textBaseline?: string;
}

const StyleNames = [
    ["fillStyle", "fill", "black"],
    ["font", "", ""],
    ["globalAlpha", "opacity", ""],
    ["globalCompositeOperation", "", ""],
    ["imageSmoothingEnabled", "", ""],
    ["lineCap", "stroke-linecap", ""],
    ["lineDashOffset", "stroke-dashoffset", ""],
    ["lineJoin", "stroke-linejoin", ""],
    ["lineWidth", "stroke-width", "1"],
    ["miterLimit", "stroke-miterlimit", ""],
    ["shadowBlur", "", ""],
    ["shadowColor", "", ""],
    ["shadowOffsetX", "", ""],
    ["shadowOffsetY", "", ""],
    ["strokeStyle", "stroke", "none"],
    ["textAlign", "", ""],
    ["textBaseline", "", ""]
]

function stylesEqual(s1: Style, s2: Style): boolean {
    const keys1 = Object.keys(s1);
    const keys2 = Object.keys(s2);
    if (keys1.length !== keys2.length)
        return false;
    return keys1.every((key, i) => key == keys2[i] &&
                                   (s1 as any)[key] == (s2 as any)[key]);
}

function parseStyles(element: Element): Style {
    let style = {} as Style;
    for (const [styleName, name, defaultValue] of StyleNames) {
        if (!styleName || !name)
            continue;
        const value = element.getAttribute(name) || defaultValue;
        if (!value)
            continue;
        (style as any)[styleName] = value;
    }
    return style;
}

const GeometryProperties = {
    "cx": {
        parse: (data: string) => Number.parseFloat(data),
        defaultValue: (_) => 0
    },
    "cy": {
        parse: (data: string) => Number.parseFloat(data),
        defaultValue: (_) => 0
    },
    "r": {
        parse: (data: string) => Number.parseFloat(data),
        defaultValue: (_) => 0
    },
    "rx": {
        parse: (data: string) => Number.parseFloat(data),
        defaultValue: (e) => {
            const ry = e.getAttribute("ry");
            if (!ry || ry == "auto")
                return 0;
            const val = Number.parseFloat(ry);
            return isNaN(val) ? 0 : val;
        }
    },
    "ry": {
        parse: (data: string) => Number.parseFloat(data),
        defaultValue: (e) => {
            const rx = e.getAttribute("rx");
            if (!rx || rx == "auto")
                return 0;
            const val = Number.parseFloat(rx);
            return isNaN(val) ? 0 : val;
        }
    },
    "x": {
        parse: (data: string) => Number.parseFloat(data),
        defaultValue: (_) => 0,
    },
    "y": {
        parse: (data: string) => Number.parseFloat(data),
        defaultValue: (_) => 0,
    },
    "width": {
        parse: (data: string) => Number.parseFloat(data),
        defaultValue: (_) => 100,
    },
    "height": {
        parse: (data: string) => Number.parseFloat(data),
        defaultValue: (_) => 100,
    },
    "x1": {
        parse: (data: string) => Number.parseFloat(data),
        defaultValue: (_) => 0,
    },
    "y1": {
        parse: (data: string) => Number.parseFloat(data),
        defaultValue: (_) => 0,
    },
    "x2": {
        parse: (data: string) => Number.parseFloat(data),
        defaultValue: (_) => 0,
    },
    "y2": {
        parse: (data: string) => Number.parseFloat(data),
        defaultValue: (_) => 0,
    },
    "points": {
        parse: (data: string) => {
            return data.split(" ")
                       .filter(s => s.length > 0)
                       .map(s => s.split(",")
                                  .map(v => Number.parseFloat(v)));
        },
        defaultValue: (_) => "",
    },
    "d": {
        parse: (data: string) => data,
        defaultValue: (_) => undefined
    },
} as Record<string, {
    parse: (data: string) => any,
    defaultValue: (element: Element) => any
}>;

export class Drawing {
    private children: Drawing[];

    private style?: Style;
    private path?: Path2D;

    public constructor(style?: Style, path?: Path2D) {
        this.children = [];
        this.style = style;
        this.path = path;
    }

    private applyStyles(ctx: CanvasRenderingContext2D): void {
        if (!this.style)
            return;
        Object.entries(this.style).forEach(([k, v]) => {
            if (!(k in ctx) || (ctx as any)[k] == v)
                return;
            (ctx as any)[k] = v
        });
    }

    public addChild(child: Drawing): void {
        this.children.push(child);
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        this.applyStyles(ctx);

        if (this.path) {
            if (this.style && this.style.fillStyle != "none")
                ctx.fill(this.path);
            if (this.style && this.style.strokeStyle != "none")
                ctx.stroke(this.path);
        }

        this.children.forEach(d => d.draw(ctx));
    }
}

export class SVGDrawing {
    private children: Drawing[];

    private invWidth: number;
    private invHeight: number;

    public constructor(width: number, height: number) {
        this.children = [];

        this.invWidth = 1.0/width;
        this.invHeight = 1.0/height;
    }

    public addChild(child: Drawing): void {
        this.children.push(child);
    }

    public draw(ctx: CanvasRenderingContext2D, x: number = 0, y: number = 0, width?: number, height?: number): void {
        ctx.save();

        ctx.translate(x, y);
        if (width != undefined || height != undefined) {
            const sw = width  ? width *this.invWidth  : (height! * this.invHeight);
            const sh = height ? height*this.invHeight : (width! * this.invWidth);

            ctx.scale(sw, sh);
        }

        this.children.forEach(d => d.draw(ctx));

        ctx.restore();
    }
}

const Shapes = {
    "rect": {
        attributes: ["x", "y", "width", "height", "rx", "ry"],
        parse: ([x, y, width, height, rx, ry]: number[]) => {
            const path = new Path2D();
            path.rect(x, y, width, height);
            return path;
        }
    },
    "circle": {
        attributes: ["cx", "cy", "r"],
        parse: ([cx, cy, r]: number[]) => {
            const path = new Path2D();
            path.ellipse(cx, cy, r, r, 0, 0, 2*Math.PI);
            return path;
        }
    },
    "ellipse": {
        attributes: ["cx", "cy", "rx", "ry"],
        parse: ([cx, cy, rx, ry]: number[]) => {
            const path = new Path2D();
            path.ellipse(cx, cy, rx, ry, 0, 0, 2*Math.PI);
            return path;
        }
    },
    "line": {
        attributes: ["x1", "y1", "x2", "y2"],
        parse: ([x1, y1, x2, y2]: number[]) => {
            const path = new Path2D();
            path.moveTo(x1, y1);
            path.lineTo(x2, y2);
            return path;
        }
    },
    "polyline": {
        attributes: ["points"],
        parse: ([points]: (number[][])[]) => {
            const path = new Path2D();
            for (let i = 0; i < points.length; i++) {
                const [x, y] = points[i];
                if (i == 0)
                    path.moveTo(x, y);
                else
                    path.lineTo(x, y);
            }
            return path;
        }
    },
    "polygon": {
        attributes: ["points"],
        parse: ([points]: (number[][])[]) => {
            const path = new Path2D();
            for (let i = 0; i < points.length; i++) {
                const [x, y] = points[i];
                if (i == 0)
                    path.moveTo(x, y);
                else
                    path.lineTo(x, y);
            }
            path.closePath();
            return path;
        }
    },
    "path": {
        attributes: ["d"],
        parse: ([d]: string[]) => {
            return new Path2D(d);
        }
    }
} as Record<string, {
    attributes: string[],
    parse: (attributes: any[]) => Path2D
}>;

export function CreateDrawingFromSVG(svg?: XMLDocument): SVGDrawing | undefined {
    if (!svg)
        return undefined;

    // Make sure there is exactly 1 svg root
    const root = svg.getElementsByTagName("svg");
    if (!root || root.length == 0)
        throw new Error("Can't find root element `svg` in the given SVG document!");
    else if (root.length > 1)
        throw new Error("Invalid SVG XML! Can only have one root `svg` element.");

    // Get width/height of svg
    const width = root[0].getAttribute("width");
    if (!width)
        throw new Error("Failed to find SVG `width` attribute!");
    const height = root[0].getAttribute("height");
    if (!height)
        throw new Error("Failed to find SVG `height` attribute!");

    // Get non-null and supported elements
    const nodes = Array.from(root[0].children).filter(element => {
        if (!element)
            return false;
        const type = element.nodeName;
        if (!(type in Shapes)) {
            console.error(`Unsupported SVG node type ${type}! Please make an issue on http://github.com/OpenCircuits/svg2path2D/issues!`);
            return false;
        }
        return true;
    });

    // Get shape (style and path) for each node
    const shapes = nodes.map(element => {
        const type = element.nodeName;
        const style = parseStyles(element);

        const shape = Shapes[type];
        const attributes = shape.attributes.map((attribute) => {
            const {parse, defaultValue} = GeometryProperties[attribute];
            const val = element.getAttribute(attribute);
            return (val ? parse(val) : defaultValue(element)) as number;
        });
        const path = shape.parse(attributes);

        return [style, path];
    }) as [Style, Path2D][];

    // Reduce the shapes into one path by style
    //  this is more efficient since we can group the stylings
    //  under one path and therefore 1 draw call
    const reducedShapes = shapes.reduce((acc, cur) => {
        if (acc.length == 0)
            return [cur];
        const [curStyle, curPath] = cur;
        const [prevStyle, prevPath] = acc[acc.length-1];
        if (stylesEqual(curStyle, prevStyle)) {
            const newPath = new Path2D(prevPath);
            newPath.addPath(curPath);
            return [...acc.slice(0, acc.length-1), [prevStyle, newPath] as [Style, Path2D]];
        }
        return [...acc, cur];
    }, [] as [Style, Path2D][]);

    // Add each shape as a drawing to the root drawing
    const rootDrawing = new SVGDrawing(Number.parseFloat(width), Number.parseFloat(height));
    reducedShapes.forEach(([style, path]) =>
        rootDrawing.addChild(new Drawing(style, path))
    );

    return rootDrawing;
}
