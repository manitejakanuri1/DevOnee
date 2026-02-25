import './globals.css'
import { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
    title: "DevOne - Accelerating Developer Onboarding",
    description: "DevOne is an AI-powered onboarding platform that breaks down complex codebases, provides tailored learning plans, and seamlessly mentors developers making their first open-source contributions.",
    icons: {
        icon: '/icon.png'
    },
    openGraph: {
        title: "DevOne",
        description: "AI-powered Developer Onboarding & Mentorship.",
        url: "https://devone.app",
        siteName: "DevOne",
        images: [
            {
                url: "/icon.png",
                width: 256,
                height: 256,
                alt: "DevOne Logo",
            },
        ],
        locale: "en_US",
        type: "website",
    }
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
