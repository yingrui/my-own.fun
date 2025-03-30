function getXpath(element: HTMLElement, xpath: string = ""): string {
  // If element has id, then return xpath with id
  if (element.id) {
    return `//${element.tagName.toLowerCase()}[@id="${element.id}"]${xpath}`;
  }
  // If element is body, then return xpath with body
  if (element.tagName.toLowerCase() == "body") {
    return `//body${xpath}`;
  }
  // If element does not have id, then lookup parent
  const parent = element.parentElement;
  if (parent == null) {
    // If parent is null, then return xpath with tag name
    return `//${element.tagName.toLowerCase()}${xpath}`;
  }

  const nodeXpath = getXpathWithIndex(element);
  if (parent.tagName.toLowerCase() == "body") {
    // If parent is body, then return xpath with tag name
    return `//body${nodeXpath}${xpath}`;
  }
  return getXpath(parent, `${nodeXpath}${xpath}`);
}

function getXpathWithIndex(element: HTMLElement): string {
  const parent = element.parentElement;
  if (parent.children.length == 1) {
    return `/${element.tagName.toLowerCase()}`;
  }
  let index = -1;
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (child === element) {
      index = i;
    }
  }

  if (index >= 0) {
    return `/${element.tagName.toLowerCase()}[${index + 1}]`;
  }
  return "";
}

export default getXpath;
