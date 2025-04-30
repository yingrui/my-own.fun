type WebPageContent = {
  url: string;
  title: string;
  text: string;
  links: string[];
};

interface Environment {
  systemPrompt: () => Promise<string>;
  content?: WebPageContent;
  screenshot?: string;
}

export default Environment;
export type { WebPageContent };
