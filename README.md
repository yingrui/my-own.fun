# <img src="public/icons/gm_logo.png" width="45" align="left"> Gru.ai

Gru.ai is a browser copilot and Chrome extension.

## Features
As a Web browser Copilot, it can:
* **Question Answer**: Answer questions based on the opened web pages.
* **Summary**: Quickly list the main points according to your instructions.
* **Search**: Find out the answer by searching.
* **Translate**: translate content between Chinese and English or into other specified languages.

For users from software development teams, it can: 
* **Generate User Story**: Automatically create engaging narrative content for new Trello board cards.
* **Generate Tasking**: Generate tasking results based on the description of the trello card you are currently viewing.
* **Generate UI Test**: Generate test script against current web page.

... and more you can define by yourself!

## Build or Install

### Build from Source Code

1. Run npm install
2. Run build command:
    - Dev: `pnpm dev` or `npm run dev`
    - Prod: `pnpm build` or `npm run build`
3. Follow steps 2 to 5 in [Install from Package](#install-from-package).

### Install from Package
1. Download & unzip the latest release zip file from [releases page](https://github.com/yingrui/gru.ai/releases).
2. Open in browser - `chrome://extensions`
3. Check - `Developer mode`
4. Find and Click - `Load unpacked extension`
5. Select - unzipped file folder or `dist` folder if you build from source code

<img src="docs/images/setup_chrome_extension.png"/>

6. Pin extension in Google Chrome toolbar
<img src="docs/images/pin_chrome_extension.png"/>


### Setup Configurations
Please set up below configurations in the extension popup page: 
* **API Key**: Set api key from OpenAI, Zhipu AI, Baichuan or Ollama
* **Base URL**: base url from OpenAI, Zhipu AI, Baichuan or Ollama
* **Organization**: Your Organization Name
* **GPT Model**: gpt-3.5-turbo is default
* **Tools Call Model**: If it's empty, will not use tools call to recognize user intents.

<img src="docs/images/configure_in_popup_window.png"/>

Please refer to [How to setup configurations](docs/tutorial/how_to_setup_configurations.md) for more details.

***NOTE:*** *Any OpenAI compatible GPT model API should work.*

## For Users
For who want to use this extension, please refer to below documents:
* [An Introduction to Gru](docs/tutorial/an_introduction_to_gru.md)
* [How to setup configurations](docs/tutorial/how_to_setup_configurations.md)
* [How to use this chrome extension](docs/tutorial/how_to_use_this_chrome_extension.md)
* [Interesting Use Cases](docs/tutorial/interesting_usecases.md)

## For Developers
For who want to contribute to this extension, please refer to below documents:
* [How to get web page content](docs/tasking/how_to_get_web_page_content.md)
* [How to add new agent and command](docs/tasking/how_to_add_new_agent_and_command.md)
* [How to update popup window for configuration](docs/tasking/how_to_update_popup_window_for_configuration.md)
* [How to develop test generation tool](docs/tasking/how_to_develop_test_generation_tool.md)