import { CLLM, CodeAidConfig } from "../types/config.type";
import { IDE } from "../types/ide.type";
import LocalProfileLoader from "./profile/LocalProfileLoader";

class ProfileLifecycleHandler {
  private savedConfig?: CodeAidConfig;
  constructor(private readonly profileLoader: LocalProfileLoader) {}

  clearConfig() {
    this.savedConfig = undefined;
  }

  async loadConfig() {
    const config = await this.profileLoader.doLoadConfig();
    this.savedConfig = config;
    return config;
  }

  async reloadConfig() {
    this.clearConfig();
    return await this.profileLoader.doLoadConfig();
  }
}

export class ConfigHandler {
  private profiles: ProfileLifecycleHandler[] = [];
  constructor(private readonly ide: IDE) {
    this.ide = ide;
    const localProfileLoader = new LocalProfileLoader(ide);
    this.profiles = [new ProfileLifecycleHandler(localProfileLoader)];
  }

  loadConfig() {
    return this.profiles[0].loadConfig();
  }

  async llmFromTitle(title?: string): Promise<CLLM> {
    const config = await this.loadConfig();
    const model = config.models.find((m) => m.title === title);
    if (!model) {
      if (config.models.length > 0) {
        return config.models[0];
      }
      throw new Error(`No model found for title: ${title}`);
    }
    return model;
  }
}
