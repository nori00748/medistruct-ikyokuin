// 招待URLをクリップボードにコピーするボタン(クライアントコンポーネント)
"use client";

import { useState } from "react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック
      prompt("コピーしてください", url);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-[11px] bg-primary hover:bg-primary-hover text-white font-semibold rounded-md px-2.5 py-1.5"
    >
      {copied ? "✓ コピー済み" : "URLをコピー"}
    </button>
  );
}
