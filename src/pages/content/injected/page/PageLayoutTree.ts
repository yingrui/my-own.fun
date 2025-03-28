import _ from "lodash";

interface PageLink {
  text: string;
  href: string;
}

interface Page {
  url: string;
  title: string;
  text: string;
  links: PageLink[];
  layoutTree?: LayoutNode;
}

interface Layout {
  width: number;
  height: number;
  x: number;
  y: number;
}

class LayoutNode {
  xpath: string;
  element: HTMLElement;
  parent: LayoutNode;
  layout: Layout;
  children: LayoutNode[];
  keep: boolean;
  static leafNodeNames = [
    "p",
    "a",
    "button",
    "span",
    "br",
    "img",
    "li",
    "tr",
    "td",
    "th",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "dl",
    "dt",
    "dd",
    "blockquote",
    "pre",
    "code",
    "em",
    "strong",
    "b",
    "i",
    "u",
    "s",
    "strike",
    "sup",
    "sub",
    "small",
    "big",
    "font",
    "center",
    "cite",
    "abbr",
    "acronym",
    "address",
    "bdo",
    "q",
    "ins",
    "del",
    "kbd",
    "samp",
    "var",
    "dfn",
    "mark",
    "ruby",
    "rt",
    "rp",
    "rt",
    "rp",
    "rtc",
    "rb",
    "rbc",
    "rtc",
    "rb",
    "rbc",
    "rt",
    "rp",
  ];

  static blockNodeNames = [
    "section",
    "article",
    "aside",
    "nav",
    "header",
    "footer",
    "table",
    "iframe",
  ];

  constructor(parent: LayoutNode, element: HTMLElement, layout: Layout) {
    this.parent = parent;
    this.element = element;
    this.layout = layout;
    this.children = this.isLeaf() ? [] : this.parseChildren();
    this.keep = this.shouldKeep();
    this.shrink();
  }

  shouldKeep(): boolean {
    let shouldKeep = true;
    shouldKeep = shouldKeep && !this.isLeaf();

    return shouldKeep;
  }

  shrink() {
    // Strategy 1: If there is only 1 child, replace current node with child
    if (this.children.length === 1) {
      const child = this.children[0];
      this.element = child.element;
      this.layout = child.layout;
      this.children = child.children;
      this.keep = child.keep;
      return;
    }

    // Strategy 2: If all children are at same line, merge all by setting children to empty list
    if (this.isAllChildrenAtSameLine()) {
      this.children = [];
      return;
    }

    // Strategy 3:
    // If current node is smaller that parent & all children are at same column
    // Then merge all by setting children to empty list
    if (
      this.isCurrentNodeWidthLessThanParent() &&
      this.isAllChildrenAtSameColumn()
    ) {
      this.children = [];
      return;
    }
  }

  private isCurrentNodeWidthLessThanParent(): boolean {
    if (this.parent != null) {
      return (
        this.layout.width < this.parent.layout.width &&
        this.layout.x >= this.parent.layout.x
      );
    }
    return false;
  }

  private isAllChildrenAtSameLine(): boolean {
    let isSameLine = this.children.length > 1;
    for (const child of this.children) {
      const isSamePosition = Math.abs(this.layout.y - child.layout.y) <= 2;
      const isSameHeight =
        Math.abs(this.layout.height - child.layout.height) <= 2;
      isSameLine = isSameLine && isSamePosition && isSameHeight;
      if (!isSameLine) {
        return false;
      }
    }

    return true;
  }

  private isAllChildrenAtSameColumn(): boolean {
    let isSameLine = this.children.length > 1;
    for (let i = 0; i < this.children.length - 1; i++) {
      const child = this.children[i];
      const isSamePosition = Math.abs(this.layout.x - child.layout.x) <= 2;
      const isSameWidth = Math.abs(this.layout.width - child.layout.width) <= 2;
      isSameLine = isSameLine && isSamePosition && isSameWidth;
      if (i > 0 && isSameLine) {
        const prevChild = this.children[i - 1];
        const isAdjacent =
          Math.abs(
            prevChild.layout.y + prevChild.layout.height - child.layout.y,
          ) <= 1;
        isSameLine = isSameLine && isAdjacent;
      }
      if (!isSameLine) {
        return false;
      }
    }

    return true;
  }

  visible(): boolean {
    let isCurrentNodeVisible = this.layout.width > 0 && this.layout.height > 0;
    // Check if any of its children is visible when itself is not visible
    if (!isCurrentNodeVisible && this.element.hasChildNodes()) {
      const child = this.element.children[0];
      if (child instanceof HTMLElement) {
        isCurrentNodeVisible = child.offsetWidth > 0 && child.offsetHeight > 0;
      }
    }
    return isCurrentNodeVisible;
  }

  isLeaf(): boolean {
    return (
      _.includes(
        LayoutNode.leafNodeNames,
        this.element.tagName.toLowerCase(),
      ) || !this.element.hasChildNodes()
    );
  }

  private parseChildren(): LayoutNode[] {
    const children = [];
    for (const child of this.element.children) {
      if (child instanceof HTMLElement) {
        if (
          _.includes(["script", "style", "svg"], child.tagName.toLowerCase())
        ) {
          continue;
        }
        if (
          _.includes(
            LayoutNode.blockNodeNames,
            this.element.tagName.toLowerCase(),
          )
        ) {
          continue;
        }
        const layout = {
          width: child.offsetWidth,
          height: child.offsetHeight,
          x: child.offsetLeft,
          y: child.offsetTop,
        };
        const node = new LayoutNode(this, child, layout);
        if (node.visible() && node.keep) {
          children.push(node);
        }
      }
    }
    return children;
  }
}

class PageLayoutTree {
  root: LayoutNode;
  depth: number;

  constructor(body: HTMLElement, depth: number = 4) {
    const layout = {
      width: body.offsetWidth,
      height: body.offsetHeight,
      x: body.offsetLeft,
      y: body.offsetTop,
    };
    this.root = new LayoutNode(null, body, layout);
    this.depth = depth;
  }

  getRootNode(): LayoutNode {
    this.prune([this.root], 0);
    return this.root;
  }

  private prune(nodes: LayoutNode[], d: number): void {
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
export { Page, PageLink, Layout, LayoutNode };
