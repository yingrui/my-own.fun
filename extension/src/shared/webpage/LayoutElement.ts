import HtmlTag from "./tags";
import getXpath from "./XpathUtils";
import { getInputs, getLinks, getText } from "./ElementUtils";

class LayoutElement {
  element: HTMLElement;
  parent: LayoutElement;
  offset: LayoutOffset;
  children: LayoutElement[];
  keep: boolean;

  constructor(
    parent: LayoutElement,
    element: HTMLElement,
    offset: LayoutOffset,
  ) {
    this.parent = parent;
    this.element = element;
    this.offset = offset;
    this.children = this.isLeaf() ? [] : this.parseChildren();
    this.keep = this.shouldKeep();
    this.shrink();
  }

  isLeaf(): boolean {
    return (
      HtmlTag.isLeafTag(this.element.tagName) || !this.element.hasChildNodes()
    );
  }

  shouldKeep(): boolean {
    if (this.isSignificantVisualBlock()) {
      return true;
    }
    let shouldKeep = true;
    shouldKeep = shouldKeep && !this.isLeaf();
    return shouldKeep;
  }

  visible(): boolean {
    let isCurrentNodeVisible = this.offset.w > 0 && this.offset.h > 0;
    // Check if any of its children is visible when itself is not visible
    if (!isCurrentNodeVisible && this.element.hasChildNodes()) {
      const child = this.element.children[0];
      if (child instanceof HTMLElement) {
        isCurrentNodeVisible = child.offsetWidth > 0 && child.offsetHeight > 0;
      }
    }
    return isCurrentNodeVisible;
  }

  shrink() {
    // Strategy 1: If there is only 1 child, replace current node with child
    if (this.children.length === 1) {
      const child = this.children[0];
      this.element = child.element;
      this.offset = child.offset;
      this.children = child.children;
      this.keep = child.keep;
      return;
    }

    // Strategy 2: If all children are at same line, merge all by setting children to empty list
    if (
      this.isAllChildrenAtSameLine() &&
      this.isHorizontalRect() &&
      this.isAllChildrenNonSignificant()
    ) {
      this.children = [];
      return;
    }

    // Strategy 3:
    // If current node is smaller that parent & all children are at same column
    // Then merge all by setting children to empty list
    if (
      this.isCurrentNodeWidthLessThanParent() &&
      this.isAllChildrenAtSameColumn() &&
      this.isAllChildrenNonSignificant()
    ) {
      this.children = [];
      return;
    }
  }

  toPojo(): LayoutNode {
    return {
      xpath: getXpath(this.element),
      offset: this.offset,
      children: this.children.map((child) => child.toPojo()),
      text: this.children.length > 0 ? "" : getText(this.element),
      links: this.children.length > 0 ? [] : getLinks(this.element),
      inputs: this.children.length > 0 ? [] : getInputs(this.element),
    };
  }

  toPojoSlim(): Record<string, unknown> {
    const text = this.children.length > 0 ? "" : getText(this.element);
    const links = this.children.length > 0 ? [] : getLinks(this.element);
    const children = this.children.map((child) => child.toPojoSlim());
    const inputs = this.children.length > 0 ? [] : getInputs(this.element);

    const node: Record<string, unknown> = {
      xpath: getXpath(this.element),
      offset: this.offset,
    };
    if (children.length > 0) node.children = children;
    if (links.length > 0) node.links = links;
    if (text !== "") node.text = text;
    if (inputs.length > 0) node.inputs = inputs;
    return node;
  }

  private isCurrentNodeWidthLessThanParent(): boolean {
    if (this.parent != null) {
      return (
        this.offset.w < this.parent.offset.w &&
        this.offset.x >= this.parent.offset.x
      );
    }
    return false;
  }

  private isAllChildrenAtSameLine(): boolean {
    let isSameLine = this.children.length > 1;
    for (const child of this.children) {
      const isSamePosition = Math.abs(this.offset.y - child.offset.y) <= 2;
      const isSameHeight =
        Math.abs(this.offset.h - child.offset.h) <= 2;
      isSameLine = isSameLine && isSamePosition && isSameHeight;
      if (!isSameLine) {
        return false;
      }
    }

    return true;
  }

  private isAllChildrenNonSignificant(): boolean {
    let isNonSignificant = true;
    for (const child of this.children) {
      isNonSignificant = isNonSignificant && !child.isSignificantVisualBlock();
      if (!isNonSignificant) {
        return false;
      }
    }
    return true;
  }

  private isSignificantVisualBlock(): boolean {
    const area = this.offset.w * this.offset.h;
    const areaThreshold = 153600; // 480 * 320 = 153,600;
    return area > areaThreshold;
  }

  private isHorizontalRect(): boolean {
    return this.offset.w > this.offset.h;
  }

  private isAllChildrenAtSameColumn(): boolean {
    let isSameLine = this.children.length > 1;
    for (let i = 0; i < this.children.length - 1; i++) {
      const child = this.children[i];
      const isSamePosition = Math.abs(this.offset.x - child.offset.x) <= 2;
      const isSameWidth = Math.abs(this.offset.w - child.offset.w) <= 2;
      isSameLine = isSameLine && isSamePosition && isSameWidth;
      if (i > 0 && isSameLine) {
        const prevChild = this.children[i - 1];
        const isAdjacent =
          Math.abs(
            prevChild.offset.y + prevChild.offset.h - child.offset.y,
          ) <= 1;
        isSameLine = isSameLine && isAdjacent;
      }
      if (!isSameLine) {
        return false;
      }
    }

    return true;
  }

  private parseChildren(): LayoutElement[] {
    const children = [];
    for (const child of this.element.children) {
      if (child instanceof HTMLElement) {
        if (
          HtmlTag.isCodeTag(this.element.tagName) ||
          HtmlTag.isBlockTag(this.element.tagName)
        ) {
          continue;
        }
        const offset = {
          w: child.offsetWidth,
          h: child.offsetHeight,
          x: child.offsetLeft,
          y: child.offsetTop,
        };
        const node = new LayoutElement(this, child, offset);
        if (node.visible() && node.keep) {
          children.push(node);
        }
      }
    }
    return children;
  }
}

export default LayoutElement;
