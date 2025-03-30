import LayoutElement from "./LayoutElement";

class PageLayoutTree {
  root: LayoutElement;
  depth: number;

  constructor(body: HTMLElement, depth: number = 4) {
    const layout = {
      width: body.offsetWidth,
      height: body.offsetHeight,
      x: body.offsetLeft,
      y: body.offsetTop,
    };
    this.root = new LayoutElement(null, body, layout);
    this.depth = depth;
  }

  getRootNode(): LayoutElement {
    this.prune([this.root], 0);
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
