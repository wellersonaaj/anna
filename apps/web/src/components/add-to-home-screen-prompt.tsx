import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui";
import { useBeforeInstallPrompt } from "../hooks/use-before-install-prompt";
import {
  isAndroidDevice,
  isInstallPromptTargetDevice,
  isIosChrome,
  isSafariIos,
  isStandaloneDisplay
} from "../lib/pwa/device";
import { getInstallStrings } from "../lib/pwa/install-strings";
import { ADD_TO_HOME_DISMISSED_KEY, SHOW_HOME_SCREEN_PROMPT_KEY } from "../lib/pwa/prompt-keys";
import { useSessionStore } from "../store/session.store";

const readDismissedIds = (): string[] => {
  try {
    const raw = localStorage.getItem(ADD_TO_HOME_DISMISSED_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const persistDismissedId = (userId: string) => {
  const ids = new Set(readDismissedIds());
  ids.add(userId);
  localStorage.setItem(ADD_TO_HOME_DISMISSED_KEY, JSON.stringify([...ids]));
};

export const AddToHomeScreenPrompt = () => {
  const user = useSessionStore((s) => s.user);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const deferredPrompt = useBeforeInstallPrompt();
  const [open, setOpen] = useState(false);
  const strings = getInstallStrings();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }
    if (isStandaloneDisplay()) {
      return;
    }
    if (!isInstallPromptTargetDevice()) {
      return;
    }
    if (readDismissedIds().includes(user.id)) {
      return;
    }
    if (sessionStorage.getItem(SHOW_HOME_SCREEN_PROMPT_KEY) !== "1") {
      return;
    }
    setOpen(true);
  }, [isAuthenticated, user]);

  const finalize = useCallback(
    (opts: { dismissForever: boolean }) => {
      sessionStorage.removeItem(SHOW_HOME_SCREEN_PROMPT_KEY);
      if (opts.dismissForever && user) {
        persistDismissedId(user.id);
      }
      setOpen(false);
    },
    [user]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        finalize({ dismissForever: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finalize]);

  const onInstallAndroid = async () => {
    if (!deferredPrompt) {
      return;
    }
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted" && user) {
        persistDismissedId(user.id);
      }
    } catch {
      // ignorar cancelamento / erros do browser
    } finally {
      finalize({ dismissForever: false });
    }
  };

  if (!open || typeof document === "undefined") {
    return null;
  }

  const step1 = isIosChrome() ? strings.step1IosChrome : isSafariIos() ? strings.step1IosSafari : strings.step1IosGeneric;

  const showAndroidInstall = isAndroidDevice() && deferredPrompt;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[200] cursor-default bg-black/35"
        aria-label={strings.dismiss}
        onClick={() => finalize({ dismissForever: true })}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="anna-pwa-dialog-title"
        className="fixed bottom-0 left-0 right-0 z-[201] max-h-[min(88vh,560px)] overflow-y-auto rounded-t-3xl border border-rose-100 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(26,26,46,0.12)]"
      >
        <div className="mx-auto w-full max-w-md">
          <h2 id="anna-pwa-dialog-title" className="font-headline text-xl font-extrabold tracking-tight text-on-background">
            {strings.title}
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-on-background">
            <li>{step1}</li>
            <li>
              {strings.step2Before}
              <strong>{strings.addToHomeMenuLabel}</strong>
              {strings.step2After}
            </li>
          </ol>
          <div className="mt-6 flex flex-col gap-2">
            {showAndroidInstall ? (
              <Button type="button" className="w-full" onClick={() => void onInstallAndroid()}>
                {strings.primaryInstall}
              </Button>
            ) : (
              <Button type="button" className="w-full" onClick={() => finalize({ dismissForever: true })}>
                {strings.primaryGotIt}
              </Button>
            )}
            <button
              type="button"
              className="h-11 w-full rounded-xl text-sm font-bold text-on-surface-variant underline-offset-2 hover:underline"
              onClick={() => finalize({ dismissForever: true })}
            >
              {strings.dismiss}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
