import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { id: "python", label: "Python", pistonId: "python", version: "3.10.0", defaultCode: '# Write your Python code here\nprint("Hello, World!")' },
  { id: "javascript", label: "JavaScript", pistonId: "javascript", version: "18.15.0", defaultCode: '// Write your JavaScript code here\nconsole.log("Hello, World!");' },
  { id: "cpp", label: "C++", pistonId: "c++", version: "10.2.0", defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}' },
  { id: "java", label: "Java", pistonId: "java", version: "15.0.2", defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
];

interface CodeEditorProps {
  onCodeChange?: (code: string, language: string) => void;
  initialCode?: string;
  initialLanguage?: string;
}

const CodeEditor = ({ onCodeChange, initialCode, initialLanguage }: CodeEditorProps) => {
  const [language, setLanguage] = useState(initialLanguage || "python");
  const [code, setCode] = useState(initialCode || LANGUAGES[0].defaultCode);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  const langConfig = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];

  const handleLanguageChange = (val: string) => {
    setLanguage(val);
    const lang = LANGUAGES.find((l) => l.id === val);
    if (lang && !initialCode) {
      setCode(lang.defaultCode);
      onCodeChange?.(lang.defaultCode, val);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    const v = value || "";
    setCode(v);
    onCodeChange?.(v, language);
  };

  const runCode = async () => {
    setRunning(true);
    setOutput("Running...");
    try {
      const res = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: langConfig.pistonId,
          version: langConfig.version,
          files: [{ name: language === "java" ? "Main.java" : `main.${language === "cpp" ? "cpp" : language === "python" ? "py" : "js"}`, content: code }],
        }),
      });
      const data = await res.json();
      const run = data.run;
      if (run?.stderr) {
        setOutput(run.stderr);
      } else if (run?.output) {
        setOutput(run.output);
      } else {
        setOutput("No output");
      }
    } catch {
      setOutput("Error: Could not connect to the code execution service.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-card/80">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-secondary/30">
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-[160px] h-8 text-sm bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={runCode} disabled={running} className="h-8">
          {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
          Run
        </Button>
      </div>
      <Editor
        height="250px"
        language={language === "cpp" ? "cpp" : language}
        value={code}
        onChange={handleCodeChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          padding: { top: 8 },
        }}
      />
      {output && (
        <div className="border-t border-border/50 bg-background/80 px-4 py-3 max-h-[150px] overflow-auto">
          <p className="text-xs text-muted-foreground mb-1 font-semibold">Output:</p>
          <pre className={cn("text-sm whitespace-pre-wrap font-mono", output.includes("Error") || output.includes("error") ? "text-destructive" : "text-foreground")}>
            {output}
          </pre>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
