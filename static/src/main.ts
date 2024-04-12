import "./style.css"
import * as monaco from "monaco-editor";
import {glslConfiguration, glslLanguage} from "./glsl-monaco.ts";
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import {response} from "express";

self.MonacoEnvironment = {
    getWorker() {
        return new editorWorker();
    }
};

monaco.languages.register({
    id: "glsl"
});
monaco.languages.setLanguageConfiguration("glsl", glslConfiguration);
monaco.languages.setMonarchTokensProvider("glsl", glslLanguage);
const editor = monaco.editor.create(document.getElementById("editor")!, {
    language: "glsl",
    theme: "vs-dark",
});

editor.setValue(window.localStorage.getItem("code") ?? "");

editor.onDidChangeModelContent(() => {
    window.localStorage.setItem("code", editor.getValue());
});

const deployButton = document.getElementById("deploy");

const log = document.getElementById("deploy-log") as HTMLTextAreaElement;

function setLoggedError(error: string): void {
    log.classList.remove("error-log", "success-log", "warn-log");
    log.classList.add("error-log");
    log.value = error;
}

function setLoggedOk(): void {
    log.classList.remove("error-log", "success-log", "warn-log");
    log.classList.add("success-log");
    log.value = "Deployed successfully!";
}

function setLoggedInProgress(): void {
    log.classList.remove("error-log", "success-log", "warn-log");
    log.classList.add("warn-log");
    log.value = "Deploying...";
}

deployButton.addEventListener("click", () => {
    deployButton.setAttribute("disabled", "disabled");
    setLoggedInProgress();
    fetch("/update", {
        method: "POST",
        body: JSON.stringify({
            source: editor.getValue()
        }),
        headers: {
            "content-type": "application/json"
        }
    })
        .then(data => data.json())
        .then(data => {
            if ("error" in data) {
                setLoggedError(data.error);
                return;
            }
            setLoggedOk();
        })
        .catch(e => {
            setLoggedError(e.toString());
        })
        .finally(() => {
            deployButton.removeAttribute("disabled");
        });
});