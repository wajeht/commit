#!/bin/bash

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

commands=("jq" "git" "curl" "tail" "sed" "tr")

add_package() {
    local candidate="$1"
    local package

    for package in "${packages[@]}"; do
        if [[ "$package" == "$candidate" ]]; then
            return
        fi
    done

    packages+=("$candidate")
}

install_commands() {
    local packages=()
    local cmd

    for cmd in "$@"; do
        case "$cmd" in
            tail|tr) add_package "coreutils" ;;
            sed)
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    add_package "gnu-sed"
                else
                    add_package "sed"
                fi
                ;;
            *) add_package "$cmd" ;;
        esac
    done

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if ! command_exists brew; then
            echo "Homebrew is not installed. Please install it from https://brew.sh/"
            exit 1
        fi
        brew install "${packages[@]}"
    elif [[ -f /etc/debian_version ]]; then
        # Debian-based Linux
        sudo apt-get update
        sudo apt-get install -y "${packages[@]}"
    elif [[ -f /etc/redhat-release ]]; then
        # Red Hat-based Linux
        sudo dnf install -y "${packages[@]}"
    elif [[ -f /etc/arch-release ]]; then
        # Arch-based Linux
        sudo pacman -S --noconfirm "${packages[@]}"
    else
        echo "Unsupported operating system. Please install the required tools manually."
        exit 1
    fi
}

missing_commands=()
for cmd in "${commands[@]}"; do
    if ! command_exists "$cmd"; then
        missing_commands+=("$cmd")
    fi
done

if [[ ${#missing_commands[@]} -gt 0 ]]; then
    echo "Installing missing commands: ${missing_commands[*]}"
    install_commands "${missing_commands[@]}"
fi

echo "All required commands are installed."
