"use client"

import * as React from "react"
import { useState } from "react"
import {
    MessageSquare,
    Plus,
    Check,
    X,
    MoreHorizontal,
    CornerDownRight,
    SmilePlus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export interface DiffLine {
    type: "context" | "addition" | "deletion"
    oldLineNumber: number | null
    newLineNumber: number | null
    content: string
}

export interface ReviewComment {
    id: string
    author: {
        name: string
        avatar: string
        role: string
    }
    content: string
    timestamp: string
    isResolved?: boolean
    replies?: ReviewComment[]
}

export interface GithubDiffProps {
    fileName: string
    diffLines: DiffLine[]
    initialComments?: Record<number, ReviewComment[]>
    onCommentAdd?: (lineNumber: number, content: string) => void
    onCommentResolve?: (lineNumber: number, commentId: string) => void
}

export function GithubDiff({
    fileName,
    diffLines,
    initialComments = {},
    onCommentAdd,
    onCommentResolve,
}: GithubDiffProps) {
    const [activeCommentLine, setActiveCommentLine] = useState<number | null>(null)
    const [comments, setComments] = useState<Record<number, ReviewComment[]>>(initialComments)
    const [newCommentText, setNewCommentText] = useState("")

    const handleAddComment = (lineNumber: number) => {
        if (!newCommentText.trim()) return

        const newComment: ReviewComment = {
            id: Math.random().toString(36).substr(2, 9),
            author: {
                name: "Current User",
                avatar: "/placeholder.svg?height=32&width=32",
                role: "Author",
            },
            content: newCommentText,
            timestamp: "Just now",
            replies: [],
        }

        const updatedComments = { ...comments }
        if (!updatedComments[lineNumber]) {
            updatedComments[lineNumber] = []
        }
        updatedComments[lineNumber].push(newComment)

        setComments(updatedComments)
        setNewCommentText("")
        setActiveCommentLine(null)

        if (onCommentAdd) onCommentAdd(lineNumber, newCommentText)
    }

    const resolveThread = (lineNumber: number, commentId: string) => {
        const updatedComments = { ...comments }
        const threadIndex = updatedComments[lineNumber].findIndex((c) => c.id === commentId)

        if (threadIndex !== -1) {
            updatedComments[lineNumber][threadIndex].isResolved = !updatedComments[lineNumber][threadIndex].isResolved
            setComments(updatedComments)
            if (onCommentResolve) onCommentResolve(lineNumber, commentId)
        }
    }

    return (
        <div className="w-full rounded-md border border-slate-700 bg-slate-900 font-mono text-sm shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-200">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-slate-700">
                        <CornerDownRight className="h-4 w-4 text-slate-400" />
                        <span className="sr-only">Toggle file</span>
                    </Button>
                    <span className="font-semibold">{fileName}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                        <span className="text-red-400">
                            -{diffLines.filter((l) => l.type === "deletion").length}
                        </span>
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="text-green-400">
                            +{diffLines.filter((l) => l.type === "addition").length}
                        </span>
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-slate-700">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Diff Content */}
            <div className="w-full overflow-x-auto text-slate-300">
                <table className="w-full border-collapse">
                    <tbody>
                        {diffLines.map((line, index) => {
                            const isAddition = line.type === "addition"
                            const isDeletion = line.type === "deletion"
                            const hasComments = comments[index] && comments[index].length > 0
                            const isCommenting = activeCommentLine === index

                            return (
                                <React.Fragment key={index}>
                                    <tr
                                        className={`group relative leading-tight ${isAddition
                                            ? "bg-green-500/10 hover:bg-green-500/20"
                                            : isDeletion
                                                ? "bg-red-500/10 hover:bg-red-500/20"
                                                : "hover:bg-slate-800/50"
                                            }`}
                                    >
                                        <td
                                            className={`w-[1%] min-w-[50px] select-none border-r border-slate-700 px-2 text-right text-xs ${isDeletion ? "text-slate-400" : "text-slate-500"
                                                }`}
                                        >
                                            {line.oldLineNumber}
                                        </td>
                                        <td
                                            className={`w-[1%] min-w-[50px] select-none border-r border-slate-700 px-2 text-right text-xs relative ${isAddition ? "text-slate-400" : "text-slate-500"
                                                }`}
                                        >
                                            {line.newLineNumber}

                                            {/* Add Comment Button (Visible on hover) */}
                                            <div className="absolute top-1/2 -right-3 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden sm:block">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="secondary"
                                                                size="icon"
                                                                className="h-6 w-6 rounded-md bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                                                                onClick={() => setActiveCommentLine(isCommenting ? null : index)}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right">
                                                            <p>Add a comment to this line</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </td>
                                        <td className="w-[1%] select-none px-2 text-center text-xs text-slate-500">
                                            {isAddition ? "+" : isDeletion ? "-" : " "}
                                        </td>
                                        <td className="w-full whitespace-pre-wrap px-4 py-1 pr-8 font-mono text-sm break-all">
                                            {line.content}
                                        </td>
                                    </tr>

                                    {/* Inline Comments Thread */}
                                    {hasComments && !isCommenting && (
                                        <tr>
                                            <td colSpan={4} className="p-0 border-y border-slate-700 bg-slate-950/50">
                                                <div className="pl-[100px] border-l-2 border-blue-500 w-full max-w-4xl pt-2 pb-4">
                                                    {comments[index].map((comment) => (
                                                        <div key={comment.id} className="mb-4 last:mb-0 pr-4">
                                                            <div className={`rounded-xl border border-slate-700 bg-slate-900 shadow-sm ${comment.isResolved ? 'opacity-70' : ''}`}>
                                                                {/* Comment Header */}
                                                                <div className="flex items-center justify-between border-b border-slate-700/50 bg-slate-800/40 px-3 py-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <Avatar className="h-6 w-6 border border-slate-700">
                                                                            {comment.author.name === "AI Reviewer" ? (
                                                                                <div className="flex items-center justify-center w-full h-full bg-blue-600/20 text-blue-400 text-xs">AI</div>
                                                                            ) : (
                                                                                <AvatarFallback className="bg-slate-700 text-xs text-slate-300">{comment.author.name[0]}</AvatarFallback>
                                                                            )}
                                                                        </Avatar>
                                                                        <span className="font-semibold text-sm text-slate-200">{comment.author.name}</span>
                                                                        {comment.author.role && (
                                                                            <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-slate-800 text-slate-400 border border-slate-700">
                                                                                {comment.author.role}
                                                                            </Badge>
                                                                        )}
                                                                        <span className="text-xs text-slate-500">{comment.timestamp}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        {comment.isResolved && (
                                                                            <Badge variant="outline" className="text-[10px] h-5 bg-green-500/10 text-green-400 border-green-500/20">
                                                                                Resolved
                                                                            </Badge>
                                                                        )}
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-slate-800 text-slate-400">
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                {/* Comment Body */}
                                                                <div className="px-3 py-3 text-sm text-slate-300 font-sans leading-relaxed">
                                                                    {comment.content}
                                                                </div>

                                                                {/* Comment Footer */}
                                                                <div className="flex items-center gap-2 border-t border-slate-800 bg-slate-900 px-3 py-2 rounded-b-xl">
                                                                    <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-slate-400 hover:text-slate-300 hover:bg-slate-800">
                                                                        <SmilePlus className="h-3.5 w-3.5 mr-1.5" />
                                                                        Reply
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => resolveThread(index, comment.id)}
                                                                        className={`h-7 text-xs font-semibold ml-auto hover:bg-slate-800 ${comment.isResolved
                                                                            ? "text-blue-400 hover:text-blue-300"
                                                                            : "text-slate-400 hover:text-slate-300"
                                                                            }`}
                                                                    >
                                                                        <Check className="h-3.5 w-3.5 mr-1.5" />
                                                                        {comment.isResolved ? "Reopen" : "Resolve"}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {/* Active Comment Input Box */}
                                    {isCommenting && (
                                        <tr>
                                            <td colSpan={4} className="p-0 border-y border-slate-700 bg-slate-950/50">
                                                <div className="pl-[100px] border-l-2 border-blue-500 w-full max-w-4xl py-2">
                                                    <div className="rounded-xl border border-slate-700 bg-slate-900 shadow-sm overflow-hidden mx-4 mb-2">
                                                        <div className="bg-slate-800/40 px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-slate-300">New Comment</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 rounded-md hover:bg-slate-800 text-slate-400"
                                                                onClick={() => setActiveCommentLine(null)}
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                        <div className="p-2">
                                                            <Textarea
                                                                placeholder="Leave a review comment..."
                                                                className="min-h-[80px] resize-none border-0 bg-transparent p-2 text-sm focus-visible:ring-0 text-slate-200"
                                                                value={newCommentText}
                                                                onChange={(e) => setNewCommentText(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/50 px-3 py-2">
                                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                                <span className="hidden sm:inline">Markdown is supported</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 text-xs font-semibold hover:bg-slate-800 text-slate-300"
                                                                    onClick={() => setActiveCommentLine(null)}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm"
                                                                    onClick={() => handleAddComment(index)}
                                                                    disabled={!newCommentText.trim()}
                                                                >
                                                                    Comment
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
