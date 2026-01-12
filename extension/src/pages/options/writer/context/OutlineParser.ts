import type { TreeDataNode } from "antd";

interface TreeNode {
  key: string;
  level: number;
  title: string;
  children: TreeNode[];
  parent: TreeNode | null;
}

class OutlineParser {
  private root: TreeNode;

  constructor() {
    this.resetRoot();
  }

  private resetRoot() {
    this.root = {
      key: "0",
      level: 0,
      title: "Root",
      children: [],
      parent: null,
    };
  }

  public getTreeDataNode(): TreeDataNode {
    return this.convertToTreeDataNode(this.root);
  }

  public parse(content: string): OutlineParser {
    // Parse the markdown content and generate the outline
    // all the headings are starting with #, ##, ###, ####, #####
    // all the headings are descendent of the root node
    this.resetRoot();
    const lines = content.split("\n");
    let parent = this.root;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const level = this.getHeadingLevel(line);
      const title = this.getHeadingTitle(line);
      if (level > 0 && title.length > 0) {
        if (level == parent.level) {
          parent = parent.parent;
        } else if (level < parent.level) {
          while (parent.level >= level) {
            parent = parent.parent!;
          }
        }
        // When level > parent.level, directly add the node as a child of the parent node
        const node: TreeNode = {
          key: parent.key + "-" + parent.children.length + "-" + title,
          title: title,
          level: level,
          children: [],
          parent: parent,
        };
        parent.children.push(node);
        parent = node;
      }
    }
    return this;
  }

  private convertToTreeDataNode(node: TreeNode): TreeDataNode {
    return {
      title: node.title,
      key: node.key,
      children: node.children.map((child) => this.convertToTreeDataNode(child)),
    };
  }

  private getHeadingLevel(line: string) {
    const heading = line.slice(0, line.indexOf(" ")).trim();
    // if all the characters are #, then it is a heading
    if (heading.match(/^#+$/)) {
      return heading.length;
    }
    return -1;
  }

  private getHeadingTitle(line: string) {
    return line.slice(line.indexOf(" ") + 1).trim();
  }
}

export default OutlineParser;
