"use client";

import { Shield, AlertTriangle, Ban, Scale, FileWarning, BookOpen } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

interface LicenseData {
    key: string;
    name: string;
    spdxId: string | null;
    url: string | null;
    warningLevel: 'info' | 'warning' | 'danger';
    description: string;
    obligations: string[];
    hasPatentClause: boolean;
    hasPatentsFile: boolean;
    hasNoticeFile?: boolean;
}

interface LicenseWarningDialogProps {
    license: LicenseData | null;
    open: boolean;
    onClose: () => void;
}

export function LicenseWarningDialog({ license, open, onClose }: LicenseWarningDialogProps) {
    if (!license || license.warningLevel === 'info') return null;

    const isDanger = license.warningLevel === 'danger';

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className={`border ${isDanger ? 'border-red-500/30' : 'border-yellow-500/30'} max-w-md`}>
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isDanger ? 'bg-red-500/15' : 'bg-yellow-500/15'
                        }`}>
                            {isDanger
                                ? <Ban size={20} className="text-red-400" />
                                : <AlertTriangle size={20} className="text-yellow-400" />
                            }
                        </div>
                        <div>
                            <DialogTitle className={isDanger ? 'text-red-300' : 'text-yellow-300'}>
                                {isDanger ? 'Restricted License' : 'Copyleft License'}
                            </DialogTitle>
                            <DialogDescription className="mt-0.5">
                                {license.name} {license.spdxId && <span className="font-mono text-slate-500">({license.spdxId})</span>}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Warning message */}
                    <div className={`p-3 rounded-xl text-sm leading-relaxed ${
                        isDanger
                            ? 'bg-red-500/10 border border-red-500/20 text-red-200'
                            : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-200'
                    }`}>
                        {isDanger
                            ? "This repository's license restricts how you can use, modify, or distribute the code. Do not copy or redistribute this project without explicit permission."
                            : "This repository uses a copyleft license. Derivative works must be shared under the same or compatible license terms."
                        }
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-300 leading-relaxed">
                        {license.description}
                    </p>

                    {/* Obligations */}
                    {license.obligations.length > 0 && (
                        <div>
                            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <BookOpen size={11} /> Obligations
                            </h5>
                            <ul className="space-y-1.5">
                                {license.obligations.map((ob, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                        <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                                            isDanger ? 'bg-red-500' : 'bg-yellow-500'
                                        }`} />
                                        {ob}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Patent badges */}
                    {(license.hasPatentClause || license.hasPatentsFile) && (
                        <div className="flex flex-wrap gap-2">
                            {license.hasPatentClause && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                                    <Scale size={11} />
                                    Patent grant included
                                </div>
                            )}
                            {license.hasPatentsFile && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-300">
                                    <FileWarning size={11} />
                                    PATENTS file detected
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <button
                        onClick={onClose}
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                            isDanger
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        }`}
                    >
                        I Understand
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** Inline banner for copyleft (warning-level) licenses — non-blocking */
export function LicenseBanner({ license, onDismiss }: { license: LicenseData | null; onDismiss?: () => void }) {
    if (!license || license.warningLevel !== 'warning') return null;

    return (
        <div className="mx-4 mt-2 flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-sm">
            <AlertTriangle size={16} className="text-yellow-400 shrink-0" />
            <span className="flex-1">
                <strong>{license.name}</strong> — Copyleft license. Derivative works must be shared under the same terms.
            </span>
            {onDismiss && (
                <button onClick={onDismiss} className="text-yellow-400 hover:text-yellow-300 text-xs font-medium shrink-0">
                    Dismiss
                </button>
            )}
        </div>
    );
}
