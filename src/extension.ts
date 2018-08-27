/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
"use strict";

import * as path from "path";
import * as vscode from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from "vscode-languageclient";

export function activate(context: vscode.ExtensionContext) {
	// We run from the .yalc store. For context, every compile in the LS will push itself
	// to the .yalc. When publishing this Client, remove the yalc line, and use this the commented
	// out line below, which will link it to the NPM package.
	// let serverModule = context.asAbsolutePath(path.join("node_modules", "gml-tools-langserver", "out", "main.js"));

	let serverModule = context.asAbsolutePath(path.join(".yalc", "gml-tools-langserver", "out", "server.js"));

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
	let client = new LanguageClient("gmlTools", "Language Server", serverOptions, clientOptions);
	client.onReady().then(async () => {
		client.onNotification("createObject", async (ourSprites) => {
			let spriteArray: { sprites: string[] };

			if (ourSprites) {
				spriteArray = ourSprites;
			}

			const objectName = await vscode.window.showInputBox({
				prompt: "Object name?",
				ignoreFocusOut: true,
				value: "obj"
			});

			if (objectName) {
				const objectEvents = await vscode.window.showInputBox({
					prompt: "Events? (seperate with comma)",
					ignoreFocusOut: true,
					value: "Create, Step, Draw"
				});

				if (objectEvents) {
					const sprite = await vscode.window.showQuickPick(spriteArray.sprites, {
						canPickMany: false,
						ignoreFocusOut: true
					});

					if (sprite) {
						client.sendNotification("createObject", { objectName, objectEvents, sprite });
					}
				}
			}
		});

		client.onNotification("createScript", async () => {
			const ourScriptName = await vscode.window.showInputBox({
				prompt: "Script Name?",
				ignoreFocusOut: true
			});

			client.sendNotification("createScript", ourScriptName);
		});

		client.onNotification("addEvents", async () => {
			const thisURI = vscode.window.activeTextEditor.document.uri;
			const ourEvents = await vscode.window.showInputBox({
				prompt: "Events to Add?",
				ignoreFocusOut: true
			});

			if (ourEvents) {
				client.sendNotification("addEvents", { uri: thisURI.toString(), events: ourEvents });
			}
		});

		client.onNotification("goToURI", async (path: string) => {
			const thisURI = await vscode.Uri.file(path);
			await vscode.window.showTextDocument(thisURI);
		});

		client.onNotification("compileExport", async () => {
			const type = await vscode.window.showQuickPick(["Zip", "Installer"]);
			if (!type) return;
			const yyc = await vscode.window.showQuickPick(["YYC", "VM"]);
			if (!yyc) return;

			client.sendNotification("compileExport", { yyc, type });
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

			return ourManual[0].fsPath;
		});

		client.onRequest("requestImportManual", async () => {
			const test = await vscode.window.showInformationMessage(
				'GMS2 Manual not found at default location. Please specify location of the "GameMaker Studio 2" program folder.',
				"Okay",
				"Import later"
			);

			return test;
		});
	});

	context.subscriptions.push(client.start());

	// Are we alive?:
	console.log("GMLTools Active");
}
