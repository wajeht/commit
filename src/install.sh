#!/bin/bash

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

commands=("jq" "git" "curl" "tail" "sed" "read" "tr")

install_commands() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        for cmd in "${commands[@]}"; do
            if ! command_exists "$cmd"; then
                echo "Installing $cmd..."
                brew install "$cmd"
            fi
        done
    elif [[ -f /etc/debian_version ]]; then
        # Debian-based Linux
        sudo apt update
        sudo apt install -y "${commands[@]}"
    elif [[ -f /etc/redhat-release ]]; then
        # Red Hat-based Linux
        sudo dnf install -y "${commands[@]}"
    elif [[ -f /etc/arch-release ]]; then
        # Arch-based Linux
        sudo pacman -S --noconfirm "${commands[@]}"
    else
        echo "Unsupported operating system. Please install the required tools manually."
        exit 1
    fi
}

for cmd in "${commands[@]}"; do
    if ! command_exists "$cmd"; then
        echo "$cmd is not installed. Installing missing commands..."
        install_commands
        break
    fi
done

echo "All required commands are installed."
