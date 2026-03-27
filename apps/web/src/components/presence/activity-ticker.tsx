"use client"

import { Fragment } from "react"

interface ActivityTickerProps {
  events: { userName: string; action: string }[]
}

function TickerContent({ events }: { events: ActivityTickerProps["events"] }) {
  return (
    <>
      {events.map((e, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-text-dim mx-3">&middot;</span>}
          <span className="text-text-primary font-semibold">{e.userName}</span>{" "}
          <span className="text-text-muted">{e.action}</span>
        </Fragment>
      ))}
    </>
  )
}

export function ActivityTicker({ events }: ActivityTickerProps) {
  if (!events || events.length === 0) return null

  return (
    <div className="relative overflow-hidden border-b border-[rgba(255,240,220,0.04)] bg-[rgba(196,149,106,0.02)]">
      <div className="mx-auto flex h-8 items-center gap-3 px-4" style={{ maxWidth: 960 }}>
        {/* Breathing pulse dot */}
        <div className="ticker-pulse-dot h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-green" />

        {/* Scrolling content */}
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-scroll flex whitespace-nowrap text-xs">
            <span className="inline-block">
              <TickerContent events={events} />
            </span>
            <span className="text-text-dim mx-3">&middot;</span>
            <span className="inline-block">
              <TickerContent events={events} />
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse-breathe {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .ticker-scroll {
          animation: scroll-left 30s linear infinite;
        }
        .ticker-pulse-dot {
          animation: pulse-breathe 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
