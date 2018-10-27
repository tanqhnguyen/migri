export type Node = {
  depends?: Node[] | null;
  version: string;
  query: any;
};

export interface IParser {
  parse(dir: string): Node[];
}
