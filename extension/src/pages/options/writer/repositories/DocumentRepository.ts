class DocumentRepository {
  private storage: chrome.storage.StorageArea;
  private readonly key = "writer_content_key";

  constructor() {
    this.storage = chrome.storage.local;
  }

  async save(title, content: string): Promise<string> {
    await this.storage.set({ [this.key]: { title, content } });
    return this.key;
  }

  async load(): Promise<{ title: string; content: string }> {
    const value = await this.storage.get([this.key]);
    const obj = value[this.key];
    if (obj) {
      return obj;
    }
    return { title: "", content: "" };
  }
}

export default DocumentRepository;
