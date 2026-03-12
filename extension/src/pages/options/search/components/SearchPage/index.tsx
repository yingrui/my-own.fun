import React, { useEffect, useRef, useState } from "react";
import { Layout, Spin } from "antd";
import "./index.css";
import { ddg_search } from "@src/shared/utils/duckduckgo";
import SearchResultItem from "@pages/options/search/components/SearchResultItem";
import SearchSummary from "@pages/options/search/components/SearchSummary";
import type { SearchAgentInterface } from "@pages/options/search/agents/SearchLangGraphAgent";

interface SearchPageProps {
  query: string;
  agent: SearchAgentInterface;
}

const SearchPage: React.FC<SearchPageProps> = ({ query, agent }) => {
  const [searchResult, setSearchResult] = useState<any>({
    search_results: [],
    query: "",
  });
  const isSearchCompleted = useRef<boolean>(false);
  const [currentText, setCurrentText] = useState<string>();
  const [generating, setGenerating] = useState<boolean>();

  const search = async (queryString: string) => {
    if (!queryString.trim()) return;
    isSearchCompleted.current = false;
    if (searchResult.query !== queryString.trim()) {
      // Search
      const result = await ddg_search(queryString.trim());
      setSearchResult(result);
      agent.setSearchResults(result);
      setCurrentText("");

      // Ask agent to generate summary
      const thinkResult = await agent.summary({ userInput: queryString.trim() }, []);

      // Show summary
      setGenerating(true);
      const message = await thinkResult.getMessage((msg) => {
        setCurrentText(msg);
      });

      setGenerating(false);
    }
    isSearchCompleted.current = true;
  };

  useEffect(() => {
    search(query);
  }, [query]);

  return (
    <Layout className={"search-page"}>
      <div className={"search-page-results"}>
        <div className={"search-results"}>
          {searchResult.search_results.map((result, index) => (
            <SearchResultItem result={result} key={index} />
          ))}
          {searchResult.search_results.length === 0 && generating && (
            <div className="search-empty-loading">
              <Spin />
            </div>
          )}
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
