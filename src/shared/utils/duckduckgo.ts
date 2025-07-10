function getSearchContentLink(search_html: string) {
  const search_doc = new DOMParser().parseFromString(search_html, "text/html");
  if (search_doc && search_doc.getElementById("deep_preload_link")) {
    return search_doc.getElementById("deep_preload_link").getAttribute("href");
  }
  return null;
}

function getBriefOfSearchContent(search_html: string) {
  const group = search_html.match(
    /DDG\.ready\(function \(\) {DDG\.duckbar\.add\((\{[^]*?\}),null,"index"\);\}\);/,
  );
  if (group && group.length > 1) {
    return JSON.parse(group[1]);
  }
  return {};
}

function getSearchResults(search_result: string) {
  const group = search_result.match(
    /DDG\.pageLayout\.load\('d',(\[[^]*?\])\);DDG\.duckbar\.load/,
  );
  if (group && group.length > 1) {
    const list = JSON.parse(group[1]);
    return list
      .map((item: any) => ({
        title: item.t,
        url: item.u,
        abstract: item.a,
        source: item.sn,
      }))
      .filter((item: any) => !!item.title);
  }
  return [];
}

export const ddg_search = async (userInput: string) => {
  const search_response = await fetch(
    "https://duckduckgo.com/?" +
      new URLSearchParams({ q: userInput, t: "h_", ia: "web" }),
  );
  if (!search_response.ok) {
    return { message: "Failed to access duckduckgo." };
  }
  const search_html = await search_response.text();
  const search_content_link = getSearchContentLink(search_html);
  if (!search_content_link) {
    return { message: "Failed to get search link." };
  }

  const response = await fetch(search_content_link);
  if (!response.ok) {
    return { message: "Failed to get search result." };
  }

  const result = {
    query: userInput,
    about: getBriefOfSearchContent(search_html),
    search_results: getSearchResults(await response.text()),
  };

  return result;
};
