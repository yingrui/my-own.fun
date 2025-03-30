interface PageLink {
  text: string;
  href: string;
}

interface PageInput {
  xpath: string;
  tag: string;
  type: string;
  label: string;
  value: string;
}

interface Page {
  url: string;
  title: string;
  text: string;
  links: PageLink[];
  layoutTree?: LayoutElement;
}

interface LayoutOffset {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface LayoutNode {
  xpath: string;
  offset: LayoutOffset;
  children: LayoutNode[];
  text: string;
  links: PageLink[];
  inputs: PageInput[];
}
