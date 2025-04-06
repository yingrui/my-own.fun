interface PageLink {
  text: string;
  href: string;
}

interface SelectOption {
  value: string;
  text: string;
  selected?: boolean;
}

interface PageInput {
  xpath: string;
  tag: string;
  name: string;
  type?: string;
  value?: string;
  options?: SelectOption[];
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
