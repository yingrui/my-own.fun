import React, { useRef, useState } from "react";
import { Layout, theme } from "antd";
import "./index.css";
import { ddg_search } from "@src/shared/utils/duckduckgo";
import SearchResultItem from "@pages/options/search/components/SearchResultItem";
import SearchSummary from "@pages/options/search/components/SearchSummary";
import SearchAgent from "@pages/options/search/agents/SearchAgent";

interface SearchPageProps {
  query: string;
  agent: SearchAgent;
}

const { Sider } = Layout;

const SearchPage: React.FC<SearchPageProps> = ({ query, agent }) => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const [searchResult, setSearchResult] = useState<any>({
    search_results: [],
    query: "",
  });
  const isSearchCompleted = useRef<boolean>(false);
  const [currentText, setCurrentText] = useState<string>();
  const [generating, setGenerating] = useState<boolean>();

  const search = async (queryString: string) => {
    isSearchCompleted.current = false;
    if (searchResult.query !== queryString) {
      // Search
      const result = await ddg_search(queryString);
      setSearchResult(result);
      agent.setSearchResults(result);
      setCurrentText("");

      // Ask agent to generate summary
      const thinkResult = await agent.summary({ userInput: queryString }, []);

      // Show summary
      setGenerating(true);
      const message = await thinkResult.getMessage((msg) => {
        setCurrentText(msg);
      });

      setGenerating(false);
    }
    isSearchCompleted.current = true;
  };

  search(query);

  return (
    <Layout className={"search-page"}>
      <Sider
        className={"search-page-sider"}
        width={245}
        style={{ background: colorBgContainer }}
      ></Sider>
      <div className={"search-page-results"}>
        <div className={"search-results"}>
          {searchResult.search_results.map((result, index) => (
            <SearchResultItem result={result} key={index} />
          ))}
        </div>
      </div>
      <div className={"search-page-summary"}>
        {isSearchCompleted.current && currentText && (
          <div className={"search-summary"}>
            <SearchSummary content={currentText} loading={generating} />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SearchPage;
