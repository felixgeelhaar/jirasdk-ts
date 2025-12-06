# GitHub Discussions Setup Guide

This guide will help you enable and configure GitHub Discussions for your repository.

## Step 1: Enable GitHub Discussions

1. Go to your repository: https://github.com/felixgeelhaar/jirasdk-ts
2. Click on **Settings** (top right)
3. Scroll down to **Features** section
4. Check the box next to **Discussions**
5. Click **Set up discussions** button

## Step 2: Create Discussion Categories

Once Discussions is enabled, you'll need to create the following categories:

### 1. 💬 General
- **Name**: General
- **Description**: General discussions about the SDK, community, and anything else
- **Emoji**: 💬
- **Format**: Open-ended discussion

**How to create:**
1. Go to the Discussions tab
2. Click the ⚙️ (gear icon) next to "Categories"
3. Click "New category"
4. Fill in the details above
5. Click "Create"

### 2. 💡 Ideas
- **Name**: Ideas
- **Description**: Share and discuss ideas for new features and improvements
- **Emoji**: 💡
- **Format**: Open-ended discussion

### 3. ❓ Q&A
- **Name**: Q&A
- **Description**: Ask questions and get help from the community
- **Emoji**: ❓
- **Format**: Question / Answer
- **Special**: ✅ Enable "Mark answer as solution"

### 4. 🎉 Show and Tell
- **Name**: Show and Tell
- **Description**: Share projects you've built using the SDK
- **Emoji**: 🎉
- **Format**: Open-ended discussion

### 5. 📣 Announcements
- **Name**: Announcements
- **Description**: Official announcements about releases, features, and changes
- **Emoji**: 📣
- **Format**: Announcement
- **Special**: ✅ Set to "Maintainers only" for creating discussions

### 6. 🛠️ Development
- **Name**: Development
- **Description**: Discuss SDK development, architecture, and contributions
- **Emoji**: 🛠️
- **Format**: Open-ended discussion

### 7. 🔌 Integrations
- **Name**: Integrations
- **Description**: Discuss integrations with other tools and platforms
- **Emoji**: 🔌
- **Format**: Open-ended discussion

## Step 3: Configure Category Settings

For each category, you can:

1. **Reorder categories**: Drag and drop to arrange them
2. **Edit categories**: Click the pencil icon to edit
3. **Set permissions**: Some categories can be maintainer-only for posting

**Recommended order:**
1. 📣 Announcements
2. ❓ Q&A
3. 💡 Ideas
4. 🎉 Show and Tell
5. 🛠️ Development
6. 🔌 Integrations
7. 💬 General

## Step 4: Pin Important Discussions

Create and pin these discussions to the top:

### Welcome Discussion
- **Category**: General
- **Title**: "Welcome to Jira SDK TypeScript Discussions! 👋"
- **Content**:
  ```markdown
  Welcome to the Jira SDK TypeScript community!

  This is a place to:
  - Ask questions and get help
  - Share your projects
  - Discuss ideas and improvements
  - Connect with other developers

  ## Getting Started

  - 📚 [Read the README](https://github.com/felixgeelhaar/jirasdk-ts#readme)
  - 🚀 [Quick Start Guide](https://github.com/felixgeelhaar/jirasdk-ts#quick-start)
  - 🐛 [Report bugs](https://github.com/felixgeelhaar/jirasdk-ts/issues/new?template=bug_report.yml)
  - 💡 [Request features](https://github.com/felixgeelhaar/jirasdk-ts/issues/new?template=feature_request.yml)

  ## Community Guidelines

  Please be respectful and follow our [Code of Conduct](https://github.com/felixgeelhaar/jirasdk-ts/blob/main/CODE_OF_CONDUCT.md).

  Looking forward to your contributions!
  ```

### Contributing Guide Discussion
- **Category**: Development
- **Title**: "Contributing to the SDK 🤝"
- **Content**:
  ```markdown
  Interested in contributing? Great!

  Please read our [Contributing Guide](https://github.com/felixgeelhaar/jirasdk-ts/blob/main/CONTRIBUTING.md) first.

  ## Ways to Contribute

  - 🐛 Fix bugs
  - ✨ Add features
  - 📝 Improve documentation
  - 🧪 Write tests
  - 💡 Share ideas

  ## Getting Help

  If you have questions about contributing, ask here or in the Q&A section!
  ```

## Step 5: Set Default Welcome Message

1. Go to Settings > Discussions
2. Set a welcome message for new discussions
3. Suggested message:
   ```
   Thanks for starting a new discussion! Please make sure you've:
   - Searched for existing discussions on this topic
   - Provided enough context and details
   - Followed our Code of Conduct
   ```

## Step 6: Enable Discussion Templates

The discussion templates are already created in `.github/DISCUSSION_TEMPLATE/`:
- ✅ show-and-tell.yml
- ✅ ideas.yml
- ✅ q-and-a.yml
- ✅ general.yml

These will automatically appear when users create discussions in the matching categories!

## Verification Checklist

- [ ] Discussions enabled
- [ ] All 7 categories created with correct emojis
- [ ] Q&A category has "mark as answer" enabled
- [ ] Announcements category set to maintainers-only
- [ ] Categories reordered as recommended
- [ ] Welcome discussion created and pinned
- [ ] Contributing discussion created and pinned
- [ ] Welcome message configured

## Additional Settings (Optional)

### Enable Polls
1. Go to Settings > Discussions
2. Enable "Allow users to create polls"

### Upvoting
- Upvoting is enabled by default
- Users can upvote discussions to show interest

### Notifications
Make sure you're watching the repository to get notifications for new discussions.

---

Once you've completed these steps, your Discussions will be fully configured and ready for community engagement! 🎉
