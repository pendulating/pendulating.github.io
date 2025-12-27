import type { Site, SocialObjects } from "./types";

export const PROFILE = {
  name: "Matt Franchi",
  title: "PhD Candidate @ Cornell",
  profilePic: "/assets/profile_photo.png", // Add your profile pic to public/assets
  bio: "Urban data scientist exploring inequality through the lens of computation and photography",
  location: "Ithaca, NY",
  links: {
    github: "https://github.com/mattwfranchi",
    // add other links you want to display
  },
  stats: {
    photos: 42, // we can make this dynamic later
    albums: 3,  // we can make this dynamic later
    views: 1337 // for the retro feel ;)
  }
};

export const SITE: Site = {
  website: "https://mfranchi.net", // replace this with your deployed domain
  author: "Matt Franchi",
  profile: "https://mfranchi.net",
  desc: "Matt Franchi is a computer science PhD candidate at Cornell University, interested in computational social science and urban sensing. Extra-academically, he writes peaceful piano compositions, models, and plays with generative AI models.",
  title: "Matt Franchi",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 3,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  dynamicOgImage: false,
};

export const LOCALE = {
  lang: "en", // html lang code. Set this empty and default will be "en"
  langTag: ["en-EN"], // BCP 47 Language Tags. Set this empty [] to use the environment default
} as const;

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/pendulating",
    linkTitle: ` ${SITE.title} on Github`,
    active: true,
  },
  {
    name: "Facebook",
    href: "",
    linkTitle: `${SITE.title} on Facebook`,
    active: false,
  },
  {
    name: "Instagram",
    href: "https://instagram.com/pendulating",
    linkTitle: `${SITE.title} on Instagram`,
    active: true,
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/in/mattfranchi",
    linkTitle: `${SITE.title} on LinkedIn`,
    active: true,
  },
  {
    name: "Mail",
    href: "mailto:mwf62@cornell.edu",
    linkTitle: `Send an email to ${SITE.title}`,
    active: false,
  },
  {
    name: "Twitter",
    href: "https://x.com/mattwfranchi",
    linkTitle: `${SITE.title} on Twitter`,
    active: true,
  },
  {
    name: "Twitch",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Twitch`,
    active: false,
  },
  {
    name: "YouTube",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on YouTube`,
    active: false,
  },
  {
    name: "WhatsApp",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on WhatsApp`,
    active: false,
  },
  {
    name: "Snapchat",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Snapchat`,
    active: false,
  },
  {
    name: "Pinterest",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Pinterest`,
    active: false,
  },
  {
    name: "TikTok",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on TikTok`,
    active: false,
  },
  {
    name: "CodePen",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on CodePen`,
    active: false,
  },
  {
    name: "Discord",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Discord`,
    active: false,
  },
  {
    name: "GitLab",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on GitLab`,
    active: false,
  },
  {
    name: "Reddit",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Reddit`,
    active: false,
  },
  {
    name: "Skype",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Skype`,
    active: false,
  },
  {
    name: "Steam",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Steam`,
    active: false,
  },
  {
    name: "Telegram",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Telegram`,
    active: false,
  },
  {
    name: "Mastodon",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Mastodon`,
    active: false,
  },
  {
    name: "Spotify",
    href: "https://open.spotify.com/artist/2RIA9v5X55UGXGFqk4VIsZ?si=WXrrEIPiQamsb43APZ3sqw",
    linkTitle: `${SITE.title} on Spotify`,
    active: true,
  }
];

// Social media sharing configuration
export const SOCIAL_SHARING = {
  // Instagram configuration
  instagram: {
    username: "@mattfranchi",
    storySharing: true,
    deepLinking: true,
  },
  // Twitter/X configuration
  twitter: {
    username: "@mattwfranchi",
    cardType: "summary_large_image",
  },
  // Default sharing settings
  default: {
    showNativeShare: true, // Show Safari share button
    showCopyLink: true,
    showInstagramStory: true,
    showWebShare: true,
  },
  // OG image settings
  ogImage: {
    width: 1200,
    height: 630,
    format: "png",
    quality: 90,
  },
} as const;
