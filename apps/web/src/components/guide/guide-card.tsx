"use client";

import type {
  GuideAskResponseData,
  GuideCardData,
  GuideMessageData,
  GuideScreen,
} from "@kshetra/types";
import { useEffect, useState } from "react";

import { apiRequest } from "../../lib/api-client";

const GUIDE_IMAGE_BY_VARIANT = {
  calm: "/guide/kael-calm.png",
  bold: "/guide/kael-bold.png",
  battle: "/guide/kael-battle.png",
} as const;

export function GuideDockCard({
  userId,
  screen,
  card,
  message,
  onMessageDismissed,
}: {
  userId: string | null;
  screen: GuideScreen;
  card: GuideCardData | undefined;
  message: GuideMessageData | null | undefined;
  onMessageDismissed?: (messageId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<GuideAskResponseData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleMessageId, setVisibleMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!message?.id) {
      setVisibleMessageId(null);
      return;
    }

    setVisibleMessageId(message.id);
    const timeoutId = window.setTimeout(() => {
      setVisibleMessageId((current) => (current === message.id ? null : current));
    }, 6500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message?.id]);

  if (!card) {
    return null;
  }

  const activeVariant =
    message && visibleMessageId === message.id ? message.state_variant : card.state_variant;
  const motionMode = submitting
    ? "thinking"
    : message && visibleMessageId === message.id
      ? "alert"
      : expanded
        ? "engaged"
        : "idle";

  async function handleAsk(nextQuestion: string): Promise<void> {
    if (!userId) {
      return;
    }

    const trimmed = nextQuestion.trim();
    if (!trimmed) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await apiRequest<GuideAskResponseData>("/guide/ask", {
        method: "POST",
        userId,
        body: {
          screen,
          question: trimmed,
        },
      });
      setAnswer(response);
      setExpanded(true);
      setQuestion("");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to ask Kael right now.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDismissMessage(): Promise<void> {
    if (!userId || !message?.id) {
      setVisibleMessageId(null);
      return;
    }

    try {
      await apiRequest(`/guide/messages/${message.id}/dismiss`, {
        method: "POST",
        userId,
      });
      setVisibleMessageId(null);
      onMessageDismissed?.(message.id);
    } catch {
      setVisibleMessageId(null);
    }
  }

  return (
    <div className="guide-stack">
      {message && visibleMessageId === message.id ? (
        <div className={`guide-popup guide-popup-${message.state_variant}`} key={message.id}>
          <div className={`guide-portrait-frame guide-portrait-frame-${message.state_variant}`}>
            <div className={`guide-avatar-aura guide-avatar-aura-${message.state_variant}`} />
            <img
              src={GUIDE_IMAGE_BY_VARIANT[message.state_variant]}
              alt={`${card.companion_name} companion portrait`}
              className="guide-popup-avatar"
            />
          </div>
          <div className="min-w-0 flex-1 guide-popup-copy">
            <p className="guide-popup-title guide-popup-title-enter">{message.title}</p>
            <p className="guide-popup-body guide-popup-body-enter">{message.body}</p>
          </div>
          <button type="button" className="guide-dismiss" onClick={handleDismissMessage}>
            Dismiss
          </button>
        </div>
      ) : null}

      <section
        className={`guide-dock guide-dock-${card.state_variant} guide-dock-live-${activeVariant} guide-motion-${motionMode}`}
      >
        <div className="guide-dock-head">
          <div className={`guide-portrait-frame guide-portrait-frame-${activeVariant}`}>
            <div className={`guide-avatar-aura guide-avatar-aura-${activeVariant}`} />
            <img
              src={GUIDE_IMAGE_BY_VARIANT[activeVariant]}
              alt={`${card.companion_name} companion portrait`}
              className={`guide-dock-avatar guide-dock-avatar-${activeVariant}`}
            />
          </div>
          <div className="min-w-0 flex-1 guide-dock-copy">
            <p className="guide-name">{card.companion_name}</p>
            <h3 className="guide-title">{card.title}</h3>
            <p className="guide-body">{card.body}</p>
            <div className={`guide-signal guide-signal-${activeVariant}`} />
          </div>
          <button
            type="button"
            className="guide-expand"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Hide" : card.primary_cta_label ?? "Ask"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {card.quick_chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="guide-chip"
              disabled={submitting}
              onClick={() => void handleAsk(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        {expanded ? (
          <div className="guide-panel guide-panel-enter">
            <form
              className="guide-ask-row"
              onSubmit={(event) => {
                event.preventDefault();
                void handleAsk(question);
              }}
            >
              <input
                className="guide-input"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={`Ask ${card.companion_name} anything about this screen`}
              />
              <button type="submit" className="guide-submit" disabled={submitting}>
                {submitting ? "Reading" : "Ask"}
              </button>
            </form>

            {submitting ? (
              <div className="guide-thinking">
              <div className={`guide-thinking-avatar guide-thinking-avatar-${activeVariant}`}>
                  <div className={`guide-avatar-aura guide-avatar-aura-${activeVariant}`} />
                  <img
                    src={GUIDE_IMAGE_BY_VARIANT[activeVariant]}
                    alt={`${card.companion_name} thinking portrait`}
                    className="guide-thinking-image"
                  />
                </div>
                <div className="guide-thinking-copy">
                  <p className="guide-answer-title">Kael is reading the field</p>
                  <div className="guide-thinking-lines">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            ) : null}

            {answer ? (
              <div className={`guide-answer guide-answer-${answer.state_variant}`}>
                <p className="guide-answer-title">{answer.title}</p>
                <p className="guide-answer-body">{answer.body}</p>
                {answer.bullets.length ? (
                  <div className="guide-answer-bullets">
                    {answer.bullets.map((bullet) => (
                      <p key={bullet}>{bullet}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
