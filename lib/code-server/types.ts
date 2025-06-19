export interface FileBlock {
  filePath: string;
  content: string;
}

export interface CodeServerConfig {
  baseDir: string;
  defaultFileName?: string;
} 