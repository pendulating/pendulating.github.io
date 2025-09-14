# Social Media Sharing Features

This Astro website includes comprehensive social media sharing functionality, including Instagram Stories support and native iOS Safari sharing.

## Features

### 1. Native Web Share API (Safari Share Button)
- **What it does**: Provides the native iOS Safari share button functionality
- **How it works**: Uses the Web Share API to open the system share sheet
- **Fallback**: Copies link to clipboard if Web Share API is not supported
- **Location**: Automatically appears in ShareLinks component on supported devices

### 2. Instagram Stories Sharing
- **What it does**: Allows users to share content directly to Instagram Stories
- **How it works**: Uses Instagram's deep linking protocol (`instagram-stories://share`)
- **Fallback**: Opens Instagram web if app is not installed
- **Features**:
  - Passes title, description, and image URL to Instagram
  - Creates polished graphics for sharing
  - Works with both mobile and desktop

### 3. Enhanced Open Graph Meta Tags
- **What it does**: Provides rich previews when sharing on social media
- **Platforms supported**: Facebook, Twitter, LinkedIn, Instagram, WhatsApp, etc.
- **Features**:
  - Dynamic OG image generation
  - Article metadata (publish date, author, tags)
  - Instagram-specific meta tags
  - Twitter Card support

### 4. Comprehensive Social Platform Support
- **Platforms**: Twitter, Facebook, LinkedIn, WhatsApp, Telegram, Pinterest, Reddit, Email
- **Features**: 
  - Platform-specific sharing URLs
  - Proper URL encoding
  - Tag support for Twitter
  - Image support for Pinterest

## Components

### ShareLinks.astro
Main sharing component with all social platforms and native sharing.

**Usage**:
```astro
<ShareLinks title="Your post title" />
```

**Features**:
- All major social platforms
- Native Web Share API button (Safari)
- Copy link functionality
- Instagram Stories sharing

### InstagramStoryShare.astro
Dedicated Instagram Stories sharing component.

**Usage**:
```astro
<InstagramStoryShare 
  title="Your title"
  description="Your description"
  imageUrl="https://your-image-url.com/image.png"
  showLabel={true}
/>
```

**Features**:
- Instagram deep linking
- Fallback to Instagram web
- Customizable styling
- Optional "Story" label

## Configuration

### Social Sharing Settings (src/config.ts)
```typescript
export const SOCIAL_SHARING = {
  instagram: {
    username: "@pendulating",
    storySharing: true,
    deepLinking: true,
  },
  twitter: {
    username: "@mattwfranchi",
    cardType: "summary_large_image",
  },
  default: {
    showNativeShare: true,
    showCopyLink: true,
    showInstagramStory: true,
    showWebShare: true,
  },
  ogImage: {
    width: 1200,
    height: 630,
    format: "png",
    quality: 90,
  },
};
```

## How Instagram Stories Sharing Works

### 1. Deep Linking
When a user clicks the Instagram Story share button:
1. Creates a deep link: `instagram-stories://share?source_application=web&url=...`
2. Attempts to open Instagram app
3. If Instagram app is not installed, falls back to Instagram web

### 2. Parameters Passed
- `url`: The page URL to share
- `title`: The post title
- `description`: The post description
- `image`: The OG image URL (if available)

### 3. User Experience
1. User clicks Instagram Story button
2. Instagram app opens (if installed)
3. User can customize the story with the shared content
4. User can add the story to their Instagram Stories

## OG Image Generation

### Dynamic OG Images
- **Location**: `src/utils/og-templates/`
- **Templates**: 
  - `post.tsx`: For blog posts
  - `site.tsx`: For general pages
- **API Routes**:
  - `/og.png`: Default site OG image
  - `/og/[slug].png`: Dynamic post OG images

### Customization
The OG image templates can be customized in:
- `src/utils/og-templates/post.tsx`
- `src/utils/og-templates/site.tsx`

## Testing

### Instagram Stories
1. Open your website on a mobile device
2. Navigate to any blog post
3. Click the Instagram Story share button
4. Instagram app should open with the shared content

### Native Sharing (Safari)
1. Open your website in Safari on iOS
2. Navigate to any page
3. Click the native share button (green icon)
4. iOS share sheet should appear

### Social Media Previews
1. Share any URL on Facebook, Twitter, or LinkedIn
2. Rich preview should appear with title, description, and image
3. Test with tools like:
   - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - [Twitter Card Validator](https://cards-dev.twitter.com/validator)
   - [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

## Browser Support

### Web Share API
- ✅ Safari (iOS 12.2+)
- ✅ Chrome (Android 61+)
- ✅ Edge (79+)
- ❌ Firefox (not supported)

### Instagram Deep Linking
- ✅ iOS Safari
- ✅ Android Chrome
- ✅ Instagram app installed
- ⚠️ Instagram app not installed (falls back to web)

## Troubleshooting

### Instagram Stories Not Working
1. Ensure Instagram app is installed
2. Check that deep linking is enabled
3. Verify the URL parameters are properly encoded
4. Test on a mobile device (not desktop)

### Native Share Not Appearing
1. Check if Web Share API is supported: `'share' in navigator`
2. Ensure you're on HTTPS
3. Test on a mobile device
4. Check browser console for errors

### OG Images Not Generating
1. Check the API routes are working: `/og.png`
2. Verify Satori and Resvg dependencies are installed
3. Check build logs for errors
4. Ensure fonts are properly loaded

## Future Enhancements

### Planned Features
- [ ] WhatsApp Status sharing
- [ ] TikTok sharing
- [ ] Snapchat sharing
- [ ] Custom OG image templates per post
- [ ] Analytics for sharing
- [ ] A/B testing for different share button layouts

### Customization Options
- [ ] Custom share button colors
- [ ] Platform-specific sharing text
- [ ] Share count tracking
- [ ] Social media preview customization 