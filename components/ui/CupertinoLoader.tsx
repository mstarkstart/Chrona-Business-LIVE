import React from "react";

export function CupertinoLoaderPill({ className = "" }: { className?: string }) {
  return (
    <div className={`cupertino-loader-pill ${className}`}>
      <div className="cupertino-dot" />
      <div className="cupertino-dot" />
      <div className="cupertino-dot" />
    </div>
  );
}
