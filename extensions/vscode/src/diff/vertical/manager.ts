// 垂直diff

import vscode from "vscode";
import { ConfigHandler } from "core/src/config/ConfigHandler";
import { VscodeWebviewProtocol } from "../../webviewProtocol";
import { VerticalDiffHandler } from "./handler";
import {
  codeAidDiffVisible,
  codeAidStreamingDiff,
} from "../../constant/vscode.context";
import { pruneLinesFromTop } from "core/src/llm/countTokens";
import { streamDiffLines } from "core/src/edit/streamDiffLines";
import { getLanguageForFile } from "core/src/utils/getLanguageForFile";

export interface VerticalDiffCodeLensProps {
  start: number;
  numRed: number;
  numGreen: number;
}

export class VerticalDiffManager {
  public refreshCodeLens: () => void = () => {};
  // 缓存功能
  private filePathToHandler: Map<string, VerticalDiffHandler> = new Map();
  // 缓存行号 用于代码处理
  filepathToCodeLens: Map<string, VerticalDiffCodeLensProps[]> = new Map();

  constructor(
    private readonly configHandler: ConfigHandler,
    private readonly webviewProtocol: VscodeWebviewProtocol,
  ) {}

  createVerticalDiffHandler(
    filepath: string,
    startLine: number,
    endLine: number,
  ): VerticalDiffHandler | undefined {
    if (this.filePathToHandler.has(filepath)) {
      const handler = this.filePathToHandler.get(filepath);
      handler?.clear();
      this.filePathToHandler.delete(filepath);
    }
    const editor = vscode.window.activeTextEditor;
    if (editor && filepath === editor.document.uri.fsPath) {
      const handler = new VerticalDiffHandler(
        editor,
        startLine,
        endLine,
        this.filepathToCodeLens,
        this.refreshCodeLens,
      );
      this.filePathToHandler.set(filepath, handler);
      return handler;
    }
    return undefined;
  }

  async streamEdit(
    input: string,
    modelTitle?: string,
    onlyOneInsertion?: boolean,
  ) {
    vscode.commands.executeCommand("setContext", codeAidDiffVisible, true);

    let editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const filepath = editor.document.uri.fsPath;

    let startLine, endLine: number;

    startLine = editor.selection.start.line;
    endLine = editor.selection.end.line;

    const diffHandler = this.createVerticalDiffHandler(
      filepath,
      startLine,
      endLine,
    );
    if (!diffHandler) {
      console.warn("初始化 VerticalDiffHandler 失败");
      return;
    }

    const selectedRange = diffHandler.range;

    const llm = await this.configHandler.llmFromTitle(modelTitle);
    // 选中文本
    const rangeContext = editor.document.getText(selectedRange);
    // 前缀文本
    const prefix = pruneLinesFromTop(
      editor.document.getText(
        new vscode.Range(new vscode.Position(0, 0), selectedRange.start),
      ),
      llm.contentLength / 4,
      llm.model,
    );
    // 后缀文本
    const suffix = pruneLinesFromTop(
      editor.document.getText(
        new vscode.Range(
          selectedRange.end,
          new vscode.Position(editor.document.lineCount, 0),
        ),
      ),
      llm.contentLength / 4,
      llm.model,
    );

    if (editor.selection) {
      editor.selection = new vscode.Selection(
        editor.selection.active,
        editor.selection.active,
      );
    }

    vscode.commands.executeCommand("setContext", codeAidStreamingDiff, true);

    try {
      diffHandler.run(
        streamDiffLines(
          prefix,
          rangeContext,
          suffix,
          llm,
          input,
          getLanguageForFile(filepath),
          onlyOneInsertion,
        ),
      );
    } catch (error) {
    } finally {
      vscode.commands.executeCommand("setContext", codeAidStreamingDiff, false);
    }
  }

  // 同意/拒绝行级diff块
  async acceptRejectVerticalDiffBlock(
    accept: boolean,
    filepath?: string,
    index?: number,
  ) {
    if (!filepath) {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        return;
      }
      filepath = activeEditor.document.uri.fsPath;
    }
    const blocks = this.filepathToCodeLens.get(filepath);
    const block = blocks?.[index!];
    if (!blocks || !block) return;
    const handler = this.filePathToHandler.get(filepath);
    if (!handler) return;

    await handler.acceptRejectBlock(
      accept,
      block.start,
      block.numGreen,
      block.numRed,
    );
  }
}
