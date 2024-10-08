# 🎶 Music Showcase Bot for Discord

Welcome to the **Music Showcase Bot**! This bot is designed to enhance your Discord server's music-sharing experience by ensuring better post readability and reducing clutter. With this bot, users can only post music showcases if they haven't done so in the last **four months**, creating a cleaner and more enjoyable environment for everyone.

## Features

- **Post Management**: Automatically restricts users from posting more than once every four months, ensuring that all showcases are meaningful and relevant.
- **User Feedback**: Sends direct messages to users when they attempt to post too soon, guiding them on when they can post next.
- **Admin Controls**: Only users with a specific verified role can post in the designated channel, preventing spam and maintaining quality.
- **Interactive Buttons**: Users can interact with the bot to check their posting status through embedded responses.

## Getting Started

### Self-Deployment

1. **Clone the repository**:
   ```bash
   git clone[https://github.com/developer1231/Discord-Post-Manager.git]
   cd music-showcase-bot
   ```
2. **Install Dependencies**
   ```bash
   npm install
   ```
3. **Setup your environment**
   - Navigate to the ``.env`` file and update the following variables:
   - ``DISCORD_BOT_TOKEN:`` Your Discord bot token.
   - ``DISCORD_CLIENT_ID:`` Your Discord application client ID.
   - ``DISCORD_SERVER_ID:`` Your server ID.
4. **Configure the bot**
   Open the ``config.json`` and enter the following details:
   ```json
   {
    "channel": "CHANNEL_ID", // The channel where the button and information embed will be sent
    "post_channel": "POST_CHANNEL_ID", // The channel for posting music showcases
    "role": "ROLE_ID" // The role ID of the verified role
     }
   ```

