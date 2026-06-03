#!/bin/bash
# Blocks direct git commit and git push to protected branches.
# Matches development/beta/prod as exact names or as path segments / hyphenated / underscored
# (e.g. beta, release/beta, beta-v2, env_prod).

PROTECTED_BRANCHES='(^|[/_-])(develop|development|beta|prod)(/|$|[_-])'

input=$(cat)
command=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" 2>/dev/null)

allow() {
    echo '{"permission":"allow"}'
    exit 0
}

deny() {
    local msg="$1"
    echo "{\"permission\":\"deny\",\"user_message\":\"$msg\",\"agent_message\":\"$msg\"}"
    exit 0
}

current_branch() {
    git branch --show-current 2>/dev/null
}

# Only intercept commit and push commands
if ! echo "$command" | grep -qE '(^|[;&|])\s*git\s+(push)\b'; then
    allow
fi

# --- git push: check current branch and explicit target branch in command ---
if echo "$command" | grep -qE '(^|[;&|])\s*git\s+push\b'; then
    # Check for explicit branch in command: git push origin branch-name
    explicit_branch=$(echo "$command" | grep -oE 'git\s+push\s+\S+\s+(\S+)' | awk '{print $NF}' | sed 's/HEAD://' | head -1)
    if [ -n "$explicit_branch" ] && echo "$explicit_branch" | grep -qE "$PROTECTED_BRANCHES"; then
        deny "Direct push to '$explicit_branch' is not allowed. Ask user to push it."
    fi

    # Check current branch if no explicit target
    if [ -z "$explicit_branch" ]; then
        branch=$(current_branch)
        if echo "$branch" | grep -qE "$PROTECTED_BRANCHES"; then
            deny "Direct push to '$branch' is not allowed. Ask user to push it."
        fi
    fi
fi

allow
