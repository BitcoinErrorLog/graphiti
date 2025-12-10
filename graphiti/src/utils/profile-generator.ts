import { ProfileData } from './storage';

/**
 * Generate a clean, modern HTML profile page
 * Design matches pubky-app and franky aesthetic - minimalist, clean, modern
 */
/**
 * Note: This generates static HTML. 
 * For images stored on homeservers (pubky:// or relative paths),
 * they need to be resolved to data URLs before calling this function.
 */
export function generateProfileHTML(profile: ProfileData, publicKey: string, resolvedImageDataUrl?: string): string {
  const {
    name,
    bio,
    image,
    status,
    links = [],
  } = profile;

  // Escape HTML to prevent XSS
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const safeName = escapeHtml(name);
  const safeBio = bio ? escapeHtml(bio) : '';
  const safeStatus = status ? escapeHtml(status) : '';
  const safePublicKey = escapeHtml(publicKey);
  
  // Use the resolved data URL if provided, otherwise use the original image URL
  // This handles both external URLs and homeserver images that have been converted
  const safeImage = resolvedImageDataUrl ? escapeHtml(resolvedImageDataUrl) : 
                    (image && (image.startsWith('http://') || image.startsWith('https://')) ? escapeHtml(image) : '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeName} - Pubky Profile</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
      background: #0a0a0a;
      color: #e5e5e5;
      line-height: 1.6;
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 680px;
      margin: 0 auto;
    }

    /* Profile Header */
    .profile-header {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 20px;
    }

    .profile-top {
      display: flex;
      gap: 24px;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .avatar {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      object-fit: cover;
      background: #2a2a2a;
      flex-shrink: 0;
      border: 2px solid #3a3a3a;
    }

    .avatar-placeholder {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      font-weight: 700;
      color: white;
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .profile-info {
      flex: 1;
      min-width: 0;
    }

    .name {
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
      word-wrap: break-word;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #2a2a2a;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 14px;
      color: #a0a0a0;
      border: 1px solid #3a3a3a;
    }

    .bio {
      font-size: 15px;
      color: #b0b0b0;
      line-height: 1.5;
      margin-top: 16px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* Links Section */
    .links-section {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-icon {
      width: 20px;
      height: 20px;
      color: #6b7280;
    }

    .links-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .link-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #0a0a0a;
      border: 1px solid #2a2a2a;
      border-radius: 10px;
      text-decoration: none;
      color: #e5e5e5;
      transition: all 0.2s ease;
    }

    .link-item:hover {
      background: #2a2a2a;
      border-color: #3a3a3a;
      transform: translateX(4px);
    }

    .link-icon {
      width: 16px;
      height: 16px;
      color: #6b7280;
      flex-shrink: 0;
    }

    .link-content {
      flex: 1;
      min-width: 0;
    }

    .link-title {
      font-size: 14px;
      font-weight: 500;
      color: #ffffff;
      margin-bottom: 2px;
    }

    .link-url {
      font-size: 13px;
      color: #6b7280;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Public Key Section */
    .key-section {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
    }

    .key-box {
      background: #0a0a0a;
      border: 1px solid #2a2a2a;
      border-radius: 10px;
      padding: 16px;
      margin-top: 12px;
      position: relative;
    }

    .public-key {
      font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      color: #10b981;
      word-break: break-all;
      line-height: 1.6;
    }

    .copy-button {
      width: 100%;
      margin-top: 12px;
      background: #2a2a2a;
      color: #ffffff;
      border: 1px solid #3a3a3a;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .copy-button:hover {
      background: #3a3a3a;
      border-color: #4a4a4a;
    }

    .copy-button:active {
      transform: scale(0.98);
    }

    .copy-button.copied {
      background: #10b981;
      border-color: #10b981;
      color: #ffffff;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 32px 20px;
      color: #6b7280;
      font-size: 13px;
    }

    .footer a {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    .footer-divider {
      margin: 12px 0;
      color: #3a3a3a;
    }

    /* Responsive */
    @media (max-width: 640px) {
      body {
        padding: 12px;
      }

      .profile-header {
        padding: 24px;
      }

      .profile-top {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .avatar, .avatar-placeholder {
        width: 80px;
        height: 80px;
      }

      .avatar-placeholder {
        font-size: 32px;
      }

      .name {
        font-size: 24px;
      }

      .links-section, .key-section {
        padding: 20px;
      }

      .public-key {
        font-size: 12px;
      }
    }

    /* No content states */
    .no-content {
      text-align: center;
      padding: 32px;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Profile Header -->
    <div class="profile-header">
      <div class="profile-top">
        ${safeImage
          ? `<img 
               src="${safeImage}" 
               alt="${safeName}" 
               class="avatar" 
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
             <div class="avatar-placeholder" style="display: none;">${safeName.charAt(0).toUpperCase()}</div>`
          : `<div class="avatar-placeholder">${safeName.charAt(0).toUpperCase()}</div>`
        }
        <div class="profile-info">
          <h1 class="name">${safeName}</h1>
          ${safeStatus ? `<div class="status">${safeStatus}</div>` : ''}
        </div>
      </div>
      ${safeBio ? `<div class="bio">${safeBio}</div>` : ''}
    </div>

    <!-- Links Section -->
    ${links.length > 0 ? `
    <div class="links-section">
      <h2 class="section-title">
        <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Links
      </h2>
      <div class="links-list">
        ${links.map(link => `
          <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="link-item">
            <svg class="link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <div class="link-content">
              <div class="link-title">${escapeHtml(link.title)}</div>
              <div class="link-url">${escapeHtml(link.url)}</div>
            </div>
          </a>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Public Key Section -->
    <div class="key-section">
      <h2 class="section-title">
        <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        Public Key
      </h2>
      <div class="key-box">
        <div class="public-key">${safePublicKey}</div>
        <button class="copy-button" onclick="copyPublicKey()">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Public Key
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>Powered by <a href="https://pubky.org" target="_blank" rel="noopener noreferrer">Pubky</a></div>
      <div class="footer-divider">•</div>
      <div>Decentralized identity protocol</div>
    </div>
  </div>

  <script>
    function copyPublicKey() {
      const publicKey = ${JSON.stringify(safePublicKey)};
      const button = document.querySelector('.copy-button');
      
      navigator.clipboard.writeText(publicKey).then(() => {
        button.classList.add('copied');
        button.innerHTML = \`
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        \`;
        
        setTimeout(() => {
          button.classList.remove('copied');
          button.innerHTML = \`
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Public Key
          \`;
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
        // Show error in console since this runs in profile renderer page context
        console.error('[Graphiti] Failed to copy public key');
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Parse profile data from HTML page
 * This is used to extract profile data from an existing index.html
 */
export function parseProfileFromHTML(html: string): Partial<ProfileData> | null {
  try {
    // Create a temporary DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract name from h1.name
    const nameEl = doc.querySelector('.name');
    const name = nameEl?.textContent?.trim() || '';

    // Extract bio
    const bioEl = doc.querySelector('.bio');
    const bio = bioEl?.textContent?.trim();

    // Extract status (combined text with emoji)
    const statusEl = doc.querySelector('.status');
    const status = statusEl?.textContent?.trim();

    // Extract image (avatar)
    const imageEl = doc.querySelector('.avatar') as HTMLImageElement;
    const image = imageEl?.src;

    // Extract links
    const linkItems = doc.querySelectorAll('.link-item');
    const links: Array<{ title: string; url: string }> = [];
    linkItems.forEach(item => {
      const title = item.querySelector('.link-title')?.textContent?.trim();
      const url = (item as HTMLAnchorElement).href;
      if (title && url) {
        links.push({ title, url });
      }
    });

    if (!name) {
      return null;
    }

    return {
      name,
      bio,
      status,
      image,
      links: links.length > 0 ? links : undefined,
    };
  } catch (error) {
    console.error('Failed to parse profile from HTML:', error);
    return null;
  }
}
