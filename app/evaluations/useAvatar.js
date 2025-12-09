"use client";

import { useEffect, useState } from "react";

export function useAvatar() {
  const [avatarUrl, setAvatarUrl] = useState("");
  useEffect(() => {
    async function loadAvatar() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user) {
          const url = data.user.avatarUrl || data.user.avatar_url || "";
          if (url) setAvatarUrl(url);
        }
      } catch {
        // ignorar
      }
    }
    loadAvatar();
  }, []);
  return avatarUrl;
}
