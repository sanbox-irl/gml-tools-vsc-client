/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
"use strict";

import * as path from "path";
import * as vscode from "vscode";
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
	// RequestType
} from "vscode-languageclient";

// interface ClientViewNode {
// 	/** This is the model name of the resource. */
// 	modelName: string;

// 	/** This is the human readable name of a resource, such as "objPlayer". */
// 	name: string;

// 	/** This is the UUID of the resource. */
// 	id: string;

// 	/** This is the absolute filepath to the .YY file which describes the Resource. */
// 	fpath: string;
// }

export function activate(context: vscode.ExtensionContext) {
	// We run from the .yalc store. For context, every compile in the LS will push itself
	// to the .yalc. When publishing this Client, remove the yalc line, and use this the commented
	// out line below, which will link it to the NPM package.
	let serverModule = context.asAbsolutePath(path.join("node_modules", "gml-tools-langserver", "out", "main.js"));

	// The debug options for the server
	let debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
	};

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [
			{
				scheme: "file",
				language: "gml"
			}
		],
		synchronize: {
			// Synchronize the setting section 'language server' to the server
			configurationSection: "gmlTools",
			// Notify the server about file changes to '.clientrc files contain in the workspace
			fileEvents: vscode.workspace.createFileSystemWatcher("**/.clientrc")
		}
	};

	// Create the language client and start the client.
	let client = new LanguageClient("gmlTools", "GML Language Server", serverOptions, clientOptions);
	client.onReady().then(async () => {
		client.onRequest("createObject", async (ourSprites: { sprites: string[] }) => {
			const objectName = await vscode.window.showInputBox({
				prompt: "Object name?",
				ignoreFocusOut: true,
				value: "obj"
			});
			if (!objectName) return null;

			const objectEvents = await vscode.window.showInputBox({
				prompt: "Events? (seperate with comma)",
				ignoreFocusOut: true,
				value: "Create, Step, Draw"
			});
			if (!objectEvents) return null;

			const sprite = await vscode.window.showQuickPick(ourSprites.sprites, {
				canPickMany: false,
				ignoreFocusOut: true
			});
			if (!sprite) return null;

			return { objectName, objectEvents, sprite };
		});

		client.onRequest("createScript", async () => {
			const ourScriptName = await vscode.window.showInputBox({
				prompt: "Script Name?",
				ignoreFocusOut: true
			});

			if (ourScriptName) {
				return ourScriptName;
			} else return null;
		});

		client.onRequest("addEvents", async () => {
			if (!vscode.window.activeTextEditor) {
				return null;
			}

			const thisURI = vscode.window.activeTextEditor.document.uri;
			const ourEvents = await vscode.window.showInputBox({
				prompt: "Events to Add?",
				ignoreFocusOut: true
			});

			if (ourEvents) {
				return { uri: thisURI.toString(), events: ourEvents };
			} else return null;
		});

		client.onNotification("goToURI", async (path: string) => {
			const thisURI = await vscode.Uri.file(path);
			await vscode.window.showTextDocument(thisURI);
		});

		client.onRequest("compileExport", async () => {
			const type = await vscode.window.showQuickPick(["Zip", "Installer"]);
			if (!type) return null;
			const yyc = await vscode.window.showQuickPick(["YYC", "VM"]);
			if (!yyc) return null;

			return { yyc, type };
		});

		let compileOutput: vscode.OutputChannel;
		client.onNotification("compile.started", () => {
			if (compileOutput) {
				compileOutput.dispose();
			}
			compileOutput = vscode.window.createOutputChannel("Rubber");
			compileOutput.appendLine("Starting Compile");
			compileOutput.show();
		});
		client.onNotification("compile.status", (data) => {
			compileOutput.append(data);
		});
		client.onNotification("compile.finished", () => {
			compileOutput.appendLine("\n\nGame Run Complete");
		});

		client.onRequest("importManual", async () => {
			const ourManual = await vscode.window.showOpenDialog({
				openLabel: "GMS2 Program Folder",
				canSelectFiles: false,
				canSelectFolders: true,
				canSelectMany: false
			});
			if (ourManual) {
				return ourManual[0].fsPath;
			} else return null;
		});

		client.onRequest("requestImportManual", async () => {
			const location = await vscode.window.showInformationMessage(
				'GMS2 Manual not found at default location. Please specify location of the "GameMaker Studio 2" program folder.',
				"Okay",
				"Import later"
			);

			return location;
		});

		// Andrew -- here is what a request for views looks like. You can find the corresponding
		// `onRequest` in main.ts in the LS. It does a special check for "init" and sends the default
		// root views, otherwise, it expects a UUID. If it fails, it will return an empty [].
		// Feel free to delete/re-write this comment (as this the whole client).
		// const initViews = await client.sendRequest(
		// 	new RequestType<string, ClientViewNode[], void, void>("getViewsAtUUID"),
		// 	"init"
		// );
	});

	context.subscriptions.push(client.start());

	// Ping our status:
	console.log("GMLTools Active");
}
