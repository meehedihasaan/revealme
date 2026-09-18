# Revealme guest and social UI refresh

## Experience
- Make light mode the default for first-time visitors while preserving each returning user’s saved theme choice.
- Turn the guest homepage into a read-only public feed. After 4 seconds, show a centered sign-in gate inspired by the supplied layout, with **Sign In** and **Create new account** actions, softly blurred feed context, floating squircle avatars, and reduced-motion support.
- Keep all existing avatar shapes unchanged. Enhance active story rings with a vivid multi-stop gradient that follows the existing squircle exactly.
- Use the signed-in user’s profile photo as the mobile drawer trigger; keep a squircle fallback when no photo exists.

## Identity and onboarding
- Change the verified badge to a semantic Twitter-blue seal with a high-contrast check in both light and dark modes.
- Simplify registration to name, email, and password by removing gender and password confirmation.
- Preserve the existing avatar and username onboarding steps.
- Make username availability feedback reliable and smooth with debounced checks, a checking state, stale-response protection, restricted-word validation, and clear available/taken signals.

## Posts and comments
- Remove the level calculation, level labels, and related post-count queries everywhere.
- Show `@username` immediately after the display name in every post header, including clip-style cards.
- Remove regular post reach tracking, counts, icon usage, and the `post_views` table. Keep clip-specific view behavior unchanged.
- Restyle global body text with a Twitter-like native system font stack while preserving the Revealme brand font.
- Simplify the comments sheet into a clean threaded layout: name, `@username`, time, text, lightweight actions, smoother open/close motion, and a compact fixed composer without the emoji strip.

## Technical details
- Add a guest-safe feed mode that reads only public posts/profiles and blocks like, save, comment, follow, create, messaging, and profile navigation behind the authentication prompt.
- Keep authenticated routing and onboarding behavior intact.
- Apply the database change through a schema migration that drops `post_views`; update generated usage through application code without editing generated backend client files.
- Update app-specific page metadata while touching the head, replacing remaining template descriptions.
- Verify mobile and desktop layouts, the 4-second prompt, light-first theme, signed-in feed, username signals, post headers, comments, and absence of post-view requests.
