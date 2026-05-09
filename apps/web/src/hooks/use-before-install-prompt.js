import { useEffect, useState } from "react";
export const useBeforeInstallPrompt = () => {
    const [event, setEvent] = useState(null);
    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setEvent(e);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);
    return event;
};
