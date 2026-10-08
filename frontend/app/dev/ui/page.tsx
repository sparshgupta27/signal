"use client";

import { useState } from "react";
import {
  Archive,
  BellOff,
  MoreVertical,
  Phone,
  Pin,
  Search,
  Settings,
  Trash2,
  Video,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/Menu";
import { Switch } from "@/components/ui/Switch";
import { Tooltip } from "@/components/ui/Tooltip";
import { useTheme } from "@/components/providers/ThemeProvider";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-b border-divider pb-8 last:border-b-0">
      <h2 className="text-[12px] font-semibold uppercase tracking-wide text-secondary">
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

export default function UiShowcasePage() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [switches, setSwitches] = useState({
    receipts: true,
    typing: true,
    sound: false,
  });

  return (
    <div className="min-h-screen bg-app px-8 py-10 text-primary">
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-semibold">Component Showcase</h1>
            <p className="text-[13.5px] text-secondary">
              Resolved theme:{" "}
              <span className="font-medium text-primary">{resolvedTheme}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-sidebar p-1">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`rounded-full px-3 py-1.5 text-[13px] capitalize transition-colors duration-[120ms] ease-signal ${
                  theme === t
                    ? "bg-accent text-on-accent"
                    : "text-secondary hover:text-primary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </header>

        <Section title="Buttons">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </Section>

        <Section title="Icon buttons">
          <IconButton label="Search">
            <Search size={20} strokeWidth={1.75} />
          </IconButton>
          <IconButton label="Settings" active>
            <Settings size={20} strokeWidth={1.75} />
          </IconButton>
          <IconButton label="Voice call">
            <Phone size={20} strokeWidth={1.75} />
          </IconButton>
          <IconButton label="Video call">
            <Video size={20} strokeWidth={1.75} />
          </IconButton>
          <IconButton label="More options">
            <MoreVertical size={20} strokeWidth={1.75} />
          </IconButton>
        </Section>

        <Section title="Avatars">
          <Avatar id="u1" name="Demo User" size={28} />
          <Avatar id="u2" name="Aarav Mehta" size={36} online />
          <Avatar id="u3" name="Priya Sharma" size={48} />
          <Avatar id="u4" name="Rohan Gupta" size={48} online />
          <Avatar id="u5" name="Ananya Iyer" size={80} />
          <Avatar id="weekend-trip" name="Weekend Trip" size={48} />
        </Section>

        <Section title="Badges">
          <Badge count={1} />
          <Badge count={23} />
          <Badge count={150} />
          <Badge count={4} variant="muted" />
          <Badge dot />
        </Section>

        <Section title="Inputs">
          <Input
            placeholder="Search"
            leadingIcon={<Search size={16} />}
            className="w-64"
          />
          <Input placeholder="Type a name" className="w-64" pill={false} />
        </Section>

        <Section title="Switches">
          <label className="flex items-center gap-2 text-[13.5px]">
            <Switch
              checked={switches.receipts}
              onCheckedChange={(v) =>
                setSwitches((s) => ({ ...s, receipts: v }))
              }
              label="Read receipts"
            />
            Read receipts
          </label>
          <label className="flex items-center gap-2 text-[13.5px]">
            <Switch
              checked={switches.typing}
              onCheckedChange={(v) =>
                setSwitches((s) => ({ ...s, typing: v }))
              }
              label="Typing indicators"
            />
            Typing indicators
          </label>
          <label className="flex items-center gap-2 text-[13.5px]">
            <Switch
              checked={switches.sound}
              onCheckedChange={(v) =>
                setSwitches((s) => ({ ...s, sound: v }))
              }
              label="Notification sound"
            />
            Notification sound
          </label>
        </Section>

        <Section title="Tooltip">
          <Tooltip content="This is a tooltip">
            <Button variant="secondary">Hover me</Button>
          </Tooltip>
        </Section>

        <Section title="Dialog">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="primary">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Delete chat?</DialogTitle>
              <DialogDescription>
                This will remove the conversation from your chat list. This
                action cannot be undone.
              </DialogDescription>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="danger">Delete</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Section>

        <Section title="Menu">
          <Menu>
            <MenuTrigger asChild>
              <Button variant="secondary">Row actions</Button>
            </MenuTrigger>
            <MenuContent align="start">
              <MenuLabel>Chat</MenuLabel>
              <MenuItem>
                <Pin size={16} /> Pin chat
              </MenuItem>
              <MenuSub>
                <MenuSubTrigger>
                  <BellOff size={16} /> Mute notifications
                </MenuSubTrigger>
                <MenuSubContent>
                  <MenuItem>1 hour</MenuItem>
                  <MenuItem>8 hours</MenuItem>
                  <MenuItem>1 day</MenuItem>
                  <MenuItem>Always</MenuItem>
                </MenuSubContent>
              </MenuSub>
              <MenuItem>
                <Archive size={16} /> Archive chat
              </MenuItem>
              <MenuSeparator />
              <MenuItem danger>
                <Trash2 size={16} /> Delete chat
              </MenuItem>
            </MenuContent>
          </Menu>
        </Section>
      </div>
    </div>
  );
}
