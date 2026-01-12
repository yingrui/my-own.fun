import LayoutElement from "./LayoutElement";

class PageLayoutTree {
  private readonly root: LayoutElement;
  private readonly depth: number;

  constructor(body: HTMLElement, depth: number = 4) {
    const offset = {
      width: body.offsetWidth,
      height: body.offsetHeight,
      x: body.offsetLeft,
      y: body.offsetTop,
    };
    this.root = new LayoutElement(null, body, offset);
    this.depth = depth;
    this.prune([this.root], 0);
  }

  getRootNode(): LayoutElement {
    return this.root;
  }

  private prune(nodes: LayoutElement[], d: number): void {
    for (const node of nodes) {
      if (d >= this.depth) {
        node.children = [];
      } else {
        this.prune(node.children, d + 1);
      }
    }
  }
}

export default PageLayoutTree;
