// 4タブ共通レイアウト
// - スマホ幅(420px)で中央寄せ
// - 下部固定ボトムナビ
// - children はそれぞれのタブページ
import { BottomNav } from "./_components/BottomNav";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[420px] mx-auto pb-20 min-h-screen bg-bg">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
