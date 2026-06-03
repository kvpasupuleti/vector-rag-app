#!/bin/bash
# Guards file reads against auto-generated files that must never be read directly.

input=$(cat)
file_path=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); ti=d.get('tool_input',{}); print(ti.get('file_path','') or ti.get('path',''))" 2>/dev/null)

allow() {
    echo '{"decision":"allow"}'
    exit 0
}

deny() {
    local msg="$1"
    echo "{\"decision\":\"deny\",\"reason\":\"$msg\"}"
    exit 2
}

# No path extracted — allow and let Cursor handle it
if [ -z "$file_path" ]; then
    allow
fi

# --- Auto-generated file guard (hard deny) ---

# build/ directory — fully auto-generated, never read
if echo "$file_path" | grep -qE '/build/'; then
    deny "build/ is auto-generated. You need not read file contents in it. Skip and Move on."
fi

# views/ directory — only api_wrapper.py, __init__.py, and tests/ are allowed
if echo "$file_path" | grep -qE '/views/'; then
    if echo "$file_path" | grep -qE '/(api_wrapper\.py|__init__\.py|request_response_mocks\.py|tests/)'; then
        allow
    fi
    deny "views/ files are auto-generated boilerplate. Only api_wrapper.py, __init__.py, and tests files may be read. Skip and Move on."
fi

allow
