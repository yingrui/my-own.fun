import { getSelectorSettings } from "@pages/content/injected/listeners/utils";
import jQuery from "jquery";
import PageLayoutTree from "@src/shared/webpage/PageLayoutTree";

class PageParser {
  private page: Page;
  private readonly document: Document;

  constructor(document: Document) {
    this.document = document;
    this.page = null;
  }

  parse(): Page {
    this.page = this.parseContent();
    this.page.layoutTree = new PageLayoutTree(this.document.body).getRootNode();
    return this.page;
  }

  parseContent(): Page {
    const url = this.document.URL;
    const title = this.document.title;
    const selector = getSelectorSettings(url);
    const elements = jQuery(selector.contentSelector, this.document);
    // Get innerText of the first element if there is any, otherwise get innerText of the body
    const content =
      elements && elements.length > 0
        ? this.textContent(elements[0])
        : this.textContent(this.document.body);
    // Get links from the page according to the selector, if selector is empty, return empty array
    const links = this.getLinks(selector.linkSelector);
    this.page = {
      url: url,
      title: title,
      text: content,
      links: links,
    };
    return this.page;
  }

  private textContent(element: HTMLElement): string {
    // 1. innerText is not supported in Firefox, use textContent instead
    // 2. Unit test use DOMParser to parse html string, innerText is not available
    // ---
    // The most obvious difference between textContent and innerText:
    // * innerText keeps \n and white spaces, textContent does not
    const innerText = element.innerText;
    return innerText ?? element.textContent;
  }

  getPage(): Page {
    return this.page;
  }

  getLinks(linkSelector: string): PageLink[] {
    if (linkSelector) {
      const links = jQuery(linkSelector, this.document);
      if (links) {
        return links
          .map((id, link) => {
            return {
              text: jQuery(link).text(),
              href: jQuery(link).attr("href"),
            };
          })
          .get();
      }
    }
    return [];
  }
}

export default PageParser;
