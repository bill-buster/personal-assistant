# Setting Up Remote Repository

## Step-by-Step Guide

### Option 1: Create New Repository on GitHub (Recommended)

#### 1. Create Repository on GitHub

1. Go to [GitHub](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in:
    - **Repository name**: `personal-assistant` (or your preferred name)
    - **Description**: "Local-first CLI assistant with natural language routing"
    - **Visibility**: Choose Public or Private
    - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

#### 2. Connect Local Repository to GitHub

After creating the repo, GitHub will show you commands. Use these:

```bash
# If you haven't set up remote yet, or want to update it:
git remote add origin git@github.com:YOUR_USERNAME/personal-assistant.git

# Or if using HTTPS:
git remote add origin https://github.com/YOUR_USERNAME/personal-assistant.git

# Push your code
git push -u origin main
```

#### 3. If Remote Already Exists (Update URL)

```bash
# Check current remote
git remote -v

# Update to your repository
git remote set-url origin git@github.com:YOUR_USERNAME/personal-assistant.git

# Or HTTPS:
git remote set-url origin https://github.com/YOUR_USERNAME/personal-assistant.git

# Push
git push -u origin main
```

### Option 2: Use GitHub CLI (Faster)

If you have GitHub CLI installed:

```bash
# Check if installed
gh --version

# If not installed, install it:
# macOS: brew install gh
# Then: gh auth login

# Create repo and push in one command
gh repo create personal-assistant --public --source=. --remote=origin --push
```

### Authentication Setup

#### For SSH (Recommended)

1. **Check if you have SSH keys**:

    ```bash
    ls -la ~/.ssh/id_*.pub
    ```

2. **If no keys, generate one**:

    ```bash
    ssh-keygen -t ed25519 -C "your-email@example.com"
    # Press Enter to accept default location
    # Optionally set a passphrase
    ```

3. **Copy your public key**:

    ```bash
    cat ~/.ssh/id_ed25519.pub
    # Copy the entire output
    ```

4. **Add to GitHub**:
    - Go to GitHub → Settings → SSH and GPG keys
    - Click "New SSH key"
    - Paste your public key
    - Save

5. **Test connection**:
    ```bash
    ssh -T git@github.com
    # Should say: "Hi YOUR_USERNAME! You've successfully authenticated..."
    ```

#### For HTTPS

1. **Use Personal Access Token** (not password):
    - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
    - Generate new token with `repo` scope
    - Copy token

2. **When pushing, use token as password**:

    ```bash
    git push -u origin main
    # Username: YOUR_USERNAME
    # Password: YOUR_TOKEN (not your GitHub password)
    ```

3. **Or use GitHub CLI**:
    ```bash
    gh auth login
    # Follow prompts
    ```

### Verify Setup

```bash
# Check remote
git remote -v

# Should show:
# origin  git@github.com:YOUR_USERNAME/personal-assistant.git (fetch)
# origin  git@github.com:YOUR_USERNAME/personal-assistant.git (push)

# Push and verify
git push -u origin main

# Check status
git status
```

### Troubleshooting

#### "Permission denied (publickey)"

- SSH key not set up or not added to GitHub
- See "Authentication Setup" above

#### "Repository not found"

- Repository doesn't exist on GitHub
- Repository name is wrong
- You don't have access to the repository

#### "Remote origin already exists"

```bash
# Remove existing remote
git remote remove origin

# Add correct remote
git remote add origin git@github.com:YOUR_USERNAME/personal-assistant.git
```

### Next Steps After Push

1. **Set up branch protection** (optional):
    - GitHub → Settings → Branches
    - Add rule for `main` branch
    - Require pull request reviews

2. **Add repository description**:
    - Update README if needed
    - Add topics/tags

3. **Set up GitHub Actions** (if using CI):
    - Already have `.github/workflows/ci.yml`
    - Will run automatically on push

4. **Enable Issues/Projects** (if needed):
    - Settings → Features
    - Enable Issues, Projects, etc.

## Quick Reference

```bash
# Create repo on GitHub first, then:

# Set remote (replace YOUR_USERNAME)
git remote add origin git@github.com:YOUR_USERNAME/personal-assistant.git

# Push all commits
git push -u origin main

# Verify
git status
```
