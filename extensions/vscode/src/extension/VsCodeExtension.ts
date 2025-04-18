import vscode, { commands } from "vscode";
import { CodeAidGUIWebviewViewProvider } from "../Provider/CodeAidGUIWebviewViewProvider";
import { CodeLensNames } from "../constants/codeLens.const";
import { getNodeText } from "../utils/getNodeText";
import { registerCommands } from "../commands";
import { InlineCompletionProvider } from "../autocomplete/inlineCompletionProvider";
import { Core } from "core";
import { VscodeIde } from "../ide/VscodeIde";
import { ConfigHandler } from "core/src/config/ConfigHandler";
import { TabAutoCompleteModel } from "../utils/loadAutoCompletionModels";
import { InProcessMessenger } from "core/src/utils/messenger";
import { FromCoreProtocol, ToCoreProtocol } from "core";
import { VscodeMessenger } from "./VscodeMessenger";
import { VerticalDiffManager } from "../diff/vertical/manager";
import { registerAllCodelens } from "../codeLens/registerAllCodeLens";

export class VscodeExtension {
  private sidebar;
  private _disposableList: vscode.Disposable[];
  private core: Core;
  private ide: VscodeIde;
  private configProvider: ConfigHandler;
  private autoCompleteModel: TabAutoCompleteModel;
  private verticalDiffManager: VerticalDiffManager;

  constructor(context: vscode.ExtensionContext) {
    this.ide = new VscodeIde();

    this._disposableList = [];
    // 左侧视图
    this.sidebar = new CodeAidGUIWebviewViewProvider(context);

    // Sidebar
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        "codeAid.codeAidGUIView",
        this.sidebar,
        {
          webviewOptions: {
            // 当这个选项设置为 true 时，即使 Webview 被隐藏，其内容和状态仍然会被保留。
            // 这意味着当用户再次显示该 Webview 时，它不需要完全重新加载内容，可以直接恢复到之前的状态，这样可以提高性能和用户体验。
            retainContextWhenHidden: true,
          },
        },
      ),
    );

    // 消息队列初始化
    const inProcessMessenger = new InProcessMessenger<
      ToCoreProtocol,
      FromCoreProtocol
    >();

    new VscodeMessenger(inProcessMessenger, this.sidebar.webviewProtocol);

    // 初始化工具
    this.core = new Core(this.ide, inProcessMessenger);

    this.configProvider = this.core.configHandler;

    this.autoCompleteModel = new TabAutoCompleteModel(this.configProvider);

    // 函数辅助按钮的点击事件绑定
    CodeLensNames.forEach((v) => {
      context.subscriptions.push(
        commands.registerCommand(
          v.command,
          async (uri, node, name, position, kind, ext) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;

            const code = getNodeText(editor.document, node);

            // 触发 codeAid 左侧菜单视图选中加载显示
            vscode.commands.executeCommand("codeAid.focusInput");

            // 延时发送消息给到左侧菜单视图的webview
            this.sidebar.webviewProtocol.request(v.command, {
              rangeInFileWithContents: {
                filepath: uri.fsPath,
                range: position,
                contents: code,
              },
            });
          },
        ),
      );
    });

    // diff 功能初始化
    this.verticalDiffManager = new VerticalDiffManager(
      this.configProvider,
      this.sidebar.webviewProtocol,
    );

    const { verticalDiffCodeLens } = registerAllCodelens(
      context,
      this.verticalDiffManager.filepathToCodeLens,
    );

    // 设置刷新的方法
    this.verticalDiffManager.refreshCodeLens =
      verticalDiffCodeLens.refresh.bind(verticalDiffCodeLens);

    // commands
    registerCommands({
      context,
      sidebar: this.sidebar,
      ide: this.ide,
      verticalDiffManager: this.verticalDiffManager,
    });

    // 代码补全
    context.subscriptions.push(
      vscode.languages.registerInlineCompletionItemProvider(
        { pattern: "**/*.{js,ts,jsx,tsx,php,go}" }, // 根据需要调整文件类型
        // ["typescript", "javascript", "typescriptreact", "javascriptreact"],
        new InlineCompletionProvider(
          this.configProvider,
          this.ide,
          this.autoCompleteModel,
          context,
        ),
      ),
    );
  }

  dispose() {
    this._disposableList.forEach((item) => item.dispose());
  }
}
