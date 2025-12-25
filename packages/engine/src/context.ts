import type { FileMap } from './types';
import type { ProjectConfig } from './config';
import type { Policy } from './policy';

export interface GeneratorContext {
  config: ProjectConfig;
  policy: Policy;
  files: FileMap;
  addFile(path: string, content: Buffer): void;
  hasFile(path: string): boolean;
  getFile(path: string): Buffer | undefined;
}

export class InMemoryGeneratorContext implements GeneratorContext {
  public readonly config: ProjectConfig;
  public readonly policy: Policy;
  public readonly files: FileMap = {};

  constructor(config: ProjectConfig, policy: Policy, existingFiles?: FileMap) {
    this.config = config;
    this.policy = policy;
    if (existingFiles) {
      Object.assign(this.files, existingFiles);
    }
  }

  addFile(path: string, content: Buffer): void {
    this.files[path] = content;
  }

  hasFile(path: string): boolean {
    return path in this.files;
  }

  getFile(path: string): Buffer | undefined {
    return this.files[path];
  }
}

