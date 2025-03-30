class HtmlTag {
  static readonly leafNodeNames = [
    "p",
    "a",
    "button",
    "span",
    "br",
    "img",
    "tr",
    "td",
    "th",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "li",
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

  static readonly blockNodeNames = [
    "section",
    "article",
    "aside",
    "nav",
    "header",
    "footer",
    "table",
    "iframe",
  ];

  static readonly codeNodeNames = ["script", "style", "svg"];

  static isCodeTag(tagName: string): boolean {
    return HtmlTag.codeNodeNames.includes(tagName.toLowerCase());
  }

  static isBlockTag(tagName: string): boolean {
    return HtmlTag.blockNodeNames.includes(tagName.toLowerCase());
  }

  static isLeafTag(tagName: string): boolean {
    return HtmlTag.leafNodeNames.includes(tagName.toLowerCase());
  }
}

export default HtmlTag;
