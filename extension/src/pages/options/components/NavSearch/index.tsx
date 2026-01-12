import React, { useState } from "react";
import { Input } from "antd";
import "./index.css";

interface NavSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
}

const { Search } = Input;

const NavSearch: React.FC<NavSearchProps> = ({ query, onQueryChange }) => {
  const [queryString, setQueryString] = useState<string>(query);

  const handleSubmit = async (value: string) => {
    onQueryChange(value);
  };

  const onChange = (value: string) => {
    setQueryString(value);
  };

  return (
    <div className={"inline-nav-search"}>
      <div className={"nav-search"}>
        <Search
          onChange={(e) => onChange(e.target.value)}
          onSearch={handleSubmit}
          value={queryString}
        />
      </div>
    </div>
  );
};

export default NavSearch;
