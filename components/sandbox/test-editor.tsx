"use client";

import { useState, useRef, useEffect } from 'react';
import { Play, RotateCcw, Copy, Check, FileCode2, Loader2 } from 'lucide-react';

interface TestEditorProps {
    initialCode?: string;
    fileContent?: string;
    fileName?: string;
    onRunTests: (testCode: string) => void;
    isRunning: boolean;
}

const DEFAULT_TEST_CODE = `// Write your test cases below
// The 'assert' function is available for assertions
// The code you're editing is available as 'sourceCode'

describe("My Tests", () => {
  test("should exist", () => {
    assert(sourceCode !== undefined, "Source code should be defined");
  });

  test("should not be empty", () => {
    assert(sourceCode.length > 0, "Source code should not be empty");
  });

  test("should contain a function", () => {
    const hasFn = sourceCode.includes("function") ||
                  sourceCode.includes("=>") ||
                  sourceCode.includes("const ");
    assert(hasFn, "Source should contain at least one function or variable");
  });
});
`;

export function TestEditor({ initialCode, fileContent, fileName, onRunTests, isRunning }: TestEditorProps) {
    const [code, setCode] = useState(initialCode || DEFAULT_TEST_CODE);
    const [copied, setCopied] = useState(false);
    const [lineCount, setLineCount] = useState(1);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumberRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const lines = code.split('\n').length;
        setLineCount(lines);
    }, [code]);

    const handleScroll = () => {
        if (textareaRef.current && lineNumberRef.current) {
            lineNumberRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReset = () => {
        setCode(DEFAULT_TEST_CODE);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.currentTarget.selectionStart;
            const end = e.currentTarget.selectionEnd;
            const newCode = code.substring(0, start) + '  ' + code.substring(end);
            setCode(newCode);
            requestAnimationFrame(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
                }
            });
        }
        // Ctrl+Enter to run
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            onRunTests(code);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <FileCode2 size={13} className="text-blue-400" />
                    <span>test.js</span>
                    {fileName && (
                        <span className="text-slate-600">
                            → testing <span className="text-slate-400">{fileName}</span>
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleCopy}
                        className="p-1.5 rounded hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
                        title="Copy code"
                    >
                        {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                    </button>
                    <button
                        onClick={handleReset}
                        className="p-1.5 rounded hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
                        title="Reset to default"
                    >
                        <RotateCcw size={13} />
                    </button>
                    <button
                        onClick={() => onRunTests(code)}
                        disabled={isRunning}
                        className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
                        title="Run tests (Ctrl+Enter)"
                    >
                        {isRunning ? (
                            <><Loader2 size={12} className="animate-spin" /> Running...</>
                        ) : (
                            <><Play size={12} /> Run Tests</>
                        )}
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden bg-[#1e1e1e] relative font-mono text-[13px] leading-5">
                {/* Line numbers */}
                <div
                    ref={lineNumberRef}
                    className="w-12 shrink-0 overflow-hidden text-right pr-3 pt-3 pb-3 text-slate-600 select-none"
                >
                    {Array.from({ length: lineCount }, (_, i) => (
                        <div key={i + 1} className="h-5">{i + 1}</div>
                    ))}
                </div>

                {/* Code input */}
                <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    onScroll={handleScroll}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    className="flex-1 bg-transparent text-slate-300 p-3 pl-0 outline-none resize-none overflow-auto"
                    style={{ tabSize: 2 }}
                />
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-t border-white/5 text-[11px] text-slate-500">
                <span>{lineCount} lines</span>
                <span className="text-slate-600">Ctrl+Enter to run</span>
            </div>
        </div>
    );
}
