import {
  FacebookOutlined,
  GlobalOutlined,
  InstagramOutlined,
  LinkedinOutlined,
  PinterestOutlined,
  TikTokOutlined,
  TwitterOutlined,
  YoutubeOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

export type SocialPlatform = {
  id: string;
  label: string;
  icon: ReactNode;
  placeholder?: string;
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: "instagram",
    label: "Instagram",
    icon: <InstagramOutlined />,
    placeholder: "https://instagram.com/yourpage",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: <FacebookOutlined />,
    placeholder: "https://facebook.com/yourpage",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: <LinkedinOutlined />,
    placeholder: "https://linkedin.com/company/yourpage",
  },
  {
    id: "x",
    label: "X (Twitter)",
    icon: <TwitterOutlined />,
    placeholder: "https://x.com/yourhandle",
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: <YoutubeOutlined />,
    placeholder: "https://youtube.com/@yourchannel",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: <TikTokOutlined />,
    placeholder: "https://tiktok.com/@yourhandle",
  },
  {
    id: "pinterest",
    label: "Pinterest",
    icon: <PinterestOutlined />,
    placeholder: "https://pinterest.com/yourpage",
  },
];

export function socialPlatformIcon(label: string): ReactNode {
  const match = SOCIAL_PLATFORMS.find(
    (p) => p.label.toLowerCase() === label.trim().toLowerCase(),
  );
  return match?.icon ?? <GlobalOutlined />;
}

export function socialPlatformPlaceholder(label: string): string {
  const match = SOCIAL_PLATFORMS.find(
    (p) => p.label.toLowerCase() === label.trim().toLowerCase(),
  );
  return match?.placeholder ?? "https://…";
}
