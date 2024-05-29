import * as vscode from "vscode";
import path from "path";
import fs from "fs";
import { showProblem } from "./showProblem";
import { headerComment } from "./headerComment";
import { searchProblem } from "../libs/searchProblem";
import { tierAxios } from "../libs/tierAxios";

export function createProblem(context: vscode.ExtensionContext) {
    const input = vscode.window.createInputBox();
    input.prompt = "문제 번호를 입력해주세요.";
    input.placeholder = "예: 1000";
    input.onDidChangeValue(async (e) => {
        if (e) {
            input.title = (await searchProblem(e, context)).title;
        }
    });
    input.onDidAccept(async () => {
        const problemNumber = input.value;
        if (!problemNumber) {
            vscode.window.showErrorMessage("문제 번호가 입력되지 않았습니다.");
            return;
        }

        try {
            const config = vscode.workspace.getConfiguration("BOJ");
            const extension = config.get<string>("extension", "");

            const sp = await searchProblem(problemNumber, context);
            const tier = await tierAxios(problemNumber);

            // 제목 추출
            // replace를 사용하여 폴더명에 사용할 수 없는 문자를 바꿔준다.
            const problemName = sp.title
                .replace(/:/g, "：")
                .replace(/\*/g, "＊")
                .replace(/\?/g, "？")
                .replace(/"/g, "＂")
                .replace(/</g, "＜")
                .replace(/>/g, "＞")
                .replace(/\|/g, "｜")
                .replace(/\//g, "／")
                .replace(/\\/g, "＼")
                .replace(/\^/g, "＾");

            // 폴더명 생성
            const folderName = `${problemNumber}번： ${problemName}`;
            const folderPath = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, folderName);
            fs.mkdirSync(folderPath);

            // 파일명 생성
            let fileName = "";
            if (extension === "java") {
                fileName = `Main.java`;
            } else {
                fileName = `${problemName}.${extension}`;
            }
            // md 파일명 생성
            const readme = `README.md`;

            // 폴더 생성 후 폴더 안에 파일 생성
            const fnUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, folderName, fileName);
            const readmeUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, folderName, readme);

            // README.md 파일 내용
            const readmeContent = `# ${problemNumber}번: ${problemName} - <img src="${
                tier.svg
            }" style="height:20px" /> ${
                tier.name
            }\n\n<!-- performance -->\n\n<!-- 문제 제출 후 깃허브에 푸시를 했을 때 제출한 코드의 성능이 입력될 공간입니다.-->\n\n<!-- end -->\n\n## 문제\n\n[문제 링크](https://boj.kr/${problemNumber})\n\n${
                sp.description
            }\n\n## 입력\n\n${sp.input}\n\n## 출력\n\n${sp.output}\n\n## 소스코드\n\n[소스코드 보기](${fileName.replace(
                / /g,
                "%20"
            )})`;
            const encoder = new TextEncoder();
            const readmeData = encoder.encode(readmeContent);

            // 파일 생성
            await vscode.workspace.fs.writeFile(fnUri, new Uint8Array());
            await vscode.workspace.fs.writeFile(readmeUri, readmeData);

            // 왼쪽 분할 화면에 텍스트 에디터를 열기
            const document = await vscode.workspace.openTextDocument(fnUri);
            await vscode.window.showTextDocument(document, {
                viewColumn: vscode.ViewColumn.One,
            });

            // 완료 메시지 표시
            vscode.window.showInformationMessage(`'${fileName}' 파일이 생성되었습니다.`);

            showProblem(problemNumber, context);
            headerComment(problemNumber);
        } catch (error) {
            if (error instanceof Error && (error as any).code === "EEXIST") {
                vscode.window.showErrorMessage("이미 해당 문제의 폴더가 존재합니다.");
            } else if (error instanceof Error && (error as any).code === "ERR_BAD_REQUEST") {
                vscode.window.showErrorMessage("문제를 찾을 수 없습니다.");
            }
            console.log(error);
            return;
        }
    });
    input.show();
}
