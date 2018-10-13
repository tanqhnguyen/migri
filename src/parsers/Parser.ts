export type Node = {
  depends?: Node[] | null;
  version: string;
  query: string;
};

export interface IParser {
  parse(dir: string): Node[];
}
