interface PageLink {
  text: string;
  href: string;
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
