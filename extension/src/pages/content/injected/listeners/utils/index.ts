export const matchURL = (url) => {
  if (["<all_urls>", "*"].includes(url)) {
    return true;
  }
  return location.host === url.toLowerCase();
};

type Selector = {
  regex?: RegExp;
  contentSelector: string;
  linkSelector?: string;
};

const selectors: Selector[] = [
  {
    regex: /^https:\/\/www.google.com\/search.*/,
    contentSelector: "#rcnt",
    linkSelector: 'a:visible[jsname="UWckNb"]',
  },
  {
    regex: /^https:\/\/stackoverflow.com\/questions\/.*/,
    contentSelector: "#mainbar",
  },
];

export const getSelectorSettings = (url): Selector => {
  for (const selector of selectors) {
    if (selector.regex.test(url)) {
      return selector;
    }
  }
  return { contentSelector: "body" };
};
