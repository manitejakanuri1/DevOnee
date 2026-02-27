"use client";

import { useState, useCallback } from 'react';
import { TestEditor } from './test-editor';
import { TestResults, TestRunResult, TestResult } from './test-results';

interface TestSandboxProps {
    fileContent?: string;
    fileName?: string;
}

/**
 * Parses user-written test code and executes it in a sandboxed manner.
 * Uses a lightweight assertion framework that runs in the browser.
 */
function executeTests(testCode: string, sourceCode: string): TestRunResult {
    const startTime = performance.now();
    const tests: TestResult[] = [];
    const consoleOutput: string[] = [];
    const suites: { name: string; tests: (() => void)[] }[] = [];
    let currentSuite = 'Default Suite';

    // Mock console
    const mockConsole = {
        log: (...args: any[]) => consoleOutput.push(args.map(String).join(' ')),
        error: (...args: any[]) => consoleOutput.push('[ERROR] ' + args.map(String).join(' ')),
        warn: (...args: any[]) => consoleOutput.push('[WARN] ' + args.map(String).join(' ')),
        info: (...args: any[]) => consoleOutput.push('[INFO] ' + args.map(String).join(' ')),
    };

    // Assertion function
    const assert = (condition: boolean, message?: string) => {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    };

    // assertEqual
    const assertEqual = (actual: any, expected: any, message?: string) => {
        if (actual !== expected) {
            const err = new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            (err as any).expected = JSON.stringify(expected);
            (err as any).actual = JSON.stringify(actual);
            throw err;
        }
    };

    // assertIncludes
    const assertIncludes = (haystack: string, needle: string, message?: string) => {
        if (!haystack.includes(needle)) {
            throw new Error(message || `Expected string to include "${needle}"`);
        }
    };

    // Test registration
    let pendingTests: { name: string; fn: () => void; suiteName: string }[] = [];

    const describe = (name: string, fn: () => void) => {
        const prevSuite = currentSuite;
        currentSuite = name;
        try {
            fn();
        } catch (e) {
            consoleOutput.push(`[ERROR] Suite "${name}" registration failed: ${e}`);
        }
        currentSuite = prevSuite;
    };

    const test = (name: string, fn: () => void) => {
        pendingTests.push({ name, fn, suiteName: currentSuite });
    };

    // Alias
    const it = test;

    // Run the test code to register tests
    try {
        const runTestCode = new Function(
            'sourceCode', 'describe', 'test', 'it', 'assert', 'assertEqual', 'assertIncludes',
            'console', 'expect',
            testCode
        );

        // Simple expect() implementation
        const expect = (value: any) => ({
            toBe: (expected: any) => assertEqual(value, expected),
            toEqual: (expected: any) => assertEqual(JSON.stringify(value), JSON.stringify(expected)),
            toBeTruthy: () => assert(!!value, `Expected truthy, got ${JSON.stringify(value)}`),
            toBeFalsy: () => assert(!value, `Expected falsy, got ${JSON.stringify(value)}`),
            toContain: (needle: any) => {
                if (typeof value === 'string') assertIncludes(value, needle);
                else if (Array.isArray(value)) assert(value.includes(needle), `Array does not contain ${needle}`);
                else throw new Error('toContain only works on strings and arrays');
            },
            toThrow: () => {
                let threw = false;
                try { value(); } catch { threw = true; }
                assert(threw, 'Expected function to throw');
            },
            toBeGreaterThan: (n: number) => assert(value > n, `Expected ${value} > ${n}`),
            toBeLessThan: (n: number) => assert(value < n, `Expected ${value} < ${n}`),
            toHaveLength: (n: number) => assertEqual(value.length, n, `Expected length ${n}, got ${value.length}`),
            toBeDefined: () => assert(value !== undefined, 'Expected value to be defined'),
            toBeNull: () => assertEqual(value, null),
            not: {
                toBe: (expected: any) => assert(value !== expected, `Expected ${value} not to be ${expected}`),
                toContain: (needle: any) => {
                    if (typeof value === 'string') assert(!value.includes(needle), `Expected string not to contain "${needle}"`);
                    else if (Array.isArray(value)) assert(!value.includes(needle), `Expected array not to contain ${needle}`);
                },
                toBeTruthy: () => assert(!value, `Expected falsy, got ${JSON.stringify(value)}`),
                toBeDefined: () => assert(value === undefined, 'Expected value to be undefined'),
            }
        });

        runTestCode(sourceCode, describe, test, it, assert, assertEqual, assertIncludes, mockConsole, expect);
    } catch (e: any) {
        consoleOutput.push(`[ERROR] Test registration failed: ${e.message}`);
        tests.push({
            name: 'Test Registration',
            suite: 'Setup',
            status: 'failed',
            duration: 0,
            error: `Failed to parse test code: ${e.message}`,
        });
    }

    // Execute registered tests
    for (const pendingTest of pendingTests) {
        const testStart = performance.now();
        try {
            pendingTest.fn();
            tests.push({
                name: pendingTest.name,
                suite: pendingTest.suiteName,
                status: 'passed',
                duration: Math.round(performance.now() - testStart),
            });
        } catch (e: any) {
            tests.push({
                name: pendingTest.name,
                suite: pendingTest.suiteName,
                status: 'failed',
                duration: Math.round(performance.now() - testStart),
                error: e.message,
                expected: e.expected,
                actual: e.actual,
            });
        }
    }

    const totalDuration = Math.round(performance.now() - startTime);

    return {
        tests,
        totalPassed: tests.filter(t => t.status === 'passed').length,
        totalFailed: tests.filter(t => t.status === 'failed').length,
        totalSkipped: tests.filter(t => t.status === 'skipped').length,
        totalDuration,
        consoleOutput,
        timestamp: new Date().toISOString(),
    };
}

export function TestSandbox({ fileContent, fileName }: TestSandboxProps) {
    const [results, setResults] = useState<TestRunResult | null>(null);
    const [isRunning, setIsRunning] = useState(false);

    const handleRunTests = useCallback(async (testCode: string) => {
        setIsRunning(true);
        setResults(null);

        // Small delay for UX (shows loading state)
        await new Promise(resolve => setTimeout(resolve, 400));

        try {
            const result = executeTests(testCode, fileContent || '');
            setResults(result);
        } catch (e: any) {
            setResults({
                tests: [{
                    name: 'Execution Error',
                    suite: 'Runtime',
                    status: 'failed',
                    duration: 0,
                    error: e.message,
                }],
                totalPassed: 0,
                totalFailed: 1,
                totalSkipped: 0,
                totalDuration: 0,
                consoleOutput: [`[ERROR] ${e.message}`],
                timestamp: new Date().toISOString(),
            });
        } finally {
            setIsRunning(false);
        }
    }, [fileContent]);

    return (
        <div className="flex flex-col lg:flex-row h-[500px] bg-[#1e1e1e] rounded-xl overflow-hidden border border-white/5">
            {/* Left: Test Editor */}
            <div className="flex-1 flex flex-col min-w-0 border-b lg:border-b-0 lg:border-r border-white/5 h-1/2 lg:h-full">
                <TestEditor
                    fileContent={fileContent}
                    fileName={fileName}
                    onRunTests={handleRunTests}
                    isRunning={isRunning}
                />
            </div>

            {/* Right: Test Results */}
            <div className="flex-1 flex flex-col min-w-0 h-1/2 lg:h-full">
                <TestResults results={results} isRunning={isRunning} />
            </div>
        </div>
    );
}
