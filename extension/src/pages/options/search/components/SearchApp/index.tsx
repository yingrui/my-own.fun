import React from "react";
import { Layout } from "antd";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import "./index.css";
import SearchHome from "@pages/options/search/components/SearchHome";
import SearchPage from "@pages/options/search/components/SearchPage";
import SearchAgentFactory from "@pages/options/search/agents/SearchAgentFactory";

interface SearchAppProps {
  config: GluonConfigure;
  query: string;
  onQueryChange: (query: string) => void;
}

const SearchApp: React.FC<SearchAppProps> = ({
  config,
  query,
  onQueryChange,
}) => {
  const agent = new SearchAgentFactory().create(config);
  return (
    <Layout className={"search-app"}>
      {!query && <SearchHome query={query} onQueryChange={onQueryChange} />}
      {query && <SearchPage query={query} agent={agent} />}
    </Layout>
  );
};

export default SearchApp;
