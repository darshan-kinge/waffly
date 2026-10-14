import { resolveConfig } from "./config.js";
import { MessagesModule } from "./modules/messages.js";
import { MediaModule } from "./modules/media.js";
import { TemplatesModule } from "./modules/templates.js";
import type { WhatsAppClientOptions } from "./types/common.js";
import { HttpClient } from "./utils/http.js";

export class WhatsAppClient {
  public readonly messages: MessagesModule;
  public readonly media: MediaModule;
  public readonly templates: TemplatesModule;

  constructor(options: WhatsAppClientOptions) {
    const config = resolveConfig(options);
    const http = new HttpClient(config);
    this.messages = new MessagesModule(http, config);
    this.media = new MediaModule(http, config);
    this.templates = new TemplatesModule(http);
  }
}
