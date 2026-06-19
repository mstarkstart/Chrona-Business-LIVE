"use client";

import { useEffect, useState } from "react";

export function formatTimeAgo(dateString?: string | null) {
  if (!dateString) return "just now";
  const date = new Date(dateString);
  const diffInMs = Math.abs(new Date().getTime() - date.getTime());
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  if (diffInMins < 1) return "just now";
  if (diffInMins < 60) return `${diffInMins} min`;
  const diffInHours = Math.floor(diffInMins / 60);
  if (diffInHours < 24) return `${diffInHours} hr`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} d`;
}

export function TimeAgo({ dateString }: { dateString?: string | null }) {
  const [text, setText] = useState(() => formatTimeAgo(dateString));
  
  useEffect(() => {
    setText(formatTimeAgo(dateString));
    const interval = setInterval(() => {
      setText(formatTimeAgo(dateString));
    }, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [dateString]);

  return <>{text}</>;
}
