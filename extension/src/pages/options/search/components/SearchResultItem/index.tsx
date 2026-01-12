import React from "react";
import "./index.css";

interface SearchResultItemProps {
  result: any;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ result }) => {
  return (
    <div className="search-result-item">
      <a href={result.u} target="_blank" rel="noopener noreferrer">
        <h3 dangerouslySetInnerHTML={{ __html: result.t }} />
      </a>
      <p dangerouslySetInnerHTML={{ __html: result.a }} />
      <small>{result.i}</small>
    </div>
  );
};

export default SearchResultItem;
