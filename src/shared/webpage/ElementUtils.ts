import getXpath from "@src/shared/webpage/XpathUtils";

function getText(element: HTMLElement) {
  const text = element.textContent ?? element.innerText;
  return text ? text.trim() : "";
}

function getLinks(element: HTMLElement): PageLink[] {
  const links = [];
  const elements = element.getElementsByTagName("a");
  for (let i = 0; i < elements.length; i++) {
    const link = elements[i];
    if (link instanceof HTMLElement) {
      const text = link.textContent ?? link.innerText;
      const href = link.getAttribute("href") ?? "";
      const i = links.findIndex((l) => l.href === href);
      if (i < 0) {
        links.push({ text: text.trim(), href: href });
      }
    }
  }
  return links;
}

function getInputs(element: HTMLElement): PageInput[] {
  const inputs = [];
  const buttons = getButtons(element);
  inputs.push(...buttons);
  return inputs;
}

function getButtons(element: HTMLElement): PageInput[] {
  const buttons = [];
  const elements = element.getElementsByTagName("button");
  for (let i = 0; i < elements.length; i++) {
    const button = elements[i];
    if (button instanceof HTMLElement) {
      const text = button.textContent ?? button.innerText;
      const type = button.getAttribute("type") ?? "";
      const value = button.getAttribute("value") ?? "";
      buttons.push({
        xpath: getXpath(button),
        tag: "button",
        type: type,
        label: text.trim(),
        value: value,
      });
    }
  }
  return buttons;
}

export { getText, getLinks, getInputs };
