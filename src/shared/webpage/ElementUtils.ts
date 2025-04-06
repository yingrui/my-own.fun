import getXpath from "@src/shared/webpage/XpathUtils";
import _ from "lodash";

function getText(element: HTMLElement) {
  const text = element.textContent ?? element.innerText;
  return text ? text.trim() : "";
}

function getLinks(element: HTMLElement): PageLink[] {
  const links = _.filter(
    element.getElementsByTagName("a"),
    (link) => link instanceof HTMLAnchorElement,
  ).map((link) => {
    const text = link.textContent ?? link.innerText;
    const href = link.getAttribute("href") ?? "";
    return {
      xpath: getXpath(link),
      text: text.trim(),
      href: href,
    };
  });
  // remove duplicates by href
  return _.uniqBy(links, (link) => link.href);
}

function getInputs(element: HTMLElement): PageInput[] {
  const inputs = [];
  inputs.push(...getButtons(element));
  inputs.push(...getInputElements(element));
  inputs.push(...getSelectElements(element));
  return inputs;
}

function getInputElements(element: HTMLElement): PageInput[] {
  return _.filter(
    element.getElementsByTagName("input"),
    (input) => input instanceof HTMLInputElement,
  )
    .filter((input) => input.type !== "hidden")
    .map((input) => createPageInputFromInputElement(input));
}

function getSelectElements(element: HTMLElement): PageInput[] {
  return _.filter(
    element.getElementsByTagName("select"),
    (select) => select instanceof HTMLSelectElement,
  ).map((select) => {
    return {
      xpath: getXpath(select),
      tag: "select",
      name: select.name,
      options: _.map(select.options, (option) => {
        return {
          value: option.value,
          text: option.text,
          selected: option.selected,
        };
      }),
    };
  });
}

function createPageInputFromInputElement(element: HTMLInputElement): PageInput {
  return {
    xpath: getXpath(element),
    tag: element.tagName.toLowerCase(),
    name: element.name,
    type: element.type,
    value: element.value,
  };
}

function getButtons(element: HTMLElement): PageInput[] {
  return _.filter(
    element.getElementsByTagName("button"),
    (button) => button instanceof HTMLButtonElement,
  ).map((button) => {
    const text = button.textContent ?? button.innerText;
    return {
      xpath: getXpath(button),
      tag: "button",
      name: text.trim(),
    };
  });
}

export { getText, getLinks, getInputs };
