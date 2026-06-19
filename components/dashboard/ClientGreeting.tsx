"use client";

import { useEffect, useState } from "react";

export function ClientGreeting({ fallback }: { fallback: string }) {
  const [greeting, setGreeting] = useState(fallback);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  return <>{greeting}</>;
}
