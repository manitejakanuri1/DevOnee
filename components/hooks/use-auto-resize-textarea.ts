import { useEffect, useRef } from 'react';

export function useAutoResizeTextarea<T extends HTMLTextAreaElement>(
    value: string | undefined
) {
    const textAreaRef = useRef<T>(null);

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto'; // Reset height to recalculate
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
        }
    }, [value]);

    return { textAreaRef };
}
