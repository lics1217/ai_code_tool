import vscode from "vscode";
import FunctionCodeLensProvider from "./Providers/FunctionCodeLensProvider";
import VerticalDiffCodelens from "./Providers/VerticalDiffCodelens";
import { VerticalDiffCodeLensProps } from "../diff/vertical/manager";

const selector = [
  { language: "typescriptreact", scheme: "file" },
  { language: "javascriptreact", scheme: "file" },
  { language: "typescript", scheme: "file" },
  { language: "javascript", scheme: "file" },
  { language: "php", scheme: "file" },
  { language: "python", scheme: "file" },
  { language: "go", scheme: "file" },
];

export function registerAllCodelens(
  context: vscode.ExtensionContext,
  filepathToCodeLens: Map<string, VerticalDiffCodeLensProps[]>,
) {
  // 函数辅助提示
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      selector,
      new FunctionCodeLensProvider(),
    ),
  );

  // diff代码提示合并
  const verticalDiffCodeLens = new VerticalDiffCodelens(filepathToCodeLens);
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(selector, verticalDiffCodeLens),
  );

  return { verticalDiffCodeLens };
}
