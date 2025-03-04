# Quick Start

## Build & Install

### Build from Source Code

1. Run npm install
2. Run build command:
    - Dev: `pnpm dev` or `npm run dev`
    - Prod: `pnpm build` or `npm run build`
3. Follow steps 2 to 5 in [Install from Package](#install-from-package).

### Install from Package
1. Download & unzip the latest release zip file from [releases page](https://github.com/yingrui/my-own.fun/releases).
2. Open in browser - `chrome://extensions`
3. Check - `Developer mode`
4. Find and Click - `Load unpacked extension`
5. Select - unzipped file folder or `dist` folder if you build from source code

![setup chrome extension](../images/setup_chrome_extension.png)

You can pin extension in Google Chrome toolbar if you want.
![pin chrome extension](../images/pin_chrome_extension.png)
 

## Configure myFun
Please entrance options page as below, and set up configurations.
![options_chrome_extension](../images/options_chrome_extension.png)

In options page, you can see configuration page as below.
![configure in options_page](../images/configure_in_options_page.png)

The key configurations are:
* **API Key**: Set api key from OpenAI, Zhipu AI, Baichuan or Ollama
* **Base URL**: base url from OpenAI, Zhipu AI, Baichuan or Ollama
* **Organization**: Your Organization Name
* **GPT Model**: glm-4-plus is default
* **Tools Call Model**: If it's empty, will not use tools call to recognize user intents.

Note: Since China is not supported by OpenAI, it's difficult to ensure the compatibility, you may need to implement `agents.services.ModelService`.