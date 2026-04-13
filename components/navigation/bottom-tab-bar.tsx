"use client";

import Link from "next/link";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type TabItemProps = {
  href: string;
  label: string;
  text: string;
  active?: boolean;
};

function TabItem({ href, label, text, active }: TabItemProps) {
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-1 px-2 py-3"
    >
      <div className={active ? "text-emerald-700" : "text-slate-400"}>
        {label}
      </div>
      <span
        className={cn(
          "text-[11px]",
          active ? "font-semibold text-emerald-700" : "text-slate-400"
        )}
      >
        {text}
      </span>
    </Link>
  );
}

export default function BottomTabBar({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white">
      <TabItem href="/home" label="🏠" text="Home" active={active === "home"} />
      <TabItem
        href="/calendar"
        label="📅"
        text="Calendar"
        active={active === "calendar"}
      />
      <TabItem
        href="/Health"
        label="❤️"
        text="Health"
        active={active === "health"}
      />
      <TabItem
        href="/journal"
        label="📷"
        text="Journal"
        active={active === "journal"}
      />
      <TabItem
        href="/Profile"
        label="👤"
        text="Profile"
        active={active === "profile"}
      />
    </nav>
  );
}
