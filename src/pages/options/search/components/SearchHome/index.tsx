import React, { useState } from "react";
import type { AutoCompleteProps } from "antd";
import { AutoComplete, Input } from "antd";
import "./index.css";
import intl from "react-intl-universal";

interface SearchHomeProps {
  query: string;
  onQueryChange: (query: string) => void;
}

const { TextArea } = Input;

const SearchHome: React.FC<SearchHomeProps> = ({ query, onQueryChange }) => {
  const [text, setText] = useState<string>(query);

  const onChange = (value: string) => {
    setText(value);
  };

  const [options, setOptions] = useState<AutoCompleteProps["options"]>([]);

  const handleCompletion = (value: string) => {
    // TODO: suggest complete options
    setOptions([]);
  };

  const onKeyUp = (e: any) => {
    if (e.key == "Enter" && e.keyCode == 13 && !e.shiftKey) {
      e.preventDefault();
      const queryString = text.trim();
      onQueryChange(queryString);
    }
  };

  return (
    <>
      <div className={"search-icon-area"}>
        <div className={"search-logo"}>
          <img src={"/icons/gm_logo.svg"} />
          <h6>{intl.get("options_search_ask_assistant").d("Ask Gru")}</h6>
        </div>
      </div>
      <div className={"search-input-first-page"}>
        <div className={"search-input-area"}>
          <AutoComplete
            options={options}
            onSearch={handleCompletion}
            style={{ width: "100%" }}
          >
            <TextArea
              className={"search-input"}
              value={text}
              onKeyUp={onKeyUp}
              onChange={(e) => onChange(e.target.value)}
              placeholder={intl
                .get("options_search_textarea_placeholder")
                .d("Hit Enter to search.")}
              autoSize={{ minRows: 3, maxRows: 5 }}
              allowClear
            />
          </AutoComplete>
        </div>
      </div>
    </>
  );
};

export default SearchHome;
