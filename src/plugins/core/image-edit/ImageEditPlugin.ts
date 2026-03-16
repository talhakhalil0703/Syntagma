import { Plugin } from "../../Plugin";


export default class ImageEditPlugin extends Plugin {
    id = "core-image-edit";
    name = "Image Editor";
    version = "1.0.0";
    description = "Provides a ShareX-like image editor for annotating and editing images.";
    author = "Syntagma Core";

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.name}`);
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.name}`);
    }
}
